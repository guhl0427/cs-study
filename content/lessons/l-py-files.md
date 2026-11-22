---
id: l-py-files
slug: py-files
title: 文件与 JSON：让程序记住数据
difficulty: 2
estMinutes: 75
tags: [Python, 入门, 文件, JSON]
summary: with open 的机制、读写模式、逐行读取、JSON 存取与 pathlib——用一条「记账工具」主线，写出会持久化数据的完整程序。
updated: 2026-11-22
resources:
  - id: r-py-io-doc
    title: Python 官方教程 · 读写文件
    url: https://docs.python.org/zh-cn/3/tutorial/inputoutput.html#reading-and-writing-files
    type: doc
    difficulty: 2
    note: 官方对 open 模式、编码、with 语法的标准讲解。
  - id: r-py-json-doc
    title: Python 官方文档 · json 模块
    url: https://docs.python.org/zh-cn/3/library/json.html
    type: doc
    difficulty: 2
    note: dump/load 全参数说明，本课讲最常用的部分，细节来此查。
---

> 一句话定义：变量活在内存里、程序一结束就蒸发；**文件让数据活过程序的生死**——读写文件 + JSON 序列化，是程序「记住数据」的标准组合拳。

## 概念讲解

### 为什么程序需要「记住」：RAM 与磁盘的分工

到本课为止，你写的所有程序有个共同宿命：一结束，一切归零。原因是**变量存在 RAM（内存）里**——内存是「通电才有内容」的部件，程序退出、断电、重启，全没了。而**磁盘是「断电不失忆」**的部件，写进文件的数据第二天还在。

| 对比 | 内存（变量） | 磁盘（文件） |
| ---- | ---- | ---- |
| 速度 | 极快 | 慢几个数量级 |
| 生命周期 | 程序运行期间 | 永久，除非删除 |

所以分工明确：**运行中用变量，跨运行用文件**。记账工具的余额、游戏的存档、网站的配置，全都走文件。程序读写文件的基本姿势就是三步：`open` 打开 → 读或写 → 关闭。第三步最容易忘，于是 Python 给了Mechanism让它「想忘都忘不了」——就是下一节的 with。

### with open：为什么不用手写 close

打开文件后必须关闭——不关闭，数据可能还停在缓冲区没落盘，文件句柄也占着系统资源。手写的话：

```python
f = open("data.txt", "w", encoding="utf-8")
f.write("数据")      # 中间任何一行出错，close 就执行不到
f.close()
```

这段代码的隐患：write 到 close 之间只要出一行错，`close()` 永远不会执行，文件就一直悬着。标准写法用 **with 语句**：

```python
with open("data.txt", "w", encoding="utf-8") as f:
    f.write("数据")
# 出了 with 块，无论正常结束还是中途报错，文件都保证被关闭
```

with 背后的机制叫**上下文管理器协议**：`open(...)` 返回的对象自带「进入时做什么」（打开）和「退出时做什么」（保证关闭）两套钩子，with 负责无论块内发生什么（包括异常）都执行退出钩子。一句话记住：**with = 「用完保证归还」的语法保险**，凡是有「开了必须关」语义的资源（文件、网络连接、数据库）都用 with。以后读到 `with open(...) as f:` 直接翻译成「打开文件用完自动关」。

### 读写模式与 encoding：四个字母一张表

`open(path, mode, encoding)` 的第二个参数决定「你要干什么」：

| 模式 | 名字 | 行为 | 文件不存在时 |
| ---- | ---- | ---- | ---- |
| `"r"` | 读（默认） | 从头读，**不能写** | 报 `FileNotFoundError` |
| `"w"` | 写 | **清空原内容**从头写 | 自动创建 |
| `"a"` | 追加 | 保留原内容，从末尾接着写 | 自动创建 |
| `"x"` | 独占创建 | 只创建新文件 | **已存在则报错** |

两张警示牌：**`"w"` 会瞬间清空整个文件**——想「再加几行」结果用了 w，老数据全部蒸发，这是文件操作第一大事故；追加一律 `"a"`。`"x"` 适合「不许覆盖已有档案」的谨慎场景。第三个参数 `encoding="utf-8"` **每次都要显式写**：Windows 下不写时 Python 用系统默认编码（GBK），存中文能成功，换台 Linux 或给别人就 `UnicodeDecodeError`；写死 UTF-8 一次，天下通用。

