import * as cheerio from "cheerio";
import type { ProjectState, RenderOutcome } from "../types/index.js";
import { htmlEscape } from "../utils/html-escape.js";
import { renderMissingSource, renderOk } from "./renderer-utils.js";

export function renderPrototypeReviewHtml(state: ProjectState): RenderOutcome {
  const { htmlPrototype, prototypeAnnotationSpec, prdSpec, testCaseSpec, prototypeSpec } = state;
  if (!htmlPrototype || !prototypeAnnotationSpec || !prdSpec || !testCaseSpec || !prototypeSpec) {
    return renderMissingSource("missing_review_sources", "缺少评审原型渲染所需的结构化数据。", "/prototypeAnnotationSpec");
  }

  const file = htmlPrototype.files.order.map((id) => htmlPrototype.files.byId[id]).find((item) => item?.type === "html");
  if (!file) {
    return renderMissingSource("missing_html_file", "HTML 原型结构中缺少 HTML 文件。", "/htmlPrototype/files");
  }

  const $ = cheerio.load(file.content);
  const annotations = prototypeAnnotationSpec.annotations.order
    .map((id) => prototypeAnnotationSpec.annotations.byId[id])
    .filter((annotation) => annotation !== undefined);

  // Inject badges and tooltip containers
  for (const annotation of annotations) {
    const target = $(annotation.targetSelector).first();
    if (target.length === 0) {
      continue;
    }

    // Make target position relative for absolute badge placement
    const currentPos = target.css("position");
    if (!currentPos || currentPos === "static") {
      target.css("position", "relative");
    }

    target.attr("data-annotation-id", annotation.id);
    target.attr("data-prd-section-ids", annotation.prdSectionIds.join(","));

    // Build tooltip HTML sections
    const tooltipSectionsHtml = annotation.tooltipSections
      .map((section) => {
        const bodyHtml = markdownToHtml(section.markdownContent);
        return `<div class="prd-tooltip-section"><h4 class="prd-tooltip-section-heading">${htmlEscape(section.heading)}</h4><div class="prd-tooltip-section-body">${bodyHtml}</div></div>`;
      })
      .join("\n");

    // Badge element (positioned at top-right of target module)
    const badge = `<span class="prd-annotation-badge" data-annotation-badge="${htmlEscape(annotation.id)}">${annotation.annotationNumber}</span>`;

    // Tooltip container (initially hidden, shown on hover)
    const tooltip = `<div class="prd-tooltip" data-tooltip-for="${htmlEscape(annotation.id)}" style="display:none;">
  <div class="prd-tooltip-header">
    <span class="prd-tooltip-number">${annotation.annotationNumber}</span>
    <span class="prd-tooltip-title">需求描述：${htmlEscape(annotation.title)}</span>
    <button type="button" class="prd-tooltip-close" data-tooltip-close="${htmlEscape(annotation.id)}">&times;</button>
  </div>
  <div class="prd-tooltip-divider"></div>
  <div class="prd-tooltip-body">${tooltipSectionsHtml}</div>
</div>`;

    // Insert badge at the beginning of target module
    target.prepend(badge);
    // Append tooltip to body (avoids overflow:hidden issues)
    $("body").append(tooltip);
  }

  const style = buildStyles();
  const script = buildScript();
  $("head").append(style);
  $("body").append(script);
  const content = $.html();

  return renderOk(
    state,
    "prototype_review_html",
    "prototype-review.html",
    "output/prototype-review.html",
    content,
    {
      htmlPrototype: state.htmlPrototype,
      prototypeAnnotationSpec: state.prototypeAnnotationSpec,
      prdSpec: state.prdSpec,
      testCaseSpec: state.testCaseSpec,
      prototypeSpec: state.prototypeSpec
    }
  );
}

function buildStyles(): string {
  return `<style>
/* === Badge === */
.prd-annotation-badge {
  position: absolute;
  top: -8px;
  right: -4px;
  display: inline-block;
  background: rgb(250, 173, 20);
  color: #fff;
  font-size: 10px;
  font-weight: bold;
  line-height: 14px;
  padding: 0 4px;
  border-radius: 2px;
  cursor: pointer;
  z-index: 100;
  user-select: none;
}
.prd-annotation-badge:hover {
  background: rgb(230, 155, 10);
}

/* === Tooltip === */
.prd-tooltip {
  position: fixed;
  width: 450px;
  max-height: 80vh;
  overflow-y: auto;
  background: #f0efef;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  z-index: 9999;
  font-family: Arial, "Microsoft YaHei", sans-serif;
  font-size: 13px;
  color: #1f2937;
}

.prd-tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
}

.prd-tooltip-number {
  display: inline-block;
  background: rgb(250, 173, 20);
  color: #fff;
  font-size: 10px;
  font-weight: bold;
  line-height: 14px;
  padding: 0 4px;
  border-radius: 2px;
  min-width: 18px;
  text-align: center;
}

.prd-tooltip-title {
  flex: 1;
  font-weight: bold;
  font-size: 14px;
}

.prd-tooltip-close {
  background: none;
  border: none;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  color: #6b7280;
  padding: 0 4px;
}
.prd-tooltip-close:hover {
  color: #1f2937;
}

.prd-tooltip-divider {
  height: 1px;
  background: #d1d5db;
  margin: 0 14px;
}

.prd-tooltip-body {
  padding: 12px 14px;
}

.prd-tooltip-section {
  margin-bottom: 12px;
}
.prd-tooltip-section:last-child {
  margin-bottom: 0;
}

.prd-tooltip-section-heading {
  font-size: 12px;
  font-weight: bold;
  color: #6b7280;
  margin: 0 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.prd-tooltip-section-body {
  line-height: 1.6;
}
.prd-tooltip-section-body p {
  margin: 0 0 8px;
}
.prd-tooltip-section-body p:last-child {
  margin-bottom: 0;
}
.prd-tooltip-section-body ul,
.prd-tooltip-section-body ol {
  margin: 0 0 8px;
  padding-left: 20px;
}
.prd-tooltip-section-body li {
  margin-bottom: 4px;
}
.prd-tooltip-section-body strong {
  font-weight: bold;
}
.prd-tooltip-section-body em {
  font-style: italic;
}
.prd-tooltip-section-body blockquote {
  margin: 8px 0;
  padding: 6px 12px;
  border-left: 3px solid #d1d5db;
  background: #e5e7eb;
  color: #4b5563;
}

/* Status dots */
.prd-status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
.prd-status-dot-green { background: #22c55e; }
.prd-status-dot-red { background: #ef4444; }
.prd-status-dot-yellow { background: #eab308; }
.prd-status-dot-blue { background: #3b82f6; }

/* Toggle visibility */
.prd-annotations-hidden .prd-annotation-badge {
  display: none !important;
}
</style>`;
}

