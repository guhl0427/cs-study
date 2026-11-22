---
id: l-ai-llm-rag
slug: llm-rag
title: LLM API 与 RAG 检索增强
difficulty: 2
estMinutes: 40
tags: [LLM, RAG, API]
summary: 调 API 就是发消息列表收生成文本；RAG 三步（切分→检索→生成）让模型答上你的私有数据。
updated: 2026-11-22
resources:
  - id: r-llm-openai
    title: OpenAI API 文档 · Chat Completions
    url: https://platform.openai.com/docs/api-reference/chat
    type: doc
    difficulty: 2
    note: 看请求/响应结构，各家 LLM API 形态大同小异。
  - id: r-rag-pinecone
    title: Pinecone · What is Retrieval-Augmented Generation?
    url: https://www.pinecone.io/learn/retrieval-augmented-generation/
    type: doc
    difficulty: 2
    note: 图文并茂讲清 RAG 流程的经典科普。
  - id: r-rag-paper
    title: RAG 原始论文（Lewis et al., 2020）
    url: https://arxiv.org/abs/2005.11401
    type: doc
    difficulty: 4
    note: 检索增强生成的开山论文，读摘要即可。
---

> 一句话定义：调 LLM API 就是发一段消息列表、收一段生成文本；RAG 则先检索相关资料塞进上下文，让模型答上它原本不知道的私有数据。

## 概念讲解

**API 的基本形态**：请求是一个**消息列表**（每条带角色），响应是生成的文本。多轮对话要自己把历史塞回列表——API 不替你记着：

```text
请求 = [
  {"role": "system",    "content": "你是一个严谨的助手"},  ← 人设与规则
  {"role": "user",      "content": "什么是过拟合？"},
  {"role": "assistant", "content": "模型背题了……"},       ← 上一轮回答
  {"role": "user",      "content": "那怎么办？"}          ← 新问题
]
响应 = {"content": "限制模型复杂度，例如限制决策树深度……"}
```

两个参数一句说透。**temperature** 是随机度旋钮：调到 0，同样输入每次输出几乎一样，适合抽取、分类等要稳定的任务；调高更有创意，适合写作，但格式会漂。**token** 是模型读文的单位（约半个到一个汉字），**上下文窗口**是一次能塞进的 token 上限——历史太长要截断或摘要。流式输出（stream）就是生成一个词推一个词，体验像打字机，内容与不流式完全相同。

**RAG 解决什么问题？** 模型不知道你的内部文档和最新数据，还爱一本正经地编（幻觉）。RAG 的思路：**先检索相关文档，塞进上下文，再让模型据此回答**——答案有依据，还能标出处。

```text
┌──────────── 离线：建知识库 ────────────┐
  文档 → 切成小块 → 向量化 → 存入向量库
└────────────────────────────────────────┘
┌──────────── 在线：回答问题 ────────────┐
  提问 → 向量化 → 检索最相似的 K 块
                    ↓
    提问 + K 块资料 拼成 Prompt → LLM → 带依据的回答
└────────────────────────────────────────┘
```

**为什么入门选 RAG 不选微调？** 微调要准备训练数据、要算力，知识一更新就得重训；RAG 换文档就行——便宜、灵活、好排查（看检索到了什么，就知道答案从哪来）。

## 代码示例

RAG 三步的伪代码（向量库与模型调用均为示意）：

```python
# —— 离线：建知识库 ——
chunks = split_documents(read_files("./docs"))  # ① 切分：几百字一块
vectors = embed(chunks)                         # ② 每块算成向量（语义指纹）
store = VectorDB()
store.add(chunks, vectors)

# —— 在线：问答 ——
def answer(question):
    q_vec = embed([question])[0]
    hits = store.search(q_vec, top_k=3)         # ③ 检索：语义最相近的 3 块
    context = "\n---\n".join(h.text for h in hits)
    prompt = f"仅依据以下资料回答；资料里没有就说不知道，并注明来源块：\n{context}\n\n问题：{question}"
    return llm.chat([{"role": "user", "content": prompt}], temperature=0)

print(answer("我们公司的年假有几天？"))
# 模型训练时从没见过你的员工手册，检索后答得出，还能给出处
```

三步各管一段：**切分**决定查得到查不到（块太大塞杂讯，太小语义残缺），**向量检索**决定查得准不准，**拼上下文生成**决定答得好不好。

## 常见坑

1. **坑 1：上下文窗口爆掉**。把整本书或几十轮历史塞进请求，直接报 token 超限。排查：先算 token 数；历史做摘要，文档只取检索片段。
2. **坑 2：检索不准就怪模型**。八成问题出在切块大小或 top_k。先调 chunk 大小和检索条数，再考虑换模型。
3. **坑 3：任务型调用开了高 temperature**。做数据抽取要稳定输出，temperature 0.8 会让 JSON 时好时坏。稳定类任务一律用 0。

## 小练习

1. 把上一课的周报 Prompt 改写成一个 messages 列表（system + user 各一条）。
2. 把示例的 top_k 从 3 改成 1，思考答案质量可能怎么变（资料更纯 vs 证据不足）。
3. 思考题：为什么「把整个文档库塞进 Prompt」不可行？RAG 用什么思路绕开了上下文窗口的限制？
