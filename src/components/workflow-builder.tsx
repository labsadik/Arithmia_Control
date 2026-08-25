"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import {
  Bot,
  CheckCircle2,
  Clock3,
  GitBranch,
  Loader2,
  Play,
  Save,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { cn } from "@/lib/utils";

import { supabase } from "@/integrations/supabase/client";

/* =========================================================
   TYPES
========================================================= */

type WorkflowNodeType =
  | "trigger"
  | "agent"
  | "condition"
  | "action"
  | "delay";

type WorkflowNodeData = {
  label: string;
  description: string;
  nodeType: WorkflowNodeType;

  config?: {
    agent?: string;
    input?: string;
    model?: string;

    rule?: string;

    action?: string;
    method?: string;
    endpoint?: string;
    data?: string;

    duration?: string;
  };
};

type WorkflowNode = Node<WorkflowNodeData>;

type WorkflowDocument = {
  nodes: WorkflowNode[];
  edges: Edge[];
};

type WorkflowBuilderProps = {
  workflowId?: string | null;

  initialName?: string;

  initialDescription?: string;

  initialEnabled?: boolean;

  initialSteps?: unknown;

  readOnly?: boolean;

  onClose?: () => void;

  onSaved?: () => void;
};

/* =========================================================
   NODE DEFINITIONS
========================================================= */

const nodeConfig: Record<
  WorkflowNodeType,
  {
    label: string;
    description: string;
    icon: typeof Bot;
  }
> = {
  trigger: {
    label: "Workflow Trigger",
    description: "Starts the workflow",
    icon: Play,
  },

  agent: {
    label: "AI Agent",
    description: "Run an AI agent with workflow data",
    icon: Bot,
  },

  condition: {
    label: "Condition",
    description: "Branch based on a rule",
    icon: GitBranch,
  },

  action: {
    label: "Action",
    description: "Call an API or perform an operation",
    icon: Zap,
  },

  delay: {
    label: "Delay",
    description: "Wait before continuing",
    icon: Clock3,
  },
};

/* =========================================================
   ID
========================================================= */

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return Math.random()
    .toString(36)
    .slice(2);
}

/* =========================================================
   CREATE NODE
========================================================= */

function createNode(
  type: WorkflowNodeType,
  position: {
    x: number;
    y: number;
  },
): WorkflowNode {
  const config = nodeConfig[type];

  const configs: Record<
    WorkflowNodeType,
    WorkflowNodeData["config"]
  > = {
    trigger: {
      input: "trigger.payload",
      output: "trigger.output",
    },

    agent: {
      agent: "Support Agent",
      input: "{{previous.output}}",
      model: "default",
    },

    condition: {
      rule: "{{previous.output}} exists",
    },

    action: {
      action: "HTTP Request",
      method: "POST",
      endpoint: "",
      data: "{{previous.output}}",
    },

    delay: {
      duration: "5 minutes",
    },
  };

  return {
    id: createId(),

    type: "workflow",

    position,

    data: {
      label: config.label,

      description: config.description,

      nodeType: type,

      config: configs[type],
    },
  };
}

/* =========================================================
   DEFAULT WORKFLOW
========================================================= */

function makeDefaultWorkflow(): WorkflowDocument {
  const trigger: WorkflowNode = {
    id: "trigger",

    type: "workflow",

    position: {
      x: 100,
      y: 200,
    },

    data: {
      label: "Workflow Trigger",

      description:
        "Start when this workflow is launched",

      nodeType: "trigger",

      config: {
        input: "trigger.payload",
        output: "trigger.output",
      },
    },
  };

  return {
    nodes: [trigger],

    edges: [],
  };
}

/* =========================================================
   NORMALIZE OLD + NEW DATA
========================================================= */

