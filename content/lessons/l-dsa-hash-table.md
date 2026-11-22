---
id: l-dsa-hash-table
slug: hash-table
title: 哈希表
difficulty: 2
estMinutes: 80
tags: [数据结构, 哈希表, dict, set, 两数之和]
summary: 从「哈希函数把键算成桶下标」理解 O(1) 查询的原理，掌握冲突三解法与负载因子扩容，学会计数/去重/索引映射三大实战模式，做透 LeetCode 1 与 49 两道真题。
updated: 2026-11-22
resources:
  - id: r-py-dict
    title: Python 官方文档 · dict 与 set
    url: https://docs.python.org/zh-cn/3/tutorial/datastructures.html#dictionaries
    type: doc
    difficulty: 1
    note: dict/set 用法官方教程，本课实战模式的标准参考。
  - id: r-py-hash
    title: Python 官方文档 · hash() 与可哈希性
    url: https://docs.python.org/zh-cn/3/library/functions.html#hash
    type: doc
    difficulty: 2
    note: 为什么 list 不能当 dict 的键，答案在这。
  - id: r-visualgo
    title: VisuAlgo · Hash Table
    url: https://visualgo.net/zh/hashtable
    type: tool
    difficulty: 1
    note: 动画演示哈希、冲突与拉链的过程。
---

> 一句话定义：哈希表用「哈希函数把键直接算成存储下标」实现近似 O(1) 的按值存取——数组靠下标直达，哈希表让你自己造下标。

## 概念讲解

### O(1) 查询的原理：自己算出地址

数组的 O(1) 是「起始地址 + 下标 × 大小」。但现实中的键是姓名、ID、字符串，不是整数下标。哈希表的思路：**用哈希函数把任意键换算成数组下标**，然后照数组的路子直达。

```text
键 "wang" ──哈希函数 h──→ 大整数 872346… ──对桶数取模──→ 桶下标 3
                                    ↓
 桶数组:  [0][1][2][3][4][5][6][7]
                   ↑
                 桶 3 里存着 ("wang", 95)
```

存和查走同一条路：插入时算下标放进去；查询时算同一个下标直达——**不需要任何比较和遍历**，这就是 O(1)。类比：储物柜 1000 个，前台不发柜号单，而是「报你的姓名，我从姓名算出柜号」，谁都不用翻登记本。

哈希函数必须满足两条性质：

1. **确定性**：同一个键无论算多少次，结果必须相同。否则存的时候在 3 号桶、查的时候算出 5 号桶，数据就「丢了」。这直接推出哪些东西能当 dict 的键——**可哈希**：数字、字符串、元组（内容不可变）都行；list、dict、set 不行（内容可变，哈希值会漂移）。这正是「dict 的键必须是不可变类型」的原理层解释。
2. **均匀性**：不同的键尽量均匀散开。全挤进少数几个桶，哈希表就退化成链表，O(1) 变 O(n)。

### 冲突：两个键算进了同一个桶

键的空间无限（字符串无限多），桶的数量有限——数学上冲突不可避免（鸽笼原理）。三种主流解法：

| 解法 | 做法 | 优点 | 缺点 | 使用者 |
| ---- | ---- | ---- | ---- | ---- |
| 拉链法 | 桶里挂一条链表，冲突的都串上去 | 实现简单、负载因子可超 1 | 链表爬行慢、额外指针 | Python dict 底层用的是它的变体思路 |
| 开放寻址 | 冲突了就顺位探下一个空桶 | 全在连续数组，缓存友好、省指针 | 表会「堆块」，删除要打墓碑标记 | CPython dict 实际方案 |
| 再哈希 | 冲突了换第二个哈希函数再算 | 分布更散 | 要存多个函数、计算贵 | 布隆过滤器等场合 |

三种解法的本质都是「给后来者找落脚点」，代价不同。查 Python dict 文档能看到它用**开放寻址**（探针序列），理由正是「对缓存友好」——现代 CPU 上「连续内存」的隐性收益反复出现（数组、B+树、开放寻址，同一逻辑）。

### 负载因子与扩容：O(1) 的前提条件

**负载因子 = 元素数 ÷ 桶数**。它衡量拥挤程度：因子越大，冲突越频繁，探针越长。经验阈值约 2/3——超过就**扩容**：申请约 2 倍的新桶数组，把所有元素**重新哈希**搬过去。

