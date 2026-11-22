---
id: l-py-modules
slug: py-modules
title: 模块与虚拟环境：像工程师一样组织代码
difficulty: 2
estMinutes: 75
tags: [Python, 入门, 模块, 工程化]
summary: 模块与包的组织哲学、import 的搜索路径陷阱、__main__ 原理、标准库地图、venv 全流程——把记账工具拆成真正的多文件项目。
updated: 2026-11-22
resources:
  - id: r-py-mod-doc
    title: Python 官方教程 · 模块
    url: https://docs.python.org/zh-cn/3/tutorial/modules.html
    type: doc
    difficulty: 2
    note: 官方对模块、搜索路径、__name__ 的权威讲解，本课讲完可直接通读。
  - id: r-py-venv-doc
    title: Python 官方 · venv 虚拟环境
    url: https://docs.python.org/zh-cn/3/library/venv.html
    type: doc
    difficulty: 2
    note: venv 的官方说明与完整命令参考。
---

> 一句话定义：**模块是文件、包是目录**，import 让代码跨文件复用；虚拟环境让每个项目的依赖「各住各家」——从这里开始写工程，而不是写脚本。

## 概念讲解

### 组织哲学：为什么一个文件会不够用

前六课的程序都在一个 .py 文件里。超过两三百行后，单文件的问题开始显形：想找 `load` 函数要在几百行里翻；想把这个函数借给另一个项目，只能复制粘贴；文件越长越不敢动。解法就是把代码按职责拆成多个文件，每个文件是一个**模块（module）**，模块之间用 `import` 借用——你其实早就在用了：`import json`、`from pathlib import Path`，借的就是标准库的模块。**包（package）**再进一层：把相关模块收进一个目录（Python 3.3 起不需要 `__init__.py` 也能工作），目录名成为命名空间，如 `myapp.storage`。组织哲学一句话：**一个模块一件事，一个包一个领域**——就像记账工具拆出「存数据的」和「干活的」两个文件，各自独立演进。

### 三种 import 与搜索路径

```python
import json                      # 借整个模块：用 json.loads
from pathlib import Path         # 只借一个名字：直接用 Path
import numpy as np               # 借的时候改个短名
```

第三种 `from module import *` 会把对方的所有公开名字**灌进你的命名空间**——两个模块里有同名函数时，后 import 的悄悄盖掉前者，bug 从此说不清。工程纪律：**不用 star import**，要么整模块、要么点名。import 时 Python 按固定顺序搜模块，搜索路径存在 `sys.path` 里，关键顺序是：**当前目录最优先 → PYTHONPATH → 已安装的第三方包 → 标准库**。「当前目录最优先」意味着：如果你的文件叫 `json.py`，`import json` 会导入**你写的这个文件**而不是标准库——同目录下的自建文件会顶掉标准库，这是新手第二大灵异事件（本课第 1 个坑专讲）。

### `__name__ == "__main__"`：一个文件的两种人生

每个模块都有一个自带的字符串属性 `__name__`。**直接运行**这个文件（`python main.py`）时，它的 `__name__` 是 `"__main__"`；**被别人 import** 时，`__name__` 是模块名（`"main"`）。利用这个差别，一个文件可以「当脚本跑时执行主流程，被借用时只提供函数不打扰对方」：

```python
def load():
    ...

if __name__ == "__main__":    # 只有直接运行本文件时才为真
    print("自检：直接运行 storage.py 时才会打印")
```

这就是官方惯用的**脚本/模块两用**模式：函数定义是模块的「公共资产」，`if __name__` 块是「私人领地」。主线项目里 storage.py 会用它内置一段自检代码——被 main.py import 时自检不执行，单独跑它就做自检，两全其美。

### 标准库地图：五分钟认识随身的工具箱

标准库随 Python 附带、免安装，这五个是入门期最高频的：

