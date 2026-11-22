---
id: l-ai-sklearn
slug: sklearn
title: scikit-learn：跑通第一个模型
difficulty: 3
estMinutes: 45
tags: [scikit-learn, 机器学习, 入门]
summary: 所有模型共享 fit/predict 两板斧——六步跑通鸢尾花分类，换模型只是换个类名。
updated: 2026-11-22
resources:
  - id: r-sklearn-doc
    title: scikit-learn 官方 · 入门教程（ML with scikit-learn）
    url: https://scikit-learn.org/stable/tutorial/basic/tutorial.html
    type: doc
    difficulty: 3
    note: 本课的官方展开版，含更多数据集示例。
  - id: r-sklearn-kaggle
    title: Kaggle Learn · Intro to Machine Learning
    url: https://www.kaggle.com/learn/intro-to-machine-learning
    type: video
    difficulty: 2
    note: 浏览器里免费跟练，作业自动判分。
---

> 一句话定义：scikit-learn 把所有算法统一成「fit 学、predict 用」两步——学会一个，等于学会全部。

## 概念讲解

sklearn 最美的地方是 **API 统一**：不管线性回归、决策树还是 KNN，用法都是同一个模具：

```python
model = SomeModel(超参数)       # ① 选模型：new 一个对象
model.fit(X_train, y_train)     # ② 学习：喂训练数据
y_pred = model.predict(X_test)  # ③ 预测：对考卷作答
```

换模型 = 只换第一行的类名，其余一行不改——「两板斧打天下」。

约定俗成的变量名：**X** 是特征矩阵（二维：行=样本，列=特征），**y** 是标签向量（一维）。纪律：`fit` 只准喂训练数据，测试数据只能喂给 `predict`——这是上一课「防背题」纪律的代码化。

六步流程（背下这个骨架，90% 的入门任务都能跑通）：

```text
① load_iris()   ② train_test_split     ③ KNeighborsClassifier(3)
   加载数据        划分训练/测试           创建模型
        └───────────┬───────────────────────┘
                    ▼
      X_train / X_test / y_train / y_test
④ model.fit(X_train, y_train)      学习
⑤ model.predict(X_test)            预测
⑥ accuracy_score(y_test, y_pred)   打分
```

## 代码示例

鸢尾花分类：150 朵花，花瓣花萼共 4 个测量值，判断属于哪种花——机器学习的「Hello World」：

```python
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score

X, y = load_iris(return_X_y=True)                     # ① 特征 X，标签 y
X_train, X_test, y_train, y_test = train_test_split(  # ② 70% 训练 30% 测试
    X, y, test_size=0.3, random_state=42)
model = KNeighborsClassifier(n_neighbors=3)           # ③ 创建 KNN 模型
model.fit(X_train, y_train)                           # ④ 学习
y_pred = model.predict(X_test)                        # ⑤ 对 45 朵测试花预测
print(y_pred[:5])                                     # [1 0 2 1 1]
print(y_test[:5])                                     # [1 0 2 1 1]  前 5 个全对
print(accuracy_score(y_test, y_pred))                 # 1.0  45 朵全对
```

换个回归任务，同样三步：用面积预测房价：

```python
import numpy as np
from sklearn.linear_model import LinearRegression

area = np.array([30, 45, 60, 75, 90, 105, 120])    # 特征
price = np.array([150, 205, 268, 320, 388, 445, 505])  # 标签（万元）
model = LinearRegression()
model.fit(area.reshape(-1, 1), price)     # 特征必须二维：(7 行, 1 列)
print(model.coef_[0].round(2), model.intercept_.round(1))
# 3.96 28.5  →  每平米约 3.96 万，基础价 28.5 万
print(model.predict(np.array([[100]])))   # [424.96]  →  100 平米约 425 万
```

一句带过交叉验证：`cross_val_score(model, X, y, cv=5)` 把数据切 5 份轮流当考卷，鸢尾花 KNN 的 5 次成绩 `[0.967 0.967 0.933 0.967 1.0]`，平均 0.967——比单次划分更能反映真实水平。下一步去哪：**特征工程**（造更有用的列）和**调参**（`GridSearchCV` 自动搜超参数）。

## 常见坑

1. **坑 1：`Expected 2D array, got 1D array`**。把一维数组直接喂给 `fit`/`predict`。特征永远要二维：单列用 `x.reshape(-1, 1)`，或用 pandas 的 `df[["col"]]`（双层中括号取出即二维）。
2. **坑 2：忘了 `random_state`**。每次运行划分都不同，结果对不上，别人也复现不了。教学与调试阶段固定随机种子。
3. **坑 3：拿训练数据评估**。`accuracy_score(y_train, model.predict(X_train))` 的高分毫无意义（背题成绩），评估对象必须是测试集。

## 小练习

1. 把 `n_neighbors` 从 3 改成 1 和 50，观察测试分变化，并用「背题/没学会」解释。
2. 用 `cross_val_score` 分别评 KNN(1) 和 KNN(3)，比较平均分，回答谁更能泛化。
3. 思考题：为什么换模型只需改一行代码？这种统一 API 给学习和工程各带来什么好处？
