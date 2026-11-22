---
id: l-co-cpu
slug: co-cpu
title: CPU 与指令：程序执行的现场
difficulty: 2
estMinutes: 45
tags: [组成原理, CPU]
summary: CPU 只会一件事：取指→译码→执行→写回，周而复始——寄存器是随身口袋，指令是操作码加操作数，跳转就是改 PC。
updated: 2026-11-22
resources:
  - id: r-co-cpu-godbolt
    title: Compiler Explorer（godbolt）
    url: https://godbolt.org/
    type: tool
    difficulty: 2
    note: 左边写 C、右边立刻看到对应汇编，观察「高级语言如何翻译成指令」的第一神器。
  - id: r-co-cpu-csapp
    title: 《深入理解计算机系统》（CSAPP）第 3 章
    url: https://csapp.cs.cmu.edu/
    type: book
    difficulty: 3
    note: 「程序的机器级表示」，把汇编、寄存器、栈帧讲透的教材章节。
  - id: r-co-cpu-nand2tetris
    title: Nand2Tetris 项目 5：计算机体系结构
    url: https://www.nand2tetris.org/
    type: doc
    difficulty: 3
    note: 亲手用简单芯片拼出一个能执行指令的 CPU，取指-执行循环从此不再抽象。
---

> 一句话定义：CPU 是个只会循环干四步的工人——取指、译码、执行、写回；程序就是喂给它的指令序列，而「跳转」不过是改了它手里记录下一站的地址（PC）。

## 概念讲解

CPU 内部三大件，类比一个流水线工人：

| 部件     | 类比       | 干什么                                   |
| -------- | ---------- | ---------------------------------------- |
| 寄存器   | 随身口袋   | 存正在计算的几个数，全机最快，只有十几个 |
| ALU      | 手和工作台 | 只会加减乘、位运算这些「小活」，快得惊人 |
| 控制单元 | 大脑读工单 | 读指令、指挥另外两个部件按顺序干活       |

指令是什么？一串机器数：**操作码（干什么）+ 操作数（对谁干）**——x86 上 `add eax, 5` 编码成 `83 C0 05`，你眼里的汇编，CPU 眼里只是三个字节。CPU 的全部日常就是围着它转这个圈：

```text
PC ──► ① 取指（按 PC 拿指令）→ ② 译码（要干什么）→ ③ 执行（ALU 算 / 读写内存）→ ④ 写回（结果放回寄存器）──► 回到 ①
  ▲
  └ 跳转指令（jmp/jl/call）：直接把 PC 改成别的地址
```

**程序计数器（PC）** 存着「下一条指令的地址」：顺序执行时自动指向下一条，而 `if`、`while`、函数调用的本质，都是某条指令把 PC 改走——循环就是「跳回开头」那条跳转每轮都成立。

汇编直觉——每条指令对应高级语言的一小步：

| 汇编（x86 直觉版）        | 意思                 | 对应高级语言          |
| ------------------------- | -------------------- | --------------------- |
| `mov eax, [x]`            | 把变量 x 取进口袋    | 读变量                |
| `add eax, 1`              | 口袋里的数加 1       | `x = x + 1`           |
| `cmp eax, 10` + `jl loop` | 比一比，小于就跳回   | `if` / `while` 的循环 |
| `call f` / `ret`          | 跳去函数 / 跳回原地  | 函数调用与 return     |

函数调用时，返回地址、参数和局部变量会压进**调用栈**的一块「栈帧」（正是指针课里「局部变量住在栈上」的硬件现场）。为什么 C 更快？编译器在**运行前**就把源码翻译成贴近硬件的指令序列，运行时一条指令就是一条；而 Python 的一行代码要先经过解释器拆成好几步——解释器本身也是一段 C 程序，两者差一个数量级的指令数很正常。

## 代码示例

不用装汇编环境，Python 自带的 `dis` 模块就能看到「指令长什么样」：

```python
def add_ten(n):
    return n + 10

import dis
dis.dis(add_ten)   # 输出（3.11+，地址列略去）：
#   LOAD_FAST  0 (n)   → 取参数 n 进「口袋」
#   LOAD_CONST 1 (10)  → 取常量 10
#   BINARY_OP  0 (+)   → 相加
#   RETURN_VALUE       → 返回
# 四条指令都是「操作码+操作数」——字节码和机器码同构，执行者从硬件换成了解释器
```

有 gcc 的环境（Linux/macOS 或 MinGW）可以看真正的机器级汇编；没装 gcc 就去 godbolt.org，左边粘入 `square`、编译器选 x86-64 gcc。`sq.s` 的内容（节选，x86-64）：

```bash
echo 'int square(int n){return n*n;}' > sq.c
gcc -O0 -S sq.c -o sq.s && cat sq.s       # -S：停在汇编这一步
gcc sq.c && objdump -d a.out | grep -A7 '<square>'   # 反汇编看机器码字节
```

```text
square:
    pushq   %rbp                # 保存上一层栈帧基址：栈帧开始搭建
    movl    %edi, -4(%rbp)      # 参数 n 存进栈帧
    movl    -4(%rbp), %eax      # 取进口袋（寄存器 eax）
    imull   %eax, %eax          # eax = eax * eax —— 真正干活的就这一条
    popq    %rbp
    ret                         # 按 call 存好的返回地址跳回去
```

## 常见坑

1. **坑 1：以为「一行代码 = 一条指令」**。一行 Python/C 往往对应几条到几十条机器指令，性能直觉要按指令数和内存访问算，不是按行数。排查：用 `dis` 或 godbolt 看翻译结果。
2. **坑 2：被 AT&T 汇编语法劝退**。`movl %edi, -4(%rbp)` 源在前、目的在后，和 Intel 手册正好相反，还满眼 `%` `$`。排查：godbolt 右侧切换成 Intel 语法，观感立刻友好。
3. **坑 3：以为 CPU 慢在计算**。ALU 一条加法不到 1ns，瓶颈常在取指和访存——分支跳转打乱流水线、缓存未命中等内存，这正是下一节缓存课的主题。

## 小练习

1. 写一个含 `if/else` 的函数，用 `dis.dis` 找出条件跳转指令（`POP_JUMP_FORWARD_IF_FALSE` 之类）；再写一个等价的 `while` 循环版本，确认「循环 = 跳回开头」。
2. 在 godbolt 上编译 `int f(int a, int b){return a - b;}`，指出哪一条是减法指令，参数 a、b 分别从哪个寄存器进来。
3. 思考题：`total += x` 在 dis 里是好几条指令，在 gcc -O2 编译的 C 里常只有一两条。为什么执行成本差这么多？这对「Python 写原型、C 写热点」有什么启发？
