---
id: l-py-collections
slug: py-collections
title: 四大容器：list、dict、tuple、set
difficulty: 1
estMinutes: 85
tags: [Python, 入门, 容器]
summary: 一张对照表选对容器，四种容器各司其职——用一条「word count」主线项目，把 Python 数据组织的核心一次讲透。
updated: 2026-11-22
resources:
  - id: r-py-data-doc
    title: Python 官方教程 · 数据结构
    url: https://docs.python.org/zh-cn/3/tutorial/datastructures.html
    type: doc
    difficulty: 1
    note: 官方对列表、字典、元组、集合的完整讲解，本课的权威延伸阅读。
  - id: r-py-visual
    title: Python Tutor 在线可视化执行
    url: https://pythontutor.com/
    type: tool
    difficulty: 1
    note: 能可视化「两个名字指向同一个列表」的引用现象，第 1 个坑的直观教具。
---

> 一句话定义：Python 用 list（有序可改）、dict（键值映射）、tuple（不可变）、set（去重集合）四种容器覆盖所有数据组织场景——**选对容器，一半的逻辑就自动成立**。

## 概念讲解

### 四种容器对照表与选型口诀

程序 = 数据 + 处理。数据几乎总装在容器里，选错容器会让代码又绕又脆。一张表看清四兄弟的分工：

| 容器 | 写法 | 有序 | 可变 | 允许重复 | 典型场景 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| `list` | `[1, 2, 3]` | 有 | 可 | 是 | 一串会增删改的东西：待办、成绩表 |
| `dict` | `{"a": 1}` | 按插入序 | 可 | 键不重复 | 键值映射：配置、计数器、对象属性 |
| `tuple` | `(1, 2, 3)` | 有 | **不可** | 是 | 固定结构不许动：坐标、`(名, 分)` 对 |
| `set` | `{1, 2, 3}` | 无 | 可 | **否** | 去重、判断「在不在」、交并差 |

选型口诀背下来：**一串东西用 list，查对应关系用 dict，不许改的用 tuple，去重和成员判断用 set**。判断时先问两个问题：数据要不要「按名字取」（要 → dict）？要不要去重（要 → set）？都不是才轮到 list。tuple 特殊些——它不是用来「装变化的数据」，而是用来**承诺**「这份数据不会变」。

### list 深入：增删改查与推导式

list 是最常用的容器，一套增删改查走全：

```python
scores = [92, 88, 75]
scores.append(60)      # 尾部加
scores.insert(0, 100)  # 指定位置插
scores[1] = 95         # 改
del scores[0]          # 按下标删
top = scores.pop()     # 弹出末尾并返回它
scores.remove(75)      # 按值删（只删第一个匹配）
print(88 in scores)    # 查：成员判断，返回 True/False
```

切片（字符串课讲过）对 list 同样适用：`scores[1:3]`、`scores[::-1]` 都返回**新列表**。list 可以嵌套出二维结构 `matrix = [[1, 2], [3, 4]]`，用 `matrix[0][1]` 取——但更常见的嵌套是下一节的「字典列表」。真正让 list 火力全开的是**列表推导式**：「对每个元素做变换（可加过滤）」压成一行：

```python
scores = [92, 55, 88, 40]
doubled = [s * 2 for s in scores]              # 每个元素 ×2
passed = [s for s in scores if s >= 60]        # 带过滤
labels = [f"{s}分" for s in scores]            # 生成新形态
```

读法固定：「结果 = 对 for 里的每个 x 求 expr，条件满足的才要」。判断标准：循环体只有一两行、逻辑纯变换时用推导式，超过就老实写 for 循环——可读性优先。

### dict 深入：键值映射与 get 兜底

dict 存「键 → 值」的映射，像一本**通讯录**：不翻页（下标）找，直接按名字（键）定位，速度极快：

```python
phone = {"小明": "138000", "小红": "139111"}
phone["小刚"] = "137222"        # 增：新键直接赋值
phone["小明"] = "138999"        # 改：同键覆盖
del phone["小红"]               # 删
print("小明" in phone)          # 查键存在
print(phone["小明"])            # 取值；键不存在则 KeyError 崩溃
```

新手第一大崩溃源就是 `KeyError`：访问不存在的键直接炸。**兜底用 `get`**：`phone.get("小丽", "未登记")` 查不到不炸、返回默认值。它是「安全查一次」的标准写法，尤其适合计数场景。遍历 dict 有惯用姿势——`items()` 同时给键和值：

```python
for name, num in phone.items():    # 解包 (键, 值)
    print(f"{name}: {num}")
```

dict 推导式同 list：`{s: len(s) for s in ["ab", "cde"]}` 得 `{'ab': 2, 'cde': 3}`。记住 dict 的本质约束：**键必须不可变**（字符串、数字、tuple 都行，list 不行，原因见 tuple 一节）。

### tuple：不可变的意义与何时当字典键

