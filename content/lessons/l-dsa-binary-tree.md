---
id: l-dsa-binary-tree
slug: binary-tree
title: 二叉树与遍历
difficulty: 2
estMinutes: 90
tags: [数据结构, 二叉树, DFS, BFS, BST]
summary: 建立二叉树术语表与形态对照，写透三种 DFS 与 BFS 层序遍历（含迭代版），掌握 BST 的查找插入，一次做透 LeetCode 104、226、98 三道真题。
updated: 2026-11-22
resources:
  - id: r-visualgo
    title: VisuAlgo · Binary Tree
    url: https://visualgo.net/zh/bst
    type: tool
    difficulty: 1
    note: 动画演示树遍历与 BST 插入，和本课图示互为验证。
  - id: r-algo-book
    title: 《算法图解》
    url: https://www.manning.com/books/grokking-algorithms
    type: book
    difficulty: 1
    note: 最后几章讲 BST 与递归的关系。
  - id: r-py-deque
    title: Python 官方文档 · collections.deque
    url: https://docs.python.org/zh-cn/3/library/collections.html#collections.deque
    type: doc
    difficulty: 2
    note: BFS 层序遍历的标准工具。
---

> 一句话定义：二叉树是「每个节点最多两个孩子」的递归结构——一棵树 = 根 + 左子树 + 右子树，这个定义直接生成了它的全部遍历与操作。

## 概念讲解

### 术语表：把「树话」说清楚

```text
              A          ← 根（root）：没有父节点的唯一入口
             / \
            B   C        ← B、C 是 A 的孩子；A 是它们的父节点
           / \    \
          D   E    F     ← E 无孩子 → 叶（leaf）；A→E 是一条路径
         /
        G                ← G 的深度 3（从根走 3 步）
```

| 术语 | 定义 | 上图示例 |
| ---- | ---- | ---- |
| 根 / 叶 | 入口节点 / 无孩子节点 | A / E、F、G |
| 深度 | 从根走到该节点的步数 | G 的深度 3 |
| 高度 | 树中最深节点的深度（树高=根的深度视角） | 该树高度 3 |
| 子树 | 任一节点连同它的全部后代，本身也是一棵树 | D+G 是 B 的左子树 |

关键的心智模型在定义本身：「二叉树 = 根 + 左子树 + 右子树」是**递归定义**——每棵子树又是一棵二叉树。这就是为什么树的几乎所有算法都是递归三行：对根做点事，然后「同样地处理左子树、右子树」（递归一课的信仰之跃，在树上最常用）。

### 满 / 完全 / 平衡：三种「长得好」的树

| 形态 | 定义 | 例子特征 | 为什么重要 |
| ---- | ---- | ---- | ---- |
| 满二叉树 | 每个节点要么 0 孩子要么 2 孩子 | 没有独苗 | 某些编码结构（哈夫曼）的形态 |
| 完全二叉树 | 除最后一层全满，最后一层从左到右连续 | 可以平铺进数组无空洞 | 堆的形态；高度 O(log n) |
| 平衡二叉树 | 任意节点左右子树高度差 ≤ 1（近似） | 长得匀称 | 保证查找 O(log n) 的前提 |

形态直接决定性能：n 个节点若长得**匀称**，高度 ≈ log₂n（一万节点约 14 层）；若退化成**一条链**（每个节点只有右孩子），高度 = n，一切操作从 O(log n) 塌到 O(n)。树的性能问题十有八九是「长歪了」——这也是平衡树（AVL/红黑树）存在的理由：插入时自动旋转，保持匀称。本题课不实现红黑树，但要记住结论：**字典序结构（dict）之外需要有序数据时，默认假设平衡树 O(log n)**。

### 三种 DFS：同一个递归，三个访问时机

深度优先（DFS）按「根→左→右」的骨架深入，唯一的区别是**在什么时候访问根**：

```text
        1
       / \
      2   3
     / \
    4   5

前序（根左右）：1 2 4 5 3    ← 根最先被访问。用途：复制树、序列化
中序（左根右）：4 2 5 1 3    ← 根居中。BST 里得到升序序列（重点！）
后序（左右根）：4 5 2 3 1    ← 根最后。用途：先算子树再算根（删树、求高度）
```

