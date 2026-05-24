请把用户需求整理为 html-prototype-agent 的 AgentResult JSON。

要求：

1. agentName 必须是 "html-prototype-agent"。
2. output 必须是合法 HTMLPrototype。
3. HTML 必须包含可追踪的 data-page-id 页面容器。
4. assumptions、pendingQuestions、warnings 必须存在。
5. 不要输出 JSON Patch 或 Markdown。

## 设计规范（动态设计体系）

生成的 HTML 原型必须遵循项目当前确认的设计体系。设计体系来源（按优先级）：

1. **项目 design-system/MASTER.md**（已持久化的设计 Token，优先使用）
2. **search.py --design-system 自动生成**（基于产品类型和行业推荐）
3. **用户指定的自定义设计体系**

### 设计体系生成

在生成原型前，如项目尚无设计体系，先运行：

```bash
python3 scripts/design-search/search.py "<产品类型> <行业> <关键词>" --design-system -f markdown [-p "Project Name"] --persist
```

将生成的设计体系保存到 `<project>/design-system/MASTER.md`，作为原型生成的 Token 来源。

### 生成行为要求

1. **CSS 变量声明**：在 `<style>` 标签开头，从项目设计体系中读取所有设计 Token，声明为 CSS 变量（`--color-*`、`--font-*`、`--spacing-*`、`--radius-*`、`--shadow-*`）。Token 架构参考 `references/design-intelligence/token-architecture.md`。
2. **严格引用**：所有样式必须通过 CSS 变量引用设计 Token，不要硬编码颜色值或自定义字号。
3. **布局结构**：使用经典 B 端三栏布局 — 左侧深色侧边栏 (240px) + 顶部白色导航栏 (56px) + 浅灰背景内容区（最大宽度 1280px，水平居中）。
4. **间距网格**：使用 4px 基础间距网格，所有间距为 4 的倍数。
5. **组件一致性**：按钮、卡片、输入框、数据表格、徽章等组件必须遵循 `references/design-intelligence/component-specs.md` 中定义的规格。

## 交互规范（强制要求）

原型不是静态截图，必须是**可交互的演示**。每个页面必须包含完整的 JavaScript 交互逻辑，让用户可以实际操作原型来理解业务流程。

### 交互模式库

`references/b2b-interaction-patterns.md` 中定义的交互模式是**必须遵循**的交互词汇表。原型中的每种交互都必须使用其中一个模式 ID 作为 `data-interaction` 属性值。

### 按页面类型的最低交互要求

以下表格定义了每种页面类型**必须包含**的交互，缺一不可：

| pageType | 必须包含的交互 |
|----------|---------------|
| `list` | (1) 至少 2 个可用筛选器，选择后实际过滤表格行；(2) 分页控件，点击切换可见数据行；(3) 行 hover 出现操作按钮；(4) 搜索框带 300ms 防抖；(5) 筛选无结果时显示空状态引导 |
| `detail` | (1) 页内 Tab 切换，**所有 Tab 都有完整内容**；(2) 可展开/折叠的信息区块；(3) 面包屑导航返回上级列表页；(4) 危险操作（删除、作废）弹出确认对话框 |
| `create` / `edit` | (1) 失焦校验 + 提交时全量校验；(2) 至少 1 个条件显隐字段（根据下拉值显示/隐藏关联字段）；(3) 提交成功显示 Toast 反馈；(4) 取消时如表单已修改弹出确认提示 |
| `approval` | (1) 通过/驳回操作弹出对话框，驳回时必须填写原因；(2) 操作后状态标签实时更新；(3) 操作前二次确认 |
| `config` | (1) 开关控件可切换；(2) 保存后显示 Toast 反馈；(3) 危险配置项有二次确认 |
| `dashboard` | (1) 统计卡片点击可跳转到明细列表页；(2) 日期范围筛选器 |
| `log` | (1) 筛选器可过滤日志列表；(2) 分页控件 |

### 交互实现参考代码

以下是 8 种核心交互模式的 JavaScript 实现参考。生成原型时，将对应的 `<script>` 代码嵌入页面的 `<script>` 标签中：

**1. 页内 Tab 切换**

