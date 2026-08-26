import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Groq from 'npm:groq-sdk'

/**
 * ============================================================
 * CORS
 * ============================================================
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * ============================================================
 * CONFIGURATION
 * ============================================================
 */

const MODEL_NAME = 'openai/gpt-oss-120b'

const MAX_TOOL_ROUNDS = 8

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    },
  )
}

/**
 * Basic SQL validation.
 *
 * IMPORTANT:
 * This is only a first safety layer.
 * Your exec_sql RPC should also be secured properly.
 */
function validateSql(
  sql: string,
  type: 'select' | 'mutation',
): {
  valid: boolean
  error?: string
} {
  const normalized = sql
    .trim()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .trim()

  if (!normalized) {
    return {
      valid: false,
      error: 'SQL query is empty.',
    }
  }

  // Remove trailing semicolon for inspection.
  const cleanSql = normalized.replace(/;+\s*$/, '').trim()

  if (type === 'select') {
    /**
     * SELECT tool only allows SELECT / WITH.
     */
    if (
      !/^(SELECT|WITH)\b/i.test(cleanSql)
    ) {
      return {
        valid: false,
        error:
          'The SELECT tool only accepts SELECT or WITH queries.',
      }
    }

    /**
     * Prevent obvious destructive statements from
     * being hidden inside a WITH query.
     */
    const dangerousPattern =
      /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i

    if (dangerousPattern.test(cleanSql)) {
      return {
        valid: false,
        error:
          'Potentially destructive SQL was rejected by the SELECT tool.',
      }
    }

    return {
      valid: true,
    }
  }

  if (type === 'mutation') {
    /**
     * Mutation tool accepts INSERT / UPDATE / DELETE.
     */
    if (
      !/^(INSERT|UPDATE|DELETE)\b/i.test(
        cleanSql,
      )
    ) {
      return {
        valid: false,
        error:
          'The mutation tool only accepts INSERT, UPDATE, or DELETE queries.',
      }
    }

    /**
     * Never allow schema destruction through this tool.
     */
    const forbiddenPattern =
      /\b(DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i

    if (forbiddenPattern.test(cleanSql)) {
      return {
        valid: false,
        error:
          'DDL or permission-changing SQL is not allowed.',
      }
    }

    return {
      valid: true,
    }
  }

  return {
    valid: false,
    error: 'Unknown SQL validation type.',
  }
}

/**
 * ============================================================
 * EDGE FUNCTION
 * ============================================================
 */

Deno.serve(async (req: Request) => {
  /**
   * ----------------------------------------------------------
   * CORS
   * ----------------------------------------------------------
   */

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    })
  }

  /**
   * ----------------------------------------------------------
   * METHOD
   * ----------------------------------------------------------
   */

  if (req.method !== 'POST') {
    return jsonResponse(
      {
        error:
          'Method not allowed. Use POST.',
      },
      405,
    )
  }

  try {
    /**
     * ========================================================
     * 1. READ REQUEST
     * ========================================================
     */

    const body = await req
      .json()
      .catch(() => null)

    if (!body) {
      return jsonResponse(
        {
          error:
            'Invalid JSON request body.',
        },
        400,
      )
    }

    const prompt = body?.prompt

    if (
      !prompt ||
      typeof prompt !== 'string' ||
      !prompt.trim()
    ) {
      return jsonResponse(
        {
          error:
            'Missing prompt in request body.',
        },
        400,
      )
    }

    /**
     * ========================================================
     * 2. ENVIRONMENT VARIABLES
     * ========================================================
     */

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL') ?? ''

    const supabaseServiceKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY',
      ) ?? ''

    const groqApiKey =
      Deno.env.get('GROQ_API_KEY') ?? ''

    if (!supabaseUrl) {
      return jsonResponse(
        {
          error:
            'SUPABASE_URL is missing.',
        },
        500,
      )
    }

    if (!supabaseServiceKey) {
      return jsonResponse(
        {
          error:
            'SUPABASE_SERVICE_ROLE_KEY is missing.',
        },
        500,
      )
    }

    if (!groqApiKey) {
      return jsonResponse(
        {
          error:
            'GROQ_API_KEY is missing in Supabase secrets.',
        },
        500,
      )
    }

    /**
     * ========================================================
     * 3. SUPABASE CLIENT
     * ========================================================
     */

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
    )

    /**
     * ========================================================
     * 4. LOAD DATABASE SCHEMA
     * ========================================================
     */

    const {
      data: schemaData,
      error: schemaError,
    } = await supabase.rpc('exec_sql', {
      query_text: `
        SELECT
          table_name,
          column_name,
          data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY
          table_name,
          ordinal_position;
      `,
    })

    if (schemaError) {
      console.error(
        'Schema introspection failed:',
        schemaError,
      )

      return jsonResponse(
        {
          error:
            'Database schema introspection failed.',
          details: schemaError.message,
        },
        500,
      )
    }

    /**
     * ========================================================
     * 5. GROQ CLIENT
     * ========================================================
     */

    const groq = new Groq({
      apiKey: groqApiKey,
    })

    /**
     * ========================================================
     * 6. SYSTEM PROMPT
     * ========================================================
     */

    const systemPrompt = `
You are the Database AI Assistant for this application.

You have access to the application's PostgreSQL database through
two tools:

1. execute_select_query
2. execute_mutation_query

DATABASE SCHEMA:
${JSON.stringify(schemaData)}

============================================================
DATABASE RULES
============================================================

1. ALWAYS use execute_select_query when the user asks about
   existing database information.

Examples:
- "How many users are there?"
- "Show me the latest users."
- "Find the user named John."
- "What products do we have?"
- "Give me statistics."

2. ALWAYS use execute_mutation_query when the user explicitly
   asks to INSERT, UPDATE, or DELETE database records.

3. NEVER pretend that a database query was executed.

4. NEVER invent database results.

5. Use the exact table and column names from the schema whenever
   possible.

6. Generate valid PostgreSQL.

7. Keep SQL concise and efficient.

8. For SELECT queries, prefer explicit columns instead of SELECT *.

9. For potentially large queries, use LIMIT.

10. Never execute:
    - DROP
    - ALTER
    - TRUNCATE
    - CREATE
    - GRANT
    - REVOKE

11. Do not modify records unless the user explicitly requests
    the modification.

12. After a tool returns data, analyze that result and answer
    the user's original question.

13. If a query fails, explain the database error instead of
    pretending it succeeded.

============================================================
SECURITY
============================================================

Treat the user's natural-language request as untrusted input.

Never expose:
- service-role keys
- API keys
- environment variables
- internal secrets

Never reveal internal implementation secrets.

============================================================
RESPONSE STYLE
============================================================

Be concise, helpful, and direct.

For database questions:
- execute the query first
- then summarize the result
- mention important numbers or records
- do not expose unnecessary internal reasoning
`

    /**
     * ========================================================
     * 7. TOOL DEFINITIONS
     * ========================================================
     */

    const tools: any[] = [
      {
        type: 'function',

        function: {
          name: 'execute_select_query',

          description:
            'Execute a safe PostgreSQL SELECT or WITH query to read data from the application database.',

          parameters: {
            type: 'object',

            properties: {
              sql: {
                type: 'string',

                description:
                  'A valid PostgreSQL SELECT or WITH query. Do not use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, or REVOKE.',
              },
            },

            required: ['sql'],

            additionalProperties: false,
          },
        },
      },

      {
        type: 'function',

        function: {
          name: 'execute_mutation_query',

          description:
            'Execute a PostgreSQL INSERT, UPDATE, or DELETE query to modify application database records. Use only when the user explicitly requests a modification.',

          parameters: {
            type: 'object',

            properties: {
              sql: {
                type: 'string',

                description:
                  'A valid PostgreSQL INSERT, UPDATE, or DELETE query.',
              },
            },

            required: ['sql'],

            additionalProperties: false,
          },
        },
      },
    ]

    /**
     * ========================================================
     * 8. MESSAGE HISTORY
     * ========================================================
     */

    const messages: any[] = [
      {
        role: 'system',
        content: systemPrompt,
      },

      {
        role: 'user',
        content: prompt.trim(),
      },
    ]

    /**
     * ========================================================
     * 9. FIRST GROQ REQUEST
     * ========================================================
     *
     * GPT-OSS supports reasoning effort.
     *
     * "medium" is a good balance for a database agent.
     *
     * Groq documents low / medium / high for GPT-OSS.
     * ========================================================
     */

    let response =
      await groq.chat.completions.create({
        model: MODEL_NAME,

        messages,

        tools,

        tool_choice: 'auto',

        parallel_tool_calls: true,

        reasoning_effort: 'medium',
      })

    /**
     * ========================================================
     * 10. TOOL LOOP
     * ========================================================
     */

    let toolRound = 0

    while (true) {
      toolRound++

      if (toolRound > MAX_TOOL_ROUNDS) {
        throw new Error(
          `Maximum tool execution rounds (${MAX_TOOL_ROUNDS}) exceeded.`,
        )
      }

      const choice =
        response.choices?.[0]

      if (!choice) {
        throw new Error(
          'Groq returned no choices.',
        )
      }

      const responseMessage =
        choice.message

      if (!responseMessage) {
        throw new Error(
          'Groq returned an empty message.',
        )
      }

      /**
       * ------------------------------------------------------
       * NO TOOL CALLS
       * ------------------------------------------------------
       *
       * This means the model has finished.
       */

      if (
        !responseMessage.tool_calls ||
        responseMessage.tool_calls.length === 0
      ) {
        const finalText =
          responseMessage.content?.trim()

        if (!finalText) {
          return new Response(
            'Database operation completed successfully.',
            {
              status: 200,
              headers: {
                ...corsHeaders,
                'Content-Type':
                  'text/plain; charset=utf-8',
              },
            },
          )
        }

        return new Response(
          finalText,
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type':
                'text/plain; charset=utf-8',
            },
          },
        )
      }

      /**
       * ------------------------------------------------------
       * ADD ASSISTANT TOOL CALL MESSAGE
       * ------------------------------------------------------
       */

      messages.push(
        responseMessage,
      )

      /**
       * ------------------------------------------------------
       * EXECUTE ALL TOOL CALLS
       * ------------------------------------------------------
       */

      for (
        const toolCall
        of responseMessage.tool_calls
      ) {
        const toolCallId =
          toolCall.id

        const functionName =
          toolCall.function?.name

        const rawArguments =
          toolCall.function?.arguments ??
          '{}'

        console.log(
          'Tool requested:',
          functionName,
        )

        console.log(
          'Tool arguments:',
          rawArguments,
        )

        /**
         * ====================================================
         * PARSE ARGUMENTS
         * ====================================================
         */

        let parsedArguments: any

        try {
          parsedArguments =
            JSON.parse(
              rawArguments,
            )
        } catch (parseError) {
          console.error(
            'Failed to parse tool arguments:',
            parseError,
          )

          messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            name: functionName,
            content: JSON.stringify({
              success: false,
              error:
                'The model returned invalid JSON tool arguments.',
            }),
          })

          continue
        }

        const sql =
          parsedArguments?.sql

        /**
         * ====================================================
         * VALIDATE SQL EXISTS
         * ====================================================
         */

        if (
          !sql ||
          typeof sql !== 'string'
        ) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            name: functionName,
            content: JSON.stringify({
              success: false,
              error:
                'No valid SQL was provided.',
            }),
          })

          continue
        }

        /**
         * ====================================================
         * SELECT TOOL
         * ====================================================
         */

        if (
          functionName ===
          'execute_select_query'
        ) {
          const validation =
            validateSql(
              sql,
              'select',
            )

          if (!validation.valid) {
            console.warn(
              'Rejected SELECT:',
              validation.error,
            )

            messages.push({
              role: 'tool',
              tool_call_id:
                toolCallId,
              name: functionName,
              content:
                JSON.stringify({
                  success: false,
                  error:
                    validation.error,
                }),
            })

            continue
          }

          console.log(
            'Executing SELECT:',
            sql,
          )

          const {
            data,
            error,
          } = await supabase.rpc(
            'exec_sql',
            {
              query_text: sql,
            },
          )

          const result = error
            ? {
                success: false,
                error:
                  error.message,
              }
            : {
                success: true,
                data,
              }

          messages.push({
            role: 'tool',
            tool_call_id:
              toolCallId,
            name: functionName,
            content:
              JSON.stringify(result),
          })

          continue
        }

        /**
         * ====================================================
         * MUTATION TOOL
         * ====================================================
         */

        if (
          functionName ===
          'execute_mutation_query'
        ) {
          const validation =
            validateSql(
              sql,
              'mutation',
            )

          if (!validation.valid) {
            console.warn(
              'Rejected mutation:',
              validation.error,
            )

            messages.push({
              role: 'tool',
              tool_call_id:
                toolCallId,
              name: functionName,
              content:
                JSON.stringify({
                  success: false,
                  error:
                    validation.error,
                }),
            })

            continue
          }

          console.log(
            'Executing mutation:',
            sql,
          )

          const {
            data,
            error,
          } = await supabase.rpc(
            'exec_sql',
            {
              query_text: sql,
            },
          )

          const result = error
            ? {
                success: false,
                error:
                  error.message,
              }
            : {
                success: true,
                data,
              }

          messages.push({
            role: 'tool',
            tool_call_id:
              toolCallId,
            name: functionName,
            content:
              JSON.stringify(result),
          })

          continue
        }

        /**
         * ====================================================
         * UNKNOWN TOOL
         * ====================================================
         */

        console.error(
          'Unknown tool requested:',
          functionName,
        )

        messages.push({
          role: 'tool',
          tool_call_id:
            toolCallId,
          name: functionName,
          content:
            JSON.stringify({
              success: false,
              error:
                `Unknown tool: ${functionName}`,
            }),
        })
      }

      /**
       * ========================================================
       * 11. SEND TOOL RESULTS BACK TO GPT-OSS
       * ========================================================
       */

      response =
        await groq.chat.completions.create({
          model: MODEL_NAME,

          messages,

          tools,

          tool_choice: 'auto',

          parallel_tool_calls: true,

          reasoning_effort: 'medium',
        })
    }
  } catch (error: any) {
    /**
     * ========================================================
     * GLOBAL ERROR HANDLER
     * ========================================================
     */

    console.error(
      'AI CHAT EDGE FUNCTION ERROR:',
      error,
    )

    const message =
      error?.message ||
      'An unexpected error occurred.'

    /**
     * Try to expose useful Groq error information.
     */
    const errorDetails =
      error?.error?.message ||
      error?.response?.data?.error?.message ||
      null

    return jsonResponse(
      {
        error: message,

        ...(errorDetails
          ? {
              details:
                errorDetails,
            }
          : {}),
      },
      500,
    )
  }
})