```text
负载因子 8/8 = 1.0 > 2/3，触发扩容：
旧表(8 桶):  [•][•][•][•][•][•][•][•]   8 个元素挤 8 个桶
                  ↓ 全部重算下标（桶数变了，下标全变！）
新表(16 桶): [•][ ][•][ ][ ][•][ ][•][ ][ ][ ][•][ ][ ][ ][ ]
负载因子 8/16 = 0.5，冲突概率骤降
```

注意「重新哈希」：桶数从 8 变 16，`hash % 8` 和 `hash % 16` 结果不同，**每个元素都要搬家重算**，单次扩容 O(n)。但和大 O 一课的动态数组扩容一样，容量翻倍使扩容越来越稀疏，摊到每次插入仍是均摊 O(1)。**为什么 dict 查询是「均摊 O(1)」而不是绝对 O(1)**，答案就在这里：扩容那一瞬间是 O(n)，平时是 O(1)。

### Python dict/set 的实现要点

- dict 底层：开放寻址哈希表，查询/插入/删除均摊 O(1)；Python 3.7 起**保证记住插入顺序**（靠紧凑的 entries 数组），遍历顺序可预期。
- set 就是「只存键的 dict」：成员判断 `x in s` 均摊 O(1)，而 `x in list` 是 O(n)——大 O 一课实测过 100 倍差距。
- 可哈希才能进 dict/set；自定义类实例默认可哈希（按 id），重写 `__eq__` 后需同步重写 `__hash__`，否则「相等」的对象进不同桶，字典行为错乱。
- 键的类型要稳定：`1`、`1.0`、`True` 哈希值相同（值相等），三者只能占一个槽位——这是 Python 的规定，不是 bug。

### 三大实战模式：哈希表 90% 的用法

| 模式 | 写法 | 典型问题 |
| ---- | ---- | ---- |
| 计数 | `d[k] = d.get(k, 0) + 1` 或 `Counter` | 字符频率、多数元素、异位词分组 |
| 去重 | `seen = set()`，`if x in seen: 跳过` | 判重、环检测、已访问标记 |
| 索引映射 | `d[val] = index`，值→位置的倒排表 | 两数之和、按值反查、缓存 |

三个模式的公共思想：**把「每次都要找一遍」变成「存一次，以后直达」**——用 O(n) 空间买 O(1) 时间，这正是大 O 一课说的时空互换。

## 代码示例

### 第 1 部分：LeetCode 1 两数之和（完整解法）

```python
# 题目：在数组中找出和为 target 的两个整数的下标，恰好一个解。
# 例：nums = [2, 7, 11, 15], target = 9 → [0, 1]（2 + 7 = 9）

def two_sum_brute(nums, target):        # 暴力版：O(n²)
    n = len(nums)
    for i in range(n):
        for j in range(i + 1, n):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []

def two_sum(nums, target):              # 哈希版：O(n)
    seen = {}                           # 值 → 下标 的索引映射
    for i, v in enumerate(nums):
        need = target - v               # 我需要找的另一半
        if need in seen:                # O(1) 查它来过没有
            return [seen[need], i]
        seen[v] = i                     # 把自己登记进索引（放在检查之后，
                                        # 避免「自己配自己」）
    return []

# 推演 nums=[2,7,11,15], target=9：
# i=0 v=2  need=7  不在 seen → 登记 {2:0}
# i=1 v=7  need=2  在 seen！→ 返回 [0, 1]
print(two_sum([2, 7, 11, 15], 9))       # [0, 1]
print(two_sum_brute([2, 7, 11, 15], 9)) # [0, 1]
print(two_sum([3, 2, 4], 6))            # [1, 2]（注意不能是 [0,0] 自己配自己）
```

核心转变：暴力问「两个数凑不凑」，哈希版把问题改成「**对每个数，另一个数来过没有**」——一遍扫描，用 dict 当「来过的名册」。这就是索引映射模式的威力。

### 第 2 部分：LeetCode 49 字母异位词分组（完整解法）

```python
# 题目：把字母异位词（字母相同、顺序不同）分组。
# 例：["eat","tea","tan","ate","nat","bat"]
#   → [["eat","tea","ate"],["tan","nat"],["bat"]]

from collections import defaultdict

def group_anagrams(strs):
    groups = defaultdict(list)          # 签名 → 单词列表
    for s in strs:
        key = ''.join(sorted(s))        # 排序后的字母串 = 异位词的公共签名
        groups[key].append(s)           # 同签名的自动归为一组
    return list(groups.values())

# 推演："eat"→"aet"，"tea"→"aet"，"ate"→"aet" 同桶；"tan"/"nat"→"ant"；"bat"→"abt"
print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
# [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]

# 另一种签名：26 个字母的计数元组（对超长单词更快）
def group_anagrams_count(strs):
    groups = defaultdict(list)
    for s in strs:
        count = [0] * 26
        for ch in s:
            count[ord(ch) - ord('a')] += 1     # 计数模式
        groups[tuple(count)].append(s)         # tuple 可哈希，list 不行！
    return list(groups.values())

print(group_anagrams_count(["eat", "tea", "tan", "ate", "nat", "bat"]))
# [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]
# 两种签名对比：排序 O(k log k)（k 为单词长）；计数 O(k)，但键长固定 26
```

