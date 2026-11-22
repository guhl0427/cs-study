---
id: l-ai-sklearn
slug: sklearn
title: scikit-learn：跑通第一个模型
difficulty: 3
estMinutes: 85
tags: [scikit-learn, 机器学习, 入门]
summary: 所有模型共用 fit/predict 两板斧——六步跑通鸢尾花分类，交叉验证更稳地打分，再换一个回归任务验证「流程不变」。
updated: 2026-11-22
resources:
  - id: r-sklearn-doc
    title: scikit-learn 官方 · 入门教程（ML with scikit-learn）
    url: https://scikit-learn.org/stable/tutorial/basic/tutorial.html
    type: doc
    difficulty: 3
    note: 本课的官方展开版，含更多数据集示例。
  - id: r-sklearn-cv
    title: scikit-learn 官方 · Cross-validation 指南
    url: https://scikit-learn.org/stable/modules/cross_validation.html
    type: doc
    difficulty: 3
    note: 交叉验证的原理、折数选择与注意事项。
  - id: r-sklearn-kaggle
    title: Kaggle Learn · Intro to Machine Learning
    url: https://www.kaggle.com/learn/intro-to-machine-learning
    type: tool
    difficulty: 2
    note: 浏览器里免费跟练，作业自动判分。
---

> 一句话定义：scikit-learn 把所有算法统一成「fit 学、predict 用」的两板斧——学会一套流程，等于学会全部模型。

## 概念讲解

### 统一 API：两板斧打天下

sklearn 最美的设计是 **API 统一**：不管 KNN、决策树还是线性回归，用法都是同一个模具：

```python
model = SomeModel(超参数)         # ① 创建：选一个算法类，new 出对象
model.fit(X_train, y_train)      # ② 学习：喂训练数据，规律学进对象里
y_pred = model.predict(X_test)   # ③ 预测：对考卷作答，返回预测结果
```

换模型 = 只换第一行的类名，后两行一字不动。「两板斧」的好处是实打实的：学习成本从「每个算法学一遍用法」降为「学一次模具」；实验成本从「重写代码」降为「改一行」；工程上还能写通用函数，自动批量试 N 个模型。

### X 与 y：全库通用的命名约定

sklearn 文档和示例永远用这两个名字，含义是定死的：

```text
X：特征矩阵，二维「表」——行 = 样本，列 = 特征        shape (n_samples, n_features)
y：标签向量，一维「列」——每个样本一个答案            shape (n_samples,)

鸢尾花：X (150, 4)   150 朵花，每朵 4 个测量值
        y (150,)     每朵花的品种编号 0/1/2
```

纪律也藏在约定里：`fit` 只准吃 `X_train, y_train`，测试数据只准喂给 `predict`——上一课「防背题」纪律的代码化。另外特征**必须二维**：哪怕是「面积」一个特征，也要是 (150, 1) 而不是 (150,)——新手第一大报错就源于此（见坑 1）。

### 认识鸢尾花：机器学习的 Hello World

鸢尾花数据集是 1936 年 Fisher 用来发论文的老数据，如今是 ML 界的 Hello World：150 朵花，每朵 4 个测量值（花萼长宽、花瓣长宽），标签是 3 个品种（setosa / versicolor / virginica）。任务：**用 4 个测量值预测品种**——典型的三分类。选它的原因是数据干净、量小、规律清晰，让你把注意力放在流程而非数据清洗上。

### 六步流程：背下这个骨架

```text
① load_iris()                加载数据（任何来源的第一步都是"变成 X 和 y"）
        │
② train_test_split(X, y)     划分 70% 训练 / 30% 测试
        │
③ KNeighborsClassifier(3)    创建模型（选算法 + 设超参数）
        │
④ model.fit(X_train, y_train)       学习（只碰训练集）
        │
⑤ model.predict(X_test)             对考卷作答
        │
⑥ accuracy_score(y_test, y_pred)    打分（只看测试集）
```

90% 的入门任务都是这六步换个名字再演一遍：①换数据源、③换模型类、⑥换指标，②④⑤⑥永远不变。

### 交叉验证：一场考试不如五场

单次划分有运气成分：恰好测试集简单，分数虚高。**交叉验证**把数据切 5 份（折），轮流拿 1 份当考卷、其余 4 份当练习，得到 5 个分数再取平均：

```text
折 1: [考][练][练][练][练] → 0.967
折 2: [练][考][练][练][练] → 0.967
折 3: [练][练][考][练][练] → 0.933      5 次考试，每条数据
折 4: [练][练][练][考][练] → 0.967      都当过一次考生
折 5: [练][练][练][练][考] → 1.000
平均：0.967  ← 比单次划分更能反映真实水平
```

