---
id: l-dsa-binary-search
slug: binary-search
title: 二分查找
difficulty: 2
estMinutes: 75
tags: [算法, 二分查找, 边界处理, LeetCode]
summary: 用折半直觉与边界推演建立二分模板的三个细节，掌握精确值/左边界/右边界三套变体，做透 LeetCode 704、35、34 三题，最后建立「有序 + O(log n) 就想二分」的条件反射。
updated: 2026-11-22
resources:
  - id: r-visualgo
    title: VisuAlgo · Binary Search
    url: https://visualgo.net/zh/bst
    type: tool
    difficulty: 1
    note: 动画演示折半收缩区间的过程。
  - id: r-algo-book
    title: 《算法图解》
    url: https://www.manning.com/books/grokking-algorithms
    type: book
    difficulty: 1
    note: 第 1 章用「查电话簿」讲二分，与大 O 一课呼应。
  - id: r-lc-binary
    title: LeetCode · 二分查找专题
    url: https://leetcode.cn/tag/binary-search/
    type: tool
    difficulty: 2
    note: 本课三道真题的出处，练完可按标签继续刷。
---

> 一句话定义：二分查找在**有序**数据上每一步把搜索区间砍掉一半，O(log n) 的代价来自「每步排除一半」——大 O 一课说的那个「20 步找 100 万」，本课把它写成不会错的代码。

## 概念讲解

### 折半直觉：猜数字游戏的最优策略

我心中想一个 1~100 的数，你最少几次必猜中？策略：每次猜「剩余区间的正中间」——猜 50，我说「大了」，区间缩成 1~49；再猜 25……每猜一次区间砍半：100→50→25→12→6→3→1，**最多 7 次**。这就是二分：不关心具体数字，只关心「区间还剩多少」，而区间按 log₂ 收缩。100 万个数只需 20 步，10 亿只需 30 步——数据翻倍只多 1 步，这是 log 级的本性。

```text
target = 23，在 [3, 8, 15, 23, 37, 42, 56] 里找：
第 1 步  lo=0 hi=6  mid=3  a[3]=23 == target ✓ 命中（运气好 1 步）
再看不命中的例子，target = 42：
第 1 步  lo=0 hi=6  mid=3  a[3]=23 < 42 → 目标必在右半
第 2 步  lo=4 hi=6  mid=5  a[5]=42 == target ✓
区间变化：[0,6] → [4,6] → 命中     每步严格砍掉一半
```

前提只有一个：**有序**。无序的数据无法用「比中点大/小」排除任何一半。所以看到二分题，第一反应永远是「这里有没有序（或能否造出序）」。

### 标准模板三细节：lo / hi、闭区间、返回什么

二分写错，99% 错在边界。把三个细节钉死，模板就永远不会错：

1. **区间约定**：本课统一用**闭区间** `[lo, hi]`（两端都有效）。它的不变式（invariant）是：「target 若存在，必在 [lo, hi] 内」。每一步收缩都不得破坏这个承诺。
2. **循环条件与收缩方向**：`while lo <= hi`（闭区间非空才继续）；命中即返回；否则 `a[mid] < target → lo = mid + 1`，`a[mid] > target → hi = mid - 1`——mid 已经查过，必须**排除出去**，否则区间不缩、死循环。
3. **mid 的写法与返回值**：`mid = (lo + hi) // 2`（Python 整数无溢出顾虑；其他语言写 `lo + (hi - lo) // 2`）。循环正常结束还没找到，返回 -1（或按题意返回 lo，见变体二）。

```text
闭区间模板的区间演化图（找 42 不存在时，target=30）：
[3, 8, 15, 23, 37, 42, 56]
第 1 步  [0,6]  mid=3  a[3]=23<30 → lo=4      排除了 [0,3]
第 2 步  [4,6]  mid=5  a[5]=42>30 → hi=4      排除了 [5,6]
第 3 步  [4,4]  mid=4  a[4]=37>30 → hi=3      区间变空
lo=4 > hi=3 → 退出循环，返回 -1
不变式自始至终成立：30 若存在必在当前区间内，区间空了=不存在
```

