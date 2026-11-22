---
id: l-py-modules
slug: py-modules
title: 模块、包与虚拟环境：代码的组织与隔离
difficulty: 2
estMinutes: 30
tags: [Python, 工程化]
summary: 一个文件是模块、一个目录是包；每个项目配一个虚拟环境，依赖互不打架——从这里开始写「工程」而不是「脚本」。
updated: 2026-11-22
resources:
  - id: r-py-venv
    title: Python 官方 · venv 虚拟环境
    url: https://docs.python.org/zh-cn/3/library/venv.html
    type: doc
    difficulty: 2
    note: venv 的官方说明与完整命令。
---

> 一句话定义：`import` 让你复用别人的代码（标准库/第三方包），虚拟环境让每个项目的依赖各住各家。

## 概念讲解

**模块 = 一个 .py 文件**；**包 = 一组模块的目录**。三种 import：

```python
import json                          # 导入整个标准库模块
from datetime import date            # 只导入需要的名字
import numpy as np                   # 起别名（社区惯例）
```

标准库（自带）已经很强大：`json` 解析数据、`os`/`pathlib` 操作文件、`random` 随机、`re` 正则。**先查标准库，再想第三方**。

第三方包用 `pip` 安装——但直接装进全局 Python 是大忌：项目 A 要 requests 2.x、项目 B 要 3.x，全局只有一份必然打架。**虚拟环境（venv）** 给每个项目一个独立的小 Python：

```bash
python -m venv .venv                 # 在项目里创建虚拟环境
source .venv/bin/activate            # 激活（Windows: .venv\Scripts\activate）
pip install requests                 # 装进 .venv，不污染全局
pip freeze > requirements.txt        # 把依赖清单存档
 deactivate                          # 用完退出
```

`requirements.txt` 就是这个项目的「依赖清单」——别人拿到项目后 `pip install -r requirements.txt` 一条命令还原全部依赖。这是 Python 项目的最低工程礼仪。

## 代码示例

从零搭一个带依赖的最小项目（建议现在就跟着做）：

```bash
mkdir weather-demo && cd weather-demo
python -m venv .venv
source .venv/bin/activate
pip install requests
pip freeze > requirements.txt
```

```python
# main.py
import json
import urllib.request      # 标准库：发 HTTP 请求，不用装任何东西

def fetch_joke():
    with urllib.request.urlopen("https://official-joke-api.appspot.com/random_joke") as resp:
        data = json.load(resp)
        return f"{data['setup']} —— {data['punchline']}"

if __name__ == "__main__":          # 直接运行本文件时才执行
    print(fetch_joke())
```

`if __name__ == "__main__":` 是模块的「门口」：被 import 时不执行、直接运行时才执行——从此你的文件既能当脚本跑、又能当模块被复用。

## 常见坑

1. **坑 1：忘了激活虚拟环境就 pip install**。包装进了全局。对策：每次开终端先激活；看提示符有没有 `(.venv)` 前缀。
2. **坑 2：给自己的文件起名覆盖标准库**。写一个 `random.py`，任何 `import random` 都会导入你这份文件（当前目录优先），连锁崩一堆东西。
3. **坑 3：循环导入**。a.py import b、b.py 又 import a——启动即报 ImportError。对策：把公共部分抽到第三个模块 c.py。

## 小练习

1. 完整跟着示例搭一次项目，运行 main.py 拿到一个笑话。
2. 把上一节的 grade 程序改造成模块：`grade.py` 提供 grade() 函数，`main.py` 导入它并运行。
3. 思考题：为什么 `requirements.txt` 要和代码一起提交进 Git？
