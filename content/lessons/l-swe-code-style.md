---
id: l-swe-code-style
slug: code-style
title: 代码规范与重构初步：写给人读的代码
difficulty: 1
estMinutes: 80
tags: [规范, 重构]
summary: 代码是写给人读的——命名即文档、格式化交给工具、重构是小步等价的变形，跟着把一段「祖传乱码」重构成人样。
updated: 2026-11-22
resources:
  - id: r-pep8
    title: PEP 8 · Python 代码风格指南
    url: https://peps.python.org/pep-0008/
    type: doc
    difficulty: 2
    note: Python 官方风格指南，原则与其他语言相通。
  - id: r-refactoring-guru
    title: Refactoring.Guru（重构模式图解）
    url: https://refactoringguru.cn/
    type: doc
    difficulty: 2
    note: 所有重构手法的图解百科，本课手法出自这里。
  - id: r-clean-code
    title: 《代码整洁之道》
    url: https://book.douban.com/subject/4199741/
    type: book
    difficulty: 2
    note: 命名、函数长度、注释三章正是本课内容的展开版。
---

> 一句话定义：代码规范让「一百个人写的代码像一个人写的」，重构让代码**在不改变行为的前提下持续变好**——机器管格式，人管意图。

## 概念讲解

**代码是写给人读的，机器只是顺便执行。** 一个函数每天被读十次、只被写一次——规范的价值全部在「读」的那十次：新同事上手快、三个月后的你看得懂、评审时只讨论逻辑不争论风格。

**命名即文档。** 70% 的注释需求其实靠命名就能消灭：

```python
# 差：读不出任何意图
def f(u):
    for x in u[1]:
        if x[2] > 0 and x[1] >= d:
            s += x[1] * x[2]
    return s + 10

# 好：名字自己会说话
def calculate_invoice_total(lines, effective_date):
    for line in lines:
        if line.quantity > 0 and line.date >= effective_date:
            total += line.price * line.quantity
    return total + SHIPPING_FEE
```

命名四原则：见名知义（`user_count` 不是 `n`）、不用拼音缩写黑话、布尔用 is/has/can 前缀、函数用动词（`fetchUser`/`isValid`）。

**格式化与静态检查交给工具**（呼应工程化课）：

| 工具 | 管什么 | Python 生态 |
| ---- | ---- | ---- |
| 格式化 | 缩进、引号、换行 | Black（保存即格式化，零配置） |
| 静态检查 | 低级错误、可疑模式 | Ruff / flake8 |
| 类型检查 | 类型注解错误 | mypy |

分工铁律：**机器管规矩，人管意图**——评审里出现「这里应该用空格」就是团队的工具没配好。

**把风格检查推到提交之前**。靠人自觉总会漏，现代工作流把检查钉进 `git commit`：JS 生态用 **husky + lint-staged**（husky 注册提交钩子，lint-staged 只对暂存文件跑格式化与 lint——不合格的代码根本进不了仓库）；Python 生态用 pre-commit 框架（`.pre-commit-config.yaml` 声明 Black/Ruff 钩子，`pre-commit run --all-files` 一键全检）。**规则执行得越早，返工越便宜**：本地提交时拦截 < CI 拦截 < 评审时人工挑刺。

**注释写「为什么」而不是「是什么」**：

```python
i += 1                      # 注释「i 加一」——废话，删掉
# 用 2 的幂做分桶，避免取模在负数上的歧义——这才值得写
bucket = 1 << shift
```

**函数长度的判断标准**：没有硬性数字，用四个启发式：

1. **一句话职责**：能用一句不含「与/然后」的话描述它做什么——说不出来就是做了两件事，该拆；
2. **一屏测试**：约 30–40 行内读完，不用滚动；
3. **嵌套深度**：超过 2–3 层就该提取函数，或用卫语句提前返回拉平；
4. **if/for 里塞了几层逻辑**：循环体里再套分支再算业务，就该把分支体提取成命名函数。

注意：**数字是提示不是 KPI**——50 行顺序清晰的处理流程可以不拆，10 行但混了两个职责的必须拆。