这题把两个模式叠加：**计数**（签名）+ **索引映射**（签名→组）。注意 `tuple(count)` 这个细节——list 不可哈希，直接当键会 TypeError，正是「可哈希性」知识的实战落点。

### 第 3 部分：三大模式各来一发

```python
from collections import Counter, defaultdict

# 模式一：计数——找出现次数超过一半的元素（LeetCode 169 多数元素）
def majority_element(nums):
    counts = Counter(nums)
    return counts.most_common(1)[0][0]
print(majority_element([3, 2, 3]))          # 3

# 模式二：去重——判断数组是否含重复元素（LeetCode 217）
def contains_duplicate(nums):
    seen = set()
    for v in nums:
        if v in seen:
            return True
        seen.add(v)
    return False
print(contains_duplicate([1, 2, 3, 1]))     # True

# 模式三：索引映射——第一次出现且唯一的字符下标（LeetCode 387）
def first_uniq_char(s):
    counts = Counter(s)                     # 先计数
    for i, ch in enumerate(s):              # 再按原顺序找第一个计数为 1 的
        if counts[ch] == 1:
            return i
    return -1
print(first_uniq_char("leetcode"))          # 0
print(first_uniq_char("aabb"))              # -1
```

三道题都是一遍扫描 + 一本哈希账。刷题时养成反射：**「出现过吗 / 出现几次 / 在哪出现过」三类问题，先想哈希表**。

## 常见坑

1. **坑 1：用可变对象当 dict 键**。现象：`d[[1,2]] = x` 直接 TypeError。原因：list 内容可变，哈希值会漂移，破坏确定性。排查：键用 tuple/frozenset/字符串；确需「多维键」用 `(x, y)` 元组。
2. **坑 2：访问不存在的键**。现象：`d["missing"]` 抛 KeyError。原因：dict 没有默认值语义。排查：读用 `d.get(k, 默认)`，写用 `defaultdict(int/list)` 或 `setdefault`，判存在用 `k in d`。
3. **坑 3：遍历时增删键**。现象：`for k in d: if ...: del d[k]` 抛 RuntimeError。原因：遍历期间改变表结构是未定义行为。排查：先 `list(d.keys())` 快照再删，或构造新 dict。
4. **坑 4：以为 dict 有序是因为遍历按哈希序**。现象：依赖遍历顺序却说不清为什么。原因：3.7 起有序来自紧凑 entries 数组按插入序存储，是**语言保证**而非实现巧合；但 3.6 及更早无此保证。排查：跨版本代码不依赖隐式顺序，显式排序或用 OrderedDict 表意图。
5. **坑 5：重写 `__eq__` 不重写 `__hash__`**。现象：自定义对象作为键，「相等」的两个对象却查出两个结果。原因：eq 相等则 hash 必须相等，否则落进不同桶。排查：改 `__eq__` 时同步重写 `__hash__`（返回基于相等字段的哈希）。
6. **坑 6：哈希碰撞故意被敌人构造时无警惕**。现象：接受外部输入当键的接口被特定数据拖慢。原因：均匀性是对随机输入说的，攻击者可构造全撞一个桶的输入（哈希洪水攻击）。排查：生产服务用语言内置的随机化哈希（Python 字符串哈希默认随机化），不自己发明哈希函数。

## 小练习

1. 手推：桶数 8，键的哈希值依次为 3, 11, 19（拉链法），画出桶数组的最终状态；再改成开放寻址（线性探测）画一遍，比较两者的查找路径。
2. LeetCode 217 存在重复元素：分别用 set 和「先排序再相邻比较」两种解法提交，写出各自的时间/空间复杂度，并说明什么场景下排序版反而更优。
3. LeetCode 383 赎金信：判断 magazine 的字母能否拼出 ransomNote——用 Counter 一行核心逻辑完成。
4. 思考题：为什么 dict 的键要求「哈希值在对象生命周期内不变」，而值随便改？用「确定性」原理写两句话解释。
