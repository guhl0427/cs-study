---
id: l-dsa-graph
slug: dsa-graph
title: 图：顶点与边的通用语言
difficulty: 3
estMinutes: 85
tags: [数据结构, 图, BFS, DFS, 连通分量]
summary: 认识图的术语与两种存储结构，写透 BFS（无权最短路径）与 DFS 完整实现，理解连通分量与拓扑排序，最后用 LeetCode 200 岛屿数量打通「网格即图」的刷题直觉。
updated: 2026-11-22
resources:
  - id: r-visualgo
    title: VisuAlgo · Graph
    url: https://visualgo.net/zh/dfsbfs
    type: tool
    difficulty: 2
    note: 动画演示图的 BFS/DFS 遍历顺序，强烈建议跟着本课代码对照看。
  - id: r-algo-book
    title: 《算法图解》
    url: https://www.manning.com/books/grokking-algorithms
    type: book
    difficulty: 1
    note: 第 6、7 章用「找卖香蕉的人」讲 BFS，广度优先最好的入门故事。
  - id: r-py-deque
    title: Python 官方文档 · collections.deque
    url: https://docs.python.org/zh-cn/3/library/collections.html#collections.deque
    type: doc
    difficulty: 2
    note: BFS 的标准队列工具。
---

> 一句话定义：图是「一堆点（顶点）+ 点与点之间的关系（边）」的通用结构——当问题从「序列」变成「关系网」，就该想到图。

## 概念讲解

![图的节点与边，BFS 与 DFS 的遍历顺序差异](fig:dsa-graph)

### 图的定义与术语：从链表到自由生长

链表是「每个节点指向下一个」，树是「每个节点指向孩子、只有一个父亲」——都是被规则捆住的图。把规则全部放开，就得到图：**顶点（vertex）之间可以任意连边（edge）**。

```text
   A ─── B            顶点集合 {A, B, C, D}
   │  ╲  │            边集合   {A-B, A-C, A-D, B-D, C-D}
   C ─── D
```

| 术语 | 定义 | 生活例子 |
| ---- | ---- | ---- |
| 有向图 | 边有方向：A→B 不代表 B→A | 微博关注（你关注他，他未必关注你） |
| 无向图 | 边是双向的 | 微信好友、地铁线路 |
| 权重 | 边上带数字（距离/耗时/票价） | 地图导航的路程长度 |
| 度 | 一个顶点连出的边数 | A 的度 3；有向图再分入度/出度 |
| 路径 | 顺着边从一个顶点走到另一个的序列 | A→C→D 是一条路径 |
| 环 | 首尾相接的路径 | A→B→D→A 成环 |

树其实是「无环且连通」的特殊图，链表是「每个节点度 ≤ 2」的特殊树——**树课学过的 DFS 递归，在图上原样可用**，只是多了一道必须的动作：标记已访问（图有环，不标记就死循环）。

### 两种存储结构：邻接表 dict vs 邻接矩阵

| 维度 | 邻接表（dict of list） | 邻接矩阵（n×n 二维数组） |
| ---- | ---- | ---- |
| 形状 | `{A: [B, C, D], B: [A, D], ...}` | `matrix[i][j] = 1` 表示 i、j 相连 |
| 空间 | O(V + E)，有多少边存多少 | O(V²)，与边数无关，稀疏图浪费 |
| 查「a 和 b 相连吗」 | O(度)，要扫列表 | O(1) 直接查格 |
| 遍历邻居 | O(度)，恰好是算法需要的 | O(V)，全行扫一遍 |
| 适用场景 | 稀疏图（现实世界绝大多数：社交网、地图） | 稠密图 / 小规模题 |

```text
邻接表：                       邻接矩阵：
{                                  A  B  C  D
  A: [B, C, D],  B: [A, D],    A [ 0  1  1  1 ]
  C: [A, D],  D: [A, B, C]     B [ 1  0  0  1 ]   对称 ← 无向图的性质
}                              C [ 1  0  0  1 ]   D [ 1  1  1  0 ]
```