function normalizeWorkflowSteps(
  value: unknown,
): WorkflowDocument {
  /*
   * New format:
   *
   * {
   *   nodes: [],
   *   edges: []
   * }
   */

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    const document =
      value as Partial<WorkflowDocument>;

    if (
      Array.isArray(document.nodes) &&
      Array.isArray(document.edges)
    ) {
      return {
        nodes: document.nodes.map(
          (node: any) => ({
            ...node,

            type: "workflow",

            data: {
              label:
                node.data?.label ??
                "Workflow Node",

              description:
                node.data?.description ??
                "Workflow step",

              nodeType:
                node.data?.nodeType ??
                "action",

              config:
                node.data?.config ?? {},
            },
          }),
        ),

        edges: document.edges.map(
          (edge: any) => ({
            ...edge,

            type:
              edge.type ??
              "smoothstep",

            animated:
              edge.animated ?? true,
          }),
        ),
      };
    }
  }

  /*
   * Old format:
   *
   * [
   *   {
   *     id,
   *     type,
   *     name,
   *     description,
   *     config
   *   }
   * ]
   */

  if (
    Array.isArray(value) &&
    value.length > 0
  ) {
    const nodes: WorkflowNode[] =
      value.map(
        (step: any, index) => {
          const type: WorkflowNodeType =
            step.type === "trigger" ||
            step.type === "agent" ||
            step.type === "condition" ||
            step.type === "action" ||
            step.type === "delay"
              ? step.type
              : index === 0
                ? "trigger"
                : "action";

          return {
            id:
              typeof step.id === "string"
                ? step.id
                : index === 0
                  ? "trigger"
                  : createId(),

            type: "workflow",

            position: {
              x: 100,
              y: 120 + index * 180,
            },

            data: {
              label:
                step.name ??
                nodeConfig[type].label,

              description:
                step.description ??
                nodeConfig[type].description,

              nodeType: type,

              config:
                step.config ?? {},
            },
          };
        },
      );

    const edges: Edge[] = [];

    for (
      let i = 0;
      i < nodes.length - 1;
      i++
    ) {
      edges.push({
        id: `${nodes[i].id}-${nodes[i + 1].id}`,

        source: nodes[i].id,

        target: nodes[i + 1].id,

        type: "smoothstep",

        animated: true,
      });
    }

    return {
      nodes,
      edges,
    };
  }

  return makeDefaultWorkflow();
}

/* =========================================================
   NODE UI
========================================================= */

