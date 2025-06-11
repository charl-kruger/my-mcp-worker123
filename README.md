# Remote MCP Server: User Timezone Tool

This Cloudflare Worker deploys a remote MCP server (authless) with a single tool: it returns the user's timezone based on their IP address when called from a remote MCP client.

## How it Works

- Implements an MCP-compliant server using the [`agents`](https://www.npmjs.com/package/agents) and [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) packages.
- Defines a single "get_timezone" tool: when invoked from an MCP client (e.g. [Claude Desktop](https://modelcontextprotocol.io/quickstart/user), or [AI Playground](https://playground.ai.cloudflare.com)), it attempts to infer the timezone of the user based on their IP address (from Cloudflare headers or forwarded headers).

## Fast Deploy

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-repo-here)

This will deploy your MCP server to a URL like: `user-timezone-mcp-server.<your-account>.workers.dev/sse`

## Usage (MCP Tool)

- Tool name: `get_timezone`
- No parameters required
- Returns the user's timezone as a text message

## Local Testing (Curl Example)

Try the health endpoint directly:

```bash
curl "https://user-timezone-mcp-server.<your-account>.workers.dev/timezone"
```
Response:
```json
{"timezone":"America/Los_Angeles","ip":"203.0.113.99"}
```
Where available, the endpoint will return your timezone and detected IP address. In development or local wrangler, IP-based detection may not function.

## Connect Using Claude Desktop or Playground

- Claude Desktop: Use the [mcp-remote](https://www.npmjs.com/package/mcp-remote) proxy, set your config for `/sse` endpoint.
- Playground: Add your `/sse` endpoint in the UI, click `get_timezone`.

## Security/Privacy Considerations

- Only the user's apparent public IP address (via standard headers) is used for time zone lookup.
- No data is retained or logged except for error logging (for diagnostics only).
- No authentication is enabled—this is a public MCP endpoint intended for experimentation and utility functions.

## Customize Tools

To add more tools or behaviors, edit the `init()` method of `src/index.ts` and register additional MCP tools to `this.server`.