结论：**Python 刷题默认用 dict 邻接表**。真实世界的图几乎都稀疏（一个微博用户关注几千人，不是所有人），邻接矩阵的 V² 空间不可接受。矩阵只有两个优势场景：边特别稠密，或需要 O(1) 判「两点是否直连」。

### BFS：无权图的最短路径，靠「一圈一圈扩散」

BFS（广度优先）从起点出发，先访问所有距离 1 的邻居，再访问距离 2 的，像水波纹扩散。**队列**保证这个次序：出队一个点，把它的邻居入队——先入队的先被访问，距离自然从小到大。

```text
从 A 出发的 BFS 波纹（数字 = 距起点几步）：
      0
      A
   1  │  1
  B ──┼── C
   2  │  2
      D       访问顺序：A(0) → B, C, D(1)；「到 D 最短几步」的答案就是它的波纹层数
```

为什么 BFS 天然给最短路？**因为它是按距离分批处理的**：任何一个点第一次被访问时，走过的层数就是起点到它的最少步数（无权图中每条边代价相同）。有权图里这条路要走 Dijkstra，本课先立住「无权最短路 = BFS」这条直觉。复杂度：每个顶点入队一次、每条边看一次，O(V + E)。

### DFS：一条路走到底，遇墙回头

DFS（深度优先）与树的 DFS 同源：一条岔路走到底，走不通回退换岔路。递归版就是树遍历三行 + 访问标记；迭代版用显式栈。**图与树唯一的实现差异是 `visited` 集合**——图有环，不标记会绕圈死循环。DFS 擅长「存在性」问题（有没有路径、能不能出去）、连通性分析、拓扑排序；BFS 擅长「最短/最少」问题。选哪个先问一句：**要最短找 BFS，要存在找 DFS**。

### 连通分量：把图切成互不相连的几块

连通分量 = 图中「彼此可达」的最大顶点集团。社交网络断网成几坨、岛屿地图有几块陆地、 friendships 里有多少个独立朋友圈——全是连通分量计数。标准算法：**遍历循环 + visited 去重**——对每个还没访问过的顶点启动一次 BFS/DFS，把它所在的整个分量染上标记；启动了几次，就有几个分量。这个「外层循环 + 单次遍历」的两层结构，就是 LeetCode 200 岛屿数量的骨架。

### 拓扑排序一句（选课先修场景）

有向无环图（DAG）里求「合法先后顺序」就是拓扑排序：课程先修（先学 A 才能学 B）、任务依赖（先编译依赖再编译主程序）、构建流水线——它的标准解法是「入度表 + 队列」（Kahn 算法）：反复摘走入度为 0 的点，本质是 BFS 的应用，进阶阶段再学，本课先知道「**依赖排序问题 → 想拓扑排序**」即可。

### 什么问题该想到图：识别信号清单

| 问题信号 | 图的对应物 |
| ---- | ---- |
| 「关系/连接/相邻」字眼，或实体间多对多 | 顶点 + 边 |
| 网格地图上问「几块区域/能否到达」 | 网格即图：格子是顶点，四方向相邻是边 |
| 「最少几步/最短几跳」（无权） | BFS |
| 「是否存在路径/能否逃出」 | DFS |
| 「互不相连的组数」 | 连通分量 |
| 「先做什么后做什么」依赖 | 拓扑排序 |
| 状态转移（每次操作变一个状态） | 隐式图：状态是顶点，操作是边 |

最后一条最容易被忽略：扫雷盘面、魔方状态、密码锁最少转动次数——只要「一个状态 + 一组合法转移」成立，就是图，边甚至不需要你显式存。

## 代码示例

### 第 1 部分：建图 + BFS 最短路 + DFS 完整实现

