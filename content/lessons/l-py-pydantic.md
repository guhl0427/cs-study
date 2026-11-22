---
id: l-py-pydantic
slug: py-pydantic
title: Pydantic：类型即校验
difficulty: 2
estMinutes: 85
tags: [Pydantic, FastAPI, 数据校验]
summary: 请求体进来先过 Pydantic 模型这道安检门——字段类型、必填、范围、格式全在声明里，非法数据在门口就被拦下并给出字段级的 422 报告。
updated: 2026-11-22
resources:
  - id: r-pydantic-doc
    title: Pydantic 官方文档
    url: https://docs.pydantic.dev/latest/
    type: doc
    difficulty: 2
    note: 模型与校验器的权威参考，重点看 Models 与 Fields 章节。
  - id: r-pydantic-fields
    title: Pydantic · Fields
    url: https://docs.pydantic.dev/latest/concepts/fields/
    type: doc
    difficulty: 2
    note: Field 全部约束参数的字典页，本课「约束大全」的出处。
  - id: r-fastapi-body
    title: FastAPI · Request Body（中文）
    url: https://fastapi.tiangolo.com/zh/tutorial/body/
    type: doc
    difficulty: 1
    note: 官方教程里 Pydantic 模型与请求体的配合方式。
---

> 一句话定义：Pydantic 把「数据长什么样」写成**带类型的类**——数据进门先过它的安检，不合规直接打回并给出字段级报告，合规的已经是干净的 Python 对象。

## 概念讲解

### 从字典到模型：为什么需要这道安检门

上一课的请求体用了一个极简的 BaseModel。但真实的 POST/PUT 请求体是**一坨没有类型的 JSON**：字段漏了、类型错了、值越界了、多传了不该传的字段——全都要防。没有模型时的代码长这样：

```python
data = await request.json()               # 手工解析
title = data.get("title")                 # 漏传是 None？
if not title or len(title) > 50: ...      # 手工校验，散落各处
views = int(data.get("views", 0))         # 手工转换，还可能抛异常
```

这段代码有三个病灶：校验规则散落在函数里（文档看不见、测试要现造数据）；每个接口重复一遍；漏防一种情况就多一个线上 bug。Pydantic 的答案是把「数据形状」提升为**类定义**——一处声明，校验、解析、文档、序列化四件事全部自动完成。

### 模型 = 四合一：同一个类的四张面孔

```python
class ArticleIn(BaseModel):
    title: str = Field(min_length=1, max_length=50)
    views: int = Field(default=0, ge=0)
```

**面孔一：校验器。** 数据进入时逐字段核对：类型对不对、必填在不在、范围越没越界。不合规立刻拒绝——在 FastAPI 里表现为 422，路由函数根本不会执行。校验规则全写在声明里，一眼看全。

**面孔二：解析器。** 合法 JSON 自动变成对象属性：`article.title` 而不是 `data["title"]`——属性名拼错是 AttributeError（IDE 立刻标红），字典键拼错是静默的 None（bug 藏到运行时才炸）。顺带完成类型转换：能按声明转成 int 的 `"5"` 自动转。

**面孔三：文档源。** /docs 里自动渲染这个模型的字段表：每个字段的类型、是否必填、约束（长度/范围）、默认值、示例。前端照着写表单校验，联调时少一半扯皮。

**面孔四：序列化器。** `.model_dump()` 转回 dict、`.model_dump_json()` 转 JSON 字符串——出站数据同样经过模型把关，不会漏字段、不会带脏数据。

一个类、四张面孔，信息源只有一份——改一处约束，校验、文档、序列化同时生效。

### Field 约束大全：把业务规则写进声明

| 约束参数 | 管什么 | 示例 |
| ---- | ---- | ---- |
| `min_length` / `max_length` | 字符串长度 | `Field(min_length=1, max_length=50)` |
| `ge` / `le` / `gt` / `lt` | 数值范围（≥/≤/>/<） | `Field(ge=0)`：浏览量不为负 |
| `pattern` | 正则格式 | `Field(pattern=r"^#[0-9a-f]{6}$")` |
| `default_factory` | 可变默认值的安全写法 | `Field(default_factory=list)` |
| `description` / `examples` | 进文档的说明与示例 | `Field(description="浏览量")` |

**可变默认值大坑，值得单独讲透。** 裸写 `tags: list[str] = []`，在纯 Python 类和 dataclass 里是经典事故源——默认值挂在类上，所有实例共享同一个列表，一个人 append 全体遭殃。Pydantic 出于兼容会在校验时深拷贝默认值帮你兜底，但官方文档明确推荐 `default_factory`：**每次创建实例时调用工厂函数生成新值**——语义上就写着「每次新建」，且对象不走校验路径创建时（如 `model_construct`）坑不会现形。养成习惯：**list/dict/set 这类可变类型做默认值，一律 `Field(default_factory=...)`**。

### 入站出站分离：ArticleIn 与 ArticleOut

创建文章时，客户端**不该传** `id`（服务器生成）；返回文章时，响应里**必须有** `id`。两个方向的契约不同，就该是两个模型：

