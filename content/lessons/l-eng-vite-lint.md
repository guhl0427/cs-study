---
id: l-eng-vite-lint
slug: eng-vite-lint
title: Vite 与代码质量工具链
difficulty: 2
estMinutes: 80
tags: [Vite, ESLint, 工程化]
summary: Vite 用「dev 按需编译 + build 打包优化」双模式解决快与优化的矛盾；ESLint+Prettier 把风格交给机器。主线从 create vite 起项目，接上完整工具链，故意写坏代码看 --fix 前后的 diff。
updated: 2026-11-22
resources:
  - id: r-vite-doc
    title: Vite 官方指南（中文）
    url: https://cn.vite.dev/guide/
    type: doc
    difficulty: 1
    note: 「为什么选 Vite」与 dev/build 的原理都在前几章，配置项当字典查。
  - id: r-eslint-doc
    title: ESLint 官方文档
    url: https://eslint.org/docs/latest/
    type: doc
    difficulty: 2
    note: 规则与平铺配置的权威参考；本文讲思想与读法，规则名用到再查。
  - id: r-prettier-doc
    title: Prettier 官方文档
    url: https://prettier.io/docs/
    type: doc
    difficulty: 1
    note: 「为什么 Prettier 不做太多配置」的设计哲学，值得读一遍。
---

> 一句话定义：Vite 解决「开发时秒级看到效果、发布时打包优化」的双模式矛盾；ESLint + Prettier 解决「风格与低级错误」——格式归 Prettier、质量归 ESLint、类型归 TypeScript，机器管规矩，人管创造。

## 概念讲解

### 为什么需要构建工具：浏览器只认识「三件套」

浏览器内置的解析器只认 HTML、CSS 和原生 JS（ESM），你项目里真实写的文件它一个都直接跑不了：

```text
你写的文件             浏览器直接认吗？      谁来翻译/优化
src/main.ts          ✗ 不认识 TypeScript    esbuild/tsc 转译
App.vue              ✗ 不认识组件模板        @vitejs/plugin-vue
style.scss           ✗ 不认识嵌套语法        sass 编译
几百个源文件          ✗ 逐个请求太慢          打包压缩、拆 chunk
```

所以需要构建工具充当「翻译 + 优化工厂」。Vite 的过人之处是把这件事拆成两种模式：开发时**只求快**，发布时**只求好**——不是同一个流程调参数，而是两套截然不同的策略。

### Vite 双模式：dev 按需秒级编译 vs build 全量打包

**dev 模式（`pnpm dev`）不打包**。Vite 起一个本地服务器，浏览器用原生 ESM 逐个请求模块；哪个文件被请求了，Vite 才用 esbuild 把那一个文件转译成 JS（毫秒级），其余文件纹丝不动。你改一行代码，Vite 只重新转换这一行所在的文件，然后通过 HMR（热模块替换）推给浏览器——**反馈速度与项目大小基本无关**。

**build 模式（`pnpm build`）才打包**。发布时用 Rollup 把几百个源文件加工成少量优化产物：压缩、tree-shaking（摇掉没用到的代码）、按路由拆 chunk、文件名加内容 hash 以利用浏览器缓存。

**为什么 dev 不打包？** 打包要先把全项目的依赖图分析完、处理完才能产出可运行的文件，项目越大首次等待越久；而 dev 阶段要的是「改一行立刻看到」，按需编译正好把「处理多少」和「用到多少」绑在一起。一句话：**dev 优化的是迭代速度，build 优化的是线上体积**——把两件事分开优化，是 Vite 快的根源。

### 一次页面加载：dev 与 build 的对照

| | dev（`pnpm dev`） | build（`pnpm build` + 预览/上线） |
| ---- | ---- | ---- |
| 模块形态 | 原始源文件，逐个按需转译 | 合并压缩后的少量 chunk |
| 首次等待 | 只编译当前用到的模块，秒开 | 构建一次（可提前做） |
| 改一行后 | HMR 毫秒级热更新 | 需重新构建 |
| 产物去哪 | 内存里直接服务 | dist/ 目录 |

新手最容易混淆的点：**dev 下看到的不是最终形态**——性能问题要用 `pnpm build && pnpm preview` 看产物才作数。

### ESLint vs Prettier vs TypeScript：三者分工表

| 工具 | 管什么 | 管不了什么 | 典型报错 |
| ---- | ---- | ---- | ---- |
| Prettier | 格式：缩进、引号、换行、分号 | 任何逻辑与质量问题 | （不报错，直接改文件） |
| ESLint | 质量规则：no-var、eqeqeq、未使用变量 | 类型检查、格式细节 | 'x' is defined but never used |
| TypeScript | 类型错误：类型不匹配、缺字段 | 风格与低级模式 | Type 'string' is not assignable… |