```python
from collections import deque

graph = {
    "A": ["B", "C", "D"],  "B": ["A", "D"],      "C": ["A", "D"],
    "D": ["A", "B", "C", "E"],  "E": ["D", "F"],  "F": ["E"],
}

def bfs_shortest_path(g, start, end):
    """BFS 求无权图最短路径。返回完整路径（含端点），不通返回 None。O(V+E)"""
    if start == end:
        return [start]
    queue = deque([[start]])          # 队列里放「路径」，不是单点
    visited = {start}
    while queue:
        path = queue.popleft()        # 取出当前路径
        node = path[-1]               # 路径的最后一站
        for nxt in g[node]:           # 遍历邻居
            if nxt in visited:        # 已访问跳过——防环死循环的关键
                continue
            new_path = path + [nxt]
            if nxt == end:
                return new_path       # 第一次到达即最短（按距离分批的保证）
            visited.add(nxt)
            queue.append(new_path)    # 更长的路径排队等待扩散
    return None

def bfs_steps(g, start):              # 更常用形态：只记步数/距离
    dist = {start: 0}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for nxt in g[node]:
            if nxt not in dist:
                dist[nxt] = dist[node] + 1    # 邻居 = 我的距离 + 1
                queue.append(nxt)
    return dist

def dfs(g, start, visited=None):
    """DFS 递归版：一条路走到底。O(V+E)"""
    visited = visited if visited is not None else set()
    visited.add(start)                # 进门先签到
    print(start, end=" ")             # 此处换成任意「访问动作」
    for nxt in g[start]:
        if nxt not in visited:
            dfs(g, nxt, visited)      # 递归深入（隐式调用栈）
    return visited

def dfs_iter(g, start):               # DFS 迭代版：显式栈
    visited, stack = set(), [start]
    order = []
    while stack:
        node = stack.pop()            # 后进先出 → 深入
        if node in visited:
            continue
        visited.add(node)
        order.append(node)
        for nxt in reversed(g[node]): # 逆序压栈让编号小的先出
            if nxt not in visited:
                stack.append(nxt)
    return order

print(bfs_shortest_path(graph, "A", "F"))   # ['A', 'D', 'E', 'F'] —— 3 步
print(bfs_steps(graph, "A"))                # {'A':0,'B':1,'C':1,'D':1,'E':2,'F':3}
print(dfs(graph, "A"))                      # A B D C E F   （顺序随邻接表次序）
print(dfs_iter(graph, "A"))                 # ['A', 'D', 'E', 'F', 'C', 'B']
```

注意 BFS 版本两点：visited 在**入队时**标记（不是出队时），否则同一节点会被多个邻居重复入队，复杂度退化；「第一次到达即最短」是队列按距离分批的直接推论。

### 第 2 部分：连通分量计数

```python
def count_components(g):
    visited = set()
    count = 0
    for node in g:                    # 外层：扫每个还没访问的点
        if node not in visited:
            count += 1                # 启动一次遍历 = 染一个新分量
            stack = [node]
            while stack:              # DFS 把整个分量全部染色
                cur = stack.pop()
                if cur in visited:
                    continue
                visited.add(cur)
                stack.extend(g[cur])
    return count

g3 = {                               # 两个独立分量 {A,B,C} 和 {D,E}
    "A": ["B"], "B": ["A", "C"], "C": ["B"],
    "D": ["E"], "E": ["D"],
}
print(count_components(g3))          # 2
print(count_components(graph))       # 1（全连通）
```

「启动了几次遍历 = 几个分量」这个两层结构背下来，下一题就是它的网格版。

### 第 3 部分：LeetCode 200 岛屿数量（网格 DFS 完整解法）

