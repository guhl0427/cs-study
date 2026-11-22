---
id: l-c-array-string
slug: c-array-string
title: 数组与字符串
difficulty: 2
estMinutes: 40
tags: [C]
summary: C 的数组没有 length 属性、字符串就是 \0 结尾的 char 数组——边界要自己数，越界没人拦你。
updated: 2026-11-22
resources:
  - id: r-c-string-ref
    title: cppreference C 字符串函数参考
    url: https://en.cppreference.com/w/c/string/byte
    type: doc
    difficulty: 2
    note: strlen/strcpy/strcmp 等函数的权威参考。
  - id: r-c-godbolt
    title: Compiler Explorer
    url: https://godbolt.org/
    type: tool
    difficulty: 2
    note: 在线编译并查看汇编，亲眼看看 -O0 和 -O2 的差别。
---

> 一句话定义：C 的数组是**一排连续的同类格子**——没有长度属性、不做边界检查；字符串就是用 `\0` 标记结尾的字符数组。

## 概念讲解

数组：类型相同、大小固定、内存连续：

```text
int scores[5] = {92, 88, 79, 95, 60};
地址:    1000  1004  1008  1012  1016   ← 每格 4 字节，紧挨着
下标:     [0]   [1]   [2]   [3]   [4]
```

连续存放带来两件事：

1. **随机访问 O(1)**：编译器用 `首地址 + 下标 × 单格大小` 直接算出地址，不用挨个找。
2. **数组名就是首元素的地址**：把数组传给函数时，传过去的其实是地址（`int *`）——所以函数内 `sizeof(arr)` 得到的是**指针的大小（8 字节）**，不是数组总大小。**数组长度必须作为另一个参数传进去**。

字符串在 C 里没有独立类型，就是 `char` 数组 + 结尾标记 `\0`（空字符，值全 0）：

```text
"abc" 在内存里： 'a'  'b'  'c'  '\0'
                  ↓    ↓    ↓    ↓
                  97   98   99   0     ← 靠这个 0 标记「到这儿结束了」
```

`strlen` 为什么是 O(n)？它得从头走到 `\0` 才知道多长。这解释了 C 字符串和 Python str 的根本差异：Python 把长度存在对象里，C 只存了那串字符本身。

## 代码示例

数组遍历 + 函数传参（注意长度怎么传）：

```c
#include <stdio.h>

int sum(int *arr, int len) {        // 数组退化成指针，长度必须自己传
    int total = 0;
    for (int i = 0; i < len; i++) {
        total += arr[i];
    }
    return total;
}

int main(void) {
    int scores[5] = {92, 88, 79, 95, 60};
    printf("总长=%zu 字节\n", sizeof(scores));   // 20 字节（main 里还是数组）
    printf("总分=%d\n", sum(scores, 5));          // 总分=414
    printf("平均=%.1f\n", sum(scores, 5) / 5.0); // 平均=82.8（5.0 保证浮点除法）
    return 0;
}
```

字符串的三种写法与常用函数：

```c
#include <stdio.h>
#include <string.h>

int main(void) {
    char name[16] = "Alice";        // 自动补 \0，共 6 个有效字符
    printf("len=%zu\n", strlen(name));        // len=5（不含 \0）
    printf("sizeof=%zu\n", sizeof(name));     // 16（整个数组的格子数）

    char greet[16];
    snprintf(greet, sizeof(greet), "Hi, %s!", name);  // 安全写入（比 strcpy 多一层保护）
    printf("%s\n", greet);                    // Hi, Alice!

    printf("%d\n", strcmp("apple", "banana")); // -1（字典序 apple 在前，返回负数）
    return 0;
}
```

## 常见坑

1. **坑 1：越界不报错**。`scores[10] = 1;` 编译运行都正常——它只是把值写到了数组后面的内存里，可能污染别的变量，也可能什么都没炸。**未定义行为**：不出错才是最可怕的。边界永远用 `i < len`，别手滑写成 `<=`。
2. **坑 2：`strlen` 与 `sizeof` 混用**。`strlen("abc")` 是 3（有效字符数，运行时数）；`sizeof` 是数组的总格子数（编译期确定），对 `"abc"` 数组是 4（含 `\0`），对 `char*` 指针则是 8。
3. **坑 3：`char *s = "hi"; s[0] = 'H';`**。字符串字面量存在只读区，改它直接崩溃。要能改就写成数组：`char s[] = "hi";`。
4. **坑 4：往没分配够的数组里 strcpy**。`char buf[4]; strcpy(buf, "hello");` 写穿了格子边界。用 `snprintf(buf, sizeof(buf), ...)`，它保证不写超。

## 小练习

1. 写一个函数 `int count_char(const char *s, char target)`，手写循环统计字符出现次数（不许用 strlen），并在 main 里用 `"banana"` 统计 `'a'`（应为 3）。
2. 把 `snprintf` 那行改成 `strcpy` 并把 `greet` 数组缩到 8，运行观察结果；再换回 `snprintf`，确认它截断而不崩溃。
3. 思考题：为什么 `sum(int *arr, int len)` 必须传 len？如果数组自己记着长度，这个设计会变成什么样？（提示：想想 Python list）
