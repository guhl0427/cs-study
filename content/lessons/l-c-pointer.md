---
id: l-c-pointer
slug: c-pointer
title: 指针与内存
difficulty: 2
estMinutes: 45
tags: [C, 内存]
summary: 指针就是「存地址的变量」——&取地址、*解引用，看懂这张内存地图，C 就通关了一半。
updated: 2026-11-22
resources:
  - id: r-c-pointer-vis
    title: Pointer Fun with Binky（斯坦福Pointer动画）
    url: https://www.youtube.com/watch?v=8gURMCnCRAc
    type: video
    difficulty: 1
    note: 8 分钟动画把指针、malloc 讲到一清二楚，经典中的经典。
  - id: r-c-cs50
    title: CS50 第 4 讲：Memory
    url: https://cs50.harvard.edu/x/2024/weeks/4/
    type: video
    difficulty: 2
    note: 哈佛公开课的内存专题，配合 NV! 图解指针。
  - id: r-c-tutorial-pt
    title: Learn C：Pointers 章节
    url: https://www.learn-c.org/en/Pointers
    type: doc
    difficulty: 2
    note: 配合本节边读边练。
---

> 一句话定义：指针是**存内存地址的变量**——`&` 取地址，`*` 顺着地址找到值；理解指针，就理解了程序里的数据到底「住」在哪。

## 概念讲解

把内存想成一条超长的街道，每间房子（字节）都有唯一门牌号（**地址**）：

```text
地址      房间里的值
1000  ┌──────────────┐
      │      18      │ ← int age 住在 1000 号
1004  ├──────────────┤
      │     1000     │ ← int *p 住在 1004 号，存的值是「1000 号的地址」
      └──────────────┘
```

两个运算符，一张图就够：

- `&age` —— 问「age 住在哪？」得到地址 `1000`（**取地址**）。
- `*p` —— 拿着纸条上的地址 `1000` 找到房间，取出里面的 `18`（**解引用**）。

声明一个指针的写法是 `int *p`——星号属于类型：「p 是一个指向 int 的指针」。所以下面两行是**等价**的，读的时候别被绕晕：

```c
int *p;      // 声明：p 是指向 int 的指针
*p = 18;     // 使用：往 p 指向的那个房间写入 18
```

指针最大的用途：**函数没法改调用者的变量，除非给它地址**。C 的函数参数是「复印一份」传进去的（值传递）——复印稿上怎么涂改，原件都毫发无损。想改原件，只能把「原件的地址」递过去。

## 代码示例

经典 swap：错误版与正确版对照，跑一遍就懂了：

```c
#include <stdio.h>

void swap_wrong(int a, int b) {   // 拿到的是复印件
    int tmp = a; a = b; b = tmp;  // 改复印件，原件不变
}

void swap(int *a, int *b) {       // 拿到的是地址
    int tmp = *a;                 // 顺着地址取出值
    *a = *b;
    *b = tmp;
}

int main(void) {
    int x = 1, y = 2;
    swap_wrong(x, y);
    printf("wrong: x=%d y=%d\n", x, y);   // wrong: x=1 y=2（没换成！）
    swap(&x, &y);                 // 把 x、y 的地址递进去
    printf("ok:    x=%d y=%d\n", x, y);   // ok:    x=2 y=1
    return 0;
}
```

再验证一次内存图——打印地址建立直觉：

```c
int age = 18;
int *p = &age;                    // p 存下 age 的地址
printf("age=%d &age=%p p=%p *p=%d\n", age, &age, p, *p);
// age=18 &age=0x7ffd... p=0x7ffd...（相同） *p=18
*p = 20;                          // 顺着地址写入
printf("age=%d\n", age);          // age=20 —— 通过指针改动了 age 本体
```

## 常见坑

1. **坑 1：解引用未初始化的指针**。`int *p; *p = 5;`——纸条上是一串垃圾地址，写入它可能让程序当场崩溃。声明时就给它地址：`int x; int *p = &x;`。
2. **坑 2：混淆 `*` 的两副面孔**。声明处 `int *p` 的 `*` 表示「p 是指针」；表达式处 `*p` 的 `*` 是解引用动作。同一符号，两种含义。
3. **坑 3：空指针不检查**。`scanf("%d", p)` 若 p 是 NULL，段错误（Segmentation fault）直接给你看。用指针前先确认它「指向一个真实存在的房间」。
4. **坑 4：swap 传成了值**。`swap(x, y)` 编译能过（类型不匹配会有警告），运行不报错但就是没效果——这是初学者最迷惑的「静默失败」。

## 小练习

1. 写一个 `void max_min(int *a, int *b)`：比较两个数，把较大者放到 a 指向的位置、较小者放到 b 指向的位置，并写 main 验证。
2. 打印 `&x`、`&x + 1`，观察两个地址差多少——这个差值和 `sizeof(int)` 有什么关系？
3. 思考题：Python 的变量赋值 `a = b` 从不复制数据，两个名字指向同一个对象——这和 C 的指针是什么关系？