```python
class ArticleIn(BaseModel):          # 入站：用户能传什么
    title: str
    views: int = 0

class ArticleOut(ArticleIn):         # 出站：继承入站，再加服务器生成的字段
    id: int
    created_at: datetime
```

路由上配 `@app.post("/articles", response_model=ArticleOut)`：**response_model 是出站的闸门**——哪怕函数返回的对象带了多余字段，也只输出 ArticleOut 声明的字段。两个好处：内部字段（密码哈希、内部标记）不会被意外泄漏；响应结构永远和文档一致。这就是接口契约的「读写分离」。

### 嵌套模型与列表字段

真实数据都是嵌套的：文章带作者、带评论。Pydantic 模型可以直接嵌套：

```python
class Author(BaseModel):
    name: str = Field(min_length=1)

class Comment(BaseModel):
    content: str = Field(min_length=1, max_length=200)

class ArticleIn(BaseModel):
    title: str
    author: Author                   # 嵌套模型：author 必须是合法 Author
    comments: list[Comment] = Field(default_factory=list)   # 模型列表
```

嵌套校验是**递归**的：`author.name` 为空、`comments[0].content` 超长，都会被逐层报出来，`loc` 精确到 `["body", "comments", 0, "content"]`。模型的可组合能力就是它的表达力——数据形状有多复杂，校验就有多精确。

### 自定义校验一句

声明写不下的规则（如「标题不能是纯空白」）用 `field_validator` 补：

```python
from pydantic import field_validator

class ArticleIn(BaseModel):
    title: str

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("标题不能是纯空白")
        return v
```

原则：**能用 Field 表达的约束不写 validator**——Field 进文档，validator 不进；前者是契约的一部分，后者只是兜底。

### 422 detail 逐字段解读

校验失败时，FastAPI 返回的 detail 是一个**列表**（多个字段同时出错就一起报）：

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "title"],
      "msg": "Field required",
      "input": {}
    }
  ]
}
```

四个字段各司其职：`loc`（location）是**路径**——从请求的哪里找错：第一段 `body` 表示请求体（其他取值 `path`、`query`），后面依次是字段名、嵌套下标；`msg` 是给人看的原因；`type` 是机器可读错误码（`missing` 缺字段 / `string_too_long` 超长 / `greater_than_equal` 越下界），前端可按 type 做针对性提示；`input` 回显实际传入的值。**这套结构让校验错误可编程**——不用解析自然语言，按 loc + type 就能渲染出「title：必填」这样的表单错误提示。

## 代码示例

主线任务：给文章 API 装上完整的校验层——三种典型非法请求（缺字段/超长/负数）各自触发 422，逐字段读懂 detail，最后修复验证。全程约 30 分钟。

### 第 0 步：完整的模型与路由

```python
# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="文章 API")

class ArticleIn(BaseModel):                # 入站模型
    title: str = Field(min_length=1, max_length=50)
    tag: str = "general"
    views: int = Field(default=0, ge=0)
    tags: list[str] = Field(default_factory=list)   # 可变默认值的正确写法

class ArticleOut(ArticleIn):               # 出站模型：多一个服务器生成的 id
    id: int

db: dict[int, ArticleOut] = {}
next_id = 1

@app.post("/articles", response_model=ArticleOut, status_code=201)
def create_article(article: ArticleIn):
    global next_id
    saved = ArticleOut(id=next_id, **article.model_dump())
    db[next_id] = saved
    next_id += 1
    return saved                           # response_model 保证出站字段干净

@app.get("/articles/{article_id}", response_model=ArticleOut)
def read_article(article_id: int):
    if article_id not in db:
        raise HTTPException(status_code=404, detail="文章不存在")
    return db[article_id]

@app.get("/articles", response_model=list[ArticleOut])
def list_articles():
    return list(db.values())
```

启动：`fastapi dev main.py`。打开 `/docs`，能看到 ArticleIn 的字段表已带约束说明——这就是「模型即文档」。

### 第 1 步：非法请求一——缺必填字段

```bash
curl -X POST http://127.0.0.1:8000/articles \
  -H "Content-Type: application/json" -d '{}'
```

预期响应（422）：

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "title"],
      "msg": "Field required",
      "input": {}
    }
  ]
}
```

逐字段解读：`loc[0]` 是 `body`——错在请求体（不是路径不是查询串）；`loc[1]` 是 `title`——缺的就是这个字段；`type: "missing"` 是机器码，前端可据此提示「此项必填」；`msg` 是给人看的一句话。**你一行校验代码都没写，错误却精确到了字段。**

### 第 2 步：非法请求二——超长

```bash
curl -X POST http://127.0.0.1:8000/articles \
  -H "Content-Type: application/json" \
  -d '{"title": "This title is definitely longer than fifty characters limit!!!"}'
```

预期响应（422，节选）：

