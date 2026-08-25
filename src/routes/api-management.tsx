import { createFileRoute } from "@tanstack/react-router";
import { ApiManagementPage } from "@/components/api-management";

export const Route = createFileRoute("/api-management")({
  head: () => ({
    meta: [
      {
        title: "API Management — OmniAgent Control",
      },
      {
        name: "description",
        content: "Manage LLM API keys, providers, and usage monitoring.",
      },
      {
        property: "og:title",
        content: "API Management — OmniAgent Control",
      },
      {
        property: "og:description",
        content: "Manage LLM API keys, providers, and usage monitoring.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
    ],
  }),
  component: ApiManagementPage,
});