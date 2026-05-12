import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ReviewMode = "none" | "review" | "strict";

export interface ProjectConfig {
  reviewMode: ReviewMode;
}

const VALID_MODES: ReviewMode[] = ["none", "review", "strict"];

export function createDefaultConfig(): ProjectConfig {
  return { reviewMode: "none" };
}

export function isValidReviewMode(value: string): value is ReviewMode {
  return VALID_MODES.includes(value as ReviewMode);
}

export function resolveConfigPath(projectDir: string): string {
  return path.join(projectDir, "project-config.json");
}

export async function loadProjectConfig(projectDir: string): Promise<ProjectConfig> {
  const configPath = resolveConfigPath(projectDir);
  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    if (isValidReviewMode(parsed.reviewMode)) {
      return { reviewMode: parsed.reviewMode };
    }
    return createDefaultConfig();
  } catch {
    return createDefaultConfig();
  }
}

export async function saveProjectConfig(projectDir: string, config: ProjectConfig): Promise<void> {
  const configPath = resolveConfigPath(projectDir);
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
