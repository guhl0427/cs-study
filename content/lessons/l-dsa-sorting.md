---
id: l-dsa-sorting
slug: sorting
title: 常见排序算法
difficulty: 2
estMinutes: 90
tags: [算法, 排序, 归并, 快排, Timsort]
summary: 逐一讲透冒泡/选择/插入/归并/快排五种排序的直觉与代码，用分治骨架串起归并与快排，对照复杂度与稳定性大表，最后手写归并排序并理解为什么日常该用内置 Timsort。
updated: 2026-11-22
resources:
  - id: r-visualgo
    title: VisuAlgo · Sorting
    url: https://visualgo.net/zh/sorting
    type: tool
    difficulty: 1
    note: 五种排序的动画对照观看，一眼看出行为差异。
  - id: r-algo-book
    title: 《算法图解》
    url: https://www.manning.com/books/grokking-algorithms
    type: book
    difficulty: 1
    note: 第 4 章的快排与分治讲法是本课主线。
  - id: r-py-sorting
    title: Python 官方文档 · Sorting HOW TO
    url: https://docs.python.org/zh-cn/3/howto/sorting.html
    type: doc
    difficulty: 2
    note: Timsort、稳定性、key 参数的官方说明。
---

> 一句话定义：排序算法家族是一条「从直觉到效率」的进化链——冒泡/选择/插入是 O(n²) 的朴素派，归并/快排用分治跳到 O(n log n)，而内置 Timsort 把各家优点缝合成了默认答案。

## 概念讲解

### 进化链总览：五兄弟一张图

| 算法 | 平均 | 最坏 | 空间 | 稳定 | 一句话人设 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| 冒泡 | O(n²) | O(n²) | O(1) | 稳定 | 相邻互换，最大值像气泡一样浮到末尾 |
| 选择 | O(n²) | O(n²) | O(1) | 不稳定 | 每轮选出最小值放到前面，交换次数最少 |
| 插入 | O(n²) | O(n²) | O(1) | 稳定 | 像整理扑克牌：把新牌插进已排好的左手 |
| 归并 | O(n log n) | O(n log n) | O(n) | 稳定 | 分治排小段再合并，稳如老狗 |
| 快排 | O(n log n) | O(n²) | O(log n) | 不稳定 | 选基准分区，常数小，实践中最快 |

**稳定性** = 相等的元素排序后保持原来的先后次序。它不是学术洁癖：按「总分排序后再按单科排序」时，稳定排序保证总分相同的仍按单科次序排列——多关键字排序全靠它。归并稳定、快排不稳定的根源在代码里（代码示例部分指出具体行）。

### 冒泡排序：相邻互换的直觉

每一轮从头到尾相邻比较，大的往右换——一轮结束，最大值必然「浮」到最右端：

```text
第 1 轮（n=5，比较 4 次）：
[5, 3, 8, 1, 4] → 5>3 换 → [3, 5, 8, 1, 4] → 5<8 不换 → 8>1 换 → [3, 5, 1, 8, 4]
→ 8>4 换 → [3, 5, 1, 4, 8]     ← 8 已归位，下一轮不再碰它
已排好部分：            [ 8 ]  （从右往左逐个归位）
```

第 i 轮比较 n-i 次，共 n-1 轮，总比较 n(n-1)/2 ≈ n²/2。优化点：某一轮没有任何交换说明已有序，可提前结束（最好情形 O(n)）——但平均仍是 O(n²)，教学中存在，生产中不用。

### 选择排序：交换次数最少的朴素派

每轮从未排区间里**选**出最小值，和区间开头换位：

```text
[5, 3, 8, 1, 4]
第 1 轮：全扫一遍，最小是 1，与 5 换 → [1, 3, 8, 5, 4]
第 2 轮：剩 [3, 8, 5, 4]，最小 3，原地 → [1, 3, 8, 5, 4]
第 3 轮：剩 [8, 5, 4]，最小 4，与 8 换 → [1, 3, 4, 5, 8]
已排好部分：[1, 3, 4] （从左往右逐个归位）
```

无论输入多乱，交换只有 n-1 次（写内存少是它唯一优点）；但比较次数仍是 n²/2，且**远距离交换会破坏稳定性**（相等元素被换到前面去）。