**重构的定义**：在不改变外部行为的前提下，改善代码内部结构。两个关键词：**不改变行为**（测试一跑全绿才叫重构成功，呼应测试课）与**小步**（每一步都是等价变形 + 立即验证，绝不「重构三天再看能不能跑」）。

**重构工具箱：四个新手法，各配微型示例**（加上主线的改名/消魔法数字/提取函数，共七把刀）：

1. **合并条件（Consolidate Conditional）**——同一结果的条件收拢，读的人少判断几次：

```python
# 前：分散的条件，读的人要在脑内做 or 运算
if amount > BULK_THRESHOLD: total -= FEE
if amount > BULK_THRESHOLD and not order.cancelled: total -= FEE

# 后：一个条件读完，意图唯一
if amount > BULK_THRESHOLD and not order.cancelled:
    total -= FEE
```

2. **移动语句（Slide Statement）**——相关的语句聚在一起，让代码按「一件事」成块：

```python
# 前：准备数据的代码散落在使用点之间，读起来断断续续
shipping = compute_shipping(order)
total = 0
for line in order.lines:
    total += line.price * line.qty
send_email(order.user)

# 后：total 的计算与它的准备工作聚成一块
total = 0
for line in order.lines:
    total += line.price * line.qty
shipping = compute_shipping(order)
send_email(order.user)
```

3. **引入参数对象（Introduce Parameter Object）**——总是结伴出现的参数收拢成一个对象：

```python
# 前：加需求时参数列越排越长，调用方还要记顺序
def export_report(orders, start, end, fmt, include_shipping):

# 后：结伴的参数归成概念，签名稳定，调用方可读
def export_report(orders, period, options):
    """period = {"start": "2026-01-01", "end": "2026-01-31"}
       options = {"fmt": "csv", "include_shipping": True}"""
```

4. **卫语句提前返回（Guard Clauses）**——先处理异常路径，主逻辑不再嵌套：

```python
# 前：主逻辑被嵌套在两层 if 里
def pay(order):
    if order is not None:
        if order.status == "pending":
            ...  # 主逻辑

# 后：异常路径一行一个卫语句，主逻辑顶格写
def pay(order):
    if order is None:
        raise ValueError("订单不存在")
    if order.status != "pending":
        return order
    ...  # 主逻辑
```

**先写测试的重构 vs 重构完再补测试：成本对照**：

| | 先有测试再重构 | 重构完再补测试 |
| ---- | ---- | ---- |
| 行为基准 | 测试先钉住当前行为，改坏了立刻红 | 没有基准，靠肉眼 diff 或人工点页面 |
| 心态 | 放心小步走 | 每一步都在赌 |
| 返工成本 | 低：红一个测试，回退这一步 | 高：错要排查是重构错还是测试写错 |
| 测试质量 | 顺带钉住真实行为 | 容易照着新实现写（把 bug 也测进去） |

结论：**重构与测试是绑定的组合技**——「先写测试的重构」是挂了保险绳的作业，「后补测试」是对着答案抄。

## 代码示例

主线：把一段「祖传乱码」三步重构成人样——每步都是可验证的等价变形：

**第 0 步：坏味道清单**（先学会识别）：

```python
# invoice.py —— 三个典型坏味道：魔法数字、超长函数、裸元组
def calc(orders):
    t = 0
    for o in orders:
        if o[3] > 100:
            t += o[3] * 0.9          # 0.9 是什么？100 是什么？
        elif o[3] > 50:
            t += o[3] * 0.95
        t += 5                       # 又一个魔法数字
    return round(t, 2)
```

**第 1 步：改名 + 消灭魔法数字**（纯机械替换，行为不变）：

```python
BULK_THRESHOLD = 100       # 批量折扣门槛（元）
BULK_RATE = 0.9            # 批量折扣率
MID_THRESHOLD = 50
MID_RATE = 0.95
SHIPPING_FEE = 5           # 运费

def calc_total(orders):
    total = 0
    for order in orders:
        amount = order[3]
        ...                  # 规则照搬，只换名字
```

**第 2 步：提取函数**——折扣规则独立成一个函数（可单独测试！）：

