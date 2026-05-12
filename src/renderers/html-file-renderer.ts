import type { ProjectState, RenderOutcome } from "../types/index.js";
import { renderMissingSource, renderOk } from "./renderer-utils.js";

export function renderHtmlFile(state: ProjectState): RenderOutcome {
  const htmlPrototype = state.htmlPrototype;
  if (!htmlPrototype) {
    return renderMissingSource("missing_html_prototype", "缺少 HTML 原型结构，无法渲染 index.html。", "/htmlPrototype");
  }

  const file = htmlPrototype.files.order.map((id) => htmlPrototype.files.byId[id]).find((item) => item?.type === "html");
  if (!file) {
    return renderMissingSource("missing_html_file", "HTML 原型结构中缺少 HTML 文件。", "/htmlPrototype/files");
  }

  return renderOk(state, "html_prototype", "index.html", "output/index.html", file.content, htmlPrototype);
}
