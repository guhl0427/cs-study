import type { Component } from 'vue'
import {
  IconBinary,
  IconCode,
  IconCpu,
  IconDatabase,
  IconFileCode,
  IconGitBranch,
  IconPuzzle,
  IconServer2,
  IconTerminal2,
} from '@tabler/icons-vue'

/** 领域图标映射（design/tokens.md §6，Tabler Icons，stroke 1.5） */
export const domainIcons: Record<string, Component> = {
  cpu: IconCpu,
  'file-code': IconFileCode,
  code: IconCode,
  'server-2': IconServer2,
  database: IconDatabase,
  'terminal-2': IconTerminal2,
  'git-branch': IconGitBranch,
  binary: IconBinary,
  puzzle: IconPuzzle,
}

/** 外链资源类型图标（F3.4） */
export const resourceTypeNames: Record<string, string> = {
  doc: '文档',
  book: '书籍',
  video: '视频',
  tool: '工具',
}