三者各司其职、互不替代：**格式归 Prettier（外观）、质量归 ESLint（低级错误与坏味道）、类型归 TS（正确性）**。同一段代码 `var x == "1"` 三个工具各有各的发言权，缺一个都留盲区。

### eslint.config.js：平铺配置怎么读

ESLint 9 的 flat config 是一个数组：**每个元素是一组配置对象**，可以只对某些文件生效（`files`）或只做排除（`ignores`）；**数组顺序即覆盖顺序**，后面的规则覆盖前面的。旧的 `.eslintrc` 是多文件级联的树，flat config 把它拍平成一个文件——配置即代码，能 import 别人的配置包直接混进数组。

### .prettierrc：只声明分歧点

Prettier 的设计哲学是「少配置」：官方默认值就是推荐风格，团队**只声明与默认有分歧的项**（比如不要分号、单引号、一行 100 列）。配置文件越长，说明团队要争论的风格点越多——每一项都是一次永无结论的口水战。默认项不必写出来，写了反而像在邀请重新讨论。

### eslint-config-prettier：防打架的关键一环

ESLint 历史上也管格式（`semi`、`quotes` 等），这些规则会和 Prettier 的输出互相打架——Prettier 刚加分号，ESLint 报「不该有分号」。`eslint-config-prettier` 的作用只有一个：**关掉 ESLint 里所有与格式相关的规则**，让 ESLint 专心管质量、Prettier 独家管格式。注意它在配置数组里必须放**最后**，才能覆盖前面所有包带的格式规则。

### 从「自觉」到「强制」：git hooks 与 CI

工具装好了，最后一步是让检查**不依赖人的自觉**——软件工程课的老结论：靠自觉的流程必然漏。两层保险：其一，git hooks（用 husky 配置）在 `git commit` 时自动跑 lint，不过就不让提交；其二，CI 流水线里 `lint → typecheck → test` 全绿才允许合并——lint 放最前，因为它毫秒级失败，能在几秒内拦住明显问题，省下后面更贵的检查。两层各拦一遍，风格漂移就失去了生存空间。

## 代码示例

主线任务：**从 create vite 到接上 ESLint + Prettier**，并故意写坏代码，对比 lint 报错、`--fix` 前后的 diff。全程约 30 分钟。

### 第 0 步：create vite 起项目

```bash
pnpm create vite my-app --template vue-ts   # Vite + Vue + TS 三合一模板
cd my-app && pnpm install
pnpm dev            # 秒开 http://localhost:5173，改一行保存试试 HMR
```

观察 package.json 的 scripts：`dev` 背后是 `vite`，`build` 背后是 `vue-tsc -b && vite build`——上一课「scripts 是统一入口」在这里兑现。

### 第 1 步：装三件质量工具

```bash
pnpm add -D eslint prettier eslint-config-prettier
```

三个都是构建/开发期工具，按上一课判据全部进 devDependencies。

### 第 2 步：eslint.config.js 逐行解读

```js
// eslint.config.js —— ESLint 9 平铺配置
import prettier from "eslint-config-prettier"

export default [
  { ignores: ["dist/"] },                        // ① 构建产物不检查
  {
    files: ["**/*.{js,ts,vue}"],                 // ② 本组规则作用于哪些文件
    languageOptions: { ecmaVersion: "latest" },  // ③ 按最新 JS 语法解析
    rules: {
      "no-var": "error",                         // ④ 禁用 var → 必须 error 而非 warn
      eqeqeq: ["error", "always"],               // ⑤ 必须用 ===；第二个元素是规则选项
    },
  },
  prettier,                                      // ⑥ 放最后：关掉与 Prettier 冲突的格式规则
]
```

逐行拆解：① `ignores` 单独一组，排除产物目录（dist 是机器生成的，检查它只会刷屏）；② `files` 用 glob 圈定本组规则的适用范围；④ 规则值三级——`"error"`（报错）/`"warn"`（警告）/`"off"`（关闭），团队红线用 error；⑤ 需要参数的规则写成数组 `[级别, 选项]`；⑥ 顺序敏感，prettier 必须压轴。

### 第 3 步：.prettierrc——只写分歧点

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100
}
```

三项之外全部用官方默认。顺手加 `.prettierignore`：写入 `dist/` 与 `pnpm-lock.yaml`——产物和 lock 文件都不许格式化。

### 第 4 步：故意写坏代码，看 lint 报错

```ts
// src/demo.ts —— 故意写的坏味道（注意：必须是合法 JS 才能触发规则）
var flag = 1               // no-var
if (flag == 1) {           // eqeqeq：应改 ===
  console.log("hit")
}
var unused = 42            // no-unused-vars
```

提醒：如果直接写 `var x == 1` 这种**整句不合法**的代码，ESLint 只会给一个 `Parsing error`（解析都过不了，规则根本轮不到跑）——「故意写错」要错在合法但有坏味道的层面。跑检查：

```bash
pnpm exec eslint src/demo.ts
```

```text
src/demo.ts
  2:1   error  Unexpected var, use let or const instead       no-var
  3:7   error  Expected '===' and instead saw '=='            eqeqeq
  6:5   error  'unused' is assigned a value but never used    no-unused-vars

