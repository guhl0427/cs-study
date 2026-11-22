---
id: l-dsa-hash-table
slug: hash-table
title: 哈希表
difficulty: 2
estMinutes: 40
tags: [数据结构, Python]
summary: 哈希表用哈希函数把 key 换算成「桶编号」直达数据——Python 的 dict 和 set 就是它。
updated: 2026-11-22
resources:
  - id: r-py-dict-doc
    title: Python 官方教程 · 字典
    url: https://docs.python.org/zh-cn/3/tutorial/datastructures.html#dictionaries
    type: doc
    difficulty: 1
    note: dict 的官方用法，本节内容的 Python 落点。
  - id: r-hash-visual
    title: 哈希表可视化（USF）
    url: https://www.cs.usfca.edu/~galles/visualization/OpenHash.html
    type: tool
    difficulty: 2
    note: 动画演示哈希、冲突与拉链。
  - id: r-two-sum
    title: LeetCode · 两数之和
    url: https://leetcode.cn/problems/two-sum/
    type: tool
    difficulty: 2
    note: 哈希表优化的经典题，学完立刻练。
---

> 一句话定义：哈希表用哈希函数把 key 换算成「桶编号」直达数据——不用逐个翻找，平均一步到位。

## 概念讲解

**键值对**的直觉是通讯录：你不会从头翻 500 个人找「张三」，而是按姓名直接翻到那一页。哈希表把这个「按名字定位」自动化了：

```
key "张三" ──哈希函数──▶ 桶编号 37 ──▶ 直达 [张三: 138xxxxxxxx]
```

哈希函数（Python 里是内置的 `hash()`）把任意 key 映射成数字，再对桶数取余决定放哪个桶。理想情况下 key 均匀摊开，**查找、插入、删除都是 O(1)**——和数据量无关。

**冲突**：不同 key 被算进同一个桶怎么办？最常用**拉链法**——桶里挂一条链，撞进来的往后排：

```
桶 36: [李四] → ∅
桶 37: [张三] → [王五] → ∅      ← 「王五」和「张三」撞桶，挂后面
桶 38: [赵六] → ∅
```

撞得越多链越长，最坏（所有 key 撞进一个桶）退化成 O(n)；Python 的 dict 会自动扩容重排，日常几乎碰不到。**dict 和 set 就是哈希表**：`d[key]`、`in` 都是平均 O(1)——所以「把 list 换成 set 判断成员」是最常见的优化。需要「按标识找数据」的场景都该想到它：计数、去重、索引映射、缓存。

## 代码示例

经典例题「两数之和」：找两个数使和为 target。看哈希表怎么把 O(n²) 降到 O(n)：

```python
def two_sum_slow(nums, target):
    for i in range(len(nums)):           # 每对组合都试一遍
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return None                          # O(n²)：双重循环

def two_sum(nums, target):
    seen = {}                            # 值 → 下标
    for i, x in enumerate(nums):
        need = target - x                # 我需要的搭档
        if need in seen:                 # O(1)：搭档来过吗？
            return [seen[need], i]
        seen[x] = i                      # 记住自己
    return None                          # O(n)：一遍扫描

print(two_sum([2, 7, 11, 15], 9))        # [0, 1]（2 + 7 = 9）
```

思路差异：慢版问每对「你俩加起来是 9 吗」；快版只问哈希表「9 - 我 的搭档出现过吗」。**把「找谁和我配」变成「查搭档来过没」**，是哈希表最常用的套路。

再一个高频套路——计数：

```python
words = ["py", "js", "py", "go", "py"]
count = {}
for w in words:
    count[w] = count.get(w, 0) + 1
print(count)                             # {'py': 3, 'js': 1, 'go': 1}
```

## 常见坑

1. **坑 1：把可变对象当 dict 的 key**。`d[[1, 2]]` 直接 `TypeError`——list 内容会变、没有固定哈希值。排查：换 tuple。
2. **坑 2：遍历时增删 key**。`for k in d: d.pop(k)` 抛 `RuntimeError`。排查：先收集要删的 key，循环外再删。
3. **坑 3：以为 dict「绝对」O(1)**。平均才是 O(1)，最坏退化 O(n)。日常不必担心，面试要能说出来。
4. **坑 4：dict「无序」的旧印象**。Python 3.7 起 dict 保留插入顺序，但把它当「顺带福利」而不是设计依赖。

## 小练习

1. 用 dict 统计一段英文里每个字母出现的次数（忽略大小写）。
2. 把「两数之和」改成返回所有不重复组合，说说复杂度变化。
3. 思考题：为什么 set 的 `in` 比 list 的 `in` 快？从桶编号直达的角度解释。
