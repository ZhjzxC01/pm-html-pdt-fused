import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyPatchEnvelope } from "../state/patch-manager.js";
import { loadProjectState, saveProjectState } from "../state/project-state-manager.js";
import type { FileArtifactType, PatchEnvelope, ProjectState, RenderOutcome, RenderResult, ValidationIssue } from "../types/index.js";
import { renderConsistencyReport } from "../renderers/consistency-report-renderer.js";
import { renderFlowMermaid } from "../renderers/flow-mermaid-renderer.js";
import { renderGherkinFeature } from "../renderers/gherkin-renderer.js";
import { renderHtmlFile } from "../renderers/html-file-renderer.js";
import { renderPrdMarkdown } from "../renderers/prd-markdown-renderer.js";
import { renderPrototypeAnnotationJson } from "../renderers/prototype-annotation-json-renderer.js";
import { renderPrototypeMetaJson } from "../renderers/prototype-meta-json-renderer.js";
import { renderPrototypeReviewHtml } from "../renderers/prototype-review-html-renderer.js";
import { renderPrototypeSpecJson } from "../renderers/prototype-spec-json-renderer.js";
import { renderTestCaseMarkdown } from "../renderers/test-case-markdown-renderer.js";

export type RenderTarget = "all" | FileArtifactType[];

export interface PreparedRender {
  runId: string;
  projectRoot: string;
  tempOutputDir: string;
  outputDir: string;
  results: RenderResult[];
  manifestPatchEnvelope: PatchEnvelope;
}

export type PrepareRenderOutcome = { ok: true; prepared: PreparedRender } | { ok: false; issues: ValidationIssue[] };

const renderers: Record<FileArtifactType, (state: ProjectState) => RenderOutcome> = {
  prototype_spec_json: renderPrototypeSpecJson,
  prototype_meta_json: renderPrototypeMetaJson,
  html_prototype: renderHtmlFile,
  prd_markdown: renderPrdMarkdown,
  prototype_annotation_json: renderPrototypeAnnotationJson,
  prototype_review_html: renderPrototypeReviewHtml,
  test_cases_markdown: renderTestCaseMarkdown,
  gherkin_feature: renderGherkinFeature,
  flow_mermaid: renderFlowMermaid,
  consistency_report: renderConsistencyReport
};

const allTargets = Object.keys(renderers) as FileArtifactType[];

export async function prepareRender(
  state: ProjectState,
  projectRoot: string,
  target: RenderTarget = "all",
  options: { runId?: string; now?: string } = {}
): Promise<PrepareRenderOutcome> {
  const targets = target === "all" ? allTargets : target;
  const issues: ValidationIssue[] = [];
  const results: RenderResult[] = [];

  for (const artifactType of targets) {
    const outcome = renderers[artifactType](state);
    if (outcome.ok) {
      results.push(outcome.result);
    } else {
      issues.push(...outcome.issues);
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const runId = options.runId ?? `run_${Date.now()}`;
  const outputDir = path.join(projectRoot, "output");
  const tempOutputDir = path.join(outputDir, `.tmp-${runId}`);
  await mkdir(tempOutputDir, { recursive: true });

  for (const result of results) {
    await writeFile(path.join(tempOutputDir, result.fileName), result.content, "utf8");
  }

  const now = options.now ?? new Date().toISOString();
  const manifestItems = { ...state.artifactManifest.items.byId };
  const manifestOrder = new Set(state.artifactManifest.items.order);

  for (const result of results) {
    const id = `artifact_${result.artifactType}`;
    manifestItems[id] = {
      id,
      artifactType: result.artifactType,
      fileName: result.fileName,
      relativePath: result.relativePath,
      sourceStateVersion: result.sourceStateVersion,
      sourceHash: result.sourceHash,
      contentHash: result.contentHash,
      rendererVersion: result.rendererVersion,
      schemaVersion: result.schemaVersion,
      generatedAt: now
    };
    manifestOrder.add(id);
  }

  return {
    ok: true,
    prepared: {
      runId,
      projectRoot,
      tempOutputDir,
      outputDir,
      results,
      manifestPatchEnvelope: {
        id: `patch_renderer_manifest_${runId}`,
        projectId: state.id,
        baseVersion: state.version,
        source: "renderer_manifest_sync",
        reason: "同步渲染产物清单",
        patches: [
          {
            op: "replace",
            path: "/artifactManifest",
            value: {
              items: {
                byId: manifestItems,
                order: Array.from(manifestOrder)
              }
            }
          }
        ],
        transaction: { atomic: true, mode: "all_or_nothing" },
        validationProfile: "render_manifest_sync"
      }
    }
  };
}

export async function commitRender(prepared: PreparedRender): Promise<void> {
  await mkdir(prepared.outputDir, { recursive: true });
  for (const result of prepared.results) {
    await rename(path.join(prepared.tempOutputDir, result.fileName), path.join(prepared.outputDir, result.fileName));
  }
  await rm(prepared.tempOutputDir, { recursive: true, force: true });
}

export async function renderAndCommit(
  state: ProjectState,
  projectRoot: string,
  target: RenderTarget = "all"
): Promise<{ ok: true; state: ProjectState } | { ok: false; issues: ValidationIssue[] }> {
  const prepared = await prepareRender(state, projectRoot, target);
  if (!prepared.ok) {
    return { ok: false, issues: prepared.issues };
  }

  const patched = applyPatchEnvelope(state, prepared.prepared.manifestPatchEnvelope);
  if (!patched.ok) {
    await rm(prepared.prepared.tempOutputDir, { recursive: true, force: true });
    return { ok: false, issues: patched.issues };
  }

  await commitRender(prepared.prepared);
  return { ok: true, state: patched.state };
}

export async function renderProjectFile(projectPath: string): Promise<{ ok: true } | { ok: false; issues: ValidationIssue[] }> {
  const state = await loadProjectState(projectPath);
  const projectRoot = path.dirname(projectPath);
  const result = await renderAndCommit(state, projectRoot, "all");
  if (!result.ok) {
    return result;
  }
  await saveProjectState(projectPath, result.state);
  return { ok: true };
}
