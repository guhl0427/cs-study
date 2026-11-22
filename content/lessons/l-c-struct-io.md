---
id: l-c-struct-io
slug: c-struct-io
title: 结构体与文件读写
difficulty: 2
estMinutes: 40
tags: [C]
summary: 结构体把散装数据捆成一个类型，文件 IO 让程序「记住」东西——C 的持久化就这么朴素。
updated: 2026-11-22
resources:
  - id: r-c-stdio-ref
    title: cppreference C 文件 IO 参考
    url: https://en.cppreference.com/w/c/io
    type: doc
    difficulty: 2
    note: fopen/fprintf/fscanf 等全套标准 IO 函数的权威参考。
  - id: r-c-learn-files
    title: Learn C：File Input/Output
    url: https://www.learn-c.org/en/File_Input/Output
    type: doc
    difficulty: 2
    note: 边跑边学的文件 IO 小节。
---

> 一句话定义：结构体（struct）把几个相关变量捆成**一个自定义类型**，文件 IO 让数据在程序退出后**活下来**——两者组合就能写出有真实数据的小工具。

## 概念讲解

没有结构体时，一个学生的数据要用三个散装变量（`name`、`age`、`score`），传参要传三个、排序要挪三个。结构体把它们**捆成一个整体**：

```c
typedef struct {
    char name[16];
    int  age;
    double score;
} Student;          // 从此 Student 是一个类型，和 int 地位相同
```

`typedef struct {...} Student;` 的意思是「给这个结构体起名叫 Student」，之后声明变量不再写 `struct` 关键字。

访问成员的两个符号：

```text
Student s;      →  s.age      （点号：变量.成员）
Student *p = &s;→  p->age     （箭头：指针->成员，等价于 (*p).age）
```

文件 IO 的四步固定流程——**打开、读写、关闭**，外加一步**检查打开是否成功**：

```text
FILE *fp = fopen("data.txt", "r");   // 1. 打开（r 读 / w 写（覆盖）/ a 追加）
if (fp == NULL) { ... }              // 2. 检查！文件不存在时 fopen 返回 NULL
fprintf(fp, ...);  fscanf(fp, ...);  // 3. 读写（用法和 printf/scanf 几乎一样，多个 fp 参数）
fclose(fp);                          // 4. 关闭——忘了它，缓冲区数据可能没落盘
```

## 代码示例

结构体数组 + 写文件 + 读文件，一个能落地的迷你成绩单：

```c
#include <stdio.h>

typedef struct {
    char name[16];
    int score;
} Student;

int main(void) {
    Student class[] = { {"Alice", 92}, {"Bob", 78}, {"Carol", 85} };
    int n = sizeof(class) / sizeof(class[0]);   // 3：总大小除以单格大小

    // 写文件
    FILE *fp = fopen("scores.txt", "w");
    if (fp == NULL) { printf("打不开文件\n"); return 1; }
    for (int i = 0; i < n; i++) {
        fprintf(fp, "%s %d\n", class[i].name, class[i].score);
    }
    fclose(fp);

    // 读回来
    Student s;
    fp = fopen("scores.txt", "r");
    if (fp == NULL) { printf("打不开文件\n"); return 1; }
    while (fscanf(fp, "%s %d", s.name, &s.score) == 2) {   // 读到 2 个字段才算成功
        printf("%-8s %d\n", s.name, s.score);
    }
    fclose(fp);
    return 0;
}
```

运行结果（第二次运行读到的就是上次写入的内容）：

```text
Alice    92
Bob      78
Carol    85
```

`fscanf` 的返回值是「成功读到的字段数」——用它当循环条件，读到文件尾自动停，这比在循环里写死次数靠谱得多。

## 进阶一课：结构体指针与 -> 的真实用法

结构体大时按值传参会整块复制（浪费），真实工程里传**指针**：

```c
void promote(Student *s) {          // 传指针：能改调用者的结构体（指针课的 swap 同理）
    if (s->score >= 90) s->grade = 'A';
}

Student alice = {"Alice", 92, 'B'};
promote(&alice);                    // 传地址
printf("%c\n", alice.grade);        // A —— 函数内部真的改到了本体
```

`s->grade` 是 `(*s).grade` 的语法糖：「沿指针找到结构体，再取成员」。两个符号的记忆口诀：**变量用点、指针用箭头**——见到箭头，左边一定是指针。

**结构体数组 + 指针遍历**的组合是 C 里组织数据的标准形态：

```c
Student class[] = { {"Alice", 92, 'B'}, {"Bob", 78, 'C'} };
Student *p = class;
printf("%s\n", p->name);            // Alice（p 指向第 0 个）
p++;                                // 前进一个「结构体的大小」——指针算术按类型步长走
printf("%s\n", p->name);            // Bob
```

最后一步呼应指针课：`p++` 移动的是 `sizeof(Student)` 字节——编译器根据类型知道步长。这也是 DSA 课「数组与链表」里「连续存储 + 指针遍历」的 C 语言地基。

## 常见坑

1. **坑 1：忘检查 `fopen` 返回值**。文件不存在时返回 `NULL`，接着 `fprintf(NULL, ...)` 直接段错误。每次 fopen 后第一件事就是判 NULL。
2. **坑 2：忘 `fclose`**。fprintf 先写进缓冲区，fclose 才保证刷进磁盘——数据「丢了」多半是这个。顺手好事：文件还可能被其他程序锁定。
3. **坑 3：`"w"` 每次清空文件**。想保留旧内容追加，用 `"a"`。调试时发现「文件里只有最后一次的数据」，基本就是模式选错了。
4. **坑 4：结构体里的字符数组当普通变量赋值**。`s.name = "Alice";` 编译报错——数组不能用 `=` 整体赋值，要用 `snprintf(s.name, sizeof(s.name), "Alice")`。
5. **坑 5：`.` 与 `->` 用混**。`(*p).name` 合法但难读；`p.name` 直接编译错误——看左边是指针还是变量，指针用箭头。
6. **坑 6：fscanf 的格式与文件格式不一致**。文件里是「名字 分数」空格分隔，fscanf 却写 `"%s,%d"`——永远解析失败还返回 0，循环一次都不跑。读写双方的格式必须逐字符对齐。

## 小练习

1. 扩展示例：程序启动时把 `scores.txt` 读进结构体数组，追加一个从用户输入（`scanf`）得到的新学生，再把整个数组写回文件。
2. 写一个函数 `double average(Student *arr, int n)` 返回平均分，注意结构体数组传参退化为指针；再用「指针遍历」版写一次。
3. 思考题：把 `typedef struct {...} Student` 和 Python 的 `class Student: __init__` 对比——C 的 struct 没有「方法」，那行为（如打印学生信息）在 C 里该放哪？