tuple 和 list 长得像，语义完全不同——它**创建后不可修改**，相当于 list 的「封条版」。什么时候需要封条？两类场景。**其一，固定结构的记录**：一个点 `(x, y)`、一条 `(姓名, 分数)`，如果允许别人往里 append 一个第三项，数据结构就被破坏了；tuple 用不可变性保证「永远是两个元素」。**其二，字典键**：dict 要求键不可变，因为 dict 内部靠键算「地址」（哈希）来定位——键若能被改，地址就变了，存的数据永远找不回来。所以 `d[(3, 4)] = "点"` 合法，`d[[3, 4]]` 直接报 `TypeError: unhashable type: 'list'`。

顺手的语法：**解包** `x, y = (3, 4)`，以及单元素 tuple 必须带逗号 `(5,)`——`(5)` 只是数字 5 加括号。函数「返回多个值」返回的就是 tuple（上一课已用）。

### set：去重与交并差

set 只存「不重复的东西」，无序。两大用途：**去重**——`set([1, 1, 2, 3])` 直接得 `{1, 2, 3}`，想保序去重就配 sorted：`sorted(set(xs), key=xs.index)`；**集合运算**——数学课的交并差原样可用：

```python
py = {"小明", "小红", "小刚"}
java = {"小红", "小丽"}
both = py & java        # 交集 {'小红'}
allst = py | java       # 并集：四人
only = py - java        # 差集：只学 Python 的
print("小丽" in java)    # 成员判断，set 比 list 快得多
```

注意字面量的坑：空集合必须写 `set()`，因为 `{}` 是空 **dict**——一个符号之差，容器完全不同。set 里也不能放 list（同 dict 键的道理）。

### 容器嵌套实战：对象数组形态

真实程序里最高频的数据形态是**「字典的列表」**——每个 dict 是一个「对象」，list 把它们串成数组：

```python
students = [
    {"name": "小明", "score": 92, "tags": ["班长"]},
    {"name": "小红", "score": 75, "tags": []},
]
print(students[0]["name"])          # 小明：先按下标再按键
students[1]["tags"].append("体育")  # 深层操作照样行
```

读法是「一层一层剥」：`students[1]["score"]` 先选第 1 个学生再取 score 键。这种形态与 JSON 格式完全同构，也是后面文件课读写 JSON 的基础。标准库 `collections.Counter` 是「计数 dict」的现成版：`Counter(["a", "b", "a"])` 直接得 `Counter({'a': 2, 'b': 1})`，还带 `most_common(n)` 方法——word count 的官方捷径，但本课主线为了教学先手写，工程里可以直接用它。

## 代码示例

主线任务：**完整实现 word count（词频统计）**。这是文本处理界的「Hello World+」：给一段英文文本，统计每个单词出现次数，输出出现最多的前 3 名。四种容器在本任务里各司其职——list 装词、dict 计数、tuple 打包排名、set 答疑。跟着做约 25 分钟。

### 第 0 步：需求与数据

```python
text = """python is simple python is powerful
simple is better than complex
python is not magic python is craft"""
```

需求拆解：**切词**（文本 → 单词列表）→ **计数**（列表 → 词频 dict）→ **排名**（dict → 前 3 名）。老规矩，拆成能独立验证的三块。

### 第 1 步：切词——得到 list

用字符串课学的组合拳把文本切成干净的单词列表：

```python
words = text.lower().replace("\n", " ").split()
print(words[:6])       # 切片只看前 6 个，别刷屏
print(len(words))      # 总词数
```

运行结果：

```text
['python', 'is', 'simple', 'python', 'is', 'powerful']
17
```

`lower()` 统一大小写（保证 Python 和 python 算同一个词）、`replace` 把换行变空格、无参 `split()` 按连续空白切开——三招连环，文本变 list。

### 第 2 步：计数——dict + get 兜底登场

核心一招：遍历词表，往 dict 里累加：

```python
counts = {}
for w in words:
    counts[w] = counts.get(w, 0) + 1
print(counts)
```

运行结果：

```text
{'python': 4, 'is': 5, 'simple': 2, 'powerful': 1, 'better': 1,
 'than': 1, 'complex': 1, 'not': 1, 'magic': 1, 'craft': 1}
```

逐字理解 `counts.get(w, 0) + 1`：查 w 的旧次数，没出现过就当 0，加 1 后存回。这一行同时处理「首见」和「再现」两种情况，不用 if/else 分支——**get 兜底是 dict 计数的灵魂写法**。注意 dict 保留「键第一次出现的顺序」，所以输出顺序就是词的出场序。

### 第 3 步：set 出场——回答「有多少个不同的词」

dict 的键天然去重，但 set 能把这个语义表达得更直白，还顺便做完整性检查：

```python
unique = set(words)
print(len(unique))                    # 10 个不同词
assert len(unique) == len(counts)     # set 数出的「不同词数」应与 dict 键数一致
```

运行结果：

```text
10
```

`assert` 是断言：条件为假立刻崩溃。用两种独立途径算同一个数并互相验证，是处理数据时的自检习惯。