```python
def discounted(amount: float) -> float:
    """按订单金额返回折扣后金额"""
    if amount > BULK_THRESHOLD:
        return amount * BULK_RATE
    if amount > MID_THRESHOLD:
        return amount * MID_RATE
    return amount

def calc_total(orders) -> float:
    total = sum(discounted(o[3]) for o in orders)
    return round(total + SHIPPING_FEE, 2)
```

**第 3 步：数据结构升级**——用字典/类替代裸元组（`o[3]` 谁知道是金额）：

```python
# 订单从元组 (id, user, date, amount) 升级为对象
order = {"id": 1, "amount": 120.0}
total = sum(discounted(o["amount"]) for o in orders)
```

每一步之后跑一遍测试（测试课的 `calc_total` 用例）确认全绿——**重构与测试是绑定的组合技**：没有测试的重构是赌博。

**第 4 步（分支）：用工具箱新手法继续打磨**——每步仍然只做一件事：

```python
# 4a 卫语句 + 合并条件：discounted 的两个 if 收拢，主逻辑顶格
def discounted(amount: float) -> float:
    if amount <= MID_THRESHOLD:        # 卫语句：不参与折扣的直接返回
        return amount
    rate = BULK_RATE if amount > BULK_THRESHOLD else MID_RATE
    return amount * rate
```

```python
# 4b 引入参数对象：给 invoice.py 加「导出报表」需求，参数开始变长
# 前：def export_report(orders, start, end, fmt, include_shipping)
# 后：
def export_report(orders, period, options):
    """period = {"start": ..., "end": ...}
       options = {"fmt": "csv", "include_shipping": True}"""
```

```python
# 4c 移动语句：让 calc_total 的相关计算聚成一块，无关输出挪走
def calc_total(orders, echo=False):
    total = sum(discounted(o["amount"]) for o in orders)   # 主逻辑成块
    if echo:
        print(f"共 {len(orders)} 单")                       # 副作用挪到边缘
    return round(total + SHIPPING_FEE, 2)
```

每步跑一遍测试课的用例确认全绿——`discounted` 被卫语句改写后行为完全一致（≤50 原样返回，>100 打九折，其余打九五折），这就是「等价变形」的验证方式。四步走完再回看：函数缩短了一半、嵌套消失、参数有了名字——**每一刀都小，但组合起来代码焕然一新**。

## 常见坑

1. **坑 1：边加功能边大重构**。改逻辑和改结构混在同一个提交里，出了问题分不清是重构引入的还是新功能引入的——分开提交：先重构（全绿）再功能。
2. **坑 2：没有测试就动手重构**。「重构完能不能跑」全靠猜——先补一层表征当前行为的测试（哪怕粗糙），再动手。
3. **坑 3：命名矫枉过正**。`userListSortedByCreateDateDescending` 这种名字本身就是坏味道——名字精确到「下次不用查」即可，别写成段落。
4. **坑 4：一次重构摊得太大**。「我顺便把整个模块都重构了」——PR 大到没人能评审（呼应协作课的好 PR 三标准）。小步：一个坏味道一个提交。
5. **坑 5：格式化工具与手工风格对抗**。团队一半人用 Black 一半手调，diff 永远是格式噪音——统一「保存即格式化」，格式争论从评审里消失。
6. **坑 6：把「重构」当挡箭牌**。需求没做完说「我在重构」——重构的定义是不改行为，功能变更请走正常需求流程。

## 小练习

1. 把本课主线三步亲手走一遍，每步之后写一个「行为不变」的验证方法（打印前后输出对比，或跑测试）。
2. 识别你之前项目里的一段代码：列出三个坏味道，用「改名/提取函数/消灭魔法数字」三手法重构，前后各打印一遍输出证明等价。
3. 综合任务：给重构后的 `calc_total` 补 5 个测试（含边界：恰好 100、恰好 50、空订单列表）——先写测试再微调实现，体会 TDD 的节奏；然后按主线第 4 步用卫语句改写 `discounted`，跑测试确认全绿（对照表里「先有测试再重构」的那一列）。
4. 思考题：「格式化交给工具」为什么还能提升代码质量？省下的评审时间应该用来做什么？