✖ 3 problems (3 errors, 0 warnings)
```

学会读 ESLint 输出：每行是 `文件:行:列  级别  消息  规则名`——最后那个规则名就是你去官方文档查的关键词。

### 第 5 步：--fix 前后的 diff

```bash
pnpm exec eslint src/demo.ts --fix
```

哪些能自动修？--fix 只修「改写明确、不会改变行为」的问题。本例只有 eqeqeq 被自动修复：

```diff
  var flag = 1
- if (flag == 1) {
+ if (flag === 1) {
    console.log("hit")
  }
  var unused = 42
```

`no-var` 与 `no-unused-vars` 依然报错——var 改 let 涉及作用域语义、删未使用变量涉及「你是不是忘了用它」，机器不敢替你决定，**必须手动改**。手动修完剩两个文件级动作：

```bash
pnpm exec prettier src/demo.ts --write   # 格式归 Prettier
pnpm exec eslint src/demo.ts             # ✖ 0 problems —— 全绿
```

把这套流程固化成 scripts，团队和 CI 就有了统一入口：

```json
"scripts": {
  "lint": "eslint .",
  "format": "prettier --write .",
  "typecheck": "vue-tsc --noEmit"
}
```

对应 CI 里的三连：`pnpm lint && pnpm typecheck && pnpm test`——正是软件工程课 workflow 的那几步。

## 常见坑

1. **坑 1：ESLint 与 Prettier 互相打架**。现象：保存后分号加了又删，两个工具轮流报错。原因：ESLint 里的格式规则（semi/quotes）与 Prettier 输出冲突，或 eslint-config-prettier 没放在数组最后。排查：确认三件事——装了包、import 进配置、位置压轴；再看 ESLint 是否还在报格式类规则。
2. **坑 2：dist/ 没进 ignore**。现象：每次 build 后全仓 lint 报错几百条。原因：对机器生成的产物做检查。排查：eslint.config.js 的 `ignores` 与 .prettierignore 都要排除 dist/。
3. **坑 3：只在自己电脑上跑 lint**。现象：总有人忘跑，风格漂移。原因：靠自觉的流程必然漏（软件工程课结论）。排查：上 husky 在 commit 时强制 lint-staged；CI 兜底拦截 merge。
4. **坑 4：以为 ESLint 能抓类型错误**。现象：类型写错却怪「lint 怎么没报」。原因：类型检查是 TS 的分工；基础 ESLint 不做类型分析。排查：typecheck 独立成步（tsc --noEmit），CI 里与 lint 并列跑，各守各的门。
5. **坑 5：故意写坏代码写成 Parsing error**。现象：写 `var x == 1` 想触发规则，结果只得到一条解析错误。原因：整句不合法的代码连解析都过不了，规则检查轮不到启动。排查：坏味道要写在「合法但糟糕」的层面（var 声明 + 表达式里的 ==）。
6. **坑 6：把 Vite 的 build 当性能银弹**。现象：build 完发现页面还是慢，怀疑工具坏了。原因：压缩拆包救不了网络瀑布、巨图、巨型依赖。排查：用 `pnpm build && pnpm preview` 在产物形态下复现，再对照浏览器原理课的清单逐项排查。

## 小练习

1. 完整复现主线第 4-5 步：先写 `var x == 1` 观察 Parsing error，改成合法的坏味道代码，记录三条报错的「行:列 / 规则名 / 消息」，再跑 --fix 抄下 diff，并解释为什么只剩 eqeqeq 被自动修复。
2. 打开本站仓库 frontend/ 的 package.json，找出 dev/build/lint/typecheck 的实际定义，回答：lint 背后是谁在干活？typecheck 为什么用 `--noEmit`？
3. 团队要定 .prettierrc：默认不加配置与「只写分歧点」两种做法，各会出现什么问题？用「每多一项配置就多一场口水战」的逻辑说服自己。
4. **综合任务**：从 create vite 到工具链全绿——起项目、接 ESLint + Prettier + eslint-config-prettier、写 scripts 四件套（lint/format/typecheck/test 占位），把 demo.ts 修到 `pnpm lint` 零报错；最后设计 CI 步骤清单（说明 lint 放在 test 前面的理由），贴一份到项目的 README 里。