三段式的记忆锚点：「前/中/后」说的是**根的位置**，左右永远不变。中序在 BST 里的「升序魔法」是本题课最重要的伏笔——LeetCode 98 验证 BST 就靠它。

### BFS 层序：一层一扫，queue 是灵魂

广度优先（BFS）不深入，**逐层横扫**：

```text
        1            第 1 层：1
       / \           第 2 层：2 3
      2   3          第 3 层：4 5
     / \
    4   5            输出：[[1], [2, 3], [4, 5]]
```

实现要点：用**队列**（deque）保证「先发现的节点先处理」——出队一个节点，把它的孩子按左先右后入队。栈与队列一课说「BFS 用队列」，此处兑现：DFS 用栈（递归调用栈或显式栈），BFS 用队列，方向感就这么来的。

### BST：让树自己有序，查找砍一半

二叉搜索树（BST）只加一条性质：**左子树所有节点 < 根 < 右子树所有节点**（对每棵子树都成立）。

```text
        8
       / \
      3   10            查 5：8→(5<8)左→3→(5>3)右→5   3 步
     / \    \           规律：每一步排除一半，O(高度)=O(log n)
    1   6   14          插入 7：8→左→3→右→6→右→空位，挂上
       / \
      4   7
```

查找、插入都走「比大小选岔路」这条路，均摊 O(log n)。中序遍历 BST 输出升序：`1 3 4 6 7 8 10 14`——「有序性」藏在树的几何里。反面：按 1,2,3,4,… 顺序插入会退化成链，操作变 O(n)，呼应上一小节「长歪」的教训。

### 遍历应用对照表：什么时候用哪种

| 需求 | 用哪种遍历 | 理由 |
| ---- | ---- | ---- |
| 复制树 / 序列化 | 前序 | 先知根才能重建结构 |
| BST 输出有序序列 / 验证 BST | 中序 | 性质保证升序 |
| 求树高 / 自底向上聚合 / 删树 | 后序 | 必须先有孩子的答案 |
| 求最短跳数 / 按层统计 | BFS | 队列天然保序逐层 |
| 找目标值（BST） | 比大小选岔路 | 每步排除一半 |

## 代码示例

### 第 1 部分：建树 + 三种 DFS（递归）+ 前序迭代版

```python
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build_demo_tree():
    """        1
              / \
             2   3
            / \
           4   5       """
    return TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))

def preorder(root):                   # 根左右
    if not root:                      # 基线：空树
        return []
    return [root.val] + preorder(root.left) + preorder(root.right)

def inorder(root):                    # 左根右
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)

def postorder(root):                  # 左右根
    if not root:
        return []
    return postorder(root.left) + postorder(root.right) + [root.val]

def preorder_iter(root):              # 前序迭代版：显式栈，O(n)
    out, stack = [], ([root] if root else [])
    while stack:
        node = stack.pop()            # 栈顶（最近发现的）先处理 → DFS
        out.append(node.val)          # ① 先访问根
        if node.right:                # ② 右孩子先压（后处理）
            stack.append(node.right)
        if node.left:                 # ③ 左孩子后压（先处理）
            stack.append(node.left)
    return out

root = build_demo_tree()
print(preorder(root))                 # [1, 2, 4, 5, 3]
print(inorder(root))                  # [4, 2, 5, 1, 3]
print(postorder(root))                # [4, 5, 2, 3, 1]
print(preorder_iter(root))            # [1, 2, 4, 5, 3]
```

递归三连的形状完全一致，只动一行顺序——这是「递归定义」的直接体现。迭代版是「递归转迭代」的树版示范：递归调用栈换成显式 list。

### 第 2 部分：BFS 层序遍历（deque + 按层分组）

```python
def level_order(root):                # LeetCode 102 层序遍历
    if not root:
        return []
    out, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):   # 关键：只处理当前层的 len 个
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        out.append(level)             # 这一层收工，进入下一层
    return out

print(level_order(build_demo_tree())) # [[1], [2, 3], [4, 5]]
# 复杂度：每个节点入队出队各一次 O(n)，空间最宽一层 O(n)
```

「for _ in range(len(queue))」这一行是按层分组的全部秘密：循环开始时队列里恰好是本层全部节点。

### 第 3 部分：LeetCode 104 / 226 / 98 三题一次做透

