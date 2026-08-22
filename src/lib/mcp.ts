/**
 * MCP (Model Context Protocol) support
 */

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export function listPlatformTools(): McpTool[] {
  return [
    {
      name: "create_project",
      description: "Create a new Silicon Valley Builder project from a prompt",
      inputSchema: { type: "object", properties: { prompt: { type: "string" }, name: { type: "string" } }, required: ["prompt"] },
    },
    {
      name: "generate_code",
      description: "Generate or update code files in a project",
      inputSchema: { type: "object", properties: { projectId: { type: "string" }, prompt: { type: "string" } }, required: ["projectId", "prompt"] },
    },
    {
      name: "run_seo_audit",
      description: "Run SEO & AI Search audit on a project",
      inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"] },
    },
  ];
}