function buildScript(): string {
  return `<script>
(function() {
  // --- Hover to show tooltip ---
  document.querySelectorAll('[data-annotation-badge]').forEach(function(badge) {
    var annotationId = badge.getAttribute('data-annotation-badge');
    var tooltip = document.querySelector('[data-tooltip-for="' + annotationId + '"]');
    if (!tooltip) return;

    badge.addEventListener('mouseenter', function() {
      // Show tooltip on hover (multiple different tooltips can be open simultaneously)
      tooltip.style.display = 'block';
      positionTooltip(tooltip, badge);
    });
  });

  // --- Close button (ONLY way to close a tooltip) ---
  document.querySelectorAll('[data-tooltip-close]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var annotationId = btn.getAttribute('data-tooltip-close');
      var tooltip = document.querySelector('[data-tooltip-for="' + annotationId + '"]');
      if (tooltip) tooltip.style.display = 'none';
    });
  });

  // --- Event isolation on tooltip click/drag ---
  document.querySelectorAll('.prd-tooltip').forEach(function(tooltip) {
    tooltip.addEventListener('mousedown', function(e) {
      e.stopPropagation();
    });
    tooltip.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  });

  // --- Drag to move (via header area) ---
  document.querySelectorAll('.prd-tooltip').forEach(function(tooltip) {
    var isDragging = false;
    var startX, startY, startLeft, startTop;

    var header = tooltip.querySelector('.prd-tooltip-header');
    if (!header) return;
    header.style.cursor = 'move';

    header.addEventListener('mousedown', function(e) {
      if (e.target.closest('.prd-tooltip-close')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      var rect = tooltip.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      tooltip.style.left = startLeft + 'px';
      tooltip.style.top = startTop + 'px';
      tooltip.style.right = 'auto';
      tooltip.style.bottom = 'auto';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      tooltip.style.left = (startLeft + dx) + 'px';
      tooltip.style.top = (startTop + dy) + 'px';
    });

    document.addEventListener('mouseup', function() {
      isDragging = false;
    });
  });

  // --- Position tooltip near badge with smart boundary detection ---
  function positionTooltip(tooltip, badge) {
    var badgeRect = badge.getBoundingClientRect();
    var tooltipWidth = 450;
    var tooltipHeight = tooltip.offsetHeight || 300;
    var gap = 8;

    // Default: left-bottom of badge
    var left = badgeRect.left - tooltipWidth - gap;
    var top = badgeRect.bottom + gap;

    // If too far left, show right of badge
    if (left < 8) {
      left = badgeRect.right + gap;
    }
    // If still too far right (tooltip goes off right edge)
    if (left + tooltipWidth > window.innerWidth - 8) {
      left = window.innerWidth - tooltipWidth - 8;
    }
    // If too far down, show above badge
    if (top + tooltipHeight > window.innerHeight - 8) {
      top = badgeRect.top - tooltipHeight - gap;
    }
    // If too far up
    if (top < 8) {
      top = 8;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.style.right = 'auto';
    tooltip.style.bottom = 'auto';
  }
})();
</script>`;
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const parts: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let listType: "ul" | "ol" = "ul";

  function closeList() {
    if (inList && listItems.length > 0) {
      parts.push(`<${listType}>${listItems.join("")}</${listType}>`);
      listItems = [];
      inList = false;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        closeList();
        inList = true;
        listType = "ul";
      }
      listItems.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        closeList();
        inList = true;
        listType = "ol";
      }
      listItems.push(`<li>${inlineFormat(olMatch[1])}</li>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      closeList();
      const content = trimmed.replace(/^>\s*/, "");
      parts.push(`<blockquote>${inlineFormat(content)}</blockquote>`);
      continue;
    }

    // Regular paragraph
    closeList();
    parts.push(`<p>${inlineFormat(trimmed)}</p>`);
  }

  closeList();
  return parts.join("\n");
}

function inlineFormat(text: string): string {
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic: *text*
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Status dots: ⚫🟢🔴🟡🔵
  text = text.replace(/🟢/g, '<span class="prd-status-dot prd-status-dot-green"></span>');
  text = text.replace(/🔴/g, '<span class="prd-status-dot prd-status-dot-red"></span>');
  text = text.replace(/🟡/g, '<span class="prd-status-dot prd-status-dot-yellow"></span>');
  text = text.replace(/🔵/g, '<span class="prd-status-dot prd-status-dot-blue"></span>');
  return text;
}
