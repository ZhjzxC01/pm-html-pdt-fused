import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareRender, renderAndCommit } from "../../src/workflow/render-pipeline.js";
import { createRenderableState } from "../support/renderable-state.js";

describe("渲染流水线", () => {
  it("渲染全部文件并通过 PatchEnvelope 更新产物清单", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-render-"));
    try {
      const state = createRenderableState();
      const result = await renderAndCommit(state, dir, "all");

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.state.artifactManifest.items.order).toContain("artifact_html_prototype");
      expect(result.state.changeLog.at(-1)?.source).toBe("renderer_manifest_sync");

      const indexHtml = await readFile(path.join(dir, "output", "index.html"), "utf8");
      const prd = await readFile(path.join(dir, "output", "prd.md"), "utf8");
      const review = await readFile(path.join(dir, "output", "prototype-review.html"), "utf8");

      expect(indexHtml).toContain("费用报销");
      expect(prd).toContain("费用报销审批 PRD");
      expect(review).toContain("prd-tooltip");
      expect(review).toContain("data-annotation-id");
      expect(review).toContain("data-prd-section-ids");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("缺少必需源切片时失败且不创建输出", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-render-"));
    try {
      const state = createRenderableState();
      state.prdSpec = null;

      const result = await renderAndCommit(state, dir, "all");

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.issues.some((issue) => issue.code === "missing_prd_sources")).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("提交前先把渲染结果写入临时目录", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "pm-html-render-"));
    try {
      const state = createRenderableState();
      const prepared = await prepareRender(state, dir, ["html_prototype"], { runId: "test_run" });

      expect(prepared.ok).toBe(true);
      if (!prepared.ok) return;

      const tempHtml = await readFile(path.join(dir, "output", ".tmp-test_run", "index.html"), "utf8");
      expect(tempHtml).toContain("费用报销");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
