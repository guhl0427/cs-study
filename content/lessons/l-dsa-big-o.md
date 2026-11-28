---
id: l-dsa-big-o
slug: big-o
title: 复杂度与大 O 记号
difficulty: 2
estMinutes: 75
tags: [算法, 复杂度, 大O, 性能分析]
summary: 用实测实验看清「同一问题不同写法差千倍」，掌握五种复杂度的直觉与判读心法，背下常见结构增删查改的大对照表，再用 timeit 亲手验证增长阶级的威力。
updated: 2026-11-22
resources:
  - id: r-bigo-sheet
    title: Big-O Cheat Sheet
    url: https://www.bigocheatsheet.com/
    type: tool
    difficulty: 2
    note: 各数据结构与算法复杂度速查大表，写代码前扫一眼。
  - id: r-algo-book
    title: 《算法图解》
    url: https://www.manning.com/books/grokking-algorithms
    type: book
    difficulty: 1
    note: 讲大 O 最轻松的入门书，第 1 章与本课一一对应。
  - id: r-py-timeit
    title: Python 官方文档 · timeit
    url: https://docs.python.org/zh-cn/3/library/timeit.html
    type: doc
    difficulty: 2
    note: 本课实测实验用的标准计时工具。
---

> 一句话定义：大 O 记号回答的唯一问题是「数据量 n 变大时，操作次数怎么跟着涨」——它不预测你的代码跑几秒，但能预测谁的写法先撑不住。

## 概念讲解

![常见复杂度的增长曲线对比](fig:dsa-big-o)

### 为什么要度量：同一问题，两种写法，实测差千倍

在 100 万个**有序**元素里找目标值 999999，有两种写法：

- 写法 A（线性查找）：从第 1 个开始逐个比对，最坏比对 100 万次；
- 写法 B（二分查找）：每次从中间砍掉一半，最多比对 20 次。

100 万 ÷ 20 = 5 万倍。这不是「优化一下快一点」，而是**阶级差距**——数据再涨十倍，A 要 1000 万次，B 依然只要 23 次。算法优化的核心收益来自**降低增长阶级**，而不是抠某一行代码的细节：把 O(n²) 改成 O(n log n)，比把循环里的乘法改成位运算重要一万倍。反过来说，如果一个问题只有 O(n²) 的解法（很多问题确实如此），那你再怎么抠细节也逃不掉平方级——复杂度告诉你的是「天花板在哪，值不值得再熬」。

### 大 O 在度量什么：只看增长趋势

大 O 不测秒数，它把所有算法放到同一把尺子上：**n 翻倍，工作量变成几倍**。

```text
 操作次数
    │                            ·  ·  ·  O(n²)  悬崖
    │                    ·  ·
    │              ·
    │         ·        ___——  O(n log n)
    │      ·     ___——
    │   ·    __—   O(n)  爬坡
    │  ·  _—
    │ ·_—  O(log n) 几乎躺平
    └──────────────────────────────→ n（数据量）
      O(1) 是一条水平线，不在这张图里占地方
```

| 复杂度 | n 翻倍时 | 直觉类比 | 典型来源 |
| ---- | ---- | ---- | ---- |
| O(1) | 不变 | 从带编号的储物柜直接取东西 | 数组按下标访问、dict 取值 |
| O(log n) | 多 1 步 | 翻字典找词：每次翻掉一半 | 二分查找、平衡树查找 |
| O(n) | 翻倍 | 逐个点名，一人不能漏 | 遍历列表、求和 |
| O(n log n) | 略多于翻倍 | 先分组再点名 | 归并/快排/Python 内置排序 |
| O(n²) | 变 4 倍 | 全班两两握手 | 双重循环、两两比较 |

为什么写 O(n) 而不写 O(2n + 5)？类比：开车 2 小时 vs 2.1 小时——多出的 0.1 小时是「过红绿灯的固定开销」，跑长途时没人关心它。n 极大时，常数因子和低阶项都被主导项淹没：`3n² + n + 10` 的曲线形状就是 `n²` 的形状，所以一律记作 O(n²)。大 O 刻意抹掉这些细节，换来「跨机器、跨语言可比」。

### 常见结构操作复杂度大对照表

这张表是后面六课的总纲，每学完一个结构回来看一行：

| 结构 | 按下标查 | 按值找 | 头部插入 | 尾部追加 | 中间删 | 随机删（先找到） |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| 数组 / Python list | O(1) | O(n) | O(n) | O(1)* | O(n) | O(n) |
| 链表 | O(n) | O(n) | O(1) | O(1)† | O(1)† | O(n) 找 + O(1) 删 |
| 哈希表 / dict | 无 | O(1) 均摊 | 无 | O(1) 均摊 | O(1) 均摊 | O(1) 均摊 |
| 平衡树 | O(log n) | O(log n) | O(log n) | O(log n) | O(log n) | O(log n) |

