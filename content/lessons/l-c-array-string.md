---
id: l-c-array-string
slug: c-array-string
title: 数组与字符串
difficulty: 2
estMinutes: 75
tags: [C]
summary: C 的数组没有 length 属性、字符串就是 \0 结尾的 char 数组——二维数组、argv 指针数组、手写 mini strlen/strcmp、边界与缓冲区溢出，越界没人拦你。
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
  - id: r-c-beej
    title: Beej's Guide to C Programming
    url: https://beej.us/guide/bgc/
    type: book
    difficulty: 2
    note: 免费开源的经典 C 教程，数组与字符串章节写得极细。
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

### 二维数组：表格铺成一条直线

```text
int m[2][3] = {{1,2,3},{4,5,6}}   ← 逻辑上是 2 行 3 列的表格
物理内存里没有「表格」，只有一条直线，按行铺开：
地址:  2000  2004  2008  2012  2016  2020
值:      1     2     3     4     5     6
       [0][0] [0][1] [0][2] [1][0] [1][1] [1][2]
```

访问 `m[1][2]` 的地址 = 2000 + (1×3 + 2) × 4——编译器算地址时必须知道**列数是 3**，这就是为什么声明二维数组参数时列数不能省：`int m[][3]` 合法，`int m[][]` 编译报错（不知道每行几个，地址就算不出来）。

### 字符串数组：argv 就是这么长

每个终端程序的入口 `int main(int argc, char *argv[])` 里，argv 就是「字符串数组」——更准确说是**指针数组**：数组每格存一个 `char *`，指向各自的字符串：

```text
$ ./hello Alice Bob          ← 用户在终端敲的命令 → argc = 3

argv:  ┌───────┐
 [0] → │   ●───┼──►  "./hello\0"   ← argv[0] 固定是程序自己的名字
 [1] → │   ●───┼──►  "Alice\0"
 [2] → │   ●───┼──►  "Bob\0"
 [3] → │ NULL  │      ← 末尾固定是空指针，argv[argc] == NULL
       └───────┘
```

argv 的类型可以写成 `char *argv[]` 或 `char **argv`——「指向 char* 的指针」，这正是指针课的**二级指针**伏笔，到那一课会彻底看清它的脸。

### 字符串函数的实现原理：手写 mini strlen/strcmp

标准库的字符串函数并不神秘，核心就是那行「走到 `\0`」的循环。亲手写一遍 mini 版，理解了实现就不会误用：

```c
#include <stddef.h>

size_t my_strlen(const char *s) {          // 数长度：走到 \0 为止
    size_t n = 0;
    while (s[n] != '\0') n++;              // 没到结尾就继续数
    return n;
}

int my_strcmp(const char *a, const char *b) {   // 逐字符比较
    while (*a && *a == *b) { a++; b++; }       // 没到头且相等 → 都前进一格
    return (unsigned char)*a - (unsigned char)*b;   // 第一个不同字符的差值
}
```

注意 strcmp 的返回值**不是** -1/0/1，而是「第一个不同字符的差值」（如 `'a'-'b' = -1`，但 `"z"-"a"` 会是大正数）——所以判断相等永远写 `strcmp(x, y) == 0`，不要假设它恰好返回 ±1。而 `*a && *a == *b` 这行条件展示了 C 的惯用缩写：「`*a` 非零（没到 \0）且当前字符相等才继续」。

### 字符串函数的安全用法对照

C 的字符串函数是「不检查边界的原始工具」，用错就是安全漏洞（SQL 注入课的缓冲区溢出同源）。安全对照表：

| 危险写法 | 安全替代 | 差别 |
| ---- | ---- | ---- |
| `strcpy(dst, src)` | `snprintf(dst, sizeof(dst), "%s", src)` | 后者保证不写超 dst 边界 |
| `strcat(dst, src)` | `strncat(dst, src, n)` 或 snprintf 拼接 | 限长拼接 |
| `sprintf(buf, ...)` | `snprintf(buf, sizeof(buf), ...)` | 限长格式化 |
| `gets(buf)` | **不存在安全替代，禁止使用** | 无限读取必越界 |

**这不是学术恐吓**：缓冲区溢出是 C 生态四十年的头号漏洞类型——1988 年的 Morris 蠕虫利用 fingerd 服务里一句 `gets()` 瘫痪了当时约 10% 的互联网；2014 年的 Heartbleed 本质是「读取时没做边界检查」的越界读，泄漏了 OpenSSL 的内存。此后编译器加 stack protector、微软甚至给 C 加了「安全函数集」，全都是在给「C 不检查边界」这个设计打补丁。理解越界的机制，你才能读懂安全公告的原理。

