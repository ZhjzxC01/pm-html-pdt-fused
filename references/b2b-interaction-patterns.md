# B 端交互模式库

用途：原型生成时参考的标准交互模式，确保覆盖 B 端高频交互场景。

## 数据操作交互

### 行内编辑

列表中直接编辑字段，不需要打开详情页。

- 适用场景：简单字段修改（如状态切换、备注更新、优先级调整）
- 交互方式：双击单元格 → 出现编辑态 → 回车或点击外部保存
- 校验规则：实时校验，保存失败时保留编辑态并显示错误
- 不适用：复杂表单、涉及多个关联字段的修改
- 原型标识：`data-interaction="inline-edit"`

### 快捷操作

列表行 hover 出现操作按钮，减少页面跳转。

- 适用场景：高频低复杂度操作（编辑、删除、标记、分配）
- 交互方式：鼠标 hover 列表行 → 右侧出现操作图标按钮
- 移动端适配：长按或左滑出现操作菜单
- 按钮数量限制：最多 3-4 个，更多操作收进"更多"下拉菜单
- 原型标识：`data-interaction="hover-actions"`

### 二次确认

危险操作弹出确认框，防止误操作。

- 适用场景：删除、驳回、作废、批量删除、修改关键配置
- 交互方式：点击操作按钮 → 弹出确认框 → 确认后执行
- 确认框内容：操作描述 + 影响范围 + 确认/取消按钮
- 删除类操作：确认框中显示"请输入 XX 以确认删除"
- 原型标识：`data-interaction="confirm-dialog"`

## 表单交互

### 级联选择

选择父级选项后自动过滤子级选项。

- 适用场景：省市区选择、部门-人员选择、品类-子品类选择
- 交互方式：选择父级 → 子级下拉框自动更新选项列表 → 清空已选子级
- 异常处理：父级选项无子级时，子级下拉框显示"暂无选项"
- 原型标识：`data-interaction="cascade-select"`

### 条件显隐

根据其他字段的值动态显示或隐藏表单字段。

- 适用场景：选择"其他"时显示输入框、选择"是"时显示子表单
- 交互方式：字段 A 值变化 → 字段 B 显示/隐藏（带动画过渡）
- 校验规则：隐藏字段自动清除校验状态和已填值
- 原型标识：`data-interaction="conditional-display"`

### 联动校验

字段之间存在依赖关系的校验。

- 常见规则：

| 校验场景 | 规则 |
|----------|------|
| 日期范围 | 结束日期不能早于开始日期 |
| 金额范围 | 最小值不能大于最大值 |
| 附件数量 | 至少上传 N 个附件 |
| 条件必填 | 选择"是"时某个字段变为必填 |

- 交互方式：实时校验，失焦时触发，提交时全量校验
- 原型标识：`data-interaction="cross-field-validation"`

## 搜索与筛选

### 搜索防抖

输入时延迟搜索，避免频繁请求。

- 适用场景：搜索框关键词搜索
- 交互方式：输入停止 300ms 后自动触发搜索
- 加载状态：搜索中显示 loading 图标
- 清空能力：搜索框右侧显示清除按钮
- 原型标识：`data-interaction="search-debounce"`

### 高级筛选

多条件组合筛选，支持保存筛选方案。

- 适用场景：列表页需要多维度筛选
- 交互方式：点击"高级筛选" → 展开筛选面板 → 选择条件 → 应用
- 筛选方案：支持保存常用筛选条件为"筛选方案"
- 重置能力：一键清空所有筛选条件
- 原型标识：`data-interaction="advanced-filter"`

## 状态与反馈

### 空状态引导

列表为空时显示引导内容，而非空白页面。

- 适用场景：首次使用、筛选无结果、数据全部处理完
- 引导内容：
  - 无数据时："还没有报销单，点击新建您的第一笔报销"
  - 筛选无结果："没有符合条件的数据，请调整筛选条件"
  - 全部处理完："所有待办已处理完毕"
- 原型标识：`data-interaction="empty-state"`

### 加载骨架屏

数据加载中显示占位符，减少用户等待焦虑。

- 适用场景：页面首次加载、大数据量列表加载
- 骨架屏形状：与实际内容布局一致的灰色矩形块
- 加载时长：超过 3 秒时显示"加载时间较长，请耐心等待"
- 原型标识：`data-interaction="skeleton-loading"`

### 操作反馈

操作完成后的即时反馈。

| 操作类型 | 反馈方式 | 展示时长 |
|----------|----------|----------|
| 成功 | Toast 提示（绿色） | 3 秒自动消失 |
| 失败 | Toast 提示（红色） + 错误详情 | 5 秒或手动关闭 |
| 警告 | Toast 提示（黄色） | 4 秒自动消失 |
| 信息 | Toast 提示（蓝色） | 3 秒自动消失 |