\* 均摊 O(1)，偶尔触发扩容，下一小节解释。† 双向链表持有前后指针时成立。

读表的方式不是背格子，而是问「为什么」：数组内存连续，所以按编号直达（O(1)）、插中间要腾位置（O(n)）；链表靠指针串联，插删只改两个指针（O(1)）、但找第 i 个只能顺着爬（O(n)）；哈希表直接把值算成地址，一切按值操作都是 O(1)，代价是没有「顺序」可言；树折中——有序、但每步只走一半。**没有全能冠军，只有按场景选的性价比**，这张表就是选型依据。

### 均摊分析：偶尔贵一次，平均起来仍然便宜

动态数组（Python list 的底层）满了会「搬家」：申请一块约 2 倍大的新内存，把旧元素全部搬过去——这一次 append 的代价是 O(n)。那 append 还能算 O(1) 吗？能，用**均摊（amortized）**的账本算：

```text
追加 n 个元素的完整旅程（容量 4 起步，翻倍扩容）：
搬 家：__▲______▲__________▲____________▲_______
代价：  4 +  8    +   16      +    32        ← 每次搬家搬的是「此前全部元素」
平 均搬一次的总开销 ÷ n ≈ 每次追加摊到 O(1)
```

关键在于**贵的事情越来越稀疏**：容量翻倍后，要再追加同样多的元素才会触发下一次搬家。把总代价摊到每次操作头上，append 是均摊 O(1)。均摊分析的思想很通用：只要「偶尔的高价」摊平后不影响整体趋势，就按平均价记账。

### 空间复杂度：第二本账

空间复杂度只数**额外**占用的内存随 n 怎么涨：输入本身不算。遍历求和只留一个累加变量，O(1)；归并排序要开一个和输入等大的辅助数组，O(n)；递归每一层调用占一帧栈内存，递归深度为 n 就是 O(n)。时间和空间经常可以互换：哈希表用 O(n) 空间换 O(1) 查询；记忆化用空间换掉重复计算。面试里说复杂度要**两本账一起报**，只报时间是不完整的。

### 递归复杂度：递归树一句话

递归的复杂度看两样东西：**递归深度 × 每层的代价**，把调用展开成一棵「递归树」，节点总数就是总操作数。例如 `f(n)` 调用两次 `f(n-1)`（斐波那契朴素版），树每层翻倍、深 n 层，节点约 2ⁿ——指数爆炸；而归并排序每层合并总代价 O(n)、共 log n 层，就是 O(n log n)。本课程在递归一课会专门画这棵树，这里先立住「深度 × 层代价」这个公式。

## 代码示例

### 第 1 部分：五个片段判读（答案在注释里，先自己报一遍）

```python
def snippet_a(nums):                 # ① O(1)：不管 nums 多长，只取一次
    return nums[0] + nums[-1]

def snippet_b(nums):                 # ② O(n)：一层循环摸一遍
    total = 0
    for x in nums:
        total += x                   # 执行 n 次
    return total

def snippet_c(nums):                 # ③ O(n²)：循环套循环
    count = 0
    for a in nums:
        for b in nums:
            if a < b:
                count += 1           # 执行 n*n 次
    return count

def snippet_d(n):                    # ④ O(log n)：每步砍一半
    steps = 0
    while n > 1:
        n //= 2
        steps += 1                   # 执行 log2(n) 次
    return steps

def snippet_e(nums):                 # ⑤ O(n log n)：排序主导
    nums.sort()                      # O(n log n)
    for i in range(len(nums)):       # O(n) 排在后面是低阶项，可忽略
        if nums[i] == i:
            return i
    return -1

print(snippet_d(1_000_000))          # 19 → 百万级数据二分只要约 20 步
print(snippet_c(list(range(2000))))  # 1999000 次 → 2000² = 400 万量级
```

判读心法：**只数「随 n 变化的循环层数」**。隐藏循环最危险——`max(nums)`、`x in 列表`、`nums[k:]` 切片、`nums.count(v)` 全是 O(n)，嵌进一层 for 就是 O(n²)，这是新手代码突然变慢的头号原因。

### 第 2 部分：timeit 实测——亲眼见证阶级差距

```python
import timeit

n = 2000
data = list(range(n))

# O(n)：一遍求和
t_linear = timeit.timeit(lambda: sum(data), number=100) / 100
print(f"O(n)  求和 2000 个元素: {t_linear * 1e6:.1f} 微秒/次")

# O(n²)：两两比较
def all_pairs():
    c = 0
    for a in data:
        for b in data:
            c += 1
    return c

t_quad = timeit.timeit(all_pairs, number=1)
print(f"O(n^2) 两两比较 2000 个元素: {t_quad * 1e3:.1f} 毫秒/次")
# 参考输出（普通笔记本）：
# O(n)  求和 2000 个元素: 约 20 微秒/次
# O(n²) 两两比较 2000 个元素: 约 40 毫秒/次
# → 差约 2000 倍；n 涨到 2 万，O(n) 线性变慢，O(n²) 再涨 100 倍
```