| 模块 | 一句话 | 一例 |
| ---- | ---- | ---- |
| `json` | 对象 ↔ JSON 文本互转 | `json.loads('{"a": 1}')` |
| `os` | 与操作系统交互（环境变量、目录） | `os.getenv("HOME")` |
| `pathlib` | 面向对象的路径处理 | `Path("a") / "b.txt"` |
| `random` | 随机数 | `random.randint(1, 6)` 掷骰子 |
| `datetime` | 日期时间 | `datetime.date.today()` 今天 |
| `re` | 正则表达式（文本高级匹配） | `re.findall(r"\d+", "ab12cd")` |

用的时候 `import` 即用，不用装、不用配。判断「这个功能有没有现成的」：先想标准库，再想第三方（PyPI 有五十多万个包，如 requests 之于网络请求），最后才考虑自己造轮子。

### venv 虚拟环境：为什么全局装包是灾难

第三方包用 pip 安装：`pip install requests`。问题在于**装到哪**：如果装进全局 Python，A 项目要 requests 2.x、B 项目要 requests 3.x，两者必打架；升级某个包还可能弄坏依赖旧版的其他项目——一台电脑上项目越多，全局环境越像泥潭。解法是**虚拟环境（venv）**：给每个项目造一套独立的小 Python（含独立的 site-packages 目录），pip install 只装进当前激活的这套，项目之间物理隔离、互不可见。原理记一句：**venv 复制的是「环境」不是「解释器本体」**——它建个目录结构让 Python 运行时把包查找路径指向项目内的 site-packages。

完整操作三步（在项目根目录执行）：

```text
python -m venv .venv          # 1. 创建虚拟环境（.venv 目录，每个项目一次）
.venv\Scripts\activate        # 2. 激活（Windows；macOS/Linux 用 source .venv/bin/activate）
pip install requests          # 3. 安装——此时装进 .venv，全局毫发无损
```

激活成功的标志：命令行提示符前出现 `(.venv)` 前缀，此后 `python` 和 `pip` 都指向虚拟环境里的版本。离开时 `deactivate`。VS Code 会自动检测 .venv 并让「运行」按钮使用它，体验上无感。

### requirements.txt 与 pip 日常

虚拟环境解决「隔离」，`requirements.txt` 解决**「存档与还原」**——它是一份依赖清单，把环境里所有第三方包和版本号记录在案：

```text
pip freeze > requirements.txt      # 存档：当前环境的全部依赖写入文件
pip install -r requirements.txt   # 还原：新机器/新环境一条命令装齐
```

工程意义：把 requirements.txt 提交进版本库，任何人 clone 项目后「建 venv → 装清单」两步就能复现一模一样的环境——**代码可复制，环境也要可复制**。pip 日常四命令：`pip install 包名`（装）、`pip uninstall 包名`（卸）、`pip list`（看装了什么）、`pip show 包名`（看某包详情）。装包默认从 PyPI 拉，网络慢可换国内镜像（`-i https://pypi.tuna.tsinghua.edu.cn/simple`）。

## 代码示例

主线任务：**把记账工具从单文件拆成多文件项目**，体验模块化的真实收益。拆分原则按职责：存取数据的一个文件、业务逻辑的一个文件、程序入口的一个文件。跟着做约 25 分钟。

### 第 0 步：规划项目结构

新建文件夹 `ledger`（**不要**叫 `json`、`random` 这类标准库名！），规划三个文件：

```text
ledger/
├── storage.py     # 存储层：load/save——只管「数据怎么存」
├── tools.py       # 业务层：add/report/ask_amount——只管「记账的逻辑」
├── main.py        # 入口：菜单循环——只管「用户怎么交互」
└── ledger.json    # 数据文件（运行后生成）
```

拆分信号来自函数课的「一个函数一件事」：既然函数按职责拆，文件也按**职能**拆。先写下这张图，动手时就有地图。

### 第 1 步：写 storage.py——存储层 + 自检