### 读文件的几种姿势

```python
with open("log.txt", encoding="utf-8") as f:
    text = f.read()          # 姿势一：一次读全（小文件）
with open("log.txt", encoding="utf-8") as f:
    for line in f:           # 姿势二：逐行迭代（大文件首选）
        print(line.strip())  # 每行自带换行符，strip 掉
```

`read()` 一次吞下整个文件成字符串，简单但吃内存——读 2GB 日志会把内存撑爆。**逐行迭代**是 Python 的优雅之处：文件对象本身就是可迭代的，for 循环一行行喂给你，内存占用恒定，几 GB 的文件也能稳稳处理。还有 `f.readlines()`（一次读全成行列表）介于两者之间，日常优先用前两种姿势。

### 写文件与追加

```python
with open("note.txt", "w", encoding="utf-8") as f:
    f.write("第一行\n")           # write 不自动换行，\n 自己给
    f.writelines(["第二行\n", "第三行\n"])   # 或一次写多行
with open("note.txt", "a", encoding="utf-8") as f:
    f.write("追加的一行\n")        # 老内容保住了
```

注意 `write` **不自动加换行**，`\n` 要自己拼——忘加的结果是所有内容挤成一行。写 JSON 时另有 `indent` 参数让文件可读（见主线项目），日常写日志用 `"a"` 模式。

### JSON：程序之间交换数据的标准格式

程序要保存的不是一句句话，而是**结构化数据**（字典、列表），这需要「序列化」——把内存对象转成文本格式。JSON 是事实上的世界标准：轻量、人能读懂、所有语言都认。Python 的 `json` 模块在**对象 ↔ JSON 文本**之间双向翻译，对应关系背下来：

| Python | JSON |
| ---- | ---- |
| `dict` | object `{"k": v}` |
| `list` / `tuple` | array `[...]` |
| `str` / `int` / `float` | string / number |
| `True` / `False` / `None` | `true` / `false` / `null` |

四个函数记一组对比：`json.dump(obj, f)` 把对象**写进文件**、`json.load(f)` 从**文件读回**对象；`json.dumps(obj)` 转成**字符串**（s = string）、`json.loads(s)` 从**字符串解析**（网络传输用这对）。两个限制先记住：JSON 只有这一张类型表——set、自定义对象存不进去（会报 TypeError）；dict 的键会被转成**字符串**，读回来 `"1"` 还是字符串不是整数。tuple 存进去变 list，读回来也是 list。

### pathlib：现代路径处理

拼路径别再手动字符串相加（Windows 和 Linux 分隔符还不一样），标准库 pathlib 给了面向对象的方式：

```python
from pathlib import Path
data_dir = Path("data")                 # 相对路径对象
p = data_dir / "ledger.json"            # / 直接拼接，跨平台
p.exists()                              # 存在吗
data_dir.mkdir(exist_ok=True)           # 建目录（已存在不报错）
text = p.read_text(encoding="utf-8")    # 一步读全文
p.write_text("内容", encoding="utf-8")   # 一步写全文
```

`Path` 对象能判断存在、建目录、拼路径、读写小文件，本课主线用它管理数据文件；更大的文件流操作仍走 `open`。`exist_ok=True` 是「目录已存在就当没事」的开关，能省掉一遍存在性检查。顺带一句 CSV：逗号分隔的表格数据用内置 `csv` 模块读写（`csv.reader` 逐行给你列表），Excel 能直接打开，表格类数据落地时它比 JSON 更合适——本课知道即可。

## 代码示例

主线任务：**一个完整可用的「记账工具」**（约 40 行）。功能：支出记录写入 JSON 文件持久保存、启动时读回历史、支持添加和统计。这个程序将贯穿后面两课——异常课给它加防护，模块课把它拆成多文件项目。跟着做约 25 分钟。

### 第 0 步：设计数据文件

写代码前先想清楚「数据长什么样」。记账数据是「多条支出记录」，用字典列表表示，存成 JSON：

