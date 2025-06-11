// src/index.ts
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Utility: safe extraction of IP address (from request headers, if available)
function getClientIp(request: Request): string | null {
  // Prefer standard headers like CF-Connecting-IP, X-Forwarded-For
  // Workers provides CF-Connecting-IP on production
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp;

  // Try X-Forwarded-For
  const xff = request.headers.get("X-Forwarded-For");
  if (xff) return xff.split(",")[0].trim();

  return null; // Unknown
}

// Utility: call a free geoip Web API
async function lookupTimezoneByIp(ip: string): Promise<string | null> {
  try {
    // Use ip-api.com (has a Cloudflare-friendly free endpoint)
    const resp = await fetch(`https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,timezone`);
    const data = await resp.json<any>();
    if (data?.status === "success" && typeof data.timezone === "string") {
      return data.timezone;
    }
    return null;
  } catch (error) {
    console.error("GeoIP lookup failed", error);
    return null;
  }
}

// Main MCP Agent
export class MyMCP extends McpAgent {
  server = new McpServer({
    name: "Timezone Finder",
    version: "1.0.0"
  });

  async init() {
    this.server.tool(
      "get_timezone", // Tool name for MCP clients
      {
        // no input parameters
      },
      async (_params, context) => {
        // Try to access the request from context (for remote MCP connections)
        let ip: string | null = null;

        // 'context.request' is only available in HTTP transport (MCP supports local/stdio too)
        //@ts-ignore
        const req: Request | undefined = context?.request as Request | undefined;
        if (req) {
          ip = getClientIp(req);
        }

        // If no IP in request, client likely not remote or header missing
        if (!ip) {
          return {
            content: [
              {
                type: "text",
                text: "Cannot determine IP (only available in HTTP/SSE remote calls), timezone: unknown"
              }
            ]
          };
        }

        // Lookup timezone
        const tz = await lookupTimezoneByIp(ip);
        if (tz) {
          return {
            content: [
              {
                type: "text",
                text: `Your timezone is: ${tz}`
              }
            ]
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "Could not determine timezone for your IP address."
              }
            ]
          };
        }
      }
    );
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Support both SSE and Streamable HTTP transports for MCP
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
    }
    if (url.pathname === "/mcp") {
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Health or demo endpoint
    if (url.pathname === "/timezone") {
      const ip = getClientIp(request);
      return lookupTimezoneByIp(ip || "").then(tz =>
        Response.json({ timezone: tz ?? null, ip: ip ?? null })
      );
    }

    return new Response("Not found", { status: 404 });
  }
};
