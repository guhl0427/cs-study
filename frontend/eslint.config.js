/**
 * ESLint flat config（🟡 工程质量基建：SearchPage/LessonArticle 的 vue/no-v-html
 * disable 注释自本项目接入 ESLint 起生效——v-html 仅用于构建期 Shiki 输出与本地
 * 转义高亮，属受控白名单）。
 *
 * 项目未引入 Prettier，模板排版以现状为准：关闭 flat/recommended 中的纯排版
 * 规则（属 strongly-recommended 层），保留正确性规则（essential + recommended）。
 */
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'

export default defineConfigWithVueTs(
  { ignores: ['dist/**', 'coverage/**', 'src/content/gen/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  { languageOptions: { globals: { ...globals.browser } } },
  {
    rules: {
      // ---- 排版类：项目无格式化器，保持现有书写风格，避免无意义的大面积 diff ----
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/attributes-order': 'off',
      'vue/require-default-prop': 'off',
    },
  },
  { files: ['src/App.vue'], rules: { 'vue/multi-word-component-names': 'off' } },
)