function WorkflowNodeCard({
  data,
  selected,
}: NodeProps<WorkflowNode>) {
  const config =
    nodeConfig[data.nodeType];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "min-w-[250px] overflow-hidden rounded-xl border",
        "bg-card shadow-xl transition-all",

        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border",
      )}
    >
      {/* INPUT */}

      {data.nodeType !== "trigger" && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-background !bg-primary"
        />
      )}

      {/* HEADER */}

      <div className="flex items-start gap-3 border-b border-border p-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0",
            "items-center justify-center",
            "rounded-xl bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {data.label}
            </p>

            {data.nodeType ===
              "trigger" && (
              <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                START
              </span>
            )}
          </div>

          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            {data.description}
          </p>
        </div>
      </div>

      {/* CONFIG PREVIEW */}

      <div className="space-y-2 p-3">
        {data.nodeType ===
          "trigger" && (
          <div className="rounded-lg border border-border bg-muted/30 p-2">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
              Trigger
            </p>

            <p className="mt-1 text-xs font-medium">
              Manual / Event
            </p>
          </div>
        )}

        {data.nodeType ===
          "agent" && (
          <>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                Agent
              </p>

              <p className="mt-1 text-xs font-medium">
                {data.config?.agent ??
                  "AI Agent"}
              </p>
            </div>

            <div className="rounded-md bg-muted/40 px-2 py-1.5">
              <code className="text-[9px] text-primary">
                {data.config?.input ??
                  "{{previous.output}}"}
              </code>
            </div>
          </>
        )}

        {data.nodeType ===
          "condition" && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-2">
            <p className="text-[9px] font-semibold uppercase text-violet-600">
              Rule
            </p>

            <p className="mt-1 truncate font-mono text-[10px] text-violet-700">
              {data.config?.rule ??
                "{{previous.output}} exists"}
            </p>
          </div>
        )}

        {data.nodeType ===
          "action" && (
          <>
            <div className="flex gap-2">
              <span className="rounded bg-muted px-2 py-1 text-[9px] font-bold">
                {data.config?.method ??
                  "POST"}
              </span>

              <span className="truncate font-mono text-[9px] text-muted-foreground">
                {data.config?.endpoint ||
                  "API endpoint"}
              </span>
            </div>
          </>
        )}

        {data.nodeType ===
          "delay" && (
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-2">
            <p className="text-[9px] uppercase text-cyan-600">
              Wait
            </p>

            <p className="mt-1 text-xs font-semibold text-cyan-700">
              {data.config?.duration ??
                "5 minutes"}
            </p>
          </div>
        )}
      </div>

      {/* OUTPUT */}

      {data.nodeType !==
        "condition" && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-background !bg-primary"
        />
      )}

      {data.nodeType ===
        "condition" && (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            style={{
              top: "35%",
            }}
            className="!h-3 !w-3 !border-2 !border-background !bg-success"
          />

          <Handle
            id="false"
            type="source"
            position={Position.Right}
            style={{
              top: "70%",
            }}
            className="!h-3 !w-3 !border-2 !border-background !bg-destructive"
          />
        </>
      )}
    </div>
  );
}

const nodeTypes = {
  workflow: WorkflowNodeCard,
};

/* =========================================================
   BUILDER
========================================================= */