```html
<!-- HTML 结构 -->
<div class="tab-nav">
  <button class="tab-btn active" data-tab="tab1">基本信息</button>
  <button class="tab-btn" data-tab="tab2">操作记录</button>
  <button class="tab-btn" data-tab="tab3">关联数据</button>
</div>
<div class="tab-panel" id="tab1">...内容...</div>
<div class="tab-panel" id="tab2" style="display:none">...内容...</div>
<div class="tab-panel" id="tab3" style="display:none">...内容...</div>

<script>
document.querySelectorAll('.tab-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    var group=btn.closest('.tab-nav');
    group.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
    btn.classList.add('active');
    var panels=btn.closest('[data-page-id]').querySelectorAll('.tab-panel');
    panels.forEach(function(p){p.style.display=p.id===btn.dataset.tab?'':'none';});
  });
});
</script>
```

**2. 筛选器（带防抖）**

```html
<select id="filterStatus"><option value="">全部状态</option><option value="生效中">生效中</option><option value="已清偿">已清偿</option></select>
<input id="filterSearch" placeholder="搜索关键词...">

<script>
var debounceTimer;
function applyFilters(){
  var status=document.getElementById('filterStatus').value;
  var keyword=document.getElementById('filterSearch').value.toLowerCase();
  var rows=document.querySelectorAll('.data-table tbody tr');
  var visible=0;
  rows.forEach(function(row){
    var matchStatus=!status||row.textContent.includes(status);
    var matchKey=!keyword||row.textContent.toLowerCase().includes(keyword);
    var show=matchStatus&&matchKey;
    row.style.display=show?'':'none';
    if(show)visible++;
  });
  var empty=document.getElementById('emptyState');
  if(empty)empty.style.display=visible===0?'':'none';
}
document.getElementById('filterStatus').addEventListener('change',applyFilters);
document.getElementById('filterSearch').addEventListener('input',function(){
  clearTimeout(debounceTimer);debounceTimer=setTimeout(applyFilters,300);
});
</script>
```

**3. 分页**

```script
var PAGE_SIZE=10,currentPage=1;
function paginate(){
  var rows=document.querySelectorAll('.data-table tbody tr');
  var total=rows.length,pages=Math.ceil(total/PAGE_SIZE);
  rows.forEach(function(r,i){
    r.style.display=(i>=(currentPage-1)*PAGE_SIZE&&i<currentPage*PAGE_SIZE)?'':'none';
  });
  renderPagination(total,pages);
}
function renderPagination(total,pages){
  var el=document.getElementById('pager');if(!el)return;
  var html='<span>共 '+total+' 条</span>';
  html+='<button onclick="currentPage=1;paginate()"'+(currentPage===1?' disabled':'')+'>首页</button>';
  for(var i=1;i<=pages;i++){
    html+='<button onclick="currentPage='+i+';paginate()"'+(i===currentPage?' class="active"':'')+'>'+i+'</button>';
  }
  html+='<button onclick="currentPage='+pages+';paginate()"'+(currentPage===pages?' disabled':'')+'>末页</button>';
  el.innerHTML=html;
}
paginate();
```

**4. 确认对话框**

```script
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
// 用于危险操作按钮：<button onclick="showConfirm('确认删除','删除后不可恢复',function(){showToast('已删除','success')},true)">删除</button>
```

**5. Toast 反馈**

```script
function showToast(message,type){
  var t=document.createElement('div');
  t.className='proto-toast';
  var colors={success:'var(--color-tertiary)',error:'var(--color-error)',warning:'#D97706',info:'var(--color-primary)'};
  t.style.borderLeft='4px solid '+(colors[type]||colors.info);
  t.textContent=message;
  document.body.appendChild(t);
  requestAnimationFrame(function(){t.classList.add('show');});
  setTimeout(function(){t.classList.remove('show');setTimeout(function(){t.remove();},300);},3000);
}
```

**6. 条件显隐**

```html
<select id="priceBasis"><option value="province">省级单价</option><option value="city">市级系数</option></select>
<div id="cityCoeffField" style="display:none">
  <label>市级系数</label><input type="number" step="0.01">
</div>

<script>
document.getElementById('priceBasis').addEventListener('change',function(){
  document.getElementById('cityCoeffField').style.display=this.value==='city'?'':'none';
});
</script>
```

**7. 展开/折叠**