```python
# 题目：'1' 是陆地、'0' 是水，求岛屿数量（陆地上下左右相连为一块）。
# 例：grid = [["1","1","0"],
#             ["1","0","0"],
#             ["0","0","1"]]  → 2 个岛

def num_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])

    def sink(r, c):
        """把 (r,c) 所在的整块陆地「沉水」，防止重复计数。DFS"""
        if r < 0 or r >= rows or c < 0 or c >= cols:
            return                    # 越界 = 邻居不存在
        if grid[r][c] != "1":
            return                    # 水或已沉的陆地
        grid[r][c] = "0"              # 沉岛：等价于 visited 标记
        sink(r + 1, c); sink(r - 1, c)     # 上下左右四个方向扩散
        sink(r, c + 1); sink(r, c - 1)

    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":     # 发现一块新陆地的角落
                count += 1            # 记一个新岛
                sink(r, c)            # 整块沉掉
    return count

grid = [["1", "1", "0"],
        ["1", "0", "0"],
        ["0", "0", "1"]]
print(num_islands(grid))             # 2
# 「网格即图」对照：格子=顶点，四方向相邻=边，'1'→'0' 改写=visited 标记，
# 外层双循环=连通分量的「每个未访问点启动一次遍历」。
# 复杂度：每个格子最多进 DFS 一次，O(rows × cols)，空间最坏 O(rows × cols) 栈。
```

这道题是图论直觉的毕业考：不需要显式建图，**网格本身就是图**。面试里能一句话说出「这是连通分量计数」就赢过大多数刷题者。

## 常见坑

1. **坑 1：图遍历不加 visited**。现象：有环的图 DFS/BFS 死循环或栈爆炸。原因：图不像树有「父→子」的单向性，孩子可能指回祖先。排查：任何图遍历第一步先写 visited 集合，进门先签到。
2. **坑 2：BFS 在出队时才标记 visited**。现象：同一节点被多个邻居重复入队，大图上队列爆内存、耗时翻倍。原因：标记晚了，排队期间别人又给它排了一次。排查：`visited.add` 放在入队分支里（对照第 1 部分代码位置）。
3. **坑 3：网格 DFS 忘判越界或判错边界**。现象：IndexError 或漏掉最右列/最下行。原因：行列边界混用、用了 `<` 与 `<=` 之差。排查：统一写 `0 <= r < rows and 0 <= c < cols`，单独抽成函数测试四角。
4. **坑 4：以为 BFS 求的「最短」带权也成立**。现象：带权图上用 BFS 按层数给答案。原因：BFS 的最短性依赖「每条边代价相同」，有权重时要 Dijkstra。排查：看题面有没有权值/耗时/费用字眼，有则换算法。
5. **坑 5：递归 DFS 在超大网格上爆栈**。现象：千行千列全陆地时 RecursionError。原因：递归深度可达 rows×cols（递归一课的栈限制）。排查：改显式栈迭代版或 BFS（deque 不占调用栈）。
6. **坑 6：邻接表用 dict 存却在遍历中新增顶点**。现象：RuntimeError: dictionary changed size during iteration。原因：遍历 dict 同时插入键是未定义行为。排查：先收集 `list(g.keys())` 快照，或提前建好全部顶点。

## 小练习

1. 用 `{0:[1,2], 1:[0,3], 2:[0], 3:[1]}` 手推 BFS 从 0 出发的访问顺序与各点距离，再跑 `bfs_steps` 验证；然后改推 DFS 递归版的顺序，体会两者的方向差异。
2. 把 LeetCode 200 的 `sink` 改成 BFS 版（deque + 出队染岛），提交两版对比；想一下什么数据形状下 BFS 版更稳（提示：坑 5）。
3. LeetCode 695 岛屿的最大面积：在 200 的骨架上，把「计数」改成「统计每次 DFS 沉掉的格子数，取最大」。只改三行以内的逻辑。
4. 思考题：密码锁题目——四位转轮锁，每次可拨一档，问从 "0000" 到目标最少几次且避开死位。用「隐式图」语言描述顶点、边、BFS 入口各是什么，并写出核心 10 行。
