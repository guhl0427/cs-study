---
id: l-swe-code-style
slug: code-style
title: 代码规范与重构初步
difficulty: 1
estMinutes: 35
tags: [工程实践, 可读性]
summary: 代码是写给人读的——命名即文档，格式与低级检查交给工具，重构是在不改行为的前提下整理结构。
updated: 2026-11-22
resources:
  - id: r-pep8
    title: PEP 8 · Python 官方风格指南
    url: https://peps.python.org/pep-0008/
    type: doc
    difficulty: 1
    note: Python 事实标准，命名与布局的通用原则各语言都适用。
  - id: r-black-doc
    title: Black 格式化工具
    url: https://black.readthedocs.io/
    type: tool
    difficulty: 1
    note: 「零配置、零争论」的 Python 格式化器。
  - id: r-refactoring-com
    title: refactoring.com（Martin Fowler）
    url: https://refactoring.com/
    type: book
    difficulty: 3
    note: 重构手法目录，本节两个手法都出自这里。
---

> 一句话定义：规范和重构让代码「读起来像文章」——机器不在乎格式，但三个月后的你和接手的同事在乎。

## 概念讲解

代码有两位读者：编译器只要求语法正确，人却要靠它理解意图。**命名即文档**——名字是离代码最近的说明书：

```python
def f(u):                  # f 是什么？u 又是什么？只能逐行推理
    s = 0
    for x in u[1]:
        s += x[1] * x[2]
    return s + 10          # 10 是运费？手续费？没人知道
```

换成 `order_total(member_level, cart_items)`——读完签名就懂了七成。格式与低级问题则**交给工具**：Python 用 Black 一键统一格式，JS 用 ESLint 查潜在问题 + Prettier 管格式，Go 干脆 `gofmt` 官方钦定——争「空格还是 Tab」毫无价值，工具 0.1 秒终结争论。

注释写**为什么**，不写**是什么**——「是什么」代码自己会讲：

```python
total *= 0.85   # 坏：这行明明在做乘法，注释是废话
total *= 0.85   # 好：VIP 全场 85 折（2026-03 运营活动约定）
```

三个最常见的坏味道，见到就想动手：

| 坏味道 | 症状 | 对应手法 |
| ---- | ---- | ---- |
| 超长函数 | 一屏放不下、干好几件事 | 提取函数 |
| 重复代码 | 同一段逻辑抄了两份（改一处忘一处） | 提取公共函数 |
| 魔法数字 | `return s + 10` 里裸奔的 10 | 提成命名的常量 |

**重构**的定义：在不改变外部行为的前提下调整内部结构——前提是有测试兜底（上一节的用处来了）。

## 代码示例

对上面的 `f(u)` 动手：提取函数 + 改名 + 消灭魔法数字，行为完全不变：

```python
# 重构前：能跑，但读者必须靠猜
def f(u):
    s = 0
    for x in u[1]:
        s += x[1] * x[2]
    if u[0] == "vip":
        s *= 0.85
    return s + 10

# 重构后：结构自己会说话
SHIPPING_FEE = 10  # 运费固定 10 元（调价只动这一处）

def cart_subtotal(items):
    """购物车原价小计，items 每行为 (商品名, 单价, 数量)"""
    return sum(price * qty for _, price, qty in items)

def order_total(member_level, cart_items):
    """订单应付金额 = 小计（VIP 打 85 折）+ 运费"""
    total = cart_subtotal(cart_items)
    if member_level == "vip":
        total *= 0.85
    return total + SHIPPING_FEE
```

验证「行为没变」的办法：重构前先给 `f` 写好单元测试，重构后让 `f` 转调 `order_total`，测试全绿即安全着陆——这就是测试课说的「重构的信心来源」。

## 常见坑

1. **坑 1：命名雾语**。`a`、`tmp`、`data2` 迫使读者靠上下文猜意图。自检标准：不看实现，只凭名字敢不敢调用它。
2. **坑 2：注释说谎**。代码改了注释没改，过时注释比没有注释更害人。对策：注释只写代码推不出来的「为什么」。
3. **坑 3：重构和加功能混在一个 commit**。出问题时分不清是「改坏了」还是「新功能没写对」。对策：分开提交，重构 commit 不带任何行为变化。

## 小练习

1. 给示例的重构前版本写 2 个单元测试；重构后重跑，用绿灯证明「行为没变」。
2. 从你最近的作业里挑一个 30 行以上的函数，用「提取函数」拆成两三个以意图命名的小函数。
3. 思考题：为什么「注释写为什么」比「注释写是什么」更不容易过时？