**指针版遍历**——指针课的伏笔在这里收：字符串遍历的两种等价写法：

```c
const char *s = "banana";
int count = 0;
for (int i = 0; s[i] != '\0'; i++)          // 下标版
    if (s[i] == 'a') count++;

for (const char *p = s; *p != '\0'; p++)    // 指针版：p 沿着字符串走到 \0
    if (*p == 'a') count++;
```

`while (*p)` 是 `while (*p != '\0')` 的惯用缩写——「沿字符串走到头」是 C 世界最常见的一行循环，`strlen` 自己内部就是这么实现的（这也是它 O(n) 的原因）。

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

    printf("%d\n", strcmp("apple", "banana")); // 负数（字典序 apple 在前）
    return 0;
}
```

**分支场景：命令行参数 argc/argv**——把概念讲解里的指针数组跑一遍：

```c
#include <stdio.h>

int main(int argc, char *argv[]) {
    printf("参数个数: %d\n", argc);
    printf("程序名:   %s\n", argv[0]);
    for (int i = 1; i < argc; i++) {
        printf("第 %d 个参数: %s（长度 %zu）\n", i, argv[i], strlen(argv[i]));
    }
    // argv[argc] == NULL 是 C 标准保证的——顺便验证：
    printf("argv[argc] 是 NULL 吗？%s\n", argv[argc] == NULL ? "是" : "否");
    return 0;
}
```

编译运行（源码存为 `args.c`）：

```bash
gcc args.c -o args
./args hello world
```

预期输出：

```text
参数个数: 3
程序名:   ./args
第 1 个参数: hello（长度 5）
第 2 个参数: world（长度 5）
argv[argc] 是 NULL 吗？是
```

输出说明了什么：argv 是「指针数组」——每个参数不在数组里，数组里存的只是地址；遍历它用的是下标访问指针数组，与遍历 int 数组语法相同，因为编译器知道步长是「一个指针的大小」。这个程序之后还能扩展：把参数当数字解析、当文件名传给文件 IO（结构体课的综合项目就是这种形态）。

## 常见坑

1. **坑 1：越界不报错**。`scores[10] = 1;` 编译运行都正常——它只是把值写到了数组后面的内存里，可能污染别的变量，也可能什么都没炸。**未定义行为**：不出错才是最可怕的。边界永远用 `i < len`，别手滑写成 `<=`。
2. **坑 2：`strlen` 与 `sizeof` 混用**。`strlen("abc")` 是 3（有效字符数，运行时数）；`sizeof` 是数组的总格子数（编译期确定），对 `"abc"` 数组是 4（含 `\0`），对 `char*` 指针则是 8。
3. **坑 3：`char *s = "hi"; s[0] = 'H';`**。字符串字面量存在只读区，改它直接崩溃。要能改就写成数组：`char s[] = "hi";`。
4. **坑 4：往没分配够的数组里 strcpy**。`char buf[4]; strcpy(buf, "hello");` 写穿了格子边界。用 `snprintf(buf, sizeof(buf), ...)`，它保证不写超。
5. **坑 5：忘了 `\0` 的位置**。自己造字符串时（逐字符赋值）忘了补 `'\0'`，strlen 会一路数到内存里随机的 0——**手工构造字符串，最后一位永远是 `'\0'`**。
6. **坑 6：数组传参后 sizeof 失灵**。函数内 `sizeof(arr)` 得到的是指针大小（8），不是数组总大小——长度必须作为参数传入（呼应主线 sum 函数）。

## 小练习

1. 写一个函数 `int count_char(const char *s, char target)`，手写循环统计字符出现次数（不许用 strlen），并在 main 里用 `"banana"` 统计 `'a'`（应为 3）。
2. 把 `snprintf` 那行改成 `strcpy` 并把 `greet` 数组缩到 8，运行观察结果；再换回 `snprintf`，确认它截断而不崩溃。
3. 思考题：为什么 `sum(int *arr, int len)` 必须传 len？如果数组自己记着长度，这个设计会变成什么样？（提示：想想 Python list）
4. **综合任务**：写一个 mini echo——遍历 argv 把所有参数用空格拼接后打印（提示：先累加各参数的 `my_strlen` 算出总长再开数组，比盲猜 256 安全）；无参数时打印用法提示 `usage: ./echo <words...>` 并返回 1；最后用 `printf("%d", strcmp("z", "a"))` 打破「strcmp 返回值只有 ±1」的假设，说明为什么判相等必须写 `== 0`。