代价是训练 5 次的计算时间。小数据集几乎免费，大数据集可少折数或抽样——一句话：**单次划分像单场考试，交叉验证像五场模拟考，平均分更可信**。

### 从分类到回归：换的是模型类，不是流程

回归任务的流程与分类完全相同，只是模型类换成 `LinearRegression`，指标换成看误差。回归模型有两个「可读的参数」最值得看：`coef_`（每列特征的系数——该特征每加 1 单位，预测值平均变多少）和 `intercept_`（基础值）。**读系数就是在读业务规律**：「每平米 3.96 万」这种结论，直接从模型对象里念出来。

### 特征工程与调参：下一步的两扇门

入门流程之外，真正决定成绩上限的是两件事：**特征工程**——从原始数据造出更有信息量的列（如用身高体重算出 BMI），「数据和特征决定上限，模型只是逼近上限」；**调参**——用 `GridSearchCV` 自动把 KNN 的 K 从 1 到 20 全试一遍再选最好的，本课先知道名字即可。

### 换数据集怎么办：通用清单

拿到任何新数据集，按这张清单走一遍就能跑通：

1. **变成 X 和 y**：特征列和标签列分别拎出来（pandas 选列），特征必须数值型——文本列要编码或先丢弃。
2. **体检**：`df.info()` 看缺失值、`df.describe()` 看取值范围、`bincount` 看类别比例（严重不平衡时指标要换）。
3. **划分**：`train_test_split` 固定 `random_state`。
4. **选起点**：分类先试 `KNeighborsClassifier` 或 `DecisionTreeClassifier`，回归先试 `LinearRegression`——跑通再谈优化。
5. **评估**：分类用 `accuracy_score`（不平衡时换召回率），回归用 `mean_absolute_error`。
6. **升级**：交叉验证确认成绩，再上 GridSearchCV 调参。

## 代码示例

主线任务：六步跑通鸢尾花分类，再验证「统一 API」——换回归任务只改模型行。所有输出均为 sklearn 1.9.1 实测，可直接对答案。全程约 30 分钟。

### 第 0-2 步：加载数据、认识它、划分

```python
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split

X, y = load_iris(return_X_y=True)     # ① X (150,4) 特征矩阵，y (150,) 标签
print(X.shape, y.shape)               # (150, 4) (150,)
print(X[:3])                          # 看前 3 朵花的 4 个测量值
# [[5.1 3.5 1.4 0.2]
#  [4.9 3.0 1.4 0.2]
#  [4.7 3.2 1.3 0.2]]
print(y[:10])                         # [0 0 0 0 0 0 0 0 0 0] 数据按类排好，必须打乱再分

X_train, X_test, y_train, y_test = train_test_split(   # ② 随机 70/30 划分
    X, y, test_size=0.3, random_state=42)
print(X_train.shape, X_test.shape)    # (105, 4) (45, 4)
```

`random_state=42` 固定随机性——今天跑和明天跑、你跑和我跑，结果完全一致。

### 第 3-6 步：KNN 分类、预测、打分

```python
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score

model = KNeighborsClassifier(n_neighbors=3)            # ③ 创建 KNN：看最近 3 个邻居投票
model.fit(X_train, y_train)                            # ④ 学习（只碰训练集）

y_pred = model.predict(X_test)                         # ⑤ 对 45 朵测试花作答
print(y_pred[:5])                                      # [1 0 2 1 1]
print(y_test[:5])                                      # [1 0 2 1 1]  前 5 朵全对

print((y_pred == y_test).sum(), "/", len(y_test))      # 45 / 45
print(accuracy_score(y_test, y_pred))                  # 1.0  六步跑通，测试集满分
```

### 单次划分的运气问题：交叉验证补一刀

```python
from sklearn.model_selection import cross_val_score

scores = cross_val_score(model, X, y, cv=5)     # 五折：不指定 random_state，每条数据都当过考卷
print(scores.round(3))                          # [0.967 0.967 0.933 0.967 1.   ]
print(scores.mean().round(3))                   # 0.967  ← 报这个数，别报单次 1.0
```

单次划分恰好抽到简单的 45 朵花，得了 1.0；五折平均 0.967 才是稳定水平（最差折 0.933——有 2 朵 versicolor 和 virginica 长得太像，是真实的数据难度）。**汇报模型成绩，报交叉验证平均分。**

