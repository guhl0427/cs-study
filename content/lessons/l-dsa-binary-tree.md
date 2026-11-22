---
id: l-dsa-binary-tree
slug: binary-tree
title: 二叉树与遍历
difficulty: 2
estMinutes: 45
tags: [数据结构, 树]
summary: 树是分层的一对多结构，二叉树每节点最多两个孩子——四种遍历是操作一切树结构的基本功。
updated: 2026-11-22
resources:
  - id: r-tree-visualgo
    title: VisuAlgo · 二叉搜索树
    url: https://visualgo.net/zh/bst
    type: tool
    difficulty: 2
    note: 动画演示建树、遍历与搜索。
  - id: r-tree-level
    title: LeetCode · 二叉树的层序遍历
    url: https://leetcode.cn/problems/binary-tree-level-order-traversal/
    type: tool
    difficulty: 2
    note: 本节 BFS 遍历的标准练习题。
---

> 一句话定义：二叉树把数据按「父 → 最多两个孩子」分层组织，遍历决定你按什么顺序摸到每个节点。

## 概念讲解

数组是平铺的，树才真正分层——像公司组织架构：CEO 下面有总监，总监下面有组长。树**没有环**（一个节点只有一个父节点），这是它和图的区别。**二叉树**：每个节点最多两个孩子，节点三件套 `val`（数据）、`left`、`right`（指向孩子，没有就是 None）。

```
        1            ← 根（root）
      /   \
     2     3
    / \     \
   4   5     6     ← 叶子（leaf）
```

名词一句带过：**满二叉树**每层塞满；**完全二叉树**只许最后一层缺右边——堆就长这样。

遍历分两大门派。深度优先（DFS）一条路走到黑，按访问根的时机分三种：

```
前序：根 → 左 → 右    1 2 4 5 3 6    （复制树、序列化）
中序：左 → 根 → 右    4 2 5 1 3 6    （二叉搜索树里得到有序序列）
后序：左 → 右 → 根    4 5 2 6 3 1    （先算孩子再算父亲，如统计树大小）
```

广度优先（BFS）**一层一层扫**（层序遍历），用队列实现：出队一个节点，把它的孩子依次入队。需要「按层处理」（求树高、最短层数）就想到它。

顺带一句：**二叉搜索树（BST）**规定「左子树 < 根 < 右子树」，查找像二分一样只走一边——这正是中序遍历有序的原因。

## 代码示例

```python
class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

# 搭出讲解图里的那棵树
root = TreeNode(1)
root.left = TreeNode(2)
root.right = TreeNode(3)
root.left.left = TreeNode(4)
root.left.right = TreeNode(5)
root.right.right = TreeNode(6)
def preorder(node):          # 前序：根左右
    if node is None:
        return []
    return [node.val] + preorder(node.left) + preorder(node.right)
def inorder(node):           # 中序：左根右
    if node is None:
        return []
    return inorder(node.left) + [node.val] + inorder(node.right)
def postorder(node):         # 后序：左右根
    if node is None:
        return []
    return postorder(node.left) + postorder(node.right) + [node.val]
print(preorder(root))        # [1, 2, 4, 5, 3, 6]
print(inorder(root))         # [4, 2, 5, 1, 3, 6]
print(postorder(root))       # [4, 5, 2, 6, 3, 1]
from collections import deque
def level_order(root):       # BFS 层序：队列
    if root is None:
        return []
    out, q = [], deque([root])
    while q:
        node = q.popleft()           # 出队处理
        out.append(node.val)
        if node.left:
            q.append(node.left)      # 孩子依次入队
        if node.right:
            q.append(node.right)
    return out
print(level_order(root))     # [1, 2, 3, 4, 5, 6]
```

## 常见坑

1. **坑 1：忘写 `node is None` 判断**。访问 `None.left` 抛 `AttributeError`。排查：递归函数第一行永远是基线条件。
2. **坑 2：分不清「访问根」的时机**。打印位置放错，三种遍历结果看着都像。排查：口诀——根在第几位就是什么序（根在前=前序）。
3. **坑 3：BFS 用 list 的 `pop(0)`**。每次 O(n)，树大就卡。排查：用 `deque.popleft()`（见「栈与队列」）。

## 小练习

1. 给示例树加一个节点 7（挂在 6 的左边），预测并验证三种 DFS 输出的变化。
2. 写递归函数 `tree_height(node)` 求树高（空树 0，单节点 1）。
3. 思考题：为什么 BST 的中序遍历一定有序？用「左 < 根 < 右」推一遍。