```json
[
  {"date": "2026-11-22", "item": "午饭", "amount": 18.5},
  {"date": "2026-11-22", "item": "地铁", "amount": 4.0}
]
```

选 JSON 而非 txt 的理由：结构化（每条记录有 date/item/amount 三个字段）、`json.load` 一行读回成 Python 对象、文件本身人能看懂能手改。文件名定为 `ledger.json`，用 pathlib 管理。

### 第 1 步：存储层——load 与 save

```python
import json
from pathlib import Path

DATA = Path("ledger.json")

def load():
    """读回全部记录；文件不存在视为空账本"""
    if not DATA.exists():
        return []
    text = DATA.read_text(encoding="utf-8")
    return json.loads(text) if text.strip() else []

def save(records):
    """全部记录写回文件，indent 让文件可读"""
    DATA.write_text(json.dumps(records, ensure_ascii=False, indent=2),
                    encoding="utf-8")
```

三个设计点：`load` 里先判存在——空账本返回 `[]` 而不是崩溃；`text.strip()` 防住「文件存在但内容为空」导致 `json.loads("")` 报错；`ensure_ascii=False` 让中文原样存进文件（不写会把「午饭」存成 `\u5348\u996d`），`indent=2` 让文件带缩进可读。save 接收整个列表整体重写——数据量小的工具「全量重写」最简单可靠，追加式写法留到以后。

### 第 2 步：业务层——添加与统计

```python
def add(records, item, amount, date):
    """添加一条支出记录（直接修改传入的列表）"""
    records.append({"date": date, "item": item, "amount": float(amount)})

def report(records):
    """返回统计摘要字符串"""
    if not records:
        return "账本为空，快去记一笔吧"
    total = sum(r["amount"] for r in records)
    biggest = max(records, key=lambda r: r["amount"])
    lines = [f"共 {len(records)} 笔，总计 {total:.2f} 元"]
    lines.append(f"最大一笔: {biggest['item']} {biggest['amount']:.2f} 元")
    return "\n".join(lines)
```

`add` 只是往列表追加一条 dict——**内存里先操作，落盘交给 save**。`max(records, key=...)` 按 amount 找最大那条，字符串课的 lambda 排序套路在这里复用。

### 第 3 步：交互层——main 与菜单循环

交互层设计：`main()` 先 `load()` 读回历史，然后进入 `while True` 菜单循环（语法课讲过的「程序常驻直到用户退出」结构）——读命令，`a` 走 `add` 记账、`r` 走 `report` 报表、`q` 先 `save` 落盘再 `break` 退出，其他命令提示重输。一处巧思：`input("日期: ") or "2026-11-22"` 利用了「空字符串为假」——用户直接回车就落进默认值。注意退出前才统一落盘是**有意为之的取舍**（攒一批写一次省 IO），也是异常课要处理的隐患点。完整代码见第 4 步。

### 第 4 步：完整程序与一次真实会话

把三段拼起来就是完整工具（约 40 行，直接可运行）：

```python
import json
from pathlib import Path

DATA = Path("ledger.json")

def load():
    if not DATA.exists():
        return []
    text = DATA.read_text(encoding="utf-8")
    return json.loads(text) if text.strip() else []

def save(records):
    DATA.write_text(json.dumps(records, ensure_ascii=False, indent=2),
                    encoding="utf-8")

def add(records, item, amount, date):
    records.append({"date": date, "item": item, "amount": float(amount)})

def report(records):
    if not records:
        return "账本为空，快去记一笔吧"
    total = sum(r["amount"] for r in records)
    biggest = max(records, key=lambda r: r["amount"])
    return f"共 {len(records)} 笔，总计 {total:.2f} 元\n最大一笔: {biggest['item']} {biggest['amount']:.2f} 元"

def main():
    records = load()
    print(f"欢迎记账，当前 {len(records)} 笔")
    while True:
        cmd = input("命令 (a=记账 / r=报表 / q=退出): ").strip().lower()
        if cmd == "q":
            save(records)
            print("已保存，再见")
            break
        elif cmd == "a":
            date = input("日期 (回车=今天): ") or "2026-11-22"
            item = input("项目: ")
            amount = input("金额: ")
            add(records, item, amount, date)
        elif cmd == "r":
            print(report(records))
        else:
            print("看不懂的命令，请输入 a / r / q")

main()
```

