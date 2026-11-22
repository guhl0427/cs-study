---
id: l-c-struct-io
slug: c-struct-io
title: 结构体与文件读写
difficulty: 2
estMinutes: 75
tags: [C]
summary: 结构体把散装数据捆成一个类型、嵌套与内存布局（padding）有讲究，文件 IO 让程序「记住」东西——综合项目：能持久化的交互式通讯录。
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

### 结构体嵌套：类型里装类型

结构体成员可以是另一个结构体——「一个人有一个地址、地址有城市和街道」这种归属关系，用嵌套表达得干干净净：

```c
typedef struct { char city[20]; } Address;   // 地址：只有城市字段，够演示

typedef struct {
    char    name[16];
    Address addr;       // 嵌套：成员本身也是个结构体
    int     age;
} Person;
```

访问嵌套成员是「逐层点下去」：`p.addr.city`——先取人的 addr，再取地址的 city。嵌套让类型自然分层，DSA 课的树节点（节点里装指针数组）、OS 课的进程表项（进程里装状态与寄存器组）都是这个形态。

### 内存布局：sizeof 为什么比字段加总大

把成员逐个 sizeof 加起来，常常不等于整个结构体的 sizeof——因为编译器会在成员之间塞「垫子」（**padding，对齐填充**）：

```text
struct { char a; char b; int id; }   →  a b ●● idididid       sizeof = 8  （小成员挤在一起，int 对齐到 4）
struct { char a; int id; char b; }   →  a ●●● idididid b ●●●  sizeof = 12 （a 后垫 3 格，尾部还要垫满）
```

同样的三个字段，**换个顺序就多出 4 字节**。为什么编译器要这么干？CPU 访问内存是按对齐块读取的——int 必须落在 4 的倍数地址上，否则一次读变两次读甚至报错。这解释了三件实务：写结构体数组时「小成员放一起」能省内存；比较两个结构体不能直接 `==`（padding 里的垃圾值也算数）；把结构体按字节序列化时不能假设布局紧凑。嵌套结构体的对齐要求继承它最大成员的要求，规则相同，逐层展开。

### 文本文件 vs 二进制文件一句话

`fprintf`/`fscanf` 读写的是**文本文件**（数字经格式化转换成人眼可读的字符），`fwrite`/`fread` 读写的是**二进制文件**（内存里的字节原样落盘，紧凑高效但人看不懂）。小数据用文本就够（可读、可 diff、可用编辑器修）；结构体数组整存整取时二进制一次 `fwrite(class, sizeof(Student), n, fp)` 更快——代价是文件不可读，且跨机器有字节序与对齐问题。本课主线用文本格式，二进制留到需要性能时再上。

### 结构体指针与 -> 的真实用法

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

### 文件 IO 的四步固定流程

**打开、读写、关闭**，外加一步**检查打开是否成功**：

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

### 综合小项目：能持久化的交互式通讯录

把本课全部概念拼成一个完整程序：**结构体数组（内存）+ load/save（文件持久化）+ find（查找）+ 命令循环（交互）**——这就是「结构体数组 + 文件 + 查找」的最小真实形态：

```c
/* contacts.c —— 综合小项目：通讯录（结构体数组+文件持久化+查找）
 * 编译运行：gcc contacts.c -o contacts && ./contacts */
#include <stdio.h>
#include <string.h>

#define MAX 100
#define FNAME "contacts.txt"

typedef struct {
    char name[16];
    char phone[16];
    int  age;
} Contact;

int load(Contact list[], int max) {            // 启动：把文件读进内存
    int n = 0;
    FILE *fp = fopen(FNAME, "r");
    if (fp == NULL) return 0;                  // 第一次运行：文件不存在 → 空表
    while (n < max &&                          // %15s 限长：呼应数组课的安全对照表
           fscanf(fp, "%15s %15s %d", list[n].name, list[n].phone, &list[n].age) == 3) {
        n++;
    }
    fclose(fp);
    return n;
}

void save(Contact list[], int n) {             // 退出：全量写回文件
    FILE *fp = fopen(FNAME, "w");
    if (fp == NULL) { printf("无法写文件\n"); return; }
    for (int i = 0; i < n; i++)
        fprintf(fp, "%s %s %d\n", list[i].name, list[i].phone, list[i].age);
    fclose(fp);
}

int find(Contact list[], int n, const char *name) {   // 按名字线性查找
    for (int i = 0; i < n; i++)
        if (strcmp(list[i].name, name) == 0) return i;
    return -1;                                 // 没找到的约定：返回 -1
}

int main(void) {
    Contact list[MAX]; int n = load(list, MAX);
    printf("通讯录已加载 %d 位联系人\n", n);

    char cmd[8];
    while (1) {
        printf("\n命令(add/find/list/quit): ");
        if (scanf("%7s", cmd) != 1) break;

        if (strcmp(cmd, "add") == 0) {
            if (n >= MAX) { printf("通讯录满了\n"); continue; }
            printf("姓名 电话 年龄: ");
            scanf("%15s %15s %d", list[n].name, list[n].phone, &list[n].age);
            n++; printf("已添加，共 %d 位\n", n);   // &list[n].age：嵌套成员也要取地址
        } else if (strcmp(cmd, "find") == 0) {
            char who[16];
            printf("要找谁？");
            scanf("%15s", who);
            int idx = find(list, n, who);
            if (idx >= 0)
                printf("%s：%s（%d 岁）\n", list[idx].name, list[idx].phone, list[idx].age);
            else
                printf("没有找到 %s\n", who);
        } else if (strcmp(cmd, "list") == 0) {
            for (int i = 0; i < n; i++)
                printf("%-15s %-15s %d\n", list[i].name, list[i].phone, list[i].age);
        } else if (strcmp(cmd, "quit") == 0) {
            save(list, n);                     // 内存 → 文件，程序退出后数据活着
            printf("已保存并退出\n");
            break;
        } else printf("未知命令\n");
    }
    return 0;
}
```

一次完整使用（两次运行之间，数据在文件里活着）：

```text
./contacts
通讯录已加载 0 位联系人
命令(add/find/list/quit): add
姓名 电话 年龄: Alice 13800000000 20
已添加，共 1 位
命令(add/find/list/quit): quit
已保存并退出
./contacts                          ← 第二次运行
通讯录已加载 1 位联系人              ← 从 contacts.txt 读回来了
命令(add/find/list/quit): find
要找谁？Alice
Alice：13800000000（20 岁）
```

输出说明了什么：`load` 把文件搬进结构体数组（文件→内存），`save` 把数组整体写回（内存→文件），`find` 是线性查找返回下标或 -1——**内存中的结构体数组是「工作副本」，文件才是「持久正本」**。这个模式小到通讯录、大到数据库引擎（数据页在内存里改、定期落盘）都是同一形状，呼应 Redis 课的「缓存与正本」。

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
4. **综合任务**：给通讯录加「删除」功能——按名字查找后把数组后续元素整体前移一位、n 减一，退出时全量写回；并思考：为什么删除用「重写整个文件」而不是「打开文件直接改中间一段」？（提示：文本格式下字段长度可变，中间替换会错位。）