```json
{
  "detail": [
    {
      "type": "string_too_long",
      "loc": ["body", "title"],
      "msg": "String should have at most 50 characters",
      "input": "This title is definitely longer than fifty characters limit!!!",
      "ctx": {"max_length": 50}
    }
  ]
}
```

新增的 `ctx` 字段携带约束上下文：`max_length: 50`——前端可以直接拿它生成「最多 50 字」这类精确提示。注意 `tag` 和 `views` 没报错：它们有默认值，缺省合法。

### 第 3 步：非法请求三——负数

```bash
curl -X POST http://127.0.0.1:8000/articles \
  -H "Content-Type: application/json" \
  -d '{"title": "合法标题", "views": -1}'
```

预期响应（422，节选）：

```json
{
  "detail": [
    {
      "type": "greater_than_equal",
      "loc": ["body", "views"],
      "msg": "Input should be greater than or equal to 0",
      "input": -1,
      "ctx": {"ge": 0}
    }
  ]
}
```

判读：`ge: 0` 正是模型里 `Field(ge=0)` 的回声——**声明里的每个约束，都会变成 422 里的一条可读规则**。

### 第 4 步：多错齐报——一次请求暴露所有问题

```bash
curl -X POST http://127.0.0.1:8000/articles \
  -H "Content-Type: application/json" -d '{"views": -5}'
```

预期响应（422）：detail 列表里有**两条**——`["body", "title"]` 的 missing 和 `["body", "views"]` 的 greater_than_equal。Pydantic 不会查到一个错就停：**一次校验报出全部问题，用户改一轮就能通过**，而不是改一项、提交、再改一项——这是安检门和「遇到第一个错就抛异常」的手写 if 的本质差距。

### 第 5 步：修复验证

```bash
curl -X POST http://127.0.0.1:8000/articles \
  -H "Content-Type: application/json" \
  -d '{"title": "Hello Pydantic", "views": 5}'
```

预期响应（201）：

```json
{"id": 1, "title": "Hello Pydantic", "tag": "general", "views": 5, "tags": []}
```

201 回显里注意两处：`tags: []` 来自 `default_factory=list`（没传也安全）；出站的 `id` 来自 ArticleOut——入站时客户端根本没机会传 id（ArticleIn 没这个字段，传了也被忽略）。再用 `curl http://127.0.0.1:8000/articles/1` 确认出站结构一致。

## 常见坑

1. **坑 1：入站出站共用一个模型**。现象：创建接口的文档里出现 id 字段，前端纠结「要不要传」；或返回对象把内部字段泄漏出去。原因：两个方向的契约被强行合并。排查：拆 ArticleIn（用户能传什么）/ArticleOut（接口返回什么），路由挂 `response_model` 做出站过滤。
2. **坑 2：可变默认值裸写 `= []`**。现象：多个实例的 tags 意外共享、互相污染；或对象绕过校验创建时共享同一个列表。原因：list/dict/set 是可变类型，默认值应每次新建。排查：全局搜 `= []`、`= {}`，全部改 `Field(default_factory=...)`。
3. **坑 3：校验逻辑散落在路由函数里**。现象：函数开头一串 if 检查长度、范围、格式，/docs 里却什么都看不到。原因：把「数据形状」误当「业务逻辑」。排查：形状类约束（长度/范围/格式）全部下沉到 Field；函数里只留跨字段、查库类业务校验（如「标题是否重复」）。
4. **坑 4：以为 422 是 bug 慌着改代码**。现象：联调时看到 422 就怀疑框架或后端。原因：不理解 422 正是校验层在工作。排查：读 detail 的 loc 定位字段、msg/type 定位原因——绝大多数是请求侧没按契约传数据。
5. **坑 5：响应模型忘了挂 response_model**。现象：函数返回 ORM 对象或带内部字段的 dict，敏感字段直接出现在响应里。原因：没有出站闸门。排查：所有出站路由都声明 `response_model`；用 /docs 核对响应结构与设计一致。
6. **坑 6：嵌套字段报错看不懂 loc**。现象：看到 `["body", "comments", 0, "content"]` 不知道指什么。原因：loc 是路径不是单字段名。排查：按「请求位置 → 字段名 → 嵌套下标 → 字段名」逐段读，最后一段是出错的叶子字段。

## 小练习

1. 给 ArticleIn 加 `status: str = Field(default="draft", pattern="^(draft|published)$")`，分别传合法与非法 status，对比 422 的 type 与 ctx 内容。
2. 实现嵌套：加 `comments: list[Comment] = Field(default_factory=list)`（Comment 有 content 长度约束），传一条超长评论，观察 loc 如何精确到数组下标。
3. 用 `model_dump(exclude_unset=True)` 实现 `PATCH /articles/{id}` 部分更新：先定义全可选的 ArticleUpdate 模型，只改用户传了的字段。
4. **综合任务**：把第 0 步的接口补上 PATCH 与 DELETE 形成完整 CRUD；然后写一份「非法请求清单」（缺字段/超长/负数/非法 status/多传 id），逐条 curl 并把每条 422 的 loc/type 记成表格——这就是这个接口的回归测试用例集。