```python
"""storage.py —— 数据存取层：账本的读写全部在这里"""
import json
from pathlib import Path

DATA = Path(__file__).parent / "ledger.json"   # 锚定本文件所在目录

def load():
    """读回全部记录；不存在或损坏时返回空账本"""
    if not DATA.exists():
        return []
    try:
        text = DATA.read_text(encoding="utf-8")
        return json.loads(text) if text.strip() else []
    except json.JSONDecodeError:
        print("[警告] 账本文件损坏，按新账本启动")
        return []

def save(records):
    """全部记录写回文件"""
    DATA.write_text(json.dumps(records, ensure_ascii=False, indent=2),
                    encoding="utf-8")

if __name__ == "__main__":                     # 自检：单独跑本文件才执行
    save([{"date": "2026-11-22", "item": "测试", "amount": 1.0}])
    assert load() == [{"date": "2026-11-22", "item": "测试", "amount": 1.0}]
    print("storage 自检通过：save → load 往返一致")
```

两处新意：`Path(__file__).parent` 把数据文件锚定在**脚本自己的目录**（文件课第 6 个坑的终极解法，换目录运行也不漂）；末尾的 `if __name__ == "__main__"` 块是自检——单独运行 `python storage.py` 验证存取往返，被 import 时这些代码不执行。运行验证：

```text
$ python storage.py
storage 自检通过：save → load 往返一致
```

### 第 2 步：写 tools.py——业务层

```python
"""tools.py —— 业务逻辑层：记账、报表、输入校验"""

def add(records, item, amount, date):
    records.append({"date": date, "item": item, "amount": float(amount)})

def ask_amount():
    """反复询问直到拿到合法金额"""
    while True:
        raw = input("金额: ").strip()
        try:
            value = float(raw)
        except ValueError:
            print(f"『{raw}』不是合法数字，请重输（例：22.5）")
            continue
        if value < 0:
            print("金额不能为负，请重输")
            continue
        return value

def report(records):
    if not records:
        return "账本为空，快去记一笔吧"
    total = sum(r["amount"] for r in records)
    biggest = max(records, key=lambda r: r["amount"])
    return (f"共 {len(records)} 笔，总计 {total:.2f} 元\n"
            f"最大一笔: {biggest['item']} {biggest['amount']:.2f} 元")
```

注意 tools.py **没有 import json/pathlib**——业务层只操作内存中的列表，根本不关心数据存哪。这就是分层的好处：改存储方案（比如换成数据库）只动 storage.py，业务层一行不改。

### 第 3 步：写 main.py——组装入口

```python
"""main.py —— 程序入口：用户交互与流程编排"""
import storage
import tools

def main():
    records = storage.load()
    print(f"欢迎记账，当前 {len(records)} 笔")
    while True:
        cmd = input("命令 (a=记账 / r=报表 / q=退出): ").strip().lower()
        if cmd == "q":
            storage.save(records)
            print("已保存，再见")
            break
        elif cmd == "a":
            date = input("日期 (回车=今天): ") or "2026-11-22"
            item = input("项目: ")
            tools.add(records, item, tools.ask_amount(), date)
        elif cmd == "r":
            print(tools.report(records))
        else:
            print("看不懂的命令，请输入 a / r / q")

if __name__ == "__main__":
    main()
```

`import storage` 后，storage 里的函数全部通过 `storage.load()` 这种「模块名.函数名」方式调用——命名空间清清楚楚，一眼看出这函数来自哪一层。入口文件同样加了 `if __name__` 块，它既可以直接运行，将来也能被别的程序 import 复用流程。

### 第 4 步：运行与验收

```text
$ python main.py
欢迎记账，当前 0 笔
命令 (a=记账 / r=报表 / q=退出): a
日期 (回车=今天):
项目: 咖啡
金额: 22.5
命令 (a=记账 / r=报表 / q=退出): r
共 1 笔，总计 22.50 元
最大一笔: 咖啡 22.50 元
命令 (a=记账 / r=报表 / q=退出): q
已保存，再见
```