- 位置：页面右上角或顶部居中
- 原型标识：`data-interaction="toast-feedback"`

### 撤销操作

删除后支持短时间撤回。

- 适用场景：删除单条数据、批量删除
- 交互方式：操作完成后显示"已删除 [撤回]"提示条
- 撤回时间窗口：5 秒内可撤回
- 超时处理：提示条自动消失，删除操作生效
- 原型标识：`data-interaction="undo-action"`

## 导航与效率

### 快捷键

键盘快捷键提升操作效率。

| 快捷键 | 功能 |
|--------|------|
| Ctrl/Cmd + S | 保存表单 |
| Ctrl/Cmd + Enter | 提交表单 |
| Esc | 关闭弹窗/取消编辑 |
| Ctrl/Cmd + K | 全局搜索 |

- 适用场景：高频操作用户
- 可发现性：首次使用时显示快捷键提示，可在设置中关闭
- 原型标识：`data-interaction="keyboard-shortcut"`

### 面包屑导航

展示当前页面在系统中的位置，支持快速返回上级。

- 适用场景：多层级页面（如：首页 > 合同管理 > 合同详情 > 付款记录）
- 交互方式：每级可点击跳转
- 当前页：最后一级不可点击，加粗显示
- 原型标识：`data-interaction="breadcrumb"`

### 标签页记忆

记住用户上次使用的标签页/筛选条件。

- 适用场景：用户频繁在多个 Tab 或筛选条件间切换
- 实现方式：localStorage 存储用户偏好
- 重置能力：提供"恢复默认"选项
- 原型标识：`data-interaction="tab-memory"`

## 交互模式选择规则

| 需求特征 | 推荐交互模式 |
|----------|-------------|
| 简单字段频繁修改 | 行内编辑 |
| 高频低复杂度操作 | 快捷操作（hover） |
| 删除/驳回等危险操作 | 二次确认 |
| 省市区/部门人员选择 | 级联选择 |
| 条件性表单字段 | 条件显隐 |
| 日期/金额范围校验 | 联动校验 |
| 关键词搜索 | 搜索防抖 |
| 多维度筛选 | 高级筛选 |
| 列表为空 | 空状态引导 |
| 数据加载等待 | 加载骨架屏 |
| 操作完成反馈 | Toast 提示 |
| 误操作恢复 | 撤销操作 |

## JS 实现参考

以下是每种交互模式在 HTML 原型中的 JavaScript 实现要求。生成原型时，必须为每个声明了交互模式的模块实现对应的 JS 逻辑。

### 行内编辑 (inline-edit)

```javascript
// 双击 td 进入编辑态，blur 保存，Esc 取消
document.querySelectorAll('[data-interaction="inline-edit"]').forEach(function(cell) {
  cell.addEventListener('dblclick', function() {
    var original = cell.textContent;
    cell.innerHTML = '<input type="text" value="' + original + '" class="inline-input">';
    var input = cell.querySelector('input');
    input.focus();
    input.addEventListener('blur', function() { cell.textContent = input.value || original; });
    input.addEventListener('keydown', function(e) { if (e.key === 'Escape') cell.textContent = original; });
  });
});
```

### 快捷操作 (hover-actions)

```css
.row-actions { opacity: 0; transition: opacity 0.15s; }
.data-table tbody tr:hover .row-actions { opacity: 1; }
.data-table tbody tr:hover { background: var(--color-surface-container-low, #f9fafb); }
.row-actions button { height: 28px; padding: 0 8px; font-size: 12px; }
```

### 二次确认 (confirm-dialog)

```javascript
function showConfirm(title, message, onConfirm, isDanger) {
  var overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = '<div class="confirm-box"><h3>' + title + '</h3><p>' + message + '</p>'
    + '<div class="confirm-actions"><button class="btn-cancel">取消</button>'
    + '<button class="btn-confirm ' + (isDanger ? 'btn-danger' : '') + '">确认</button></div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('.btn-cancel').onclick = function() { overlay.remove(); };
  overlay.querySelector('.btn-confirm').onclick = function() { overlay.remove(); onConfirm(); };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}
```

### 级联选择 (cascade-select)

```javascript
// 父级 change 时清空子级并加载新选项
document.getElementById('parentSelect').addEventListener('change', function() {
  var child = document.getElementById('childSelect');
  child.innerHTML = '<option value="">请选择</option>';
  var options = CASCADE_DATA[this.value] || [];
  options.forEach(function(opt) { child.innerHTML += '<option value="' + opt + '">' + opt + '</option>'; });
});
```

### 条件显隐 (conditional-display)

```javascript
document.querySelectorAll('[data-condition-trigger]').forEach(function(trigger) {
  trigger.addEventListener('change', function() {
    var target = document.getElementById(trigger.dataset.conditionTarget);
    var showValues = trigger.dataset.conditionShow.split(',');
    target.style.display = showValues.includes(trigger.value) ? '' : 'none';
  });
});
```

