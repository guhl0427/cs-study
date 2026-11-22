---
id: l-swe-code-style
slug: code-style
title: 代码规范与重构初步：写给人读的代码
difficulty: 1
estMinutes: 75
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

**注释写「为什么」而不是「是什么」**：

```python
i += 1                      # 注释「i 加一」——废话，删掉
# 用 2 的幂做分桶，避免取模在负数上的歧义——这才值得写
bucket = 1 << shift
```

**重构的定义**：在不改变外部行为的前提下，改善代码内部结构。两个关键词：**不改变行为**（测试一跑全绿才叫重构成功，呼应测试课）与**小步**（每一步都是等价变形 + 立即验证，绝不「重构三天再看能不能跑」）。

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
3. 综合任务：给重构后的 `calc_total` 补 5 个测试（含边界：恰好 100、恰好 50、空订单列表）——先写测试再微调实现，体会 TDD 的节奏。
4. 思考题：「格式化交给工具」为什么还能提升代码质量？省下的评审时间应该用来做什么？