### 插入排序：整理扑克牌的直觉

左手是已排好的牌，右手每次摸一张，从右往左找位置插进去：

```text
[5, 3, 8, 1, 4]
摸 3：比 5 小，5 右移一格，插 → [3, 5, 8, 1, 4]
摸 8：比 5 大，直接落位 → [3, 5, 8, 1, 4]
摸 1：一路比 8/5/3 都小，三者右移，插到头 → [1, 3, 5, 8, 4]
摸 4：8 右移、5 右移，插进 3 和 5 之间 → [1, 3, 4, 5, 8]
已排好部分：始终是左手前缀 [1, 3, 4, 5]
```

关键性质：移动次数只和「逆序对」数量成正比——**数据基本有序时它接近 O(n)**。这解释了为什么 Timsort（下一节）要拿它当主力：现实数据大量是「部分有序」的。它稳定、原地，是 O(n²) 派里最实用的一员。

### 分治：归并与快排的共同骨架

分治三步：**分**（把问题拆小）→ **治**（递归解决小子问题）→ **合**（把小答案拼成大答案）。归并与快排共用这个骨架，只是分工位置相反：

| 步骤 | 归并排序 | 快速排序 |
| ---- | ---- | ---- |
| 分 | 无脑从中间劈成两半 | 按基准值分区（重点工作在这里） |
| 治 | 递归排左右两半 | 递归排左右两段 |
| 合 | 合并两个有序段（重点工作在这里） | 不需要合并——分区后天然有序 |

理解了「工作量放哪一步」的差异，两种算法就不再需要分别背。分治也是递归一课「递归树」的最佳舞台：每层总工作量 O(n)、树高 log n（每次砍半），总代价 n × log n = O(n log n)。

### 快排的分区细节与最坏情形

分区（partition）是快排的灵魂：选一个**基准（pivot）**，把小于它的甩到左边、大于它的甩到右边，基准落位后它自己已归序：

```text
以末尾 4 为基准，Lomuto 扫描法：
[5, 3, 8, 1, 4]   i 是「小于区」的墙
5≥4 不动 → 3<4 进墙内 [3, 5, 8, 1, 4] → 8≥4 不动 → 1<4 进墙内 [3, 1, 5, 8, 4]
最后基准与墙后第一位换 → [3, 1, 4, 8, 5]   ← 4 归位，左右两段递归
```

最坏情形从哪来？**每次基准都选到极值**（比如对已排序数组总选末尾），分区变成 1 与 n-1 的劈法，递归树退化成链，O(n²)。两个防御：随机选基准；或三数取中。反之若每次都劈得均匀，就有 O(n log n)。快排不稳定的原因也在分区——远距离交换会打乱相等元素的先后。

### 计数排序一句与 Timsort：跳出比较的维度

以上全是**比较排序**——决策树下界证明它们的下限是 O(n log n)。要更快必须不比较：**计数排序**统计每个值出现的次数，按值域直接摆放，O(n + k)（k 是值域大小），代价是需要额外空间且值域要小（只考一句，知道「非比较排序的存在与前提」即可）。而 Python 的 `list.sort()` / `sorted()` 用 **Timsort**：它是归并与插入的缝合体——按已有有序片段（run）切分，小段用插入排序、拼接用归并，最好 O(n)（本来就有序）、最坏 O(n log n)、稳定。现实数据充满部分有序片段，所以 Timsort 平均速度碾压手写快排。**结论：理解五种排序是为了会分析和面试，写代码永远用内置。**

## 代码示例

### 第 1 部分：三种 O(n²) 排序完整实现（可运行）