一次真实会话（输入加粗示意）：

```text
欢迎记账，当前 2 笔
命令 (a=记账 / r=报表 / q=退出): a
日期 (回车=今天): 
项目: 咖啡
金额: 22
命令 (a=记账 / r=报表 / q=退出): r
共 3 笔，总计 44.50 元
最大一笔: 咖啡 22.00 元
命令 (a=记账 / r=报表 / q=退出): q
已保存，再见
```

退出后打开 `ledger.json`，新记录已经带着缩进躺在文件里——**程序结束了，数据活着**。下一课我们故意让它「出错」（输错金额、删掉 JSON 文件、改坏格式），把程序的健壮性提上来。

## 常见坑

1. **坑 1：忘了 `encoding="utf-8"`**。现象：在你电脑上中文一切正常，换台电脑（或部署到 Linux）读文件就 `UnicodeDecodeError`，或文件里的中文用别的软件打开是乱码。原因：不写 encoding 时 Python 3.15 之前按系统默认编码（Windows 常为 GBK）处理，跨平台必炸。对策：**每一次 open / read_text / write_text 都显式写 `encoding="utf-8"`**，形成肌肉记忆。
2. **坑 2：`"w"` 模式当成追加用**。现象：想「往里加一条」，结果整个文件只剩新写的那一条。原因：`"w"` 打开的瞬间就清空原文件。对策：保留旧内容用 `"a"`；结构化数据像本课一样「读全 → 内存改 → 全量重写」，别对 JSON 文件做模式级追加。
3. **坑 3：`FileNotFoundError` 没兜底**。现象：第一次运行程序就崩溃，因为数据文件还没创建。原因：`"r"` 模式对不存在的文件直接抛异常。对策：读之前用 `Path.exists()` 判断给默认值（如空列表），或下一课学的 `try/except FileNotFoundError` 兜底。
4. **坑 4：JSON 读回来的键全是字符串**。现象：存的时候 `d[1] = "a"`（整数键），读回来必须用 `d["1"]` 取，直接 `d[1]` 报 KeyError。原因：JSON 标准里对象的键只能是字符串，`json.load` 无法还原你原来的 int 键。对策：序列化前把键转字符串（如 `str(user_id)`），或数据里连键带值都换成 dict 的字段。
5. **坑 5：dump 出的中文变 `\u5348\u996d`**。现象：打开 JSON 文件满眼 `\uXXXX` 转义码。原因：`json.dumps` 默认 `ensure_ascii=True`，把非 ASCII 字符全部转义。对策：写文件时加 `ensure_ascii=False` 并保持 `encoding="utf-8"`。注意文件内容功能上其实等价，只是不可读——但如果给人看或进版本库，必须关掉转义。
6. **坑 6：相对路径跟着「运行目录」漂**。现象：`open("ledger.json")` 在 IDE 里好好的，命令行换了个目录运行就 `FileNotFoundError`。原因：相对路径是相对「程序启动时的当前目录」而非脚本所在目录。对策：用 `Path(__file__).parent / "ledger.json"` 锚定脚本目录，或干脆总在同一目录运行；路径细节在模块课还会展开。

## 小练习

1. 写程序把一个 dict（你的姓名、爱好列表、一个嵌套的地址 dict）用 `json.dumps` 打印成两种形态：默认紧凑版和 `indent=2` 中文直显版，肉眼对比差异。
2. 用 `with open(..., "a")` 写一个「留言板」：每次运行追加一行带时间戳的留言到 `notes.txt`，再写几行代码逐行读回并打印行号（`enumerate`）。
3. 用 pathlib 建目录 `data`，把记账工具的 `DATA` 改成 `Path("data") / "ledger.json"`，并保证首次运行（目录和文件都不存在）不崩溃——提示：`mkdir(exist_ok=True)`。
4. **综合小项目**：给记账工具加「分类统计」——每条记录增加 `category` 字段（餐饮/交通/娱乐），报表函数输出「各分类小计 + 占比%（`.1%` 格式）」，数据文件改名 `ledger2.json` 先手写两三行旧数据再运行验证读回正常。保存为 `ledger_cat.py`。
