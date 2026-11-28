/**
 * 测验判分纯函数（F5.4 填空题）。
 */
import type { QuizBlank } from '@/types/content'

const normalize = (s: string): string => s.replace(/\s+/g, '') // \s 含全角空格

/** 填空判分：忽略全部空白差异；alts 与 answer 等价；大小写敏感（代码类答案区分大小写） */
export function isBlankCorrect(input: string, blank: QuizBlank): boolean {
  const target = normalize(input)
  if (!target) return false
  return [blank.answer, ...(blank.alts ?? [])].some((a) => normalize(a) === target)
}