验收三件事：功能与单文件版完全一致；`python storage.py` 的自检可以随时单独跑；**换个目录再跑 `python ledger/main.py`，数据文件依然写进 ledger 文件夹**（`Path(__file__).parent` 的功劳）。模块化换来三个收益：每个文件变小、职责单一好维护；storage 可直接借给其他需要存 JSON 的项目；团队里三个人可以分别改三个文件互不冲突。

## 常见坑

1. **坑 1：文件名撞了标准库**。现象：目录里建了 `random.py`，之后 `import random` 疯狂报 `AttributeError`——你的 random.py 没有 `randint`。原因：import 搜索路径**当前目录最优先**，自建文件顶掉了标准库。对策：文件/目录命名避开标准库名（json/os/random/re/test.py 等全要避）；误撞后删掉文件并清理它生成的 `__pycache__`。
2. **坑 2：循环导入**。现象：`ImportError: cannot import name 'X' from partially initialized module`。原因：A 文件 import B、B 又 import A，互相等到天荒地老，程序加载时对方还是半成品。对策：把公共的东西抽到第三个文件让两者都 import 它；import 永远单向流动（入口 → 业务 → 存储，不许反向）。
3. **坑 3：改了代码行为没变**。现象：明明改了函数，运行结果还是旧的。原因：Python 把导入过的模块缓存成 `__pycache__` 里的字节码，极少数情况下缓存没失效；更常见的是目录里有同名旧文件、改的是另一份。排查：`print(模块.__file__)` 看实际加载的是哪个路径；删 `__pycache__` 重跑。
4. **坑 4：模块顶层写副作用代码**。现象：storage.py 顶层写了 `print("加载完成")` 或直接 `save([])`，导致 import 它的一方莫名其妙被打出信息、甚至数据被清空。原因：import 会**执行**模块顶层所有代码，副作用随之发生。对策：顶层只放 import、常量、def；一切「动作」收进函数和 `if __name__ == "__main__":` 块。
5. **坑 5：直接运行包内文件触发相对导入报错**。现象：项目变大用了包结构后，`python tools.py` 报 `ImportError: attempted relative import with no known parent package`。原因：相对导入（`from . import x`）需要「这是包的一部分」的身份，直接单跑文件没有这个身份。对策：入口统一从项目根目录以 `python -m 包名.模块名` 运行，或干脆保持本课的平铺三文件结构（入门够用）。
6. **坑 6：pip 装错了地方**。现象：明明 pip install 成功，程序还是 `ModuleNotFoundError`。原因：命令行没激活 venv，包装进了全局 Python（或另一个项目的环境）；或激活的 venv 和运行程序用的解释器不是同一个。排查：`pip -V` 和 `python -V` 看路径是否都在 `.venv` 里；确认提示符带 `(.venv)` 前缀再装。

## 小练习

1. 写模块 `dice.py`：包含 `roll(n=1)` 函数（用 random 返回 n 次掷骰子的结果列表），带 `if __name__` 自检块——分别用「直接运行」和「被另一个文件 import」两种方式跑，观察自检块只在前者打印。
2. 在你的 ledger 目录里故意新建 `json.py`（内容一行 `print("我被误导入了")`），运行 main.py 观察现象，然后删掉并解释刚才发生了什么——亲手撞一次坑，以后一眼认出它。
3. 为 ledger 项目建 venv 并激活，`pip list` 查看初始包列表（pip/setuptools），写一个不含第三方依赖的 requirements.txt 并说明：为什么本项目其实不需要 requirements.txt，什么时候才需要。
4. **综合小项目**：给项目新增第四个模块 `stats.py`，提供 `by_category(records)` 分类小计函数（文件课练习的分类字段），main.py import 它并给菜单加 `s` 命令展示分类报表——完成后运行全流程，体验「加一个功能只动了两个文件、storage 一行没碰」。