```python
# LC 104 二叉树的最大深度：O(n) 时间，O(h) 栈空间（h 为树高）
def max_depth(root):
    if not root:
        return 0                                  # 基线：空树高度 0
    return 1 + max(max_depth(root.left),          # 左右子树深度+1
                   max_depth(root.right))         # 后序思想：先要孩子的答案
print(max_depth(build_demo_tree()))               # 3

# LC 226 翻转二叉树：每个节点的左右子树互换
def invert_tree(root):
    if not root:
        return None
    root.left, root.right = invert_tree(root.right), invert_tree(root.left)
    return root                                   # 前序思想：先换根，再递归两侧
flipped = invert_tree(build_demo_tree())
print(level_order(flipped))                       # [[1], [3, 2], [5, 4]]

# LC 98 验证二叉搜索树：不止比较父子，要比较整棵子树的上下界
def is_valid_bst(root, lo=float("-inf"), hi=float("inf")):
    if not root:
        return True                               # 空树是合法 BST
    if not (lo < root.val < hi):                  # 当前节点必须落在开区间内
        return False
    # 左子树的上界收紧为 root.val，右子树下界收紧为 root.val
    return is_valid_bst(root.left, lo, root.val) and \
           is_valid_bst(root.right, root.val, hi)

bst = TreeNode(8, TreeNode(3, TreeNode(1), TreeNode(6, TreeNode(4), TreeNode(7))),
                  TreeNode(10, None, TreeNode(14, TreeNode(13))))
print(is_valid_bst(bst))                          # True
bad = TreeNode(5, TreeNode(1), TreeNode(4, TreeNode(3), TreeNode(6)))
print(is_valid_bst(bad))                          # False（4 在 5 的右子树里却小于 5）
```

98 题的坑在于「只检查 parent > left、parent < right」是不够的——错例 `5→(1,4→(3,6))` 父子关系全合法但整体非法。正确做法是给每个节点传「允许区间 [lo, hi]」，向左走收紧上界、向右走收紧下界，区间逐层变窄，这正是 BST 性质的全局表达。

## 常见坑

1. **坑 1：验证 BST 只查父子**。现象：错例树被误判为 True。原因：BST 要求的是子树整体有序，隔层也能违规（4 在 5 的右子树）。排查：传上下界（如上），或中序遍历检查是否严格升序。
2. **坑 2：BFS 用 list 当队列**。现象：层序遍历在大树上慢成平方级。原因：`list.pop(0)` 是 O(n)（队列一课的坑重现）。排查：一律 `collections.deque` + `popleft()`。
3. **坑 3：递归基线漏掉空节点**。现象：叶节点的左右是 None，一访问就 AttributeError。排查：每个树递归第一行写 `if not root: return ...`，把 None 当合法输入。
4. **坑 4：混淆深度与高度**。现象：104 题答错数值。原因：深度从根数下来，高度从最深的叶子数上去，单节点树高度/深度都是 0 或 1 视定义而定，题目以「节点数」计（LC 104 空树为 0、单节点为 1）。排查：做题先看题目给的基准例（常见：`[] → 0`）。
5. **坑 5：迭代前序把左右孩子压栈顺序写反**。现象：输出变成「根右左」。原因：栈是 LIFO，要先访问左就得后压左。排查：心里背一遍「右先压、左后压，弹出来才是左先」。
6. **坑 6：以为 BST 插入任意序列都快**。现象：有序数据插入后查找变 O(n)。原因：退化成链表形态。排查：数据近有序时选平衡树/随机打乱插入顺序；面试要能说出「树高决定性能」。

## 小练习

1. 对树 `1→(2→(4,5), 3→(6,7))` 手推三种 DFS 的输出序列，再跑代码验证；然后解释为什么中序结果对 BST 才是升序，对普通树无意义。
2. 给层序遍历加一层变体：输出「之字形层序」（第 1 层左→右，第 2 层右→左，交替），即 LeetCode 103 锯齿形层序遍历。
3. LeetCode 100 相同的树：判断两棵树是否完全相同。提示——两个参数同时递归，四行解决；这是「树的递归定义」最短的应用。
4. LeetCode 110 平衡二叉树：判断树是否平衡。陷阱：只算每个节点高度差的暴力版是 O(n²)，尝试写出 O(n) 的后序版（一旦不平衡立刻上抛 -1）。