```python
def bubble_sort(a):
    a = a[:]                          # 不动原数组
    n = len(a)
    for i in range(n - 1):            # n-1 轮
        swapped = False
        for j in range(n - 1 - i):    # 每轮少比一个（右侧已归位）
            if a[j] > a[j + 1]:       # 相邻比较
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:               # 一轮没交换 → 已有序，提前收工
            break
    return a

def selection_sort(a):
    a = a[:]
    n = len(a)
    for i in range(n):
        m = i
        for j in range(i + 1, n):     # 在未排区间找最小值的下标
            if a[j] < a[m]:
                m = j
        a[i], a[m] = a[m], a[i]       # 每轮只交换 1 次
    return a

def insertion_sort(a):
    a = a[:]
    for i in range(1, n := len(a)):   # 第 0 张牌天然有序
        key = a[i]                    # 右手摸起的牌
        j = i - 1
        while j >= 0 and a[j] > key:  # 左手里比它大的都右移
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key                # 插入空出的位置
    return a

data = [5, 3, 8, 1, 4]
print(bubble_sort(data))     # [1, 3, 4, 5, 8]
print(selection_sort(data))  # [1, 3, 4, 5, 8]
print(insertion_sort(data))  # [1, 3, 4, 5, 8]
print(insertion_sort([2, 3, 5, 1, 4]))  # [1, 2, 3, 4, 5]（几乎有序也正确）
```

### 第 2 部分：手写归并排序完整实现（重点）

```python
def merge_sort(a):
    """归并排序。时间 O(n log n)，空间 O(n)，稳定。"""
    if len(a) <= 1:                   # 基线：单个元素天然有序
        return a
    mid = len(a) // 2                 # 分：无脑从中间劈
    left = merge_sort(a[:mid])        # 治：递归左半
    right = merge_sort(a[mid:])       # 治：递归右半
    return merge(left, right)         # 合：两个有序段合一

def merge(left, right):
    """合并两个有序列表（归并排序的核心，也是 LC 21 链表版的数组版）"""
    out = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:       # 等号在这里！<= 保证稳定：
            out.append(left[i]); i += 1   # 相等时先取左边的（先出现的）
        else:
            out.append(right[j]); j += 1
    out.extend(left[i:])              # 一边耗尽，另一边整段接上
    out.extend(right[j:])
    return out

print(merge_sort([5, 3, 8, 1, 4]))        # [1, 3, 4, 5, 8]
print(merge_sort([3, 1, 3, 1, 2]))        # [1, 1, 2, 3, 3]（含重复元素）
print(merge([], []))                      # []
print(merge([1, 3, 5], [2, 4, 6]))        # [1, 2, 3, 4, 5, 6]
```

merge 里 `<=` 的等号就是归并「稳定」的全部秘密：相等元素先取左段——左段的元素在原数组里出现得更早。把它改成 `<`，稳定性当场丢失，可自行实验验证。

### 第 3 部分：快排完整实现 + 随机基准防御

```python
import random

def quick_sort(a):
    """Lomuto 分区快排。平均 O(n log n)，最坏 O(n²)，不稳定。"""
    if len(a) <= 1:
        return a
    pivot = a[-1]                     # 基准取末尾（配合 Lomuto 最直观）
    wall = 0                          # 「小于区」的墙：[0, wall) 都 < pivot
    for i in range(len(a) - 1):
        if a[i] < pivot:              # 小于基准 → 挪进墙内，墙右移
            a[i], a[wall] = a[wall], a[i]
            wall += 1
    a[wall], a[-1] = a[-1], a[wall]   # 基准归位：站在墙后第一位
    left = quick_sort(a[:wall])       # 左段 < pivot
    right = quick_sort(a[wall + 1:])  # 右段 ≥ pivot
    return left + [pivot] + right

def quick_sort_safe(a):
    """随机基准版：抵御已排序输入的最坏情形"""
    if len(a) <= 1:
        return a
    k = random.randrange(len(a))      # 随机抽一个换到末尾
    a[k], a[-1] = a[-1], a[k]
    pivot = a[-1]                     # 之后与 quick_sort 的 Lomuto 分区完全一致
    wall = 0
    for i in range(len(a) - 1):
        if a[i] < pivot:
            a[i], a[wall] = a[wall], a[i]
            wall += 1
    a[wall], a[-1] = a[-1], a[wall]
    return quick_sort_safe(a[:wall]) + [pivot] + quick_sort_safe(a[wall + 1:])

print(quick_sort([5, 3, 8, 1, 4]))        # [1, 3, 4, 5, 8]
print(quick_sort([9, -2, 7, 0]))          # [-2, 0, 7, 9]
print(quick_sort([]))                     # []
print(quick_sort([2, 2, 1]))              # [1, 2, 2]
```

