import type { ValidationIssue } from "../types/index.js";

export type StructuredParseResult<T> = { ok: true; value: T } | { ok: false; issues: ValidationIssue[] };

export function parseStructuredOutput<T = unknown>(content: string): StructuredParseResult<T> {
  try {
    return { ok: true, value: JSON.parse(content) as T };
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          id: "issue_llm_invalid_json",
          severity: "error",
          code: "llm_invalid_json",
          message: `LLM 输出不是合法 JSON：${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}