```html
<div data-expandable>
  <div class="expand-header" onclick="this.parentElement.classList.toggle('collapsed')">
    <span class="chevron">▼</span> 基本信息
  </div>
  <div class="expand-body">...内容...</div>
</div>

<style>
[data-expandable].collapsed .expand-body{display:none}
[data-expandable].collapsed .chevron{transform:rotate(-90deg)}
.chevron{display:inline-block;transition:transform 0.2s;margin-right:8px}
.expand-header{cursor:pointer;user-select:none;padding:8px 0}
</style>
```

**8. 行 hover 操作按钮**

```css
.data-table .row-actions{opacity:0;transition:opacity 0.15s;display:inline-flex;gap:4px}
.data-table tbody tr:hover .row-actions{opacity:1}
.data-table tbody tr:hover{background:var(--color-surface-container-low)}
.row-actions button{height:28px;padding:0 8px;font-size:12px}
```

### 其他交互要求

1. **禁止 alert()**：不要使用 `alert()` 作为按钮点击的响应。所有操作反馈必须使用 Toast、确认对话框或直接在页面上更新状态。
2. **页内 Tab 内容不能为空**：如果页面有多个 Tab，**每个 Tab 都必须有完整的示例内容**，不能只实现第一个 Tab 而其他 Tab 留空。
3. **筛选必须生效**：筛选器（下拉框、搜索框、日期选择器）必须实际过滤表格数据行，不能只是视觉装饰。
4. **分页必须生效**：分页控件必须切换可见的数据行。
5. **跨页导航**：点击列表中的业务编号（如批次号、单号）应能跳转到对应的详情页面。
6. **所有下拉框必须有选项**：`<select>` 元素必须包含合理的 `<option>` 值，不能是空的下拉框。
7. **Mock 数据注入**：每个页面必须在 `<script>` 标签顶部定义 MOCK_DATA 数组（3-5 条示例记录），包含该页面列表或表单所需的全部字段。筛选、排序、分页、搜索等交互基于 MOCK_DATA 运行。示例：
   ```javascript
   var MOCK_DATA = [
     { id: 1, employee: "张三", dept: "技术部", amount: 1200.00, status: "待审核", date: "2024-03-15" },
     { id: 2, employee: "李四", dept: "产品部", amount: 800.50, status: "已确认", date: "2024-03-14" },
     { id: 3, employee: "王五", dept: "运营部", amount: 2100.00, status: "已驳回", date: "2024-03-13" }
   ];
   ```
8. **向导步骤前进/后退**：向导类页面（wizard）必须有步骤前进和后退逻辑。点击"下一步"显示当前步骤内容并切换到下一步，点击"上一步"返回上一步，步骤指示器同步更新。
9. **表单失焦校验**：create/edit 页面的必填字段在 blur 时校验（空值显示红色错误提示），提交时全量校验。
10. **禁止纯展示按钮**：页面中不能出现无 onclick 事件的按钮或链接。如果某个操作在原型中不需要展示，就不应该出现该按钮。

## 输出自检清单

在输出 HTML 之前，逐项验证以下清单。任何一项未通过都必须修复后再输出：

- [ ] 每个按钮/链接都有 JavaScript 点击事件处理（不能什么都不做，也不能只弹 alert）
- [ ] 每个页内 Tab 都有完整内容（没有空白 Tab 面板）
- [ ] 每个筛选器实际过滤了表格行（改变筛选值后表格数据变化）
- [ ] 每个分页控件切换了可见行
- [ ] 每个 `<select>` 下拉框都有合理的选项
- [ ] 每个表单的必填字段都有校验反馈（失焦 + 提交时）
- [ ] 删除/驳回等危险操作弹出确认对话框
- [ ] 操作成功后显示 Toast 反馈消息
- [ ] 跨页导航正常工作（点击编号跳转详情页）
- [ ] 所有 Tab 面板都有业务数据内容，不是空白占位
- [ ] 空状态（无数据时）有引导信息
- [ ] 条件显隐字段在父字段值变化时正确显示/隐藏
- [ ] 每个页面都有 MOCK_DATA 数组（至少 3 条记录），且 MOCK_DATA 字段与表格列一致
- [ ] 向导页面有步骤前进/后退逻辑，步骤指示器同步更新
- [ ] 没有无 onclick 的"假按钮"（如果不需要该操作，就不要放这个按钮）
- [ ] 筛选器 change/input 事件绑定了实际的表格行过滤逻辑
