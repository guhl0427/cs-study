---
id: l-swe-testing
slug: testing
title: 单元测试与测试金字塔：重构的保险绳
difficulty: 2
estMinutes: 85
tags: [测试, 软件工程]
summary: 测试是给代码装的烟雾报警器——AAA 三段式写好单元测试、金字塔告诉你力气花在哪层，跟着给一个折扣函数建立完整的测试防线。
updated: 2026-11-22
resources:
  - id: r-pytest-doc
    title: pytest 官方文档
    url: https://docs.pytest.org/en/stable/
    type: doc
    difficulty: 2
    note: 五分钟上手的官方教程，本节示例出自它的入门章节。
  - id: r-fowler-pyramid
    title: Martin Fowler · TestPyramid
    url: https://martinfowler.com/bliki/TestPyramid.html
    type: doc
    difficulty: 2
    note: 测试金字塔概念的出处，几页讲清分层逻辑。
---

> 一句话定义：单元测试是给函数装的「自动验算器」——每次改代码自动跑一遍，改坏了立刻报警，让你敢放心重构。

## 概念讲解

**为什么需要测试？** 两个理由，都指向「信心」：

1. **重构的信心**——大改之后测试一跑，绿了就证明外部行为没变。没有测试的重构像蒙眼走钢丝：不是不能走，是不知道自己什么时候掉下去；
2. **回归保护**——上周修过的 bug 被测试钉住，谁也别想悄悄改回去。

**最小测试就是一条 assert**：表达式为真则过，为假则炸。pytest 把它升级成框架——**只写 `test_` 开头的函数、里面放 assert，它就自动发现、自动运行、自动汇报**：

```python
# test_demo.py
def test_add():
    assert add(1, 2) == 3        # 失败时 pytest 会打印出实际值，一眼定位
```

```bash
pytest -v
# test_demo.py::test_add PASSED
```

**测试金字塔**——三层测试该投入的比例，画成塔：

```text
        ／ 端到端 ＼        少：启动整个系统，模拟真实用户（分钟级）
       ／ 集成测试  ＼       中：验证模块拼在一起能协作（接口测试）
      ／  单元测试    ＼     多：单个函数/类，毫秒级出结果
```

为什么不能倒过来？端到端测试慢（分钟级）、贵（要维护环境）、脆（网络抖一下就红）；单元测试快而稳。同样一小时预算，金字塔结构能覆盖更多逻辑，失败了也更容易定位到具体函数。

**好测试三特征**：

1. **快**——慢了就没人愿意跑，测试形同虚设；
2. **独立**——单跑全跑、谁先谁后结果都一样（不依赖执行顺序）；
3. **可重复**——今天跑和明天跑结果一致（不碰网络/时间/随机数，外部依赖用替身）。

**AAA 三段式**是单元测试的标准结构：Arrange（准备数据）→ Act（只做被测动作）→ Assert（断言结果）。它的价值在「Act 只有一行」——断言失败时，嫌疑只剩 Arrange 和被测函数两头，不用在几十行里找凶手。

**TDD（测试驱动开发）**一句带过：先写一个会失败的测试（红），再写刚好让它通过的最小实现（绿）——是节奏而非教条，入门阶段知道这个词即可。

## 代码示例

主线：给一个「折扣计算」函数建立完整测试防线，覆盖正常流、边界、非法输入：

**第 1 步：被测代码**（`money.py`）：

```python
def apply_discount(price: float, rate: float) -> float:
    """打折。rate 为 0~1 的小数（0.2 表示打八折）"""
    if not 0 <= rate < 1:
        raise ValueError("rate 必须在 0~1 之间")
    return round(price * (1 - rate), 2)
```

**第 2 步：测试文件**（`test_money.py`），AAA 三段注释写全：

```python
import pytest
from money import apply_discount

def test_normal_discount():
    # Arrange：准备输入与期望输出
    price, rate, expected = 100, 0.2, 80.0
    # Act：调用被测函数（动作只有这一步）
    result = apply_discount(price, rate)
    # Assert：断言实际值等于期望值
    assert result == expected

def test_free_and_no_discount():        # 边界：0 与接近 1
    assert apply_discount(100, 0) == 100
    assert apply_discount(100, 0.999) == 0.1

def test_rounding():                    # 精度：四舍五入到分
    assert apply_discount(33.33, 0.5) == 16.67

def test_invalid_rate_raises():         # 非法输入：明确抛错而不是返回错值
    with pytest.raises(ValueError):
        apply_discount(100, 1.5)
    with pytest.raises(ValueError):
        apply_discount(100, -0.1)
```

**第 3 步：运行并解读输出**：

```bash
pytest -v
# test_money.py::test_normal_discount PASSED                           [ 25%]
# test_money.py::test_free_and_no_discount PASSED                      [ 50%]
# test_money.py::test_rounding PASSED                                  [ 75%]
# test_money.py::test_invalid_rate_raises PASSED                       [100%]
# ============================= 4 passed in 0.02s =============================
```

**第 4 步：体验「保险绳」**——故意把实现改坏（去掉 round），再跑：

```text
test_money.py::test_rounding FAILED
    assert 16.665 == 16.67      ← diff 直接告诉你哪里坏了、坏成什么样
```

这就是测试的价值：**坏改动在提交前被抓住**，而不是等用户投诉。

## 常见坑

1. **坑 1：写了测试但没有断言**。函数体只调用不 assert，永远不会失败——覆盖率上去了，保护是假的。排查：故意把实现改错，看测试红不红（像主线第 4 步那样）。
2. **坑 2：测试共享状态**。多个测试读写同一个全局变量或文件，单跑全过、全跑就挂。对策：每个测试自备数据、自己清理，不依赖运行顺序。
3. **坑 3：单元测试连真实数据库/网络**。一断网全红，跑一次十几秒，慢慢就没人跑了。对策：外部依赖用 mock 替身，真集成下沉到集成测试层。
4. **坑 4：只测「正常路径」**。边界值（0、极大、空串、None）与非法输入才是 bug 高发区——本课主线专门写了边界与非法两组。
5. **坑 5：测试断言写得过细**。断言「返回 dict 的第 3 个 key 是什么」这种实现细节，重构一改就红——断言「外部可见的行为」（输入→输出），不给实现留枷锁。

## 小练习

1. 给《Python 语法速览》里的 `grade(score)` 补 5 个测试：A/B/C/F 各一档 + 一个非法输入（分数超出 0-100）。
2. 故意删掉 `apply_discount` 里的 `round`，运行 pytest，观察失败输出里的 diff 帮你定位了什么。
3. 综合任务：为一个「购物车」类（add/remove/total，对象数组课的练习）写 6 个测试——空车总价、加一件、删不存在的商品、重复添加、负数价格、精度。做完这个，你就有了给任何业务类建测试防线的模板。
4. 思考题：为什么「先写测试」的函数天然更好测？这和好测试三特征里的哪一条呼应？
