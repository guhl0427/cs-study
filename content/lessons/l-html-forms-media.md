---
id: l-html-forms-media
slug: forms-media
title: 表单与多媒体
difficulty: 1
estMinutes: 40
tags: [HTML, 表单]
summary: 表单是用户与网页对话的唯一入口；掌握 form、input 类型与原生校验，再看图片视频怎么正确嵌入。
updated: 2026-11-21
resources:
  - id: r-form-mdn
    title: MDN · Web 表单入门
    url: https://developer.mozilla.org/zh-CN/docs/Learn/Forms
    type: doc
    difficulty: 1
    note: 表单细节非常多，MDN 这份指南可以当字典查。
---

> 一句话定义：`<form>` 是网页里唯一让用户「提交数据」的结构——登录框、搜索框、下单页，底层都是它。

## 概念讲解

一个表单由三部分组成：

1. **`<form>` 容器**：声明「这一块是表单」，决定数据提交到哪里（`action`）与方式（`method`）；
2. **控件**：`<input>`、`<textarea>`、`<select>`、`<button>`，每个控件用 `name` 标记自己的字段名；
3. **标签与校验**：`<label>` 关联控件（点文字也能聚焦输入框），HTML5 提供 `required`、`type` 等原生校验。

关键认知：**`name` 是数据的身份证**。提交表单时，浏览器把「name=value」打包发出去——没有 `name` 的控件等于不存在。

HTML5 的 `type` 让同一个 `<input>` 长出不同能力：`type="email"` 手机上弹出邮箱键盘并校验格式，`type="number"` 只允许数字，`type="date"` 直接给日期选择器。**能用原生能力的，就不要上 JS 库**——更轻、更快、无障碍支持更好。

多媒体方面，两个重点标签：`<img>` 必须写 `alt`（图片挂了或者用户用读屏器时，alt 就是替代信息）；`<video>`/`<audio>` 用 `controls` 属性一键获得播放器，`<video>` 记得提供封面 `poster`。

## 代码示例

一个带原生校验的注册表单：

```html
<form action="/signup" method="post">
  <label for="nick">昵称</label>
  <input id="nick" name="nickname" required minlength="2" maxlength="12" />

  <label for="mail">邮箱</label>
  <input id="mail" name="email" type="email" required />

  <label for="pwd">密码</label>
  <input id="pwd" name="password" type="password" required minlength="8" />

  <button type="submit">创建账号</button>
</form>
```

注意三处：`label` 的 `for` 对应控件的 `id`（这是关联，不是装饰）；每个控件都有 `name`；校验规则写在属性上，浏览器自动拦截不合法提交。

图片与视频：

```html
<img src="chart.png" alt="2026 年学习时长统计柱状图" width="480" />

<video src="intro.mp4" controls poster="cover.jpg" width="480">
  你的浏览器不支持视频播放。
</video>
```

## 常见坑

1. **坑 1：`label` 没有关联控件**。只写文字不写 `for`/`id` 配对，点击文字无法聚焦输入框，读屏器也不知道输入框叫什么。排查：点击 label 文字，光标应该跳进输入框。
2. **坑 2：按钮忘了 `type`**。`<button>` 在表单里默认是 `type="submit"`——表单中间放个「预览」按钮，一点整个表单就提交了。非提交按钮显式写 `type="button"`。
3. **坑 3：图片不写 `alt` 或写「图片」**。`alt` 要描述**内容与作用**（「统计柱状图」），而不是类型（「图片」）；纯装饰图才允许 `alt=""`。
4. **坑 4：只靠 JS 校验**。原生 HTML 校验在 JS 加载失败时仍然工作。先原生、后增强，顺序别反。

## 小练习

1. 给上一节的个人页面加一个「留言」表单：昵称（必填）+ 内容（textarea）+ 提交按钮，全部带 label 关联。
2. 把提交按钮改成 `type="button"`，观察点击后表单不再触发提交。
3. 给表单里加一个 `type="url"` 的「个人主页」字段，输入 `abc` 提交，体验原生校验拦截。
