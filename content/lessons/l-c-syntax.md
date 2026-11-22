---
id: l-c-syntax
slug: c-syntax
title: C 语法速览：从源码到可执行文件
difficulty: 2
estMinutes: 85
tags: [C, 入门]
summary: C 是手动挡——类型要先声明、代码要经过编译、内存要自己管，这三件事是它的全部「麻烦」，也是它快的原因；跟着写出第一个多函数程序并看懂编译的每一步。
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

> 一句话定义：C 把你写的源码**直接编译成机器码**——类型要先声明、执行前要过编译器、内存要自己管，这三件事是它的全部「麻烦」，也是它快的原因。

## 概念讲解

**编译执行 vs 解释执行：根本分野。** Python 是解释执行——解释器一边读你的代码一边执行，运行时还带着解释器这个「翻译官」。C 是编译执行——编译器先把整个源码翻译成 CPU 能直接跑的机器文件，之后每次运行都是这个翻译好的文件在跑，不再需要任何翻译：

```text
hello.c（你写的源码）
   │  gcc hello.c -o hello      ← 编译：翻译 + 检查（错误在这里报）
   ▼
hello（可执行文件，纯机器码）
   │  ./hello                   ← 运行：不再需要编译器
   ▼
Hello, world!
```

这个模型解释了 C 的三大特性：**快**（没有运行时翻译开销）、**错误前置**（编译期就报错，而不是跑到半夜才炸）、**分发难**（可执行文件与平台绑定——Linux 编译的 Mac 跑不了，跨平台要重新编译）。

**三件和 Python 明显不同的事**：

1. **变量要先声明类型**：`int age = 18;`——类型错了编译器直接报错，不帮你自动转换。提前知道每个变量的类型和大小，编译器能精确分配内存（Python 的灵活是用运行时开销换的）。
2. **语句以分号结尾，代码块用大括号**：缩进只是给人看的，编译器不看——`if` 下面缩进三行但没有大括号，只有第一行属于它（经典事故）。
3. **入口固定是 `main` 函数**：程序从 `main` 的第一行开始跑，`return 0` 表示「正常结束」（给操作系统的信号，非零表示异常退出——脚本与 CI 靠它判断成败，呼应 Shell 课的退出码）。

**和已学语言的关键差异一览**：

| 特性 | Python | C |
| ---- | ------ | - |
| 类型 | 动态推断 | 必须先声明 |
| 执行 | 解释器逐行跑 | 编译成机器码再跑 |
| 代码块 | 冒号 + 缩进 | `{ }`（缩进只是美观） |
| 数组长度 | 自带 | 自己记（没有 .length） |
| 字符串 | 内置 str 对象 | `char` 数组 + `\0` 结尾 |
| 内存 | 解释器自动回收 | 手动管理（指针课展开） |

**基本类型速记**：`int`（整数）、`float`/`double`（浮点，double 更常用）、`char`（单字符）、`long`（长整数）——`sizeof` 能告诉你每个类型在你的机器上占几个字节（`printf("%zu", sizeof(int))`）。

**常用格式化占位符**（printf 的语言）：`%d` 整数、`%f` 浮点、`%.2f` 两位小数、`%c` 字符、`%s` 字符串、`%zu` sizeof 结果、`%p` 指针地址——占位符与后面的参数必须一一对应，错位会打印出垃圾值。

## 代码示例

主线：一个「BMI 计算器」从单文件到多函数，覆盖变量、控制流、函数与编译全流程：

**第 1 步：最小程序解剖**（每行都有讲究）：

```c
#include <stdio.h>              // 引入标准输入输出库（printf 在里面）

int main(void) {                // 入口：int 表示返回整数状态码
    printf("Hello, BMI!\n");    // \n 是换行
    return 0;                   // 0 = 正常结束
}
```

编译与运行（无本地环境用 OnlineGDB）：

```bash
gcc bmi.c -o bmi        # 编译：生成可执行文件 bmi
./bmi                   # 运行：Hello, BMI!
gcc -Wall bmi.c -o bmi  # -Wall 打开全部警告——警告都是未来的 bug
```

