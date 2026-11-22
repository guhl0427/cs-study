---
id: l-py-collections
slug: py-collections
title: 列表、字典与循环：数据怎么装
difficulty: 1
estMinutes: 35
tags: [Python, 数据结构]
summary: list 管顺序、dict 管映射、set 管去重——选对容器，一半的代码就不用写了。
updated: 2026-11-22
resources:
  - id: r-py-data
    title: Python 官方教程 · 数据结构
    url: https://docs.python.org/zh-cn/3/tutorial/datastructures.html
    type: doc
    difficulty: 1
    note: 本节的权威展开版。
---

> 一句话定义：内置容器就是四种「装数据的盒子」——选对盒子，操作几乎是免费的。

## 概念讲解

| 容器 | 字面量 | 有序？ | 关键能力 | 典型场景 |
| ---- | ---- | ---- | ---- | ---- |
| list 列表 | `[1, 2, 3]` | ✓ | 按位置索引、增删 | 待办清单、日志 |
| dict 字典 | `{"a": 1}` | ✓(3.7+) | 键 → 值 映射，O(1) 查找 | 用户信息、配置 |
| tuple 元组 | `(1, 2)` | ✓ | **不可变** | 坐标、固定记录 |
| set 集合 | `{1, 2}` | ✗ | 去重、交并差 | 标签、已访问集合 |

**选型口诀**：按顺序取 → list；按键找 → dict；不许变 → tuple；要唯一 → set。

字典是最该学透的一个——现实数据几乎都是「键值对」（学生→成绩、文章→属性）。三个高频操作：

```python
scores = {"小明": 92, "小红": 75}
scores["小刚"] = 58              # 增/改
print(scores["小明"])            # 查（键不存在会 KeyError）
print(scores.get("小丽", 0))     # 安全查：不存在返回默认值 0
for name, score in scores.items():   # 同时遍历键与值
    print(name, score)
```

**推导式**是 Python 的招牌语法——一行完成「过滤 + 变换」：

```python
scores = {"小明": 92, "小红": 75, "小刚": 58}
passed = {name: s for name, s in scores.items() if s >= 60}
print(passed)                    # {'小明': 92, '小红': 75}
```

## 代码示例

综合运用：统计一段文本里每个词出现的次数（经典 word count）：

```python
text = "the quick the fox the dog fox"
counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1

print(counts)
# {'the': 3, 'quick': 1, 'fox': 2, 'dog': 1}

# 出现次数最多的词（按值倒序排序）
top = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
print(top[0])                    # ('the', 3)
```

这段十行代码覆盖了：split 切词、dict 计数、get 兜底、lambda 排序——以后做任何统计类小工具都是这个骨架。

## 常见坑

1. **坑 1：`b = a` 是引用不是拷贝**。`b = a; b.append(4)` 之后 a 也变成 4 个元素——两个名字指向同一个列表。真拷贝用 `b = a.copy()` 或 `list(a)`。
2. **坑 2：遍历 dict 时增删键**。`for k in d: d.pop(k)` 直接 RuntimeError。要改就先 `for k in list(d.keys()):` 快照一份键。
3. **坑 3：索引从 0 开始**。`scores[1]` 是第二个元素；`scores[len(scores)]` 必然越界。负索引 `-1` 是最后一个——记住「[开始:结束) 左闭右开」。

## 小练习

1. 把示例的 word count 改成「统计每个字出现的次数」（中文也适用）。
2. 用推导式从 `[1..20]` 里挑出所有偶数的平方。
3. 思考题：为什么 dict 查找是 O(1) 而 list 查找某个值是 O(n)？（提示：哈希表 vs 逐个比对。）