### 第 4 步：排名——tuple 解包取 TopN

现在回答「谁出现最多」。dict 不能直接排序，先转成 `(词, 次数)` tuple 列表：

```python
ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
top3 = ranked[:3]
print(top3)
```

运行结果：

```text
[('is', 5), ('python', 4), ('simple', 2)]
```

三件套拆解：`counts.items()` 把 dict 变成 `[(键, 值), ...]` 列表；`key=lambda kv: kv[1]` 告诉 sorted「按每个元组的第 1 项（次数）比」——lambda 是临场写的小匿名函数；`reverse=True` 从大到小。最后切片取前 3。

### 第 5 步：组装成完整程序并输出报表

把四步合成 `wordcount.py`（完整代码）：

```python
text = """python is simple python is powerful
simple is better than complex
python is not magic python is craft"""

words = text.lower().replace("\n", " ").split()   # list：装词

counts = {}                                       # dict：计数
for w in words:
    counts[w] = counts.get(w, 0) + 1

unique = set(words)                               # set：验证去重
assert len(unique) == len(counts)

ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
top3 = ranked[:3]                                 # tuple：打包 (词, 次数)

print(f"总词数 {len(words)}，不同词 {len(unique)} 个")
print("-" * 24)
for word, num in top3:                            # 解包 tuple 输出
    bar = "#" * num
    print(f"{word:<10}{num:>3}  {bar}")
```

运行结果：

```text
总词数 17，不同词 10 个
------------------------
is          5  #####
python      4  ####
simple      2  ##
```

验收四种容器的分工：**list** 承接切词结果、**dict** 完成计数、**set** 做去重自检、**tuple** 承载排名并支持 `for word, num` 解包输出。加上 f-string 对齐（`{word:<10}` 左对齐、`{num:>3}` 右对齐）画出 ASCII 条形图——一个 17 行的完整工具就此交付。工程里计数可直接用 `collections.Counter(words)` + `most_common(3)`，但你亲手写过的这 17 行才是理解它工作原理的底气。

## 常见坑

1. **坑 1：`b = a` 以为拷贝了列表**。现象：`b = a; b.append(4)` 之后 a 也变长了。原因：赋值复制的是**引用**——两个名字指向同一个列表，不是两份数据（用 Python Tutor 可视化看得一清二楚）。对策：真拷贝写 `b = a.copy()` 或 `b = a[:]`；嵌套列表要用 `copy.deepcopy`。
2. **坑 2：直接下标访问可能不存在的键**。现象：`counts["小丽"]` 抛 `KeyError: '小丽'` 崩溃。原因：dict 的 `[]` 访问对缺失键零容忍。对策：可能缺的键一律 `counts.get("小丽", 0)`；「先判断再访问」可用 `in`。
3. **坑 3：list 当 dict 的键**。现象：`d[[1, 2]] = "x"` 报 `TypeError: unhashable type: 'list'`。原因：dict 靠键的哈希值定位，list 可变、哈希值会漂，Python 直接禁止。对策：改用 tuple `d[(1, 2)] = "x"`。
4. **坑 4：边遍历边增删同一容器**。现象：`for x in xs: xs.remove(...)` 后元素漏处理。原因：遍历器按位置走，容器中途变长变短会错位。对策：遍历副本 `for x in xs[:]`，或用推导式生成新列表替代原地删除。
5. **坑 5：`{}` 当空 set 用**。现象：`s = {}; s.add(1)` 报 `AttributeError: 'dict' object has no attribute 'add'`。原因：`{}` 是空 dict，空 set 只能写 `set()`。对策：见到 `s.add` 报错先查容器类型 `type(s)`。
6. **坑 6：对 dict 直接 sorted 以为在排值**。现象：`sorted(counts)` 得到的是**键**的列表，按字典序排——以为是按次数排。原因：迭代 dict 默认只走键。对策：排「键值对」用 `sorted(counts.items(), key=lambda kv: kv[1], reverse=True)`；reverse 参数别忘了加。

## 小练习

1. 给定 `nums = [3, 1, 4, 1, 5, 9, 2, 6]`：用切片分别取出「偶数下标的元素」「后四个」「反转」，再用推导式筛出所有偶数值。
2. 把两个小组名单 `group_a`、`group_b` 用 set 求「都报了名」「只报了 A」「总共多少人」三种结果，并解释为什么不用 list 循环判断。
3. 写函数 `merge(profile, extra)`：把两个 dict 合并成一个（extra 的键优先），返回新 dict——提示：`{**profile, **extra}` 或循环 `.update()`，注意别修改传入的原字典。
4. **综合小项目**：给 word count 加三件事——过滤停用词（`the/is/a` 这类高频虚词，用 set 存，切词后剔除）、TopN 数量改成函数参数 `n`、输出报表增加「出现 1 次的稀有词个数」；再用 `collections.Counter` 重写一遍计数逻辑，对比手写版的行数差异。保存为 `wc2.py` 运行验证。
