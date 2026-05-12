import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  annotateProject,
  applyProposal,
  checkProject,
  generateProject,
  getProjectSummary,
  proposeProject,
  readOutputArtifact,
  readProjectInput,
  renderProject,
  writeProjectInput
} from "./local-service.js";
import { readStaticAsset } from "./static-server.js";
import type { GenerateMode } from "../workflow/generation-pipeline.js";

export interface LocalServerOptions {
  host?: string;
  port?: number;
  projectRoot?: string;
}

export async function startLocalServer(options: LocalServerOptions = {}): Promise<{ server: http.Server; url: string }> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4173;
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web");
  const server = http.createServer((request, response) => {
    void handleRequest(request, response, { projectRoot, webRoot });
  });

  await new Promise<void>((resolve) => {
    server.listen(port, host, resolve);
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  return { server, url: `http://${host}:${actualPort}/?root=${encodeURIComponent(projectRoot)}` };
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  context: { projectRoot: string; webRoot: string }
): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url, context.projectRoot);
      return;
    }

    const asset = await readStaticAsset(context.webRoot, url.pathname);
    response.writeHead(200, { "content-type": asset.contentType });
    response.end(asset.content);
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

async function handleApi(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  defaultRoot: string
): Promise<void> {
  const root = url.searchParams.get("root") ?? defaultRoot;
  if (request.method === "GET" && url.pathname === "/api/project") {
    sendJson(response, 200, { ok: true, project: await getProjectSummary(root) });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/input") {
    sendJson(response, 200, { ok: true, ...(await readProjectInput(root)) });
    return;
  }
  if (request.method === "PUT" && url.pathname === "/api/input") {
    const body = await readJsonBody<{ root?: string; content?: string }>(request);
    sendJson(response, 200, { ok: true, ...(await writeProjectInput(body.root ?? root, body.content ?? "")) });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/generate") {
    const body = await readJsonBody<{ root?: string; mode?: string }>(request);
    const mode = body.mode ?? "llm";
    if (!isGenerateMode(mode)) {
      sendJson(response, 400, { ok: false, error: "mode 仅支持 rule、llm、auto" });
      return;
    }
    sendJson(response, 200, await generateProject(body.root ?? root, mode));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/render") {
    const body = await readJsonBody<{ root?: string }>(request);
    sendJson(response, 200, await renderProject(body.root ?? root));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/annotate") {
    const body = await readJsonBody<{ root?: string }>(request);
    sendJson(response, 200, await annotateProject(body.root ?? root));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/check") {
    const body = await readJsonBody<{ root?: string }>(request);
    sendJson(response, 200, await checkProject(body.root ?? root));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/propose") {
    const body = await readJsonBody<{ root?: string; instruction?: string }>(request);
    sendJson(response, 200, await proposeProject(body.root ?? root, body.instruction ?? ""));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/apply-proposal") {
    const body = await readJsonBody<{ root?: string; proposalPath?: string }>(request);
    sendJson(response, 200, await applyProposal(body.root ?? root, body.proposalPath));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/artifact") {
    const artifact = await readOutputArtifact(root, url.searchParams.get("file") ?? "");
    response.writeHead(200, { "content-type": artifact.contentType });
    response.end(artifact.content);
    return;
  }

  sendJson(response, 404, { ok: false, error: "接口不存在" });
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const content = Buffer.concat(chunks).toString("utf8");
  return content.trim() ? (JSON.parse(content) as T) : ({} as T);
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function isGenerateMode(value: string): value is GenerateMode {
  return value === "rule" || value === "llm" || value === "auto";
}
