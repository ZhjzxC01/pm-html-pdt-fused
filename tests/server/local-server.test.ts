import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createRenderableState } from "../support/renderable-state.js";
import { saveProjectState } from "../../src/state/project-state-manager.js";
import { startLocalServer } from "../../src/server/local-server.js";

describe("V1.3 本地 Web UI server", () => {
  it("提供项目、input、artifact、proposal 和 apply API", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-web-"));
    const outputDir = path.join(dir, "output");
    const server = await startLocalServer({ projectRoot: dir, port: 0 });
    const baseUrl = new URL("/", server.url).toString();
    try {
      await saveProjectState(path.join(dir, "project-state.json"), createRenderableState());
      await writeFile(path.join(dir, "input.md"), "费用报销审批", "utf8");
      await mkdir(outputDir, { recursive: true });
      await writeFile(path.join(outputDir, "index.html"), "<html><body>ok</body></html>", "utf8");

      const project = await getJson(`${baseUrl}api/project?root=${encodeURIComponent(dir)}`);
      expect(project.ok).toBe(true);
      expect(project.project.exists).toBe(true);

      const inputBefore = await getJson(`${baseUrl}api/input?root=${encodeURIComponent(dir)}`);
      expect(inputBefore.content).toContain("费用报销");

      const inputWrite = await fetch(`${baseUrl}api/input`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ root: dir, content: "合同审批" })
      });
      expect(inputWrite.ok).toBe(true);
      expect(await readFile(path.join(dir, "input.md"), "utf8")).toBe("合同审批");

      const artifact = await fetch(
        `${baseUrl}api/artifact?root=${encodeURIComponent(dir)}&file=index.html`
      );
      expect(await artifact.text()).toContain("ok");

      const rejected = await fetch(
        `${baseUrl}api/artifact?root=${encodeURIComponent(dir)}&file=../project-state.json`
      );
      expect(rejected.status).toBe(500);

      const beforeState = await readFile(path.join(dir, "project-state.json"), "utf8");
      const proposed = await postJson(`${baseUrl}api/propose`, {
        root: dir,
        instruction: "将“提交审批”改为“提交报销审批”"
      });
      expect(proposed.ok).toBe(true);
      expect(await readFile(path.join(dir, "project-state.json"), "utf8")).toBe(beforeState);

      const applied = await postJson(`${baseUrl}api/apply-proposal`, { root: dir });
      expect(applied.ok).toBe(true);
    } finally {
      server.server.close();
      await rm(dir, { recursive: true, force: true });
    }
  }, 15_000);

  it("静态首页可访问", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-web-static-"));
    const server = await startLocalServer({ projectRoot: dir, port: 0 });
    try {
      const response = await fetch(server.url);
      expect(response.ok).toBe(true);
      expect(await response.text()).toContain("PM HTML Skill");
    } finally {
      server.server.close();
      await rm(dir, { recursive: true, force: true });
    }
  });
});

async function getJson(url: string): Promise<any> {
  const response = await fetch(url);
  return response.json();
}

async function postJson(url: string, body: unknown): Promise<any> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return response.json();
}
