import type { GeneratorResult } from "./generator-result.js";
import { replaceArtifact } from "./generator-result.js";
import { createExpenseApprovalProjectState } from "./expense-approval-state.js";
import type { ProjectState } from "../types/index.js";

export function generateHtmlPrototype(now: string, providedState?: ProjectState): GeneratorResult {
  const fullState = providedState ?? createExpenseApprovalProjectState(now);
  const enhanced = enhanceHtmlPrototypeWithInteraction(fullState);
  return replaceArtifact(
    "html_prototype_generation",
    "规则版生成 HTML 原型",
    "/htmlPrototype",
    enhanced.htmlPrototype,
    ["htmlPrototype"],
    ["prototypeMeta", "prototypeAnnotationSpec", "issues"],
    "generation_html"
  );
}

function enhanceHtmlPrototypeWithInteraction(state: ProjectState): ProjectState {
  if (!state.htmlPrototype || !state.prototypeSpec) {
    return state;
  }

  const cloned = structuredClone(state);
  const interactiveData = extractInteractiveData(state);
  const script = buildInteractiveScript(interactiveData);
  const designCSS = buildDesignSystemCSS();

  if (!cloned.htmlPrototype) {
    return cloned;
  }

  for (const fileId of cloned.htmlPrototype.files.order) {
    const file = cloned.htmlPrototype.files.byId[fileId];
    if (file && file.type === "html" && file.content.includes("</body>")) {
      if (!file.content.includes("fonts.googleapis.com")) {
        file.content = file.content.replace("<head>", '<head>\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">');
      }
      if (file.content.includes("<style>")) {
        file.content = file.content.replace("<style>", `<style>\n${designCSS}\n`);
      } else if (file.content.includes("</head>")) {
        file.content = file.content.replace("</head>", `<style>\n${designCSS}\n</style>\n</head>`);
      }
      const dataBlock = `<script type="application/json" id="prototype-data">\n${JSON.stringify(interactiveData, null, 2)}\n</script>`;
      const interactiveBlock = `<!-- INTERACTIVE_ENGINE_START -->\n${dataBlock}\n<script>\n${script}\n</script>\n<!-- INTERACTIVE_ENGINE_END -->`;
      file.content = file.content.replace("</body>", `${interactiveBlock}\n</body>`);
    }
  }

  return cloned;
}

interface InteractiveData {
  pages: Array<{ id: string; name: string; type: string }>;
  navigation: Array<{ id: string; fromPageId: string; toPageId: string; triggerActionId: string | undefined }>;
  stateMachines: Array<{
    id: string;
    businessObjectId: string;
    states: Array<{ id: string; name: string; type: string }>;
    transitions: Array<{ id: string; name: string; fromStateId: string; toStateId: string; triggerActionId: string; allowedRoleIds: string[] }>;
  }>;
  mockDataSets: Array<{ id: string; targetPageId: string | undefined; records: Array<Record<string, unknown>> }>;
  actions: Array<{ id: string; name: string; pageId: string }>;
  fields: Array<{ id: string; name: string; required: boolean; pageId: string; moduleId: string }>;
  interactions: Array<{ moduleId: string; pageId: string; patterns: string[] }>;
}

