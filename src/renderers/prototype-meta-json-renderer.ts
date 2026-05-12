import type { ProjectState, RenderOutcome } from "../types/index.js";
import { renderMissingSource, renderOk } from "./renderer-utils.js";

export function renderPrototypeMetaJson(state: ProjectState): RenderOutcome {
  if (!state.prototypeMeta) {
    return renderMissingSource("missing_prototype_meta", "缺少 PrototypeMeta，无法渲染 prototype-meta.json。", "/prototypeMeta");
  }

  return renderOk(
    state,
    "prototype_meta_json",
    "prototype-meta.json",
    "output/prototype-meta.json",
    `${JSON.stringify(state.prototypeMeta, null, 2)}\n`,
    state.prototypeMeta
  );
}
