---
id: l-eng-node-pnpm
slug: eng-node-pnpm
title: Node.js 与包管理：现代前端的发动机
difficulty: 1
estMinutes: 75
tags: [Node.js, 包管理, 工程化]
summary: 现代前端工具链本身就是 Node 程序。主线从空目录出发：init → 装 dayjs 与 typescript → 写脚本 → run，每一步观察 package.json、lock 文件、node_modules 三者的变化，跑通「lock + 一条命令」的环境还原闭环。
updated: 2026-11-22
resources:
  - id: r-node-doc
    title: Node.js 官方文档 · Introduction to Node.js
    url: https://nodejs.org/en/learn/getting-started/introduction-to-nodejs
    type: doc
    difficulty: 1
    note: 官方入门，Node 是什么、能干什么，本文口径与它一致。
  - id: r-pnpm-doc
    title: pnpm 官方文档
    url: https://pnpm.io/zh/
    type: doc
    difficulty: 1
    note: 本站与多数新项目的选择：更快、更省磁盘、结构更严格。
  - id: r-npm-pkg
    title: npm docs · package.json 参考
    url: https://docs.npmjs.com/cli/v10/configuring-npm/package-json
    type: doc
    difficulty: 2
    note: package.json 每个字段的权威定义，字段含义全项目通用（pnpm 也认它）。
---

> 一句话定义：Node.js 把 JavaScript 跑在浏览器之外（命令行、服务器）——对前端来说它先是**工具链的发动机**（Vite、TS、ESLint 全是 Node 程序），依赖则由包管理器按 package.json 声明、按 lock 文件锁定、装进 node_modules。

## 概念讲解

### 为什么前端绕不开 Node：工具链本身就是 Node 程序

一个常见误解是「我不做后端，不用学 Node」。事实是：现代前端的每一件工具**本身就是用 Node 写的程序**，你敲的每条命令背后都是 Node 在跑：

```text
你敲的命令                它背后是谁
─────────────────────────────────────────────
pnpm run dev          →   node 跑 Vite（Vite 是一个 Node 程序）
npx tsc               →   node 跑 TypeScript 编译器
pnpm exec eslint      →   node 跑 ESLint
pnpm create vite      →   node 跑脚手架（也是个 Node 程序）
```

所以「装 Node」不是为后端，而是为让工具链有地方跑。此外 Node 还是前端的全栈延伸（BFF、SSR 渲染）与自动化脚本环境——但这些是后话，第一优先级只有一条：**它是地基，第一周就装好**。

### Node 是什么：一段话讲清

Node.js = V8 引擎（Chrome 同款 JS 解释器）+ 一组系统级能力（读写文件、起网络服务）。它让 JS 从「只能在浏览器里跑」变成「哪里都能跑」的通用语言。注意 Node **不是一门语言**——语言还是 JS，变的只是运行环境：浏览器里没有 `fs` 模块，Node 里没有 `window`。本课我们只用它最基础的角色：跑命令行工具。

### 三件套关系图：package.json / lock 文件 / node_modules

这三样东西构成依赖管理的全部，角色类比点外卖：

```text
package.json            项目的身份证：名字、scripts、依赖清单
   │  声明的是「范围」：dayjs: ^1.11.0        （手写+自动维护，进 Git）
   ▼
pnpm-lock.yaml          精确版本锁：每个依赖（连同它的依赖）锁死到确切版本
   │  记录的是「订单」：dayjs 1.11.13 从哪下、依赖哪些   （自动生成，必须进 Git）
   ▼
node_modules/           依赖的真实安装目录
   「收到的货」：几百 MB 的实际文件                  （自动生成，不进 Git）
```

- **package.json 是愿望清单**：只写范围（要 1.x 的 dayjs），不管具体哪一版。
- **lock 文件是订单快照**：把「当时解析出来的精确版本树」存档，任何人任何时间按它安装，得到的版本一模一样。
- **node_modules 是货物本身**：随时可删——`pnpm install` 按 lock 文件一键还原。

### npm vs pnpm：命令映射与硬链接省盘

npm 是 Node 自带的默认包管理器；pnpm 是更快、更省磁盘的替代品，命令几乎一一对应：

| 任务 | npm | pnpm |
| ---- | ---- | ---- |
| 初始化项目 | `npm init` | `pnpm init` |
| 装生产依赖 | `npm i dayjs` | `pnpm add dayjs` |
| 装开发依赖 | `npm i -D typescript` | `pnpm add -D typescript` |
| 跑 scripts | `npm run dev` | `pnpm dev`（run 可省） |
| 临时执行包命令 | `npx tsc` | `pnpm exec tsc` / `pnpm dlx tsc` |
| 严格按 lock 安装 | `npm ci` | `pnpm install --frozen-lockfile` |