**死循环排查心法**：每次改动 lo/hi 后自问「区间长度是否严格变小」。`lo = mid + 1` 和 `hi = mid - 1` 都保证缩小；凡是写出 `hi = mid` 或 `lo = mid`（闭区间下），就要立刻警惕。

### 三个变体模板：精确值 / 左边界 / 右边界

现实问题往往不是「找等于」，而是「找第一个 ≥（左边界）」「找最后一个 ≤（右边界）」。三套模板对照：

| 模板 | 循环条件 | 命中后 | 收缩规则 | 返回 |
| ---- | ---- | ---- | ---- | ---- |
| ① 找精确值 | `while lo <= hi` | 立即 return | `lo=mid+1` / `hi=mid-1` | 下标或 -1 |
| ② 找左边界（第一个 ≥） | `while lo < hi` | 不返回，继续左压 | `hi = mid`（mid 可能是答案，不能丢）/ `lo = mid + 1` | 退出时 lo（=hi） |
| ③ 找右边界（最后一个 ≤） | `while lo < hi` | 不返回，继续右压 | `lo = mid + 1`（mid 若是答案，用 mid+1 表达「已确认」）/ 先把右边界题转成左边界 | 退出时 lo - 1 或 lo |

变体②③统一用**半开区间心智**：`lo` 始终指向「候选答案可能的位置」，`hi` 始终指向「已确认排除的位置」。退出时 `lo == hi`，就是边界落点。最不易错的写法（也是 LeetCode 34 实战用的）：**右边界 = 第一个大于 target 的位置再减一**，把两个变体②合成一对。三套模板 + 不变式思维，覆盖所有二分题。

### 旋转数组一句：二分的推广

有序数组被旋转（如 `[4,5,6,7,0,1,2]`）仍可用二分：**比较 mid 与端点，判断出哪一半是有序的**，再判断 target 是否落在有序的那一半里——每次仍能安全排除一半。核心技巧是「与端点比较识别有序半区」，细节留到刷题时展开（LC 33），这里记住「旋转不毁二分，只改判断条件」。

### 实数二分一句

对实数（浮点）区间二分，把 `while lo <= hi` 换成**精度控制**：循环固定次数（如 100 次）或 `while hi - lo > 1e-7`，`mid = (lo + hi) / 2`。典型场景是「求平方根保留 6 位」这类函数求值问题——比较对象从数组元素变成函数值，骨架不变。

### 什么时候想到二分：两个触发信号

| 信号 | 判断 |
| ---- | ---- |
| 数据有序（或单调） | 立刻想二分查找 |
| 题目要求 O(log n)（或「数据量 10⁵ 以上」暗示线性会超时） | 二分是 O(log n) 的代名词 |
| 「第一个满足…的位置 / 最后一个满足…」 | 左/右边界二分变体 |
| 对答案空间问「这个答案可行吗」且可行性随答案单调 | **二分答案**：对答案本身二分（进阶题型的万能钥匙） |

最后一条最值钱：把「求最小/最大能满足条件的值」转成「对答案二分 + 一个 O(n) 的可行性检查」，可行性随答案单调是唯一前提。

## 代码示例

### 第 1 部分：LeetCode 704 二分查找（精确值模板）

```python
# 题目：升序数组 nums 中找 target，返回下标，不存在返回 -1。
# 例：nums=[-1,0,3,5,9,12], target=9 → 4；target=2 → -1

def search(nums, target):                 # O(log n) 时间，O(1) 空间
    lo, hi = 0, len(nums) - 1             # 闭区间 [lo, hi]
    while lo <= hi:                       # 区间非空才继续
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid                    # 命中立即返回
        elif nums[mid] < target:
            lo = mid + 1                  # 排除左半含 mid
        else:
            hi = mid - 1                  # 排除右半含 mid
    return -1                             # 区间空 = 不存在

print(search([-1, 0, 3, 5, 9, 12], 9))    # 4
print(search([-1, 0, 3, 5, 9, 12], 2))    # -1
print(search([5], 5))                     # 0（单元素）
print(search([], 3))                      # -1（空数组，hi=-1 直接退出）
```

