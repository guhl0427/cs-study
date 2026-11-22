---
id: l-c-syntax
slug: c-syntax
title: C 语法速览：从源码到可执行文件
difficulty: 2
estMinutes: 40
tags: [C, 入门]
summary: C 是手动挡——类型要先声明、代码要经过编译、内存要自己管，这三件事是它的全部「麻烦」，也是它快的原因。
updated: 2026-11-22
resources:
  - id: r-c-tutorial
    title: Learn C（interactive）
    url: https://www.learn-c.org/
    type: doc
    difficulty: 1
    note: 边跑边学的交互式教程，每节都能在网页里直接改代码执行。
  - id: r-c-online-gcc
    title: OnlineGDB（C 在线编译器）
    url: https://www.onlinegdb.com/online_c_compiler
    type: tool
    difficulty: 1
    note: 不装环境也能跑本文全部示例。
  - id: r-c-knking
    title: 《C 语言程序设计现代方法》
    url: https://www.amazon.com/dp/0321337224
    type: book
    difficulty: 2
    note: 公认最系统的 C 入门书，比 K&R 更适合初学者。
---

> 一句话定义：C 把你写的源码**直接编译成机器码**——类型要先声明、执行前要过编译器，换来的是贴近硬件的速度和对内存的完全控制。

## 概念讲解

Python 是**解释执行**：解释器一边读你的代码一边执行。C 是**编译执行**：编译器先把整个源码翻译成 CPU 能直接跑的机器文件，之后每次运行都是这个翻译好的文件在跑——这就是 C 快的根本原因。

```text
hello.c（你写的源码）
   │  gcc hello.c -o hello      ← 编译：翻译 + 检查
   ▼
hello（可执行文件，机器码）
   │  ./hello                   ← 运行：不再需要编译器
   ▼
Hello, world!
```

三件和 Python 明显不同的事：

1. **变量要先声明类型**：`int age = 18;`——类型错了编译器直接报错，不帮你自动转换。
2. **语句以分号结尾**，代码块用大括号 `{}` 包起来（缩进只是给人看的，编译器不看）。
3. **入口固定是 `main` 函数**：程序从 `main` 的第一行开始跑。

和已学语言的关键差异一览：

| 特性 | Python | C |
| ---- | ------ | - |
| 类型 | 动态推断 | 必须先声明 |
| 执行 | 解释器逐行跑 | 编译成机器码再跑 |
| 代码块 | 冒号 + 缩进 | `{ }` |
| 数组长度 | 自带 | 自己记 |

## 代码示例

一个完整的 C 程序，包含了变量、控制流和函数——保存为 `demo.c` 后 `gcc demo.c -o demo && ./demo` 即可运行：

```c
#include <stdio.h>              // 引入标准输入输出库（printf 在里面）

int square(int n) {             // 函数：返回类型 int，参数也要声明类型
    return n * n;
}

int main(void) {                // 程序入口，从这里开始执行
    int age = 18;               // 变量：类型先声明
    double score = 92.5;        // double 存小数
    char grade = 'A';           // char 存单个字符，用单引号

    if (age >= 18) {
        printf("成年了\n");      // \n 是换行
    } else {
        printf("未成年\n");
    }

    for (int i = 0; i < 3; i++) {          // i 必须先声明类型
        printf("i=%d square=%d\n", i, square(i));
    }
    printf("score=%.1f grade=%c\n", score, grade);
    return 0;                   // 返回 0 表示「正常结束」
}
```

运行结果：

```text
成年了
i=0 square=0
i=1 square=1
i=2 square=4
score=92.5 grade=A
```

`printf` 的 `%d`、`%f`、`%c` 是**占位符**——它告诉编译器「这里放一个整数/小数/字符」，占位符和后面的参数必须一一对应。

## 常见坑

1. **坑 1：忘了分号**。报错信息指向的行往往不是真正出错的那行（编译器读到下一行才发现不对）。看到 `expected ';'` 就往报错行的**上一行**找。
2. **坑 2：用 `=` 判断相等**。`if (a = 5)` 是赋值（恒为真），不是比较 `a == 5`。gcc 开 `-Wall` 编译会有警告，别忽略警告。
3. **坑 3：`float` 存钱**。`float`/`double` 是二进制浮点，`0.1 + 0.2 != 0.3`。金额用整数（分）存。
4. **坑 4：改了代码没重新编译**。运行的是旧的机器文件——「改了没生效」十有八九是这个。

## 小练习

1. 把示例改成：用 `while` 循环打印 1 到 10 的平方，并用 `sizeof` 查看 `int` 在你的机器上占几个字节（提示：`printf("%zu\n", sizeof(int))`）。
2. 故意写一个 `if (age = 18)`，用 `gcc -Wall demo.c -o demo` 编译，观察警告信息。
3. 思考题：为什么 C 要先声明类型？提前知道每个变量的类型和大小，编译器能帮你做哪些 Python 解释器做不到的事？
