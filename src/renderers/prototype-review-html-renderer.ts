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

  // Build related annotation lookup map
  const relatedLookup: Record<string, { number: number; title: string }[]> = {};
  for (const a of annotations) {
    if (a.relatedAnnotationIds && a.relatedAnnotationIds.length > 0) {
      relatedLookup[a.id] = a.relatedAnnotationIds
        .map((rid) => {
          const found = annotations.find((x) => x.id === rid);
          return found ? { number: found.annotationNumber, title: found.title } : null;
        })
        .filter(Boolean) as { number: number; title: string }[];
    }
  }

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

    // Build related annotations HTML
    const related = relatedLookup[annotation.id] || [];
    const relatedHtml = related.length > 0
      ? `<div class="prd-tooltip-related"><span class="prd-tooltip-related-label">相关需求：</span>${related.map((r) => `<a class="prd-tooltip-related-link" data-goto-annotation="${htmlEscape(annotations.find((x) => x.annotationNumber === r.number)?.id || "")}">${r.number} ${htmlEscape(r.title)}</a>`).join("、")}</div>`
      : "";

    // Badge element (positioned at top-right of target module)
    const levelClass = annotation.annotationLevel ? ` level-${annotation.annotationLevel}` : " level-module";
    const badge = `<span class="prd-annotation-badge${levelClass}" data-annotation-badge="${htmlEscape(annotation.id)}">${annotation.annotationNumber}</span>`;

    // Tooltip container (initially hidden, shown on hover)
    const tooltip = `<div class="prd-tooltip" data-tooltip-for="${htmlEscape(annotation.id)}" style="display:none;">
  <div class="prd-tooltip-header">
    <span class="prd-tooltip-number">${annotation.annotationNumber}</span>
    <span class="prd-tooltip-title">需求描述：${htmlEscape(annotation.title)}</span>
    <button type="button" class="prd-tooltip-close" data-tooltip-close="${htmlEscape(annotation.id)}">&times;</button>
  </div>
  <div class="prd-tooltip-divider"></div>
  <div class="prd-tooltip-body">${tooltipSectionsHtml}${relatedHtml}</div>
</div>`;

    // Insert badge at the beginning of target module
    target.prepend(badge);
    // Append tooltip to body (avoids overflow:hidden issues)
    $("body").append(tooltip);
  }

  // Build sidebar items from annotations
  const sidebarItems = annotations
    .map((a) => {
      const levelClass = a.annotationLevel ? ` level-${a.annotationLevel}` : " level-module";
      const level = a.annotationLevel || "module";
      const activatePathAttr = a.activatePath
        ? ` data-activate-path='${htmlEscape(JSON.stringify(a.activatePath))}'`
        : "";
      return `<div class="prd-sidebar-item" data-annotation-id="${htmlEscape(a.id)}" data-badge-id="${htmlEscape(a.id)}" data-level="${level}"${activatePathAttr}>
    <span class="prd-sidebar-number${levelClass}">${a.annotationNumber}</span>
    <div>
      <div class="prd-sidebar-title">${htmlEscape(a.title)}</div>
      <div class="prd-sidebar-desc">${htmlEscape(a.targetDescription)}</div>
    </div>
  </div>`;
    })
    .join("\n");

  const sidebar = `<aside class="prd-sidebar" id="prd-sidebar">
  <div class="prd-sidebar-header">
    <span class="prd-sidebar-header-title">需求列表</span>
  </div>
  <div class="prd-sidebar-filters">
    <input type="text" class="prd-sidebar-search" id="prd-sidebar-search" placeholder="搜索需求..." />
    <div class="prd-sidebar-level-chips">
      <span class="prd-chip active" data-level="all">全部</span>
      <span class="prd-chip" data-level="page">页面</span>
      <span class="prd-chip" data-level="module">模块</span>
      <span class="prd-chip" data-level="component">组件</span>
      <span class="prd-chip" data-level="action">操作</span>
    </div>
  </div>
  <div class="prd-sidebar-list">${sidebarItems}</div>
</aside>
<button class="prd-sidebar-toggle-btn" id="prd-sidebar-toggle" title="收起/展开需求列表">◀</button>`;

  const style = buildStyles();
  const script = buildScript(annotations.map((a) => ({ id: a.id, annotationNumber: a.annotationNumber, title: a.title, activatePath: a.activatePath })));
  $("head").append(style);
  $("body").append(sidebar);
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
  background: #3b82f6;
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
.prd-annotation-badge.level-page { background: rgb(250, 173, 20); }
.prd-annotation-badge.level-module { background: #3b82f6; }
.prd-annotation-badge.level-component { background: #22c55e; }
.prd-annotation-badge.level-action { background: #6b7280; }
.prd-annotation-badge.level-page:hover { background: rgb(230, 155, 10); }
.prd-annotation-badge.level-module:hover { background: #2563eb; }
.prd-annotation-badge.level-component:hover { background: #16a34a; }
.prd-annotation-badge.level-action:hover { background: #4b5563; }

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
  cursor: pointer;
  user-select: none;
}
.prd-tooltip-section-heading::before {
  content: "\\25BC ";
  font-size: 9px;
}
.prd-tooltip-section.collapsed .prd-tooltip-section-body { display: none; }
.prd-tooltip-section.collapsed .prd-tooltip-section-heading::before { content: "\\25B6 "; }

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

/* === Badge active highlight === */
.prd-badge-active {
  background: #ef4444 !important;
  transform: scale(1.3);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
  transition: all 0.3s ease;
}

/* === Sidebar === */
.prd-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 340px;
  background: #fff;
  border-left: 1px solid #e5e7eb;
  box-shadow: -2px 0 8px rgba(0,0,0,0.08);
  z-index: 9998;
  display: flex;
  flex-direction: column;
  font-family: Arial, "Microsoft YaHei", sans-serif;
  font-size: 13px;
  transition: transform 0.3s ease;
}
.prd-sidebar.collapsed {
  transform: translateX(100%);
}
.prd-sidebar.collapsed + .prd-sidebar-toggle-btn {
  right: 0;
}
.prd-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-shrink: 0;
}
.prd-sidebar-header-title {
  font-weight: bold;
  font-size: 14px;
  color: #1f2937;
}
.prd-sidebar-toggle-btn {
  position: fixed;
  top: 12px;
  right: 340px;
  width: 28px;
  height: 28px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px 0 0 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #6b7280;
  z-index: 9999;
  transition: right 0.3s ease;
}
.prd-sidebar.collapsed ~ .prd-sidebar-toggle-btn {
  right: 0;
}
.prd-sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.prd-sidebar-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.15s;
  border-left: 3px solid transparent;
}
.prd-sidebar-item:hover {
  background: #f3f4f6;
}
.prd-sidebar-item.active {
  background: #eff6ff;
  border-left-color: #3b82f6;
}
.prd-sidebar-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 4px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
  color: #fff;
  flex-shrink: 0;
  margin-top: 1px;
}
.prd-sidebar-number.level-page { background: rgb(250, 173, 20); }
.prd-sidebar-number.level-module { background: #3b82f6; }
.prd-sidebar-number.level-component { background: #22c55e; }
.prd-sidebar-number.level-action { background: #6b7280; }
.prd-sidebar-title {
  flex: 1;
  line-height: 1.4;
  color: #374151;
}
.prd-sidebar-desc {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}

/* === Markdown table in tooltip === */
.prd-tooltip-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin: 8px 0;
}
.prd-tooltip-table th {
  background: #f5f5f5;
  padding: 6px 8px;
  text-align: left;
  border: 1px solid #e0e0e0;
  font-weight: 600;
}
.prd-tooltip-table td {
  padding: 6px 8px;
  border: 1px solid #e0e0e0;
}

/* === Related annotations === */
.prd-tooltip-related {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #6b7280;
}
.prd-tooltip-related-label { font-weight: 600; }
.prd-tooltip-related-link {
  color: #3b82f6;
  cursor: pointer;
  text-decoration: underline;
  margin-left: 4px;
}
.prd-tooltip-related-link:hover { color: #2563eb; }

/* === Sidebar search/filter === */
.prd-sidebar-filters {
  padding: 8px 14px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.prd-sidebar-search {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  font-family: Arial, "Microsoft YaHei", sans-serif;
  outline: none;
  box-sizing: border-box;
}
.prd-sidebar-search:focus { border-color: #3b82f6; }
.prd-sidebar-level-chips {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.prd-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  cursor: pointer;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  user-select: none;
}
.prd-chip:hover { background: #e5e7eb; }
.prd-chip.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
</style>`;
}

function buildScript(annotations: Array<{ id: string; annotationNumber: number; title: string; activatePath?: Array<{ action: string; selector: string; description?: string }> }>): string {
  const annotationData = JSON.stringify(
    annotations.map((a) => ({ id: a.id, number: a.annotationNumber, title: a.title, activatePath: a.activatePath || null }))
  );
  return `<script>
(function() {
  var annotationData = ${annotationData};
  var openTooltipStack = [];
  var sidebarItemIndex = -1;

  // --- Sidebar toggle ---
  var sidebar = document.getElementById('prd-sidebar');
  var toggleBtn = document.getElementById('prd-sidebar-toggle');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', function() {
      sidebar.classList.toggle('collapsed');
      toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
      toggleBtn.style.right = sidebar.classList.contains('collapsed') ? '0' : '340px';
    });
  }

  // --- executeActivatePath ---
  function executeActivatePath(steps, callback) {
    var i = 0;
    function nextStep() {
      if (i >= steps.length) { if (callback) callback(); return; }
      var step = steps[i++];
      var el = document.querySelector(step.selector);
      if (!el) { nextStep(); return; }
      if (step.action === 'click' || step.action === 'tab_switch') {
        el.click();
        setTimeout(nextStep, 300);
      } else if (step.action === 'scroll') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(nextStep, 300);
      } else {
        setTimeout(nextStep, 300);
      }
    }
    nextStep();
  }

  // --- navigateToAnnotation (shared by sidebar click, keyboard, related links) ---
  function navigateToAnnotation(annotationId) {
    var aData = annotationData.find(function(d) { return d.id === annotationId; });
    function doNavigate() {
      var badge = document.querySelector('[data-annotation-badge="' + annotationId + '"]');
      if (!badge) return;
      badge.scrollIntoView({ behavior: 'smooth', block: 'center' });
      badge.classList.add('prd-badge-active');
      setTimeout(function() { badge.classList.remove('prd-badge-active'); }, 3000);
      showTooltip(annotationId, badge);
    }
    if (aData && aData.activatePath && aData.activatePath.length > 0) {
      executeActivatePath(aData.activatePath, doNavigate);
    } else {
      doNavigate();
    }
  }

  // --- Sidebar item click ---
  document.querySelectorAll('.prd-sidebar-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var annotationId = item.getAttribute('data-annotation-id');
      document.querySelectorAll('.prd-sidebar-item.active').forEach(function(el) { el.classList.remove('active'); });
      item.classList.add('active');
      navigateToAnnotation(annotationId);
    });
  });

  // --- Badge hover to show tooltip ---
  document.querySelectorAll('[data-annotation-badge]').forEach(function(badge) {
    var annotationId = badge.getAttribute('data-annotation-badge');
    badge.addEventListener('mouseenter', function() {
      showTooltip(annotationId, badge);
    });
  });

  // --- showTooltip with z-index management ---
  function showTooltip(annotationId, badge) {
    var tooltip = document.querySelector('[data-tooltip-for="' + annotationId + '"]');
    if (!tooltip) return;
    tooltip.style.display = 'block';
    positionTooltip(tooltip, badge);
    // z-index: bring to front
    var existingIdx = openTooltipStack.indexOf(tooltip);
    if (existingIdx > -1) openTooltipStack.splice(existingIdx, 1);
    openTooltipStack.push(tooltip);
    openTooltipStack.forEach(function(t, i) { t.style.zIndex = 9999 + i; });
  }

  // --- Close button ---
  document.querySelectorAll('[data-tooltip-close]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var annotationId = btn.getAttribute('data-tooltip-close');
      var tooltip = document.querySelector('[data-tooltip-for="' + annotationId + '"]');
      if (tooltip) {
        tooltip.style.display = 'none';
        var idx = openTooltipStack.indexOf(tooltip);
        if (idx > -1) openTooltipStack.splice(idx, 1);
        openTooltipStack.forEach(function(t, i) { t.style.zIndex = 9999 + i; });
      }
    });
  });

  // --- Tooltip section collapse/expand ---
  document.querySelectorAll('.prd-tooltip-section-heading').forEach(function(heading) {
    heading.addEventListener('click', function(e) {
      e.stopPropagation();
      heading.parentElement.classList.toggle('collapsed');
    });
  });

  // --- Related annotation navigation ---
  document.querySelectorAll('.prd-tooltip-related-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.stopPropagation();
      var targetId = link.getAttribute('data-goto-annotation');
      if (targetId) navigateToAnnotation(targetId);
    });
  });

  // --- Event isolation on tooltip click/drag ---
  document.querySelectorAll('.prd-tooltip').forEach(function(tooltip) {
    tooltip.addEventListener('mousedown', function(e) { e.stopPropagation(); });
    tooltip.addEventListener('click', function(e) { e.stopPropagation(); });
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
      startX = e.clientX; startY = e.clientY;
      var rect = tooltip.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      tooltip.style.left = startLeft + 'px'; tooltip.style.top = startTop + 'px';
      tooltip.style.right = 'auto'; tooltip.style.bottom = 'auto';
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      tooltip.style.left = (startLeft + e.clientX - startX) + 'px';
      tooltip.style.top = (startTop + e.clientY - startY) + 'px';
    });
    document.addEventListener('mouseup', function() { isDragging = false; });
  });

  // --- Position tooltip near badge with smart boundary detection ---
  function positionTooltip(tooltip, badge) {
    var badgeRect = badge.getBoundingClientRect();
    var tooltipWidth = 450;
    var gap = 8;
    tooltip.style.left = '-9999px';
    tooltip.style.top = '0';
    tooltip.style.right = 'auto';
    tooltip.style.bottom = 'auto';
    var tooltipHeight = tooltip.scrollHeight || tooltip.offsetHeight || 300;

    var left = badgeRect.left - tooltipWidth - gap;
    var top = badgeRect.bottom + gap;
    var sidebarWidth = sidebar && !sidebar.classList.contains('collapsed') ? 348 : 0;

    if (left < 8) left = badgeRect.right + gap;
    if (left + tooltipWidth > window.innerWidth - sidebarWidth - 8)
      left = window.innerWidth - sidebarWidth - tooltipWidth - 8;
    if (left < 8) left = 8;
    if (top + tooltipHeight > window.innerHeight - 8)
      top = badgeRect.top - tooltipHeight - gap;
    if (top < 8) top = 8;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  // --- Sidebar search and level filter ---
  var searchInput = document.getElementById('prd-sidebar-search');
  var chips = document.querySelectorAll('.prd-chip');
  var activeLevel = 'all';
  function filterSidebarItems() {
    var query = searchInput ? searchInput.value.toLowerCase() : '';
    document.querySelectorAll('.prd-sidebar-item').forEach(function(item) {
      var title = (item.querySelector('.prd-sidebar-title') || {}).textContent || '';
      var desc = (item.querySelector('.prd-sidebar-desc') || {}).textContent || '';
      var level = item.getAttribute('data-level') || 'module';
      var matchesSearch = !query || title.toLowerCase().indexOf(query) > -1 || desc.toLowerCase().indexOf(query) > -1;
      var matchesLevel = activeLevel === 'all' || level === activeLevel;
      item.style.display = matchesSearch && matchesLevel ? '' : 'none';
    });
  }
  if (searchInput) searchInput.addEventListener('input', filterSidebarItems);
  chips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      chips.forEach(function(c) { c.classList.remove('active'); });
      chip.classList.add('active');
      activeLevel = chip.getAttribute('data-level') || 'all';
      filterSidebarItems();
    });
  });

  // --- Keyboard navigation ---
  document.addEventListener('keydown', function(e) {
    var items = Array.prototype.slice.call(document.querySelectorAll('.prd-sidebar-item'));
    var visibleItems = items.filter(function(it) { return it.style.display !== 'none'; });
    if (e.key === 'Escape') {
      document.querySelectorAll('.prd-tooltip').forEach(function(t) { t.style.display = 'none'; });
      openTooltipStack = [];
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (visibleItems.length === 0) return;
      var currentIdx = visibleItems.indexOf(document.querySelector('.prd-sidebar-item.active'));
      sidebarItemIndex = e.key === 'ArrowDown'
        ? Math.min(currentIdx + 1, visibleItems.length - 1)
        : Math.max(currentIdx - 1, 0);
      if (sidebarItemIndex < 0) sidebarItemIndex = 0;
      visibleItems.forEach(function(it) { it.classList.remove('active'); });
      visibleItems[sidebarItemIndex].classList.add('active');
      visibleItems[sidebarItemIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      var active = document.querySelector('.prd-sidebar-item.active');
      if (active) active.click();
    } else if (/^[1-9]$/.test(e.key)) {
      var num = parseInt(e.key);
      var match = annotationData.find(function(d) { return d.number === num; });
      if (match) navigateToAnnotation(match.id);
    }
  });
})();
</script>`;
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const parts: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let listType: "ul" | "ol" = "ul";
  let tableRows: string[] = [];
  let inTable = false;
  let tableHasHeader = false;

  function closeList() {
    if (inList && listItems.length > 0) {
      parts.push(`<${listType}>${listItems.join("")}</${listType}>`);
      listItems = [];
      inList = false;
    }
  }

  function closeTable() {
    if (inTable && tableRows.length > 0) {
      const headerRow = tableHasHeader ? tableRows[0] : "";
      const bodyRows = tableHasHeader ? tableRows.slice(1) : tableRows;
      const thead = tableHasHeader ? `<thead>${headerRow}</thead>` : "";
      parts.push(`<table class="prd-tooltip-table">${thead}<tbody>${bodyRows.join("")}</tbody></table>`);
      tableRows = [];
      inTable = false;
      tableHasHeader = false;
    }
  }

  function parseTableRow(line: string, isHeader: boolean): string {
    const cells = line.split("|").slice(1, -1);
    const tag = isHeader ? "th" : "td";
    return "<tr>" + cells.map((c) => `<${tag}>${inlineFormat(c.trim())}</${tag}>`).join("") + "</tr>";
  }

  function isSeparator(line: string): boolean {
    return /^\|[\s:]*-+[\s:]*(\|[\s:]*-+[\s:]*)*\|$/.test(line);
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Table detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (!inTable) {
        closeList();
        inTable = true;
        tableHasHeader = false;
      }
      if (isSeparator(trimmed)) {
        tableHasHeader = tableRows.length > 0;
        continue;
      }
      const isHeader = !tableHasHeader && tableRows.length === 0;
      tableRows.push(parseTableRow(trimmed, isHeader));
      continue;
    } else if (inTable) {
      closeTable();
    }

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
  closeTable();
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