### 换个回归任务：只改模型行，流程原封不动

用「面积 → 房价」验证统一 API。线性回归会拟出 `价格 = a × 面积 + b` 的直线：

```python
import numpy as np
from sklearn.linear_model import LinearRegression

area = np.array([30, 45, 60, 75, 90, 105, 120])        # 特征：面积（平米）
price = np.array([150, 205, 268, 320, 388, 445, 505])  # 标签：价格（万元）

model_r = LinearRegression()
model_r.fit(area.reshape(-1, 1), price)   # 单特征也要二维：(7,1)，reshape(-1,1) 就是干这个的

print(model_r.coef_)         # [3.96428571]  每平米约 3.96 万 ← 读系数即读业务规律
print(model_r.intercept_)    # 28.535714285714278  基础价约 28.5 万（含公摊、装修底价……随你解释）
print(model_r.predict(np.array([[100]])))   # [424.96428571]  100 平米约 425 万
```

`predict([[100]])` 用双层中括号，因为预测输入必须是二维——和 `fit` 的要求一脉相承。对比两条主线：**六步骨架一个没变，变的只有第③步的类名**——这就是「两板斧」的复利。

### 加餐：顺手验证「换模型只改一行」

```python
from sklearn.tree import DecisionTreeClassifier
tree = DecisionTreeClassifier(random_state=0)          # 只换这一行
tree.fit(X_train, y_train)
print(accuracy_score(y_test, tree.predict(X_test)))    # 1.0  鸢尾花太简单，两模型都满分
print(cross_val_score(tree, X, y, cv=5).mean().round(3))   # 0.967  交叉验证下依然打平
```

两条教训：① 鸢尾花是「太容易」的数据集，单次 1.0 不代表模型更强；② 比较模型必须用交叉验证平均分——这正是上一段的意义。

## 常见坑

1. **坑 1：`Expected 2D array, got 1D array`**。现象：`model.fit(area, price)` 直接报错。原因：特征必须是二维 (n, 1)，一维数组 (n,) 不行。排查：单列用 `area.reshape(-1, 1)`，或 pandas 的 `df[["area"]]`（双层中括号取出的就是二维）；`predict` 输入同理。
2. **坑 2：忘了 `random_state`**。现象：每次运行准确率不同，同事复现不出来。原因：划分带随机性。排查：教学与调试阶段 `train_test_split(..., random_state=42)` 固定住；生产环境留日志记录种子。
3. **坑 3：拿训练数据评估**。现象：`accuracy_score(y_train, model.predict(X_train))` 报出漂亮的 0.99。原因：背题成绩，无参考价值。排查：评估函数里写死用 `X_test`；发现自己「在训练集上打分」立即删掉重评。
4. **坑 4：先 fit 全量再划分（数据泄漏）**。现象：交叉验证或测试成绩虚高。原因：标准化、特征筛选等预处理若在全量数据上做，测试集信息已经泄进训练过程。排查：预处理也要「先划分再 fit」——`StandardScaler` 在训练集 fit、对测试集只 transform。
5. **坑 5：文本列直接喂 `fit`**。现象：报 `ValueError: could not convert string to float`。原因：sklearn 只吃数字。排查：类别文本先编码（`LabelEncoder`/one-hot），无关文本列先 drop——回到「通用清单」第 1 步。
6. **坑 6：KNN 的 K 大于训练样本数**。现象：小数据集上设 `n_neighbors=100` 报错或全错。原因：KNN 要真找得到 K 个邻居。排查：K 一般取个位数、且用奇数减少平票；调 K 交给练习 2 或 GridSearchCV。

## 小练习

1. 把 `n_neighbors` 改成 1、5、50，观察单次划分与交叉验证的分数变化，用「背题/泛化」解释：为什么 K=1 单次也是 1.0，但交叉验证平均分（0.960）略低于 K=3？
2. 用 `cross_val_score` 分别评 KNN(1)、KNN(3)、决策树，列表比较平均分，回答谁更值得交付、为什么。
3. 给房价回归再预测 60 平米和 130 平米两个面积，130 的预测值可信吗？用「训练数据范围 30–120」外推解释（提示：模型只见过 30–120，外推无据）。
4. **综合任务**：按「换数据集通用清单」跑通 wine 数据集（`load_wine()`，13 个特征三分类）——加载、体检、划分、KNN(3)、交叉验证平均分；再把模型换成决策树比较。跑通后你拥有的不是「鸢尾花代码」，而是一台可插拔任何新数据集的建模流水线。