### 第 2 部分：LeetCode 35 搜索插入位置（左边界变体的马甲）

```python
# 题目：升序数组找 target，找到返回下标；没有则返回它应被插入的位置。
# 例：nums=[1,3,5,6], target=5 → 2；target=2 → 1；target=7 → 4；target=0 → 0

def search_insert(nums, target):          # 左边界模板：第一个 >= target 的位置
    lo, hi = 0, len(nums)                 # 注意：hi = len(nums)，含「插到末尾」
    while lo < hi:                        # 半开区间 [lo, hi)
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1                  # mid 及其左边全 < target，排除
        else:
            hi = mid                      # nums[mid] >= target，mid 是候选，
                                          # 不能丢 → hi = mid 而非 mid-1
    return lo                             # lo==hi 收敛到唯一落点

print(search_insert([1, 3, 5, 6], 5))     # 2
print(search_insert([1, 3, 5, 6], 2))     # 1（插在 3 前面）
print(search_insert([1, 3, 5, 6], 7))     # 4（插到末尾）
print(search_insert([1, 3, 5, 6], 0))     # 0（插到最前）
# 推演 target=2：[0,4) mid=2 a[2]=5≥2 → hi=2 → [0,2) mid=1 a[1]=3≥2 → hi=1
#              → [0,1) mid=0 a[0]=1<2 → lo=1 → [1,1) 退出，lo=1 ✓
# 与「闭区间 + 返回 -1」的差异全在两个细节：hi 初值、命中后不 return
```

为什么它是「插入位置」的正解？插入位置恰好定义为「第一个比 target 大的元素的下标」——不存在时，闭区间模板退出时的 `lo` 正是这个值（对照第 1 部分推演中 lo 的落点）。

### 第 3 部分：LeetCode 34 在排序数组中查找元素的第一个和最后一个位置

```python
# 题目：升序数组（含重复）找 target 的 [起始, 结束] 下标，不存在返回 [-1,-1]。
# 例：nums=[5,7,7,8,8,10], target=8 → [3,4]；target=6 → [-1,-1]
# 要求 O(log n) —— 必须「找左边界 + 找右边界」两次二分，不能线性扫

def search_range(nums, target):
    def lower_bound(x):                   # 第一个 >= x 的下标（变体②）
        lo, hi = 0, len(nums)
        while lo < hi:
            mid = (lo + hi) // 2
            if nums[mid] < x:
                lo = mid + 1
            else:
                hi = mid
        return lo

    left = lower_bound(target)            # 第一个 target
    if left == len(nums) or nums[left] != target:
        return [-1, -1]                   # 越界或落点上不是 target = 不存在
    right = lower_bound(target + 1) - 1   # 第一个 > target 的位置减一 = 最后一个 target
    return [left, right]

print(search_range([5, 7, 7, 8, 8, 10], 8))   # [3, 4]
print(search_range([5, 7, 7, 8, 8, 10], 6))   # [-1, -1]
print(search_range([2, 2, 2, 2], 2))          # [0, 3]（全是 target）
print(search_range([], 1))                    # [-1, -1]

# 手推 target=8 的两次二分：
# lower_bound(8)：[0,6) mid=3 a[3]=8≥8 → hi=3 → [0,3) mid=1 a[1]=7<8 → lo=2
#                → [2,3) mid=2 a[2]=7<8 → lo=3 → [3,3) 退出 → left=3
# lower_bound(9)：同理返回 5（第一个 >8 的位置）→ right=5-1=4 → [3,4] ✓
# 「+1 再 -1」技巧让右边界题直接复用左边界模板，少记一套代码。
```

