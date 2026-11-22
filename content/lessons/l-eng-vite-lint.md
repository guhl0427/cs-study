---
id: l-eng-vite-lint
slug: eng-vite-lint
title: Vite 与代码质量工具链
difficulty: 2
estMinutes: 40
tags: [Vite, ESLint, 工程化]
summary: Vite 把「写代码→看效果」压到毫秒级，ESLint+Prettier 把「代码风格」交给机器——两者的配置文件加起来不到 50 行，却是工程与玩具的分界线。
updated: 2026-11-22
resources:
  - id: r-vite-doc
    title: Vite 官方指南（中文）
    url: https://cn.vite.dev/guide/
    type: doc
    difficulty: 1
    note: 「为什么选 Vite」和功能配置都在指南前几章。
  - id: r-eslint-doc
    title: ESLint 官方文档
    url: https://eslint.org/docs/latest/
    type: doc
    difficulty: 2
    note: 规则与配置参考；本节讲思想，规则名用到再查。
---

> 一句话定义：Vite 解决「开发时秒级看到效果、发布时打包优化」；ESLint + Prettier 解决「风格与低级错误」——机器管规矩，人管创造。

## 概念讲解

**为什么需要构建工具？** 浏览器不能直接跑 TS 和 .vue 文件，也不会帮你压缩、去重、拆包。Vite 做两件事：开发时用原生 ES 模块**按需秒级编译**（改一行，刷新立现，不用等全量打包）；发布时用 Rollup **打包优化**（压缩、拆 chunk、加 hash）。`pnpm create vite` 一条命令建好项目，`pnpm dev` 启动，`pnpm build` 产出 dist/。

**为什么需要 ESLint + Prettier？** 对照「代码规范」一课的分工：

| 工具 | 管什么 | 管不了什么 |
| ---- | ---- | ---- |
| Prettier | 格式：缩进、引号、换行 | 逻辑错误 |
| ESLint | 质量规则：未使用变量、潜在的 bug 模式 | 格式细节（交给 Prettier） |
| TypeScript | 类型错误 | 风格 |

三者各司其职、互不替代。`eslint-config-prettier` 让两者规则不冲突。保存时自动格式化（编辑器配置）+ 提交前强制检查（git hooks）= 团队代码永远一个风格，评审只看逻辑。

CI 里把它们当**守门员**：`pnpm lint && pnpm typecheck && pnpm test` 全绿才允许合并——这就是「CI/CD」一课 workflow 里那几步的来源。

## 代码示例

从零给一个 Vite 项目接上质量工具链：

```bash
pnpm create vite my-app --template vue-ts   # Vite + Vue + TS 三合一模板
cd my-app && pnpm install
pnpm add -D eslint prettier eslint-config-prettier
pnpm init @eslint/config@latest             # 生成 eslint.config.js
```

```js
// eslint.config.js —— 平铺配置（ESLint 9 风格）
import prettier from "eslint-config-prettier"

export default [
  { ignores: ["dist/"] },                       // 构建产物不检查
  {
    files: ["**/*.{js,ts,vue}"],
    languageOptions: { ecmaVersion: "latest" },
    rules: {
      "no-unused-vars": "error",                // 未使用变量直接报错
      "no-var": "error",                        // 禁用 var
      eqeqeq: ["error", "always"],              // 必须用 ===
    },
  },
  prettier,                                     // 放最后：关掉与 Prettier 冲突的规则
]
```

```json
// .prettierrc —— 只声明团队分歧点，其余用默认值
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100
}
```

```bash
pnpm exec eslint . --fix      # 检查并自动修复
pnpm exec prettier . --write  # 全仓格式化
```

跑一次效果：

```text
src/main.ts
  2:10  error  'ref' is defined but never used   no-unused-vars
  5:3   error  Expected '===' and instead saw '==', eqeqeq
✖ 2 problems (2 errors, 0 warnings)  —— 两个低级错误，机器 0.1 秒抓完
```

## 常见坑

1. **坑 1：ESLint 和 Prettier 互相打架**。两者都管格式时规则冲突、报错摇摆——`eslint-config-prettier` 关掉 ESLint 里的格式规则，让格式归 Prettier、质量归 ESLint。
2. **坑 2：dist/ 没进 ignore**。对构建产物 lint/格式化，每次 build 后全仓报错——ESLint 与 .gitignore 都要排除 dist/。
3. **坑 3：只在自己电脑上跑 lint**。有人忘跑，风格就破了。用 git hooks（husky）在提交时强制跑，或干脆依赖 CI 拦截。
4. **坑 4：把 Vite 的 build 当银弹**。构建能压缩拆包，救不了网络瀑布和巨型依赖——性能问题对照「浏览器原理」的清单逐项排查。

## 小练习

1. 建一个 Vite 项目，故意写 `var x == 1`，跑 eslint 看 no-var 和 eqeqeq 的报错，再用 --fix 观察哪些能自动修。
2. 把本站仓库 frontend/ 的 package.json 打开，找出 dev/build/lint 脚本的实际定义，理解每条命令背后是谁在干活。
3. 思考题：对照「CI/CD」一课——lint/typecheck/test 三步放在 workflow 的哪个位置？为什么 lint 要放在 test 前面？