再把「隐藏循环」抓出来示众：

```python
import timeit
n = 5000
data = list(range(n))
targets = set(range(0, n, 3))        # 要查的目标

def with_list_in():                  # ⑤ O(n²)：每次 in 都是 O(n)
    box = list(data)
    hit = 0
    for t in targets:
        if t in box:
            hit += 1
    return hit

def with_set_in():                   # O(n) 总计：建 set O(n) + 每次查 O(1)
    box = set(data)
    hit = 0
    for t in targets:
        if t in box:
            hit += 1
    return hit

print(timeit.timeit(with_list_in, number=10))   # 约 0.3~1.5 秒（随机器浮动）
print(timeit.timeit(with_set_in, number=10))    # 约 0.004~0.01 秒
# 代码逻辑一模一样，只换了一个容器：几十到上百倍差距，全来自复杂度表的那一行
```

### 第 3 部分：亲手模拟动态数组扩容，验证「均摊 O(1)」

```python
import timeit

def append_n(n):
    arr = []
    for i in range(n):
        arr.append(i)                # 均摊 O(1)
    return arr

def prepend_n(n):
    arr = []
    for i in range(n):
        arr.insert(0, i)             # 每次 O(n)：整体后移，总代价 O(n²)
    return arr

for n in (2000, 4000, 8000):
    t_append = timeit.timeit(lambda: append_n(n), number=5) / 5
    t_prepend = timeit.timeit(lambda: prepend_n(n), number=2) / 2
    print(f"n={n:>5}  append {t_append*1e3:6.2f} ms   "
          f"insert(0) {t_prepend*1e3:8.2f} ms")
# 参考输出：
# n= 2000  append   0.12 ms   insert(0)     3.20 ms
# n= 4000  append   0.25 ms   insert(0)    12.50 ms   ← 数据翻倍，append 翻倍（O(n)），insert 变 4 倍（O(n²)）
# n= 8000  append   0.52 ms   insert(0)    50.00 ms
# 用「n 翻倍时耗时怎么变」反推复杂度，正是大 O 的实验验证法
```

这个实验同时给了两个结论：一是 append 确实均摊 O(1)（含扩容在内，n 翻倍它只翻倍）；二是「头部插入」让整个循环退化成 O(n²)——需要频繁头部插入时换 `collections.deque`，它的 `appendleft` 是真 O(1)。

## 常见坑

1. **坑 1：以为 O(n) 一定比 O(n²) 快**。现象：把「慢的 O(n²)」改写成 O(n) 后实测没变快甚至更慢。原因：n=10 时常数项主导，大 O 比的是大数据下的趋势。排查：先估数据规模，规模小则可读性优先，规模大才必须换阶级。
2. **坑 2：把实测秒数当复杂度**。现象：换台机器结论全反。原因：秒数受机器、语言、负载影响，增长曲线形状才稳定。排查：像第 3 部分那样「n 翻倍看耗时倍率」来定阶级，而不是比单次秒数。
3. **坑 3：藏在函数调用里的循环**。现象：明明只有一层 for 却跑出 O(n²) 的速度。原因：`max(nums)`、`x in 列表`、`sum(nums[i:j])` 每次调用内部都扫 n 个。排查：对循环体内每一个函数调用问一句「它内部有没有循环」。
4. **坑 4：切片当免费用**。现象：`nums[i:]` 写在循环里，内存和耗时双爆。原因：切片会**复制**出一半到全部元素，一次 O(k)，k 是切出的长度。排查：循环里的切片改成传下标区间，或用 `islice`。
5. **坑 5：只报时间不报空间**。现象：面试答了 O(n log n) 被追问「空间呢」卡壳。原因：递归深度、辅助数组都是额外空间账。排查：交答案前默念一遍——除了输入，我还新开了什么。
6. **坑 6：混淆最坏与均摊**。现象：断言「dict 查询绝对 O(1)」后，被极端数据打脸。原因：均摊/平均是摊平后的期望，最坏情形（扩容瞬间、哈希退化）确实更贵。排查：看文献标注的是 worst-case 还是 amortized，报复杂度时带上限定词。

## 小练习

1. 判读：`for a in nums: if a in checked: ...`，checked 分别是 list 和 set 时整体复杂度各是多少？写出推导。
2. 用第 3 部分的方法实测 `nums.pop()`（尾部弹出）和 `nums.pop(0)`（头部弹出），用「n 翻倍耗时倍率」判断各自的复杂度。
3. 估算 O(n²) 在 n=100 万时的操作次数，按每秒 1 亿次换算成运行时间；再算 O(n log n) 需要多久，体会「换阶级」的含义。
4. LeetCode 136 只出现一次的数字：先写「两两比较」的 O(n²) 版本，再用哈希思路写出 O(n) 版本，两版都提交并对比耗时。