### 第 4 部分：二分答案小试身手（对答案空间二分）

```python
# 题：木材加工——给定每根木头长度 cuts，要切出 k 根等长的小段（长度须整数），
# 求能切出至少 k 段的最大段长。cuts=[4, 7, 2, 10, 5], k=5
# 段长 L 可行 ⇔ sum(c // L for c in cuts) >= k —— L 越大段数越少：单调！
# 「最大可行值」→ 对答案空间 [1, max(cuts)] 做右边界二分

def max_cut_length(cuts, k):
    lo, hi = 1, max(cuts)                 # 答案可能的范围
    while lo < hi:                        # 找「最后一个可行值」
        mid = (lo + hi + 1) // 2          # 上取整防止 lo=mid 死循环
        if sum(c // mid for c in cuts) >= k:
            lo = mid                      # mid 可行 → 答案可能更大，压着 lo 走
        else:
            hi = mid - 1
    return lo

print(max_cut_length([4, 7, 2, 10, 5], 5))    # 4（L=4 可切 1,1,0,2,1 共 5 段；L=5 只剩 4 段）
print(max_cut_length([100], 3))               # 33
# 检查函数 O(n)，二分 O(log max) —— 总 O(n log max)
# 「可行性随答案单调」是能用二分答案的唯一前提，做题先验证这个单调性
```

## 常见坑

1. **坑 1：闭区间写出 `hi = mid` 或 `lo = mid`**。现象：区间 [2,2] 永远缩不小，超时死循环。原因：mid 已查过却留在区间里，区间不变。排查：闭区间模板两分支必须是 `mid±1`；半开区间模板才允许 `hi = mid`，两种约定不可混用。
2. **坑 2：`hi = len(nums)` 与 `hi = len(nums) - 1` 混着记**。现象：越界 IndexError 或漏解。原因：两种初值对应两种区间约定（半开/闭），模板内部逻辑必须配套。排查：背模板时连初值一起背，做题先声明用哪套。
3. **坑 3：`(lo + hi) // 2` 在其他语言溢出**。现象：C/Java 大数组上 mid 变负数崩溃。原因：lo+hi 超过 int 上限。排查：写 `lo + (hi - lo) // 2`；Python 整数无此问题但面试口头要提。
4. **坑 4：找左边界后不验证落点**。现象：target 不存在时返回了错误下标。原因：lower_bound 返回的是「第一个 ≥ target」的位置，该位置可能越界或值不等于 target。排查：返回前检查 `left == len(nums) or nums[left] != target`（第 3 部分的写法）。
5. **坑 5：二分答案忘记单调性验证**。现象：对不单调的「可行性」二分，答案错得莫名其妙。原因：二分的前提是「一半可行一半不可行」有清晰分界。排查：动笔前先证一句「值越大可行性越单调」，证不出就换解法。
6. **坑 6：对无序数组硬套二分**。现象：随机数据上答案忽对忽错。原因：mid 比较只能排除有序区间的一半。排查：先确认整体有序；无序但「局部有序」（旋转数组）时，先判断哪半有序再收缩。

## 小练习

1. 手推 `search([2, 5, 8, 12, 16, 23, 38, 56], 16)` 的每一步（lo/hi/mid/比较结果），再跑代码验证；然后推 target=20 的完整区间演化，确认返回 -1。
2. 把 `search_insert` 改写成「闭区间 + 退出时返回 lo」的版本，用 `[1,3,5,6]` 的四个 case 验证两个版本等价，并说出两版各自的区间约定。
3. LeetCode 69 x 的平方根：实数或整数二分求 √x 的整数部分——这是「二分答案」的入门款，可行性条件是 mid² ≤ x。
4. LeetCode 33 搜索旋转排序数组：用「判断哪一半有序 → 判断 target 在不在有序半区」的两步逻辑实现 O(log n) 查找，先在纸上画出 `[4,5,6,7,0,1,2]` target=0 的判断路径。
