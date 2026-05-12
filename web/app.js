const params = new URLSearchParams(location.search);
const projectRoot = document.querySelector("#projectRoot");
const statusBar = document.querySelector("#status");
const initialRoot = params.get("root") || "";
projectRoot.value = initialRoot;

document.querySelectorAll(".nav").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.view}`).classList.add("active");
  });
});

document.querySelector("#loadProject").addEventListener("click", loadProject);
document.querySelector("#saveInput").addEventListener("click", saveInput);
document.querySelector("#generate").addEventListener("click", generate);
document.querySelector("#renderAll").addEventListener("click", () => postAction("/api/render"));
document.querySelector("#annotate").addEventListener("click", () => postAction("/api/annotate"));
document.querySelector("#check").addEventListener("click", () => postAction("/api/check"));
document.querySelector("#loadPrototype").addEventListener("click", loadPrototype);
document.querySelector("#loadDoc").addEventListener("click", loadDoc);
document.querySelector("#propose").addEventListener("click", propose);
document.querySelector("#applyProposal").addEventListener("click", applyProposal);
document.querySelector("#loadReport").addEventListener("click", () => loadDocFile("consistency-report.md", "#proposalViewer"));

loadProject();

async function loadProject() {
  const result = await apiGet(`/api/project?root=${encodeURIComponent(root())}`);
  const project = result.project;
  document.querySelector("#projectSummary").innerHTML = entries({
    项目目录: project.root,
    状态文件: project.exists ? "存在" : "不存在",
    项目名称: project.name || "-",
    版本: project.version ?? "-",
    更新时间: project.updatedAt || "-",
    脏产物: project.dirtyArtifacts.join(", ") || "-"
  });
  document.querySelector("#recentChanges").textContent = JSON.stringify(project.recentChanges, null, 2);

  const input = await apiGet(`/api/input?root=${encodeURIComponent(root())}`);
  document.querySelector("#inputEditor").value = input.content || "";
  setStatus("项目已载入");
}

async function saveInput() {
  await apiSend("/api/input", "PUT", {
    root: root(),
    content: document.querySelector("#inputEditor").value
  });
  setStatus("input.md 已保存");
}

async function generate() {
  await saveInput();
  const result = await apiSend("/api/generate", "POST", {
    root: root(),
    mode: document.querySelector("#generateMode").value
  });
  setStatus(result.ok ? "生成完成" : `生成失败：${formatIssues(result)}`);
  await loadProject();
}

async function postAction(path) {
  const result = await apiSend(path, "POST", { root: root() });
  setStatus(result.ok ? "操作完成" : `操作失败：${formatIssues(result)}`);
  await loadProject();
}

function loadPrototype() {
  const file = document.querySelector("#prototypeFile").value;
  document.querySelector("#prototypeFrame").src = `/api/artifact?root=${encodeURIComponent(root())}&file=${encodeURIComponent(file)}`;
  setStatus(`已打开 ${file}`);
}

async function loadDoc() {
  await loadDocFile(document.querySelector("#docFile").value, "#docViewer");
}

async function loadDocFile(file, target) {
  const response = await fetch(`/api/artifact?root=${encodeURIComponent(root())}&file=${encodeURIComponent(file)}`);
  document.querySelector(target).textContent = response.ok ? await response.text() : await response.text();
  setStatus(`已读取 ${file}`);
}

async function propose() {
  const result = await apiSend("/api/propose", "POST", {
    root: root(),
    instruction: document.querySelector("#instruction").value
  });
  document.querySelector("#proposalViewer").textContent = JSON.stringify(result, null, 2);
  setStatus(result.ok ? "提案已生成" : `提案失败：${formatIssues(result)}`);
}

async function applyProposal() {
  const result = await apiSend("/api/apply-proposal", "POST", { root: root() });
  document.querySelector("#proposalViewer").textContent = JSON.stringify(result, null, 2);
  setStatus(result.ok ? "提案已应用" : `应用失败：${formatIssues(result)}`);
  await loadProject();
}

async function apiGet(path) {
  const response = await fetch(path);
  return response.json();
}

async function apiSend(path, method, body) {
  const response = await fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return response.json();
}

function root() {
  return projectRoot.value.trim() || initialRoot || ".";
}

function entries(values) {
  return Object.entries(values)
    .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(String(value))}</dd>`)
    .join("");
}

function formatIssues(result) {
  return (result.issues || []).map((issue) => issue.message || issue.code).join("；") || result.error || "未知错误";
}

function setStatus(message) {
  statusBar.textContent = message;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
