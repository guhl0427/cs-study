---
id: l-ai-ml-concepts
slug: ml-concepts
title: 机器学习核心概念
difficulty: 2
estMinutes: 40
tags: [机器学习, 入门]
summary: 机器学习=从数据中学规律而非人写规则；过拟合是背题，欠拟合是没学会——考题绝不能提前做过。
updated: 2026-11-22
resources:
  - id: r-ml-map
    title: scikit-learn 官方 · 选择合适的估计器（流程图）
    url: https://scikit-learn.org/stable/tutorial/machine_learning_map/index.html
    type: doc
    difficulty: 2
    note: 一张地图教你按数据规模与任务类型选算法。
  - id: r-ml-google
    title: Google 机器学习速成课程
    url: https://developers.google.com/machine-learning/crash-course
    type: doc
    difficulty: 2
    note: 免费官方课程，把本课概念讲得更细。
---

> 一句话定义：机器学习不是人写规则，而是让算法从数据里自己学出规律——有了规律，就能对新数据做预测。

## 概念讲解

**为什么不用 if-else？** 做垃圾邮件过滤，人写规则：含「中奖」判垃圾。可发件人会改成「中 奖」「仲獎」「中★奖」……规则写不完，骗术还在进化。机器学习反过来：给算法几万封**已经标好**「垃圾/正常」的邮件，让它自己找规律，新邮件来了直接套用。规则有限，数据无限。

**两大流派**——关键看数据有没有「标准答案」：

```text
数据有标签吗？
 ├─ 有标签 → 监督学习：学「输入 → 答案」的映射
 │    ├─ 答案是类别（垃圾/正常、是不是猫）→ 分类
 │    └─ 答案是数字（房价 425 万、明天气温）→ 回归
 └─ 没标签 → 无监督学习：让数据自己聚堆
      └─ 典型任务：聚类（把用户自动分成几群）
```

两个行话先对齐：**特征**是判断用的线索（邮件里的词频、房屋面积），**标签**是要预测的答案（垃圾/正常、价格）。

**训练集/测试集**——考试题绝不能提前做过。把数据切成两半：训练集用来学，测试集用来考；模型没见过的题才测得出真本事。两种病：

| 病 | 表现 | 类比 |
| ---- | ---- | ---- |
| 过拟合 | 训练分很高，测试分暴跌 | 背题，换题就不会 |
| 欠拟合 | 训练、测试分都不高 | 根本没学会 |

常见算法一句话扫盲：**线性回归**=拟一条直线；**决策树**=一串 if-else，但它自己从数据里学出来；**KNN**=新样本看 K 个最近邻居投票。评估的直觉：**准确率不是全部**——99% 的邮件本来就正常，无脑全判「正常」也有 99% 准确率，但漏掉的垃圾邮件才是你真正关心的。

## 代码示例

亲手制造一次「背题」，亲眼看着测试分暴跌：

```python
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

# 造一批有难度的数据：20 个特征只有 4 个有用，12% 标签故意标错
X, y = make_classification(n_samples=300, n_features=20,
                           n_informative=4, flip_y=0.12, random_state=7)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42)

deep = DecisionTreeClassifier(random_state=0)        # 不限深度：可劲儿背
deep.fit(X_train, y_train)
print(round(accuracy_score(y_train, deep.predict(X_train)), 3))  # 1.0
print(round(accuracy_score(y_test, deep.predict(X_test)), 3))    # 0.722

shallow = DecisionTreeClassifier(max_depth=1, random_state=0)  # 限深度：背不动
shallow.fit(X_train, y_train)
print(round(accuracy_score(y_train, shallow.predict(X_train)), 3))  # 0.838
print(round(accuracy_score(y_test, shallow.predict(X_test)), 3))    # 0.844
```

读结果：不限深度的树把噪声也当规律背了下来——训练 1.0，考试只考 0.722；限一层的树没能力背题，训练 0.838、测试 0.844，反而更稳。**记住：看测试分，别信训练分。**

## 常见坑

1. **坑 1：没划分训练/测试集就报准确率**。那个「99%」很可能是背题背出来的。对策：拿到数据第一件事 `train_test_split`，评估只看测试集。
2. **坑 2：测试集偷偷参与调参**。反复用测试分挑模型，测试集就变成了隐形训练集，成绩虚高。严格做法是再切一块验证集，或用下一课的交叉验证。
3. **坑 3：把回归任务当分类做**。想预测价格却套了分类器，结果荒唐。先问「答案是一个数字还是一个类别」，再选算法。

## 小练习

1. 「预测某用户下个月会不会流失」是分类还是回归？列出 3 个可用的特征。
2. 把示例的 `flip_y` 改成 0（标签干净），重跑看两种树的测试分，解释变化。
3. 思考题：为什么说「树深不限制」的模型是在背题？它背下来的东西长什么样？