**第 2 步：变量、输入与控制流**：

```c
#include <stdio.h>

int main(void) {
    double weight = 0, height = 0;

    printf("体重(kg)：");
    scanf("%lf", &weight);          // 读输入（&取地址——指针课的主角）
    printf("身高(m)：");
    scanf("%lf", &height);

    double bmi = weight / (height * height);

    if (bmi < 18.5) {
        printf("偏瘦 (BMI=%.1f)\n", bmi);
    } else if (bmi < 24) {
        printf("正常 (BMI=%.1f)\n", bmi);
    } else {
        printf("偏胖 (BMI=%.1f)\n", bmi);
    }
    return 0;
}
```

```text
运行：体重(kg)：70 ↵ 身高(m)：1.75 ↵ → 正常 (BMI=22.9)
```

**第 3 步：拆函数 + 循环**——把判定逻辑独立成函数（呼应重构课）：

```c
#include <stdio.h>

const char *classify(double bmi) {      // 返回字符串指针（先照抄，指针课讲）
    if (bmi < 18.5) return "偏瘦";
    if (bmi < 24)   return "正常";
    return "偏胖";
}

int main(void) {
    double weights[] = {50, 62, 70, 85, 95};   // 数组：5 个人的体重
    double height = 1.75;

    for (int i = 0; i < 5; i++) {              // C 的 for：初值；条件；步进
        double bmi = weights[i] / (height * height);
        printf("体重 %.0f → %s\n", weights[i], classify(bmi));
    }
    return 0;
}
```

```text
运行：体重 50 → 偏瘦
      体重 62 → 正常
      体重 70 → 正常
      体重 85 → 偏胖
      体重 95 → 偏胖
```

**第 4 步：编译错误 vs 警告 vs 运行时错误**——三种失败形态的第一次亲历：

```text
编译错误：printf("BMI=%d", bmi) —— 占位符类型错，gcc 直接拒绝生成文件
警告：    未使用的变量、= 与 == 混用 —— 能编译但多半是 bug（-Wall 让它们现形）
运行时：  scanf 没检查返回值，输入字母导致变量未赋值 —— 编译期抓不住的坑
```

## 常见坑

1. **坑 1：忘了分号**。报错信息指向的行往往不是真正出错的那行（编译器读到下一行才发现不对）。看到 `expected ';'` 就往报错行的**上一行**找。
2. **坑 2：用 `=` 判断相等**。`if (a = 5)` 是赋值（恒为真），不是比较 `a == 5`。gcc 开 `-Wall` 编译会有警告，别忽略警告——每个警告都值得读一遍。
3. **坑 3：`float` 存钱**。`float`/`double` 是二进制浮点，`0.1 + 0.2 != 0.3`（组成原理课的 IEEE 754 会讲透）。金额用整数（分）或专门的类型。
4. **坑 4：改了代码没重新编译**。运行的是旧的机器文件——「改了没生效」十有八九是这个。看文件时间戳确认。
5. **坑 5：缩进骗人**。没有大括号的 if 只管第一行——`if (x > 0) printf("A"); printf("B");` 里 B 永远执行。大括号哪怕只有一行也永远写上。
6. **坑 6：scanf 忘了 &**。`scanf("%d", age)` 少了取地址符，程序把 age 的**值**当地址写入——诡异崩溃。scanf 的参数永远是「变量的地址」。

## 小练习

1. 把 BMI 程序改成：用 `while` 循环反复读输入直到输入 0 退出（哨兵值模式），并统计偏瘦/正常/偏胖各多少人。
2. 故意写一个 `if (bmi = 22)`，用 `gcc -Wall bmi.c -o bmi` 编译，观察警告信息；再用 `sizeof` 打印 int/double/char 各占几个字节。
3. 综合任务：给 classify 函数写「等价重构」——把 if 链改写成查表法（两个数组：上限表 + 结论表），验证输出完全一致（呼应软件工程的重构课）。
4. 思考题：为什么 C 要先声明类型？提前知道每个变量的类型和大小，编译器能帮你做哪些 Python 解释器做不到的事？