省盘的秘密是**硬链接**：npm 把每个项目的依赖完整复制一份，十个项目就有十份 react；pnpm 把文件统一存在全局 store，项目里的 node_modules 只是指向 store 的硬链接——同一份内容，磁盘上只占一份：

```text
npm：  项目A/node_modules/react/…（完整一份）  项目B/node_modules/react/…（又一份）

pnpm： 全局 store/react@19.x/…（全机唯一一份）
       项目A/node_modules/react → 硬链接（不额外占盘）
       项目B/node_modules/react → 硬链接（不额外占盘）
```

另一条纪律：**一个项目只用一个包管理器**——npm 和 pnpm 的 lock 文件互不兼容，混用会互相打架。

### scripts：项目的统一入口

package.json 里的 `scripts` 是项目命令的登记处：`"dev": "node main.js"` 写好后，`pnpm dev` 就会执行它。价值在**抽象层**：团队成员和 CI 只需要记住 `pnpm install && pnpm dev`，不用关心背后是 node、vite 还是别的什么——换构建工具只改 scripts，不改所有人的习惯。这也是后面 CI/CD 课里 workflow 直接调用这些脚本的原因。

### 版本号语义：^、~ 与「我本地是好的」的根因

| 写法 | 含义 | 1.2.3 会装成 |
| ---- | ---- | ---- |
| `^1.2.3` | 允许 1.x 内升级（minor+patch） | 1.2.3 ～ 1.9.9 之间的最新 |
| `~1.2.3` | 只允许补丁升级 | 1.2.3 ～ 1.2.9 之间的最新 |
| `1.2.3`（无前缀） | 精确锁定 | 1.2.3 |

`package.json` 写的是范围，那「装到哪一版」由**安装时刻**决定。有 lock 文件时一切以 lock 为准，范围只是写入时的默认姿态；**lock 文件缺失（或不提交）时，每人安装时刻不同，解析出的版本就不同**——这就是「在我本地是好的」的经典根因：你和同事装的根本不是同一套版本。patch（1.2.3→1.2.4）是 bug 修复，minor（1.2→1.3）加功能但承诺兼容，major（1→2）破坏兼容——所以 `^` 只敢越过前两档。

### dependencies vs devDependencies：一条判据

判据只有一条：**这段代码在用户浏览器/生产服务器上要不要跑？**

| 依赖 | 装在哪 | 理由 |
| ---- | ---- | ---- |
| dayjs、vue、axios | dependencies | 打包进产物，运行时必需 |
| typescript、vite | devDependencies | 只在构建期用，产物里没有它 |
| eslint、prettier | devDependencies | 只在开发期检查用 |

装错位置的代价不对称：构建工具误装生产侧只是稍微多余；**运行时库误装 dev 侧会在部署时缺包**——因为生产部署常见 `--prod` 安装，devDependencies 整个不装。拿不准就问「用户打开页面时，浏览器需要它吗？」

### npx 一句

`npx tsc --init` = 「临时下载（或找到本地）tsc 并运行，用完即走」，适合偶尔用一次的命令，不必写进依赖。pnpm 对应的是 `pnpm exec`（跑项目里已装的）与 `pnpm dlx`（临时下载）。知道它存在即可，别滥用。

## 代码示例

主线任务：**从空目录到带 dayjs + typescript 的可运行项目**。重点不是命令本身，而是每一步之后**观察三个文件的差异**——package.json 变了什么、lock 文件多了什么、node_modules 长什么样。全程约 25 分钟。

### 第 0 步：确认环境

```bash
node -v      # 预期 v20+ 或 v22+，Node 18 也够用
pnpm -v      # 没有就先 corepack enable（Node 自带 pnpm 管理器）
```

### 第 1 步：pnpm init——package.json 诞生

```bash
mkdir demo && cd demo
pnpm init
```

生成的 package.json 只有一个骨架：

```json
{
  "name": "demo",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "test": "echo \"Error: no test specified\" && exit 1" }
}
```

此时观察：lock 文件不存在，node_modules 不存在——**身份证刚办，还没下过单**。

### 第 2 步：pnpm add dayjs——三个文件同时变化

```bash
pnpm add dayjs
```

观察一，package.json 多了依赖声明（范围，带 ^）：

```json
"dependencies": { "dayjs": "^1.11.0" }
```

观察二，pnpm-lock.yaml 出现，节选：

```yaml
dependencies:
  dayjs:
    specifier: ^1.11.0
    version: 1.11.13        # ← lock 把 ^1.11.0 解析并锁死为 1.11.13
```

观察三，node_modules 出现，pnpm 的结构是嵌套的 `.pnpm` 目录 + 顶层符号链接：

```text
node_modules/
  dayjs  → .pnpm/dayjs@1.11.13/node_modules/dayjs   （链接）
  .pnpm/                                             （真实文件，硬链接到全局 store）
```

三个文件各司其职：身份证记「我要什么」，订单记「实际拿到什么」，仓库放「货物本身」。

