import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyPatchProposalFile } from "../nl-edit/patch-proposal-applier.js";
import { proposeProjectEdit } from "../nl-edit/propose-pipeline.js";
import { loadProjectState, projectStatePath } from "../state/project-state-manager.js";
import type { ValidationIssue } from "../types/index.js";
import { annotateProjectFile } from "../workflow/annotation-pipeline.js";
import { checkProjectFile } from "../workflow/check-pipeline.js";
import { generateFromInput, type GenerateMode } from "../workflow/generation-pipeline.js";
import { renderProjectFile } from "../workflow/render-pipeline.js";

export interface ProjectSummary {
  root: string;
  projectPath: string;
  inputPath: string;
  exists: boolean;
  name?: string;
  version?: number;
  updatedAt?: string;
  dirtyArtifacts: string[];
  lastStructuredGeneratedAt?: Record<string, string>;
  recentChanges: Array<{ id: string; source: string; reason: string; createdAt: string }>;
}

export function resolveProjectRoot(root: string): string {
  return path.resolve(root);
}

export function resolveProjectPath(root: string): string {
  return projectStatePath(resolveProjectRoot(root));
}

export function resolveInputPath(root: string): string {
  return path.join(resolveProjectRoot(root), "input.md");
}

export async function getProjectSummary(root: string): Promise<ProjectSummary> {
  const projectRoot = resolveProjectRoot(root);
  const projectPath = resolveProjectPath(projectRoot);
  const inputPath = resolveInputPath(projectRoot);
  try {
    const state = await loadProjectState(projectPath);
    return {
      root: projectRoot,
      projectPath,
      inputPath,
      exists: true,
      name: state.name,
      version: state.version,
      updatedAt: state.updatedAt,
      dirtyArtifacts: state.dirtyArtifacts,
      lastStructuredGeneratedAt: state.lastStructuredGeneratedAt,
      recentChanges: state.changeLog.slice(-5).map((change) => ({
        id: change.id,
        source: change.source,
        reason: change.reason,
        createdAt: change.createdAt
      }))
    };
  } catch {
    return {
      root: projectRoot,
      projectPath,
      inputPath,
      exists: false,
      dirtyArtifacts: [],
      recentChanges: []
    };
  }
}

export async function readProjectInput(root: string): Promise<{ inputPath: string; content: string }> {
  const inputPath = resolveInputPath(root);
  try {
    return { inputPath, content: await readFile(inputPath, "utf8") };
  } catch {
    return { inputPath, content: "" };
  }
}

export async function writeProjectInput(root: string, content: string): Promise<{ inputPath: string }> {
  const inputPath = resolveInputPath(root);
  await mkdir(path.dirname(inputPath), { recursive: true });
  await writeFile(inputPath, content, "utf8");
  return { inputPath };
}

export async function generateProject(root: string, mode: GenerateMode): Promise<{ ok: true; warnings: ValidationIssue[] } | { ok: false; issues: ValidationIssue[] }> {
  return generateFromInput(resolveInputPath(root), { mode });
}

export async function renderProject(root: string): Promise<{ ok: true } | { ok: false; issues: ValidationIssue[] }> {
  return renderProjectFile(resolveProjectPath(root));
}

export async function annotateProject(root: string): Promise<{ ok: true } | { ok: false; issues: ValidationIssue[] }> {
  return annotateProjectFile(resolveProjectPath(root));
}

export async function checkProject(root: string): Promise<{ ok: true } | { ok: false; issues: ValidationIssue[] }> {
  return checkProjectFile(resolveProjectPath(root));
}

export async function proposeProject(root: string, instruction: string) {
  return proposeProjectEdit(resolveProjectPath(root), instruction);
}

export async function applyProposal(root: string, proposalPath?: string) {
  const projectRoot = resolveProjectRoot(root);
  return applyPatchProposalFile(resolveProjectPath(projectRoot), proposalPath ?? path.join(projectRoot, "output", "patch-proposal.json"));
}

const artifactAllowList = new Set([
  "index.html",
  "prototype-review.html",
  "prd.md",
  "test-cases.md",
  "gherkin.feature",
  "flow.mermaid",
  "consistency-report.md",
  "patch-proposal.json"
]);

export async function readOutputArtifact(root: string, file: string): Promise<{ path: string; content: string; contentType: string }> {
  if (!artifactAllowList.has(file)) {
    throw new Error(`不允许读取该产物：${file}`);
  }

  const projectRoot = resolveProjectRoot(root);
  const outputPath = path.join(projectRoot, "output", file);
  const relative = path.relative(path.join(projectRoot, "output"), outputPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("不允许读取项目 output 目录外的文件。");
  }

  return {
    path: outputPath,
    content: await readFile(outputPath, "utf8"),
    contentType: contentTypeFor(file)
  };
}

function contentTypeFor(file: string): string {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".md") || file.endsWith(".mermaid") || file.endsWith(".feature")) return "text/plain; charset=utf-8";
  return "text/plain; charset=utf-8";
}