function extractInteractiveData(state: ProjectState): InteractiveData {
  const spec = state.prototypeSpec;
  if (!spec) {
    return { pages: [], navigation: [], stateMachines: [], mockDataSets: [], actions: [], fields: [], interactions: [] };
  }

  const pages = spec.pages.order.map((id) => {
    const p = spec.pages.byId[id];
    return { id: p.id, name: p.name, type: p.type };
  });

  const navigation = spec.navigation.order.map((id) => {
    const n = spec.navigation.byId[id];
    return { id: n.id, fromPageId: n.fromPageId, toPageId: n.toPageId, triggerActionId: n.triggerActionId };
  });

  const actions: InteractiveData["actions"] = [];
  const fields: InteractiveData["fields"] = [];
  const interactions: InteractiveData["interactions"] = [];

  for (const pageId of spec.pages.order) {
    const page = spec.pages.byId[pageId];
    for (const actionId of page.actions.order) {
      const action = page.actions.byId[actionId];
      actions.push({ id: action.id, name: action.name, pageId });
    }
    for (const moduleId of page.modules.order) {
      const module = page.modules.byId[moduleId];
      for (const fieldId of module.fields.order) {
        const field = module.fields.byId[fieldId];
        fields.push({ id: field.id, name: field.name, required: field.required ?? false, pageId, moduleId });
      }
      if (module.interactions && module.interactions.length > 0) {
        interactions.push({ moduleId: module.id, pageId, patterns: module.interactions });
      }
    }
  }

  const stateMachines: InteractiveData["stateMachines"] = [];
  if (state.flowSpec) {
    for (const smId of state.flowSpec.stateMachines.order) {
      const sm = state.flowSpec.stateMachines.byId[smId];
      stateMachines.push({
        id: sm.id,
        businessObjectId: sm.businessObjectId,
        states: sm.states.order.map((sid) => {
          const s = sm.states.byId[sid];
          return { id: s.id, name: s.name, type: s.type };
        }),
        transitions: sm.transitions.order.map((tid) => {
          const t = sm.transitions.byId[tid];
          return { id: t.id, name: t.name, fromStateId: t.fromStateId, toStateId: t.toStateId, triggerActionId: t.triggerActionId, allowedRoleIds: t.allowedRoleIds };
        })
      });
    }
  }

  const mockDataSets: InteractiveData["mockDataSets"] = [];
  if (spec.mockDataSets) {
    for (const dsId of spec.mockDataSets.order) {
      const ds = spec.mockDataSets.byId[dsId];
      mockDataSets.push({ id: ds.id, targetPageId: ds.targetPageId, records: ds.records });
    }
  }

  return { pages, navigation, stateMachines, mockDataSets, actions, fields, interactions };
}

export interface DesignSystemConfig {
  colors: Record<string, string>;
  fontHeading?: string;
  fontBody?: string;
}