分区推演（`[5, 3, 8, 1, 4]`，pivot=4）：5 不动 → 3 进墙（墙=1）→ 8 不动 → 1 进墙（墙=2，此时 `[3,1,5,8,4]`）→ 基准与下标 2 交换 → `[3,1,4,8,5]`，4 归位，左右段再递归。

### 第 4 部分：内置排序与实测对比

```python
import random, timeit

data = [random.randint(0, 10_000) for _ in range(2000)]
print(sorted(data)[:5], "...")            # sorted 返回新列表，原列表不动
# list.sort() 原地排序，返回 None —— 混用两者是经典错误

t_builtin = timeit.timeit(lambda: sorted(data), number=100) / 100
t_merge   = timeit.timeit(lambda: merge_sort(data), number=100) / 100
t_bubble  = timeit.timeit(lambda: bubble_sort(data), number=1)
print(f"Timsort: {t_builtin*1000:.2f} ms")
print(f"手写归并: {t_merge*1000:.2f} ms")
print(f"冒泡:    {t_bubble*1000:.0f} ms")
# 参考输出（2000 个元素，普通笔记本）：
# Timsort: 约 0.15 ms    手写归并: 约 0.5 ms    冒泡: 约 200 ms
# 同样的 O(n log n)，Timsort 的 C 实现 + 对有序片段的利用快数倍；
# 同样是 O(n²) 的冒泡比 O(n log n) 慢一千多倍——阶级 + 常数双差距。

pairs = [("b", 2), ("a", 1), ("b", 1), ("a", 2)]
print(sorted(pairs))                      # [('a',1),('a',2),('b',1),('b',2)]
# Timsort 稳定：相等的 ('a',1)/('a',2) 保持原相对次序
```

## 常见坑

1. **坑 1：混淆 sort() 与 sorted()**。现象：`a = list.sort()` 之后 a 是 None。原因：sort 原地改、返回 None；sorted 返回新列表、原对象不动。排查：需要新列表用 sorted，原地用 sort，绝不混合赋值。
2. **坑 2：用 == 判断稳定性**。现象：拿纯数字数组验证稳定性，怎么改都「稳定」。原因：相等元素无法区分次序。排查：用带标识的元组（如 (值, 原下标)）测试，才能看见稳定性差异。
3. **坑 3：快排对已排序数据不设防**。现象：面试写了固定基准的快排，面试官给个有序数组，直接退化 O(n²)。原因：每次基准都是极值，分区劈成 1 与 n-1。排查：随机选基准或三数取中，并口头说出最坏情形怎么触发。
4. **坑 4：merge 的 <= 写成 <**。现象：归并排序丢稳定性。原因：相等时先取了右段，右段元素原本次序更靠后。排查：稳定性的成败就在这一个字符（第 2 部分注释处）。
5. **坑 5：递归排序忘写基线**。现象：merge_sort/quick_sort 无限递归到 RecursionError。原因：len(a) <= 1 的基线漏写，或切片边界出错导致子问题不缩小。排查：先验证单元素与空数组输入。
6. **坑 6：把 O(n log n) 等同于「一样快」**。现象：以为手写快排能替换内置排序。原因：复杂度只量阶级，常数因子与实现质量（C 层优化、有序片段利用）让 Timsort 快数倍。排查：像第 4 部分一样实测，然后默认用内置。

## 小练习

1. 对 `[7, 2, 9, 4, 3]` 手推三种 O(n²) 排序的每轮状态（只写数组变化，各推 3 轮即可），再跑代码全量验证。
2. 用 `[(值, 原下标)]` 的带标识数据实测：插入排序与选择排序哪个稳定哪个不稳定？写出导致差异的那一行交换代码。
3. LeetCode 912 排序数组：分别提交手写快排（随机基准）与手写归并，观察哪版可能超时，体会最坏情形防御的意义。
4. LeetCode 56 合并区间：先按区间起点排序（内置 sorted 一行），再一次线性扫描合并；思考这题里排序承担了什么角色。