### 联动校验 (cross-field-validation)

```javascript
// 结束日期不能早于开始日期
document.getElementById('endDate').addEventListener('blur', function() {
  var start = document.getElementById('startDate').value;
  var end = this.value;
  var errEl = document.getElementById('endDateError');
  if (start && end && end < start) {
    errEl.textContent = '结束日期不能早于开始日期';
    errEl.style.display = '';
  } else {
    errEl.style.display = 'none';
  }
});
```

### 搜索防抖 (search-debounce)

```javascript
var debounceTimer;
document.getElementById('searchInput').addEventListener('input', function() {
  clearTimeout(debounceTimer);
  var keyword = this.value.toLowerCase();
  debounceTimer = setTimeout(function() {
    var rows = document.querySelectorAll('.data-table tbody tr');
    var visible = 0;
    rows.forEach(function(row) {
      var show = !keyword || row.textContent.toLowerCase().includes(keyword);
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    var empty = document.getElementById('emptyState');
    if (empty) empty.style.display = visible === 0 ? '' : 'none';
  }, 300);
});
```

### 高级筛选 (advanced-filter)

```javascript
function applyFilters() {
  var filters = {};
  document.querySelectorAll('[data-filter]').forEach(function(el) {
    filters[el.dataset.filter] = el.value;
  });
  var rows = document.querySelectorAll('.data-table tbody tr');
  var visible = 0;
  rows.forEach(function(row) {
    var show = true;
    Object.keys(filters).forEach(function(key) {
      if (filters[key] && row.dataset[key] && !row.dataset[key].includes(filters[key])) show = false;
    });
    row.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  var empty = document.getElementById('emptyState');
  if (empty) empty.style.display = visible === 0 ? '' : 'none';
}
document.querySelectorAll('[data-filter]').forEach(function(el) { el.addEventListener('change', applyFilters); });
document.getElementById('resetFilters')?.addEventListener('click', function() {
  document.querySelectorAll('[data-filter]').forEach(function(el) { el.value = ''; });
  applyFilters();
});
```

### 空状态引导 (empty-state)

```html
<div id="emptyState" style="display:none; text-align:center; padding:60px 0; color:#999;">
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style="margin-bottom:16px">
    <rect x="8" y="12" width="48" height="40" rx="4" stroke="#d1d5db" stroke-width="2" fill="none"/>
    <line x1="20" y1="26" x2="44" y2="26" stroke="#d1d5db" stroke-width="2"/>
    <line x1="20" y1="34" x2="36" y2="34" stroke="#d1d5db" stroke-width="2"/>
  </svg>
  <p>暂无数据</p>
  <p style="font-size:12px; margin-top:4px;">请调整筛选条件或新建数据</p>
</div>
```

### Toast 反馈 (toast-feedback)

```javascript
function showToast(message, type) {
  var t = document.createElement('div');
  var colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
  t.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:6px;color:#fff;font-size:14px;z-index:10000;opacity:0;transition:opacity 0.3s;border-left:4px solid ' + (colors[type] || colors.info);
  t.textContent = message;
  document.body.appendChild(t);
  requestAnimationFrame(function() { t.style.opacity = '1'; });
  setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { t.remove(); }, 300); }, 3000);
}
```

### 撤销操作 (undo-action)

```javascript
function showUndo(message, onUndo) {
  var bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:12px 20px;background:#1f2937;color:#fff;border-radius:6px;font-size:14px;z-index:10000;display:flex;align-items:center;gap:12px;';
  bar.innerHTML = '<span>' + message + '</span><button style="background:#3b82f6;color:#fff;border:none;padding:4px 12px;border-radius:4px;cursor:pointer">撤销</button>';
  document.body.appendChild(bar);
  bar.querySelector('button').onclick = function() { onUndo(); bar.remove(); };
  setTimeout(function() { bar.remove(); }, 5000);
}
```

### 标签页记忆 (tab-memory)

```javascript
// 页面加载时恢复上次选中的 tab
var savedTab = localStorage.getItem(location.pathname + '-active-tab');
if (savedTab) {
  var btn = document.querySelector('[data-tab="' + savedTab + '"]');
  if (btn) btn.click();
}
// tab 切换时保存
document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    localStorage.setItem(location.pathname + '-active-tab', btn.dataset.tab);
  });
});
```

### 面包屑导航 (breadcrumb)

```html
<nav class="breadcrumb" style="font-size:13px;color:#6b7280;margin-bottom:16px;">
  <a href="index.html" style="color:#3b82f6;text-decoration:none">首页</a>
  <span style="margin:0 6px">/</span>
  <a href="javascript:void(0)" onclick="history.back()" style="color:#3b82f6;text-decoration:none">列表页</a>
  <span style="margin:0 6px">/</span>
  <span style="color:#374151;font-weight:500">当前页</span>
</nav>
```