const DEFAULT_DESIGN_SYSTEM: DesignSystemConfig = {
  colors: {
    primary: "#2563EB",
    "on-primary": "#FFFFFF",
    "primary-container": "#DBEAFE",
    "on-primary-container": "#1E3A5F",
    secondary: "#0F172A",
    "on-secondary": "#FFFFFF",
    "secondary-container": "#1E293B",
    "on-secondary-container": "#CBD5E1",
    tertiary: "#0D9488",
    "on-tertiary": "#FFFFFF",
    "tertiary-container": "#CCFBF1",
    "on-tertiary-container": "#134E4A",
    error: "#DC2626",
    "on-error": "#FFFFFF",
    "error-container": "#FEE2E2",
    "on-error-container": "#7F1D1D",
    surface: "#FFFFFF",
    "on-surface": "#0F172A",
    "surface-dim": "#F8FAFC",
    "surface-container-low": "#F8FAFC",
    "surface-container": "#F1F5F9",
    "surface-container-high": "#E2E8F0",
    "surface-container-highest": "#CBD5E1",
    "on-surface-variant": "#64748B",
    outline: "#94A3B8",
    "outline-variant": "#E2E8F0",
    "inverse-surface": "#1E293B",
    "inverse-on-surface": "#F1F5F9",
    "inverse-primary": "#93C5FD",
    background: "#F8FAFC",
    "on-background": "#0F172A",
  },
  fontHeading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontBody: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

function buildDesignSystemCSS(config?: DesignSystemConfig): string {
  const ds = config ?? DEFAULT_DESIGN_SYSTEM;
  const c = ds.colors;
  const fh = ds.fontHeading ?? DEFAULT_DESIGN_SYSTEM.fontHeading!;
  const fb = ds.fontBody ?? DEFAULT_DESIGN_SYSTEM.fontBody!;
  return `/* Dynamic Design System */
:root {
  --color-primary: ${c.primary ?? "#2563EB"};
  --color-on-primary: ${c["on-primary"] ?? "#FFFFFF"};
  --color-primary-container: ${c["primary-container"] ?? "#DBEAFE"};
  --color-on-primary-container: ${c["on-primary-container"] ?? "#1E3A5F"};
  --color-secondary: ${c.secondary ?? "#0F172A"};
  --color-on-secondary: ${c["on-secondary"] ?? "#FFFFFF"};
  --color-secondary-container: ${c["secondary-container"] ?? "#1E293B"};
  --color-on-secondary-container: ${c["on-secondary-container"] ?? "#CBD5E1"};
  --color-tertiary: ${c.tertiary ?? "#0D9488"};
  --color-on-tertiary: ${c["on-tertiary"] ?? "#FFFFFF"};
  --color-tertiary-container: ${c["tertiary-container"] ?? "#CCFBF1"};
  --color-on-tertiary-container: ${c["on-tertiary-container"] ?? "#134E4A"};
  --color-error: ${c.error ?? "#DC2626"};
  --color-on-error: ${c["on-error"] ?? "#FFFFFF"};
  --color-error-container: ${c["error-container"] ?? "#FEE2E2"};
  --color-on-error-container: ${c["on-error-container"] ?? "#7F1D1D"};
  --color-surface: ${c.surface ?? "#FFFFFF"};
  --color-on-surface: ${c["on-surface"] ?? "#0F172A"};
  --color-surface-dim: ${c["surface-dim"] ?? "#F8FAFC"};
  --color-surface-container-low: ${c["surface-container-low"] ?? "#F8FAFC"};
  --color-surface-container: ${c["surface-container"] ?? "#F1F5F9"};
  --color-surface-container-high: ${c["surface-container-high"] ?? "#E2E8F0"};
  --color-surface-container-highest: ${c["surface-container-highest"] ?? "#CBD5E1"};
  --color-on-surface-variant: ${c["on-surface-variant"] ?? "#64748B"};
  --color-outline: ${c.outline ?? "#94A3B8"};
  --color-outline-variant: ${c["outline-variant"] ?? "#E2E8F0"};
  --color-inverse-surface: ${c["inverse-surface"] ?? "#1E293B"};
  --color-inverse-on-surface: ${c["inverse-on-surface"] ?? "#F1F5F9"};
  --color-inverse-primary: ${c["inverse-primary"] ?? "#93C5FD"};
  --color-background: ${c.background ?? "#F8FAFC"};
  --color-on-background: ${c["on-background"] ?? "#0F172A"};
  --shape-none: 0;
  --shape-sm: 4px;
  --shape-default: 6px;
  --shape-md: 8px;
  --shape-lg: 12px;
  --shape-xl: 16px;
  --shape-full: 9999px;
  --elevation-0: none;
  --elevation-1: 0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.06);
  --elevation-2: 0 4px 6px -1px rgba(15,23,42,0.06), 0 2px 4px -2px rgba(15,23,42,0.04);
  --elevation-3: 0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -4px rgba(15,23,42,0.04);
  --elevation-4: 0 20px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.04);
}
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  font: 400 14px/22px ${fb};
  letter-spacing: 0;
  color: var(--color-on-surface);
  background: var(--color-background);
}
h1 { font: 600 30px/38px ${fh}; margin: 0 0 20px; color: var(--color-on-surface); letter-spacing: -0.015em; }
h2 { font: 600 24px/32px ${fh}; margin: 0 0 16px; color: var(--color-on-surface); letter-spacing: -0.01em; }
h3 { font: 600 20px/28px ${fh}; margin: 0 0 12px; color: var(--color-on-surface); }
header {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: var(--color-surface);
  color: var(--color-on-surface);
  font: 600 20px/28px ${fh};
  border-bottom: 1px solid var(--color-outline-variant);
  position: relative;
  z-index: 10;
}
header strong { font-weight: 600; }
main { padding: 24px; }
section[data-page-id] { margin: 0 0 24px; }
section[data-module-id] {
  background: var(--color-surface);
  border: none;
  border-radius: var(--shape-lg);
  padding: 24px;
  margin: 0 0 16px;
  box-shadow: var(--elevation-1);
}
section[data-module-id]:last-child { margin-bottom: 0; }
.toolbar { display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
button, [role="button"] {
  height: 38px;
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--shape-md);
  background: var(--color-surface);
  color: var(--color-on-surface);
  padding: 0 20px;
  font: 500 14px/20px ${fh};
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--elevation-0);
}
button:hover { box-shadow: var(--elevation-2); border-color: var(--color-outline); }
button:active { box-shadow: var(--elevation-0); }
.primary, .btn-primary {
  background: var(--color-primary) !important;
  color: var(--color-on-primary) !important;
  border-color: var(--color-primary) !important;
  box-shadow: var(--elevation-0) !important;
}
.primary:hover, .btn-primary:hover { background: #1D4ED8 !important; border-color: #1D4ED8 !important; box-shadow: var(--elevation-2) !important; }
.danger, .btn-danger {
  background: var(--color-error) !important;
  color: var(--color-on-error) !important;
  border-color: var(--color-error) !important;
}
.danger:hover, .btn-danger:hover { background: #B91C1C !important; border-color: #B91C1C !important; }
a[data-action-id] {
  height: 38px;
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--shape-md);
  background: transparent;
  color: var(--color-primary);
  padding: 0 16px;
  font: 500 14px/38px ${fh};
  letter-spacing: 0.01em;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: background 0.15s ease, border-color 0.15s ease;
}
a[data-action-id]:hover { background: var(--color-primary-container); border-color: var(--color-primary); }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.field { display: flex; flex-direction: column; gap: 4px; }
.field > span,
.field > label {
  font: 500 12px/16px ${fh};
  letter-spacing: 0.02em;
  color: var(--color-on-surface-variant);
}
.field > span.primary-field { color: var(--color-on-surface-variant); }
.field input,
.field select,
.field textarea {
  height: 38px;
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--shape-md);
  background: var(--color-surface);
  color: var(--color-on-surface);
  padding: 8px 12px;
  font: 400 14px/22px ${fb};
  letter-spacing: 0;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  width: 100%;
}
.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  border-width: 2px;
  padding: 7px 11px;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}
.field textarea { min-height: 80px; padding: 12px; resize: vertical; }
.field-error {
  color: var(--color-error) !important;
  font: 400 12px/16px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  letter-spacing: 0;
  margin-top: 4px;
}
.state, [data-ui-state-id] {
  color: var(--color-on-surface-variant);
  font: 400 14px/22px ${fb};
  letter-spacing: 0;
  padding: 16px;
  background: var(--color-surface-container);
  border-radius: var(--shape-lg);
  border: none;
  margin-top: 12px;
}
table.mock-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
  font: 400 14px/22px ${fb};
  letter-spacing: 0;
}
table.mock-table thead th {
  text-align: left;
  padding: 10px 16px;
  background: var(--color-surface-container-low);
  color: var(--color-on-surface-variant);
  font: 500 12px/16px ${fh};
  letter-spacing: 0.02em;
  border-bottom: 1px solid var(--color-outline-variant);
}
table.mock-table tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-outline-variant);
  color: var(--color-on-surface);
}
table.mock-table tbody tr:hover { background: var(--color-surface-container-low); }
ol, ul { padding-left: 24px; margin: 8px 0; }
ol li, ul li { padding: 4px 0; font: 400 14px/22px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--color-on-surface); }
p { margin: 0 0 12px; color: var(--color-on-surface); }
`;
}

function buildInteractiveScript(data: InteractiveData): string {
  return `(function(){
var D=document.getElementById("prototype-data");
if(!D)return;
var P=JSON.parse(D.textContent);
var currentPageId=P.pages.length>0?P.pages[0].id:null;
var currentStateId=null;
if(P.stateMachines.length>0){
  var sm=P.stateMachines[0];
  var init=sm.states.find(function(s){return s.type==="initial";});
  if(init)currentStateId=init.id;
}

function injectDynamicStyles(){
  var s=document.createElement("style");
  s.textContent='[data-action-id]:active,[data-ui-state-id]:active{transform:scale(0.98);transition:transform 0.1s}'+
    '[data-action-id]:focus-visible,[data-ui-state-id]:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}'+
    '.proto-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--color-inverse-surface);color:var(--color-inverse-on-surface);padding:12px 24px;border-radius:var(--shape-md);font:400 14px/22px Inter,-apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:0;box-shadow:var(--elevation-3);z-index:1000;opacity:0;transition:opacity 0.3s}'+
    '.proto-toast.show{opacity:1}'+
    '.proto-highlight{outline:2px solid var(--color-primary);outline-offset:2px;background:rgba(37,99,235,0.05)!important;transition:outline 0.2s,background 0.2s}'+
    '.proto-nav-active{background:rgba(255,255,255,0.1)!important;color:var(--color-on-secondary)!important}'+
    '.proto-dialog-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.4);z-index:999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s}'+
    '.proto-dialog-overlay.show{opacity:1}'+
    '.proto-dialog{background:var(--color-surface);border-radius:var(--shape-xl);padding:24px;min-width:280px;max-width:560px;box-shadow:var(--elevation-4)}'+
    '.proto-dialog h3{font:600 20px/28px Inter,-apple-system,BlinkMacSystemFont,sans-serif;margin:0 0 16px;color:var(--color-on-surface)}'+
    '.proto-dialog p{font:400 14px/22px Inter,-apple-system,BlinkMacSystemFont,sans-serif;color:var(--color-on-surface-variant);margin:0 0 24px}'+
    '.proto-dialog-actions{display:flex;justify-content:flex-end;gap:8px}'+
    '.proto-dialog-actions button{height:38px;border:none;border-radius:var(--shape-md);padding:0 20px;font:500 14px/20px Inter,-apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer}'+
    '.proto-dialog-actions .cancel{background:transparent;color:var(--color-primary);border:1px solid var(--color-outline-variant)}'+
    '.proto-dialog-actions .confirm{background:var(--color-primary);color:var(--color-on-primary)}'+
    '.proto-dialog-actions .confirm-danger{background:var(--color-error);color:var(--color-on-error)}';
  document.head.appendChild(s);
}

function init(){
  injectDynamicStyles();
  addPageTabs();
  addStatusBar();
  bindNavigation();
  bindStateTransitions();
  bindFormValidation();
  populateMockData();
  bindInnerTabs();
  bindFilters();
  bindPagination();
  bindConfirmDialogs();
  bindToasts();
  bindConditionalDisplay();
  bindExpandCollapse();
  bindHoverActions();
  showPage(currentPageId);
  updateStatusBar();
}

function addPageTabs(){
  var header=document.querySelector("header");
  if(!header||P.pages.length<=1)return;
  var nav=document.createElement("nav");
  nav.style.cssText="display:flex;gap:4px;margin-left:24px;";
  P.pages.forEach(function(p){
    var btn=document.createElement("button");
    btn.textContent=p.name;
    btn.dataset.pageTabId=p.id;
    btn.style.cssText="background:transparent;color:var(--color-on-surface-variant);border:none;border-radius:var(--shape-full);padding:10px 20px;cursor:pointer;font:500 14px/20px 'Inter',-apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:0.01em;transition:background 0.15s ease;";
    btn.addEventListener("click",function(){showPage(p.id);});
    btn.addEventListener("mouseenter",function(){if(btn.dataset.pageTabId!==currentPageId){btn.style.background="var(--color-surface-container)";}});
    btn.addEventListener("mouseleave",function(){if(btn.dataset.pageTabId!==currentPageId){btn.style.background="transparent";}});
    nav.appendChild(btn);
  });
  header.appendChild(nav);
}

function showPage(pageId){
  currentPageId=pageId;
  document.querySelectorAll("[data-page-id]").forEach(function(el){
    el.style.display=el.dataset.pageId===pageId?"":"none";
  });
  document.querySelectorAll("[data-page-tab-id]").forEach(function(btn){
    var active=btn.dataset.pageTabId===pageId;
    btn.style.background=active?"var(--color-surface-container)":"transparent";
    btn.style.color=active?"var(--color-on-surface)":"var(--color-on-surface-variant)";
    btn.style.fontWeight=active?"600":"500";
  });
  updateStatusBar();
}

function addStatusBar(){
  var bar=document.createElement("div");
  bar.id="prototype-status-bar";
  bar.style.cssText="position:fixed;bottom:0;left:0;right:0;background:var(--color-surface);color:var(--color-on-surface-variant);padding:10px 24px;font:400 13px/20px 'Inter',-apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:0;display:flex;gap:24px;z-index:9999;border-top:1px solid var(--color-outline-variant);";
  bar.innerHTML='<span id="psb-page"></span><span id="psb-state"></span><span id="psb-actions"></span>';
  document.body.appendChild(bar);
  document.body.style.paddingBottom="48px";
}

function updateStatusBar(){
  var pageEl=document.getElementById("psb-page");
  var stateEl=document.getElementById("psb-state");
  var actionsEl=document.getElementById("psb-actions");
  if(!pageEl)return;
  var page=P.pages.find(function(p){return p.id===currentPageId;});
  pageEl.innerHTML="页面：<strong style=\\"color:var(--color-on-surface)\\">"+(page?page.name:"-")+"</strong>";
  var stateName="-";
  if(P.stateMachines.length>0){
    var sm=P.stateMachines[0];
    var st=sm.states.find(function(s){return s.id===currentStateId;});
    if(st)stateName=st.name;
  }
  stateEl.innerHTML="业务状态：<strong style=\\"color:var(--color-on-surface)\\">"+stateName+"</strong>";
  var available=[];
  if(P.stateMachines.length>0&&currentPageId){
    var sm2=P.stateMachines[0];
    sm2.transitions.forEach(function(t){
      if(t.fromStateId===currentStateId){
        var act=P.actions.find(function(a){return a.id===t.triggerActionId&&a.pageId===currentPageId;});
        if(act)available.push(act.name);
      }
    });
  }
  actionsEl.innerHTML="可用操作：<strong style=\\"color:var(--color-on-surface)\\">"+(available.length>0?available.join("、"):"无")+"</strong>";
}

function bindNavigation(){
  document.addEventListener("click",function(e){
    var el=e.target.closest("[data-action-id]");
    if(!el)return;
    var actionId=el.dataset.actionId;
    var nav=P.navigation.find(function(n){return n.triggerActionId===actionId;});
    if(nav){
      e.preventDefault();
      showPage(nav.toPageId);
    }
  });
}

function bindStateTransitions(){
  document.addEventListener("click",function(e){
    var el=e.target.closest("[data-action-id]");
    if(!el)return;
    var actionId=el.dataset.actionId;
    if(P.stateMachines.length===0)return;
    var sm=P.stateMachines[0];
    var transition=sm.transitions.find(function(t){
      return t.triggerActionId===actionId&&t.fromStateId===currentStateId;
    });
    if(!transition)return;
    currentStateId=transition.toStateId;
    var newState=sm.states.find(function(s){return s.id===currentStateId;});
    document.querySelectorAll('[data-field-id*="status"]').forEach(function(el){
      if(newState)el.textContent=newState.name;
    });
    updateActionVisibility(sm);
    updateStatusBar();
  });
}

function updateActionVisibility(sm){
  document.querySelectorAll("[data-action-id]").forEach(function(btn){
    var actionId=btn.dataset.actionId;
    var relevant=sm.transitions.filter(function(t){return t.triggerActionId===actionId;});
    if(relevant.length===0)return;
    var available=relevant.some(function(t){return t.fromStateId===currentStateId;});
    btn.style.display=available?"":"none";
  });
}

function bindFormValidation(){
  document.querySelectorAll("[data-field-required='true'] input, [data-field-required='true'] textarea, [data-field-required='true'] select").forEach(function(input){
    input.addEventListener("blur",function(){
      var parent=input.closest(".field")||input.parentElement;
      var existing=parent.querySelector(".field-error");
      if(!input.value.trim()){
        if(!existing){
          var err=document.createElement("span");
          err.className="field-error";
          err.textContent="此字段为必填项";
          parent.appendChild(err);
        }
      }else if(existing){
        existing.remove();
      }
    });
  });
  document.querySelectorAll("[data-action-id*='submit'], [data-action-id*='create']").forEach(function(btn){
    btn.addEventListener("click",function(e){
      var section=btn.closest("[data-page-id]");
      if(!section)return;
      var required=section.querySelectorAll("[data-field-required='true'] input, [data-field-required='true'] textarea");
      var empty=false;
      required.forEach(function(input){
        if(!input.value.trim())empty=true;
      });
      if(empty){
        e.preventDefault();
        e.stopPropagation();
        required.forEach(function(input){
          if(!input.value.trim()){
            var parent=input.closest(".field")||input.parentElement;
            if(!parent.querySelector(".field-error")){
              var err=document.createElement("span");
              err.className="field-error";
              err.textContent="此字段为必填项";
              parent.appendChild(err);
            }
          }
        });
      }
    });
  });
}

function populateMockData(){
  P.mockDataSets.forEach(function(ds){
    var pageSection=document.querySelector('[data-page-id="'+ds.targetPageId+'"]');
    if(!pageSection||ds.records.length===0)return;
    var tableModule=pageSection.querySelector('[data-module-id*="table"]');
    if(!tableModule)return;
    var existing=tableModule.querySelector(".mock-table");
    if(existing)return;
    var keys=Object.keys(ds.records[0]);
    var table=document.createElement("table");
    table.className="mock-table";
    var thead=document.createElement("thead");
    var headRow=document.createElement("tr");
    keys.forEach(function(k){
      var th=document.createElement("th");
      th.textContent=k;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    var tbody=document.createElement("tbody");
    ds.records.forEach(function(record){
      var row=document.createElement("tr");
      keys.forEach(function(k){
        var td=document.createElement("td");
        td.textContent=record[k]!=null?String(record[k]):"";
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableModule.appendChild(table);
  });
}

function bindInnerTabs(){
  document.querySelectorAll('[data-tab-group]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var groupId=btn.dataset.tabGroup;
      var targetId=btn.dataset.tabTarget;
      var container=btn.closest('[data-page-id]');
      if(!container)return;
      container.querySelectorAll('[data-tab-group="'+groupId+'"]').forEach(function(b){
        b.classList.remove('active');
        b.style.borderBottom='2px solid transparent';
        b.style.color='var(--color-on-surface-variant)';
      });
      btn.classList.add('active');
      btn.style.borderBottom='2px solid var(--color-primary)';
      btn.style.color='var(--color-primary)';
      container.querySelectorAll('[data-tab-panel="'+groupId+'"]').forEach(function(panel){
        panel.style.display=panel.dataset.tabId===targetId?'':'none';
      });
    });
  });
}

function bindFilters(){
  document.querySelectorAll('[data-module-id*="filter"] select,[data-module-id*="filter"] input[type="text"]').forEach(function(filterEl){
    var debounceTimer;
    function applyFilter(){
      var pageSection=filterEl.closest('[data-page-id]');
      if(!pageSection)return;
      var table=pageSection.querySelector('.mock-table');
      if(!table)return;
      var filters={};
      pageSection.querySelectorAll('[data-module-id*="filter"] select,[data-module-id*="filter"] input[type="text"]').forEach(function(f){
        if(f.value)filters[f.dataset.filterField||f.id]=f.value.toLowerCase();
      });
      var visible=0;
      table.querySelectorAll('tbody tr').forEach(function(row){
        var show=true;
        Object.keys(filters).forEach(function(key){
          if(!row.textContent.toLowerCase().includes(filters[key]))show=false;
        });
        row.style.display=show?'':'none';
        if(show)visible++;
      });
      var empty=pageSection.querySelector('[data-interaction="empty-state"]');
      if(empty)empty.style.display=visible===0?'':'none';
      var countEl=pageSection.querySelector('[data-filter-count]');
      if(countEl)countEl.textContent=visible+' 条结果';
    }
    filterEl.addEventListener(filterEl.tagName==='SELECT'?'change':'input',function(){
      clearTimeout(debounceTimer);
      debounceTimer=setTimeout(applyFilter,300);
    });
  });
}

function bindPagination(){
  document.querySelectorAll('.mock-table').forEach(function(table){
    var PAGE_SIZE=10;
    var rows=table.querySelectorAll('tbody tr');
    if(rows.length<=PAGE_SIZE)return;
    var currentPage=1;
    var totalPages=Math.ceil(rows.length/PAGE_SIZE);
    var pageSection=table.closest('[data-page-id]');
    if(!pageSection)return;
    var pager=document.createElement('div');
    pager.className='proto-pager';
    pager.style.cssText='display:flex;align-items:center;gap:8px;margin-top:16px;padding:8px 0;font:400 13px/20px Inter,sans-serif;color:var(--color-on-surface-variant);';
    pageSection.appendChild(pager);
    function render(){
      rows.forEach(function(r,i){
        r.style.display=(i>=(currentPage-1)*PAGE_SIZE&&i<currentPage*PAGE_SIZE)?'':'none';
      });
      var html='<span>共 '+rows.length+' 条</span>';
      html+=currentPage>1?'<button style="height:28px;padding:0 8px;border:1px solid var(--color-outline-variant);border-radius:var(--shape-sm);background:var(--color-surface);cursor:pointer;font:400 12px/16px Inter,sans-serif" onclick="void(0)">上一页</button>':'';
      for(var i=1;i<=totalPages;i++){
        html+='<button style="height:28px;min-width:28px;padding:0 6px;border:1px solid '+(i===currentPage?'var(--color-primary)':'var(--color-outline-variant)')+';border-radius:var(--shape-sm);background:'+(i===currentPage?'var(--color-primary)':'var(--color-surface)')+';color:'+(i===currentPage?'var(--color-on-primary)':'var(--color-on-surface)')+';cursor:pointer;font:400 12px/16px Inter,sans-serif" data-page="'+i+'">'+i+'</button>';
      }
      html+=currentPage<totalPages?'<button style="height:28px;padding:0 8px;border:1px solid var(--color-outline-variant);border-radius:var(--shape-sm);background:var(--color-surface);cursor:pointer;font:400 12px/16px Inter,sans-serif" onclick="void(0)">下一页</button>':'';
      pager.innerHTML=html;
      pager.querySelectorAll('button').forEach(function(btn){
        btn.addEventListener('click',function(){
          if(btn.dataset.page){currentPage=parseInt(btn.dataset.page);}
          else if(btn.textContent==='上一页'){currentPage--;}
          else if(btn.textContent==='下一页'){currentPage++;}
          render();
        });
      });
    }
    render();
  });
}

function bindConfirmDialogs(){
  document.addEventListener('click',function(e){
    var btn=e.target.closest('[data-action-type="delete"],[data-action-type="reject"]');
    if(!btn)return;
    e.preventDefault();e.stopPropagation();
    var actionName=btn.dataset.actionType==='delete'?'删除':'驳回';
    var isDanger=btn.dataset.actionType==='delete';
    showConfirm('确认'+actionName,actionName+'后不可恢复，是否确认？',function(){
      showToast(actionName+'操作已执行','success');
      var row=btn.closest('tr');
      if(row){row.style.opacity='0.3';row.style.pointerEvents='none';}
    },isDanger);
  });
}

function showConfirm(title,message,onConfirm,danger){
  var overlay=document.createElement('div');
  overlay.className='proto-dialog-overlay show';
  overlay.innerHTML='<div class="proto-dialog"><h3>'+title+'</h3><p>'+message+'</p>'
    +'<div class="proto-dialog-actions"><button class="cancel">取消</button>'
    +'<button class="'+(danger?'confirm-danger':'confirm')+'">确认</button></div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('.cancel').onclick=function(){overlay.remove();};
  overlay.querySelector('.confirm-danger,.confirm').onclick=function(){overlay.remove();onConfirm();};
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
}

function bindToasts(){
  window.showToast=function(message,type){
    var t=document.createElement('div');
    t.className='proto-toast';
    var colors={success:'var(--color-tertiary)',error:'var(--color-error)',warning:'#D97706',info:'var(--color-primary)'};
    t.style.borderLeft='4px solid '+(colors[type]||colors.info);
    t.textContent=message;
    document.body.appendChild(t);
    requestAnimationFrame(function(){t.classList.add('show');});
    setTimeout(function(){t.classList.remove('show');setTimeout(function(){t.remove();},300);},3000);
  };
  bindStateTransitions();
  var origBind=bindStateTransitions;
  document.addEventListener('click',function(e){
    var el=e.target.closest('[data-action-id]');
    if(!el)return;
    var sm=P.stateMachines[0];
    if(!sm)return;
    var transition=sm.transitions.find(function(t){
      return t.triggerActionId===el.dataset.actionId&&t.fromStateId===currentStateId;
    });
    if(transition){
      var newState=sm.states.find(function(s){return s.id===transition.toStateId;});
      if(newState)showToast('状态已变更为：'+newState.name,'success');
    }
  });
}

function bindConditionalDisplay(){
  document.querySelectorAll('[data-condition-field]').forEach(function(target){
    var fieldId=target.dataset.conditionField;
    var condValue=target.dataset.conditionValue;
    var source=document.getElementById(fieldId)||document.querySelector('[data-field-id="'+fieldId+'"] select,[data-field-id="'+fieldId+'"] input');
    if(!source)return;
    function toggle(){
      var val=source.value||'';
      var match=condValue?val===condValue:!!val;
      target.style.display=match?'':'none';
      if(!match){
        target.querySelectorAll('input,select,textarea').forEach(function(inp){inp.value='';});
      }
    }
    source.addEventListener('change',toggle);
    toggle();
  });
}

function bindExpandCollapse(){
  var style=document.createElement('style');
  style.textContent='[data-expandable] .expand-body{transition:max-height 0.3s ease}'+
    '[data-expandable].collapsed .expand-body{display:none}'+
    '[data-expandable].collapsed .expand-chevron{transform:rotate(-90deg)}'+
    '.expand-chevron{display:inline-block;transition:transform 0.2s;margin-right:8px;font-size:12px}'+
    '.expand-header{cursor:pointer;user-select:none;padding:8px 0;display:flex;align-items:center}';
  document.head.appendChild(style);
  document.querySelectorAll('[data-expandable]').forEach(function(section){
    var header=section.querySelector('.expand-header');
    if(!header)return;
    var chevron=header.querySelector('.expand-chevron');
    if(!chevron){chevron=document.createElement('span');chevron.className='expand-chevron';chevron.textContent='▼';header.insertBefore(chevron,header.firstChild);}
    header.addEventListener('click',function(){section.classList.toggle('collapsed');});
  });
}

function bindHoverActions(){
  var style=document.createElement('style');
  style.textContent='.mock-table .row-actions{opacity:0;transition:opacity 0.15s;display:inline-flex;gap:4px;align-items:center}'+
    '.mock-table tbody tr:hover .row-actions{opacity:1}'+
    '.mock-table tbody tr:hover{background:var(--color-surface-container-low)}'+
    '.row-actions button{height:26px;padding:0 8px;font:500 12px/16px Inter,sans-serif;border:1px solid var(--color-outline-variant);border-radius:var(--shape-sm);background:var(--color-surface);cursor:pointer;color:var(--color-primary)}'+
    '.row-actions button:hover{background:var(--color-primary-container)}'+
    '.row-actions button.danger-btn{color:var(--color-error)}.row-actions button.danger-btn:hover{background:var(--color-error-container)}';
  document.head.appendChild(style);
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init);
}else{
  init();
}
})();`;
}