### 第 3 步：pnpm add -D typescript——devDependencies 入场

```bash
pnpm add -D typescript
```

package.json 再变：

```json
"devDependencies": { "typescript": "^5.5.0" }
```

对比上一步：只多了 `-D`，落进的是 devDependencies 而不是 dependencies——TypeScript 只在构建期用，用户的浏览器永远不需要它。lock 文件同步追加 typescript 的精确版本与它的依赖树。

### 第 4 步：写 main.js 与 scripts

```js
// main.js —— 用 dayjs 打印今天的日期
const dayjs = require("dayjs")
console.log("今天是", dayjs().format("YYYY-MM-DD"))   // 今天是 2026-11-22
```

在 package.json 里登记统一入口：

```json
"scripts": {
  "dev": "node main.js"
}
```

### 第 5 步：pnpm run dev——走统一入口

```bash
pnpm run dev        # 读取 scripts.dev 执行 → 打印日期
node main.js        # 效果一样，但这是绕过入口直接跑
```

两种跑法输出相同，但请养成走 `pnpm run` 的习惯：当项目换成 Vite 后，`pnpm dev` 三个字不用变——变的只是 scripts 里的定义。顺手体验 npx（下一课的主角）：

```bash
pnpm exec tsc --init    # 项目里已装 typescript，生成 tsconfig.json
```

### 第 6 步：删掉 node_modules 重装——还原闭环

```bash
rm -rf node_modules      # 装好的货全部扔掉
pnpm install             # 按 lock 文件一键还原
pnpm run dev             # 立即可跑
```

这就是依赖管理的核心闭环：**node_modules 永远是「可再生资源」**——lock 文件在，一条命令精确还原出同一套版本。同事 clone 仓库后跑的也是这两条，你们拿到的版本分毫不差。将来 CI 流水线里跑的就是这一对命令。

## 常见坑

1. **坑 1：node_modules 提交进 Git**。现象：仓库几百 MB，clone 半小时，diff 全是乱码。原因：node_modules 是可再生资源且体积巨大。排查：确认 `.gitignore` 里有 `node_modules/`；已误提交的要 `git rm -r --cached node_modules` 移出追踪。
2. **坑 2：lock 文件不提交**。现象：「我本地是好的」，别人装出来炸。原因：只有 package.json 范围声明，每人安装时刻解析出不同版本。排查：`git ls-files | grep lock` 确认 lock 文件在版本库里；PR 里 lock 大量变动要警惕有人手改或混用了别的包管理器。
3. **坑 3：运行时依赖装进 devDependencies**。现象：本地能跑，部署后报 `Cannot find module 'dayjs'`。原因：生产部署按 `--prod` 安装，devDependencies 不装。排查：对着判据自查每个依赖「浏览器里要不要用」；用 `pnpm why <pkg>` 查它是谁引进来的。
4. **坑 4：全局安装项目依赖**。现象：`pnpm add -g dayjs` 换台电脑就崩。原因：`-g` 装到机器全局，不在项目清单里，项目无法自还原。排查：项目依赖永远不加 `-g`；全局只留 node/pnpm 这类工具本身。
5. **坑 5：混用 npm 与 pnpm**。现象：一会儿 `npm i` 一会儿 `pnpm add`，同时出现 package-lock.json 和 pnpm-lock.yaml。原因：两者 lock 格式互不兼容，node_modules 结构也不同。排查：删掉多余 lock 与 node_modules，只用项目指定的那一个重装。
6. **坑 6：幻影依赖**。现象：代码里 import 了一个你没装过的包，居然能跑。原因：npm 的平铺结构让「依赖的依赖」也能被顶层 import；换 pnpm 严格结构立刻报找不到。排查：把未在 package.json 声明就 import 的包补进依赖清单——依赖谁就声明谁。

## 小练习

1. 完整走一遍主线，并在每步后记录三个文件的变化：第 2 步前后 package.json 多了什么、lock 文件记了哪些字段、node_modules 顶层是什么形状。
2. 查看本站仓库的 package.json 与 lock 文件：挑一个带 `^` 的依赖，解释「声明范围」与「lock 里的精确版本」分别是什么；再找一个 devDependencies 里的包，说明为什么它不能进 dependencies。
3. 故意删掉 pnpm-lock.yaml 再 `pnpm install`，观察它重新解析；再 `git diff` 对比 lock 变化——用这个实验解释「lock 文件为什么必须进 Git」。
4. **综合任务**：给第 6 步的项目再加一个依赖（如 lodash，按你的判断决定装哪一侧并写明理由），新增脚本 `"today"` 打印「今天是星期 X」（提示：dayjs 的 `format("dddd")` 与中文 locale）；最后把项目推到远程仓库，模拟同事 clone：只跑 `pnpm install && pnpm dev`，确认零口头交代就能跑通。