function BuilderInner({
  workflowId,
  initialName,
  initialDescription,
  initialEnabled,
  initialSteps,
  readOnly = false,
  onClose,
  onSaved,
}: WorkflowBuilderProps) {
  const initialDocument =
    useMemo(
      () =>
        normalizeWorkflowSteps(
          initialSteps,
        ),
      [initialSteps],
    );

  const [
    nodes,
    setNodes,
    onNodesChange,
  ] = useNodesState<WorkflowNode>(
    initialDocument.nodes,
  );

  const [
    edges,
    setEdges,
    onEdgesChange,
  ] = useEdgesState(
    initialDocument.edges,
  );

  const [name, setName] =
    useState(
      initialName ||
        "New Workflow",
    );

  const [
    description,
    setDescription,
  ] = useState(
    initialDescription || "",
  );

  const [enabled, setEnabled] =
    useState(
      initialEnabled ?? true,
    );

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [testing, setTesting] =
    useState(false);

  const [
    testNodeId,
    setTestNodeId,
  ] = useState<string | null>(
    null,
  );

  const [
    selectedNode,
    setSelectedNode,
  ] = useState<WorkflowNode | null>(
    null,
  );

  /* =======================================================
     RELOAD WHEN DIFFERENT WORKFLOW IS OPENED
  ======================================================= */

  useEffect(() => {
    const document =
      normalizeWorkflowSteps(
        initialSteps,
      );

    setNodes(document.nodes);
    setEdges(document.edges);

    setName(
      initialName ||
        "New Workflow",
    );

    setDescription(
      initialDescription || "",
    );

    setEnabled(
      initialEnabled ?? true,
    );

    setSaved(false);
  }, [
    initialSteps,
    initialName,
    initialDescription,
    initialEnabled,
    setNodes,
    setEdges,
  ]);

  /* =======================================================
     CONNECT NODES
  ======================================================= */

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;

      if (
        !connection.source ||
        !connection.target
      ) {
        return;
      }

      if (
        connection.source ===
        connection.target
      ) {
        return;
      }

      setEdges((current) =>
        addEdge(
          {
            ...connection,

            id: `${connection.source}-${connection.target}-${createId()}`,

            type: "smoothstep",

            animated: true,
          },
          current,
        ),
      );

      setSaved(false);
    },
    [
      readOnly,
      setEdges,
    ],
  );

  /* =======================================================
     ADD NODE
  ======================================================= */

  function addNode(
    type: WorkflowNodeType,
  ) {
    if (readOnly) return;

    const lastNode =
      nodes[nodes.length - 1];

    const position = lastNode
      ? {
          x:
            lastNode.position.x +
            320,

          y: lastNode.position.y,
        }
      : {
          x: 100,
          y: 200,
        };

    const newNode =
      createNode(
        type,
        position,
      );

    setNodes((current) => [
      ...current,
      newNode,
    ]);

    /*
     * Automatically connect the
     * new node to the previous node.
     */

    if (lastNode) {
      setEdges((current) => [
        ...current,

        {
          id: `${lastNode.id}-${newNode.id}`,

          source: lastNode.id,

          target: newNode.id,

          type: "smoothstep",

          animated: true,
        },
      ]);
    }

    setSelectedNode(
      newNode,
    );

    setSaved(false);
  }

  /* =======================================================
     DELETE SELECTED
  ======================================================= */

  function deleteSelectedNodes() {
    if (readOnly) return;

    const selectedIds =
      nodes
        .filter(
          (node) =>
            node.selected &&
            node.data.nodeType !==
              "trigger",
        )
        .map(
          (node) =>
            node.id,
        );

    if (
      selectedIds.length === 0
    ) {
      return;
    }

    setNodes((current) =>
      current.filter(
        (node) =>
          !selectedIds.includes(
            node.id,
          ),
      ),
    );

    setEdges((current) =>
      current.filter(
        (edge) =>
          !selectedIds.includes(
            edge.source,
          ) &&
          !selectedIds.includes(
            edge.target,
          ),
      ),
    );

    setSelectedNode(null);

    setSaved(false);
  }

  /* =======================================================
     DELETE EDGE
  ======================================================= */

  function deleteEdge(
    edgeId: string,
  ) {
    if (readOnly) return;

    setEdges((current) =>
      current.filter(
        (edge) =>
          edge.id !== edgeId,
      ),
    );

    setSaved(false);
  }

  /* =======================================================
     UPDATE NODE
  ======================================================= */

  function updateNode(
    id: string,
    patch: Partial<WorkflowNodeData>,
  ) {
    if (readOnly) return;

    setNodes((current) =>
      current.map((node) =>
        node.id === id
          ? {
              ...node,

              data: {
                ...node.data,
                ...patch,
              },
            }
          : node,
      ),
    );

    setSelectedNode(
      (current) =>
        current?.id === id
          ? {
              ...current,

              data: {
                ...current.data,
                ...patch,
              },
            }
          : current,
    );

    setSaved(false);
  }

  /* =======================================================
     UPDATE CONFIG
  ======================================================= */

  function updateConfig(
    id: string,
    key: string,
    value: string,
  ) {
    if (readOnly) return;

    setNodes((current) =>
      current.map((node) =>
        node.id === id
          ? {
              ...node,

              data: {
                ...node.data,

                config: {
                  ...(node.data
                    .config ?? {}),

                  [key]: value,
                },
              },
            }
          : node,
      ),
    );

    setSelectedNode(
      (current) =>
        current?.id === id
          ? {
              ...current,

              data: {
                ...current.data,

                config: {
                  ...(current.data
                    .config ?? {}),

                  [key]: value,
                },
              },
            }
          : current,
    );

    setSaved(false);
  }

  /* =======================================================
     NODE SELECTION
  ======================================================= */

  function handleNodeClick(
    node: WorkflowNode,
  ) {
    setSelectedNode(node);
  }

  /* =======================================================
     SAVE
  ======================================================= */

  async function saveWorkflow() {
    if (readOnly) return;

    if (!name.trim()) {
      setError(
        "Workflow name is required.",
      );

      return;
    }

    if (
      nodes.length === 0
    ) {
      setError(
        "Add at least one node.",
      );

      return;
    }

    setSaving(true);
    setError(null);

    const workflowData: WorkflowDocument =
      {
        nodes,
        edges,
      };

    try {
      if (workflowId) {
        const {
          error: updateError,
        } = await supabase
          .from("workflows")
          .update({
            name: name.trim(),

            description:
              description.trim(),

            enabled,

            steps: workflowData,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            workflowId,
          );

        if (updateError) {
          throw updateError;
        }
      } else {
        const {
          data,
          error:
            insertError,
        } = await supabase
          .from("workflows")
          .insert({
            name: name.trim(),

            description:
              description.trim(),

            enabled,

            steps: workflowData,
          })
          .select(
            "id",
          )
          .single();

        if (insertError) {
          throw insertError;
        }

        /*
         * New workflow was created.
         * Keep the returned ID available
         * for the current builder session.
         */

        console.log(
          "Created workflow:",
          data?.id,
        );
      }

      setSaved(true);

      onSaved?.();
    } catch (err) {
      console.error(
        "Workflow save error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not save workflow.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     TEST RUN
  ======================================================= */

  async function testWorkflow() {
    if (testing) return;

    if (
      nodes.length === 0
    ) {
      setError(
        "There are no nodes to test.",
      );

      return;
    }

    if (!enabled) {
      setError(
        "Enable the workflow before testing it.",
      );

      return;
    }

    /*
     * Save first if the workflow
     * has unsaved changes.
     */

    if (!saved && !readOnly) {
      await saveWorkflow();
    }

    setError(null);
    setTesting(true);

    /*
     * Reset all nodes.
     */

    setNodes((current) =>
      current.map(
        (node) => ({
          ...node,
          className: "",
        }),
      ),
    );

    /*
     * Simulate execution through
     * the workflow graph.
     */

    const orderedNodes =
      [...nodes].sort(
        (a, b) =>
          a.position.x -
          b.position.x,
      );

    for (
      const node of orderedNodes
    ) {
      setTestNodeId(
        node.id,
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            850,
          ),
      );
    }

    setTestNodeId(null);
    setTesting(false);

    setSaved(true);
  }

  /* =======================================================
     TEST NODE STYLE
  ======================================================= */

  const testNodes = useMemo(
    () =>
      nodes.map(
        (node) => ({
          ...node,

          className:
            testNodeId ===
            node.id
              ? "workflow-test-active"
              : "",
        }),
      ),
    [
      nodes,
      testNodeId,
    ],
  );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ===================================================
          TOOLBAR
      =================================================== */}

      <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-background px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* NAME */}

          <div className="flex min-w-0 items-center gap-3">
            <Input
              value={name}
              disabled={
                readOnly ||
                saving
              }
              onChange={(event) => {
                setName(
                  event.target.value,
                );

                setSaved(false);
              }}
              className="w-full max-w-sm font-semibold"
              placeholder="Workflow name"
            />

            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold",

                enabled
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {enabled
                ? "ACTIVE"
                : "OFF"}
            </span>
          </div>

          {/* ACTIONS */}

          <div className="flex flex-wrap items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs font-medium text-success">
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </span>
            )}

            {!readOnly && (
              <>
                {/* ENABLE */}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEnabled(
                      (current) =>
                        !current,
                    );

                    setSaved(false);
                  }}
                >
                  {enabled
                    ? "Disable"
                    : "Enable"}
                </Button>

                {/* TEST */}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    testing ||
                    saving
                  }
                  onClick={
                    testWorkflow
                  }
                  className="gap-2"
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}

                  {testing
                    ? "Testing..."
                    : "Test Run"}
                </Button>

                {/* SAVE */}

                <Button
                  type="button"
                  size="sm"
                  disabled={
                    saving ||
                    testing
                  }
                  onClick={
                    saveWorkflow
                  }
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : saved ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {saving
                    ? "Saving..."
                    : "Save"}
                </Button>
              </>
            )}

            {readOnly && (
              <span className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                Preview mode
              </span>
            )}

            {onClose && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={
                  onClose
                }
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* DESCRIPTION */}

        {!readOnly && (
          <Input
            value={description}
            disabled={saving}
            onChange={(event) => {
              setDescription(
                event.target.value,
              );

              setSaved(false);
            }}
            placeholder="Describe what this workflow does..."
            className="border-0 bg-muted/30 shadow-none focus-visible:ring-0"
          />
        )}
      </div>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="mx-4 mt-3 shrink-0 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* ===================================================
          MAIN WORKSPACE
      =================================================== */}

      <div className="grid min-h-0 flex-1 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
        {/* =================================================
            LEFT TOOLBOX
        ================================================= */}

        {!readOnly ? (
          <div className="hidden overflow-y-auto border-r border-border bg-background p-3 lg:block">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Add Node
            </p>

            <div className="space-y-2">
              {(
                [
                  "agent",
                  "condition",
                  "action",
                  "delay",
                ] as WorkflowNodeType[]
              ).map(
                (type) => {
                  const config =
                    nodeConfig[
                      type
                    ];

                  const Icon =
                    config.icon;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        addNode(
                          type,
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-accent"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold">
                          {
                            config.label
                          }
                        </p>

                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {
                            config.description
                          }
                        </p>
                      </div>
                    </button>
                  );
                },
              )}
            </div>

            <div className="mt-5 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-semibold">
                How it works
              </p>

              <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                Add nodes, drag them around,
                then connect the output handle
                of one node to the input of
                another.
              </p>
            </div>
          </div>
        ) : (
          <div className="hidden border-r border-border bg-background p-3 lg:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Workflow
            </p>

            <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold">
                Preview
              </p>

              <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                This workflow is read-only.
                Close preview to make changes.
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            CANVAS
        ================================================= */}

        <div className="relative min-h-0 bg-[#09090b]">
          <ReactFlow
            nodes={testNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={(changes) => {
              if (readOnly) return;

              onNodesChange(
                changes,
              );

              setSaved(false);
            }}
            onEdgesChange={(changes) => {
              if (readOnly) return;

              onEdgesChange(
                changes,
              );

              setSaved(false);
            }}
            onConnect={onConnect}
            onNodeClick={(
              _event,
              node,
            ) =>
              handleNodeClick(
                node as WorkflowNode,
              )
            }
            onEdgeDoubleClick={(
              _event,
              edge,
            ) =>
              deleteEdge(
                edge.id,
              )
            }
            nodesDraggable={
              !readOnly
            }
            nodesConnectable={
              !readOnly
            }
            elementsSelectable
            fitView
            fitViewOptions={{
              padding: 0.2,
            }}
            proOptions={{
              hideAttribution: true,
            }}
            defaultEdgeOptions={{
              animated: true,
              type: "smoothstep",
              style: {
                strokeWidth: 2,
              },
            }}
          >
            <Background
              gap={20}
              size={1}
              color="#27272a"
            />

            <Controls />

            <MiniMap
              pannable
              zoomable
              nodeStrokeWidth={3}
            />
          </ReactFlow>

          {/* MOBILE ADD BUTTON */}

          {!readOnly && (
            <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 lg:hidden">
              <div className="flex gap-1 rounded-xl border border-border bg-background/95 p-1 shadow-xl backdrop-blur">
                <Button
                  size="sm"
                  onClick={() =>
                    addNode(
                      "agent",
                    )
                  }
                >
                  <Bot className="mr-1 h-3.5 w-3.5" />
                  Agent
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    addNode(
                      "action",
                    )
                  }
                >
                  <Zap className="mr-1 h-3.5 w-3.5" />
                  Action
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    addNode(
                      "condition",
                    )
                  }
                >
                  <GitBranch className="mr-1 h-3.5 w-3.5" />
                  Condition
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* =================================================
            RIGHT INSPECTOR
        ================================================= */}

        <div className="hidden overflow-y-auto border-l border-border bg-background p-3 xl:block">
          <Card className="border-border bg-card shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Node Inspector
              </CardTitle>
            </CardHeader>

            <CardContent>
              {!selectedNode ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Select a node on the canvas.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* NAME */}

                  {!readOnly ? (
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        Node name
                      </label>

                      <Input
                        value={
                          selectedNode
                            .data
                            .label
                        }
                        onChange={(
                          event,
                        ) =>
                          updateNode(
                            selectedNode.id,
                            {
                              label:
                                event
                                  .target
                                  .value,
                            },
                          )
                        }
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        Selected node
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {
                          selectedNode
                            .data
                            .label
                        }
                      </p>
                    </div>
                  )}

                  {/* TYPE */}

                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      Type
                    </p>

                    <p className="mt-1 text-xs font-semibold capitalize">
                      {
                        selectedNode
                          .data
                          .nodeType
                      }
                    </p>
                  </div>

                  {/* AGENT */}

                  {selectedNode
                    .data
                    .nodeType ===
                    "agent" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                          Agent
                        </label>

                        <Input
                          disabled={
                            readOnly
                          }
                          value={
                            selectedNode
                              .data
                              .config
                              ?.agent ??
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            updateConfig(
                              selectedNode.id,
                              "agent",
                              event
                                .target
                                .value,
                            )
                          }
                          className="mt-1 h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                          Input
                        </label>

                        <Input
                          disabled={
                            readOnly
                          }
                          value={
                            selectedNode
                              .data
                              .config
                              ?.input ??
                            "{{previous.output}}"
                          }
                          onChange={(
                            event,
                          ) =>
                            updateConfig(
                              selectedNode.id,
                              "input",
                              event
                                .target
                                .value,
                            )
                          }
                          className="mt-1 h-8 font-mono text-[10px]"
                        />
                      </div>
                    </div>
                  )}

                  {/* CONDITION */}

                  {selectedNode
                    .data
                    .nodeType ===
                    "condition" && (
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        Rule
                      </label>

                      <Input
                        disabled={
                          readOnly
                        }
                        value={
                          selectedNode
                            .data
                            .config
                            ?.rule ??
                          ""
                        }
                        onChange={(
                          event,
                        ) =>
                          updateConfig(
                            selectedNode.id,
                            "rule",
                            event
                              .target
                              .value,
                          )
                        }
                        className="mt-1 h-8 font-mono text-[10px]"
                      />

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-success/20 bg-success/10 p-2">
                          <p className="text-[9px] font-bold text-success">
                            TRUE
                          </p>

                          <p className="mt-1 text-[9px] text-muted-foreground">
                            Continue
                          </p>
                        </div>

                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2">
                          <p className="text-[9px] font-bold text-destructive">
                            FALSE
                          </p>

                          <p className="mt-1 text-[9px] text-muted-foreground">
                            Stop / branch
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ACTION */}

                  {selectedNode
                    .data
                    .nodeType ===
                    "action" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                          Method
                        </label>

                        <select
                          disabled={
                            readOnly
                          }
                          value={
                            selectedNode
                              .data
                              .config
                              ?.method ??
                            "POST"
                          }
                          onChange={(
                            event,
                          ) =>
                            updateConfig(
                              selectedNode.id,
                              "method",
                              event
                                .target
                                .value,
                            )
                          }
                          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                        >
                          <option>
                            GET
                          </option>

                          <option>
                            POST
                          </option>

                          <option>
                            PUT
                          </option>

                          <option>
                            PATCH
                          </option>

                          <option>
                            DELETE
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                          Endpoint
                        </label>

                        <Input
                          disabled={
                            readOnly
                          }
                          value={
                            selectedNode
                              .data
                              .config
                              ?.endpoint ??
                            ""
                          }
                          onChange={(
                            event,
                          ) =>
                            updateConfig(
                              selectedNode.id,
                              "endpoint",
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="https://api.example.com"
                          className="mt-1 h-8 font-mono text-[10px]"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                          Data
                        </label>

                        <Input
                          disabled={
                            readOnly
                          }
                          value={
                            selectedNode
                              .data
                              .config
                              ?.data ??
                            "{{previous.output}}"
                          }
                          onChange={(
                            event,
                          ) =>
                            updateConfig(
                              selectedNode.id,
                              "data",
                              event
                                .target
                                .value,
                            )
                          }
                          className="mt-1 h-8 font-mono text-[10px]"
                        />
                      </div>
                    </div>
                  )}

                  {/* DELAY */}

                  {selectedNode
                    .data
                    .nodeType ===
                    "delay" && (
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        Duration
                      </label>

                      <Input
                        disabled={
                          readOnly
                        }
                        value={
                          selectedNode
                            .data
                            .config
                            ?.duration ??
                          "5 minutes"
                        }
                        onChange={(
                          event,
                        ) =>
                          updateConfig(
                            selectedNode.id,
                            "duration",
                            event
                              .target
                              .value,
                          )
                        }
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                  )}

                  {/* NODE ID */}

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      Node ID
                    </p>

                    <code className="mt-1 block break-all rounded-md border border-border bg-muted/30 p-2 font-mono text-[9px] text-muted-foreground">
                      {
                        selectedNode.id
                      }
                    </code>
                  </div>

                  {/* DELETE */}

                  {!readOnly &&
                    selectedNode
                      .data
                      .nodeType !==
                      "trigger" && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setNodes(
                            (
                              current,
                            ) =>
                              current.filter(
                                (
                                  node,
                                ) =>
                                  node.id !==
                                  selectedNode.id,
                              ),
                          );

                          setEdges(
                            (
                              current,
                            ) =>
                              current.filter(
                                (
                                  edge,
                                ) =>
                                  edge.source !==
                                    selectedNode.id &&
                                  edge.target !==
                                    selectedNode.id,
                              ),
                          );

                          setSelectedNode(
                            null,
                          );

                          setSaved(
                            false,
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Node
                      </Button>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <div className="flex shrink-0 items-center justify-between border-t border-border bg-background px-4 py-2">
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>
            {nodes.length} nodes
          </span>

          <span>
            {edges.length} connections
          </span>

          {testing && (
            <span className="flex items-center gap-1 text-primary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running workflow...
            </span>
          )}
        </div>

        {!readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={
              deleteSelectedNodes
            }
            className="gap-2 text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete selected
          </Button>
        )}
      </div>

      {/* ===================================================
          TEST ANIMATION
      =================================================== */}

      <style>{`
        .workflow-test-active {
          filter: drop-shadow(
            0 0 12px rgba(59, 130, 246, 0.85)
          );
        }

        .workflow-test-active > div {
          border-color: rgb(59 130 246);
          box-shadow:
            0 0 0 2px rgba(59, 130, 246, 0.2),
            0 0 24px rgba(59, 130, 246, 0.35);
        }

        .react-flow__edge-path {
          stroke-width: 2;
        }

        .react-flow__edge.animated path {
          stroke-dasharray: 8;
          animation: workflow-edge-flow 1s linear infinite;
        }

        @keyframes workflow-edge-flow {
          from {
            stroke-dashoffset: 16;
          }

          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   PROVIDER
========================================================= */

export function WorkflowBuilder(
  props: WorkflowBuilderProps,
) {
  return (
    <ReactFlowProvider>
      <BuilderInner
        {...props}
      />
    </ReactFlowProvider>
  );
}