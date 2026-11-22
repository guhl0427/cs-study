---
id: l-java-syntax
slug: java-syntax
title: Java 语法与面向对象入门
difficulty: 2
estMinutes: 85
tags: [Java, 面向对象, 集合, 异常]
summary: 从 Python 视角拆掉 Java 的「仪式感」门槛：类与类型系统、JVM 字节码模型；逐个讲透封装/继承/多态三支柱，接口与泛型、ArrayList/HashMap 两兄弟、== 与 equals 的常量池陷阱；主线写完一个可编译运行的学生成绩管理小程序。
updated: 2026-11-22
resources:
  - id: r-java-learn
    title: dev.java · 官方 Java 学习路径
    url: https://dev.java/learn/
    type: doc
    difficulty: 1
    note: Oracle 官方教程总入口，本节对应 Getting Started 与 OOP 部分。
  - id: r-java-idea
    title: IntelliJ IDEA Community
    url: https://www.jetbrains.com/idea/download/
    type: tool
    difficulty: 1
    note: Java 生态事实标准 IDE，社区版免费够用，报错提示是最好的老师。
---

> 一句话定义：Java 是**强类型、面向对象**的编译型语言——类型写死在代码里、逻辑必须装进类、编译成字节码跑在 JVM 上；仪式感多一点，换来的是超大项目的可维护性和二十年不凉的就业生态。

## 概念讲解

已有任一门语言基础（尤其 Python）的你，会觉得 Java「规矩真多」——但每条规矩都在为「百人协作、十年维护」服务。先拆三大仪式感，再逐个讲透面向对象三支柱。

### 仪式感一：一切都在类里

Python 允许散装函数直接跑；Java **函数没有户口，必须住在类里**，连 main 入口都长在类身上。类是唯一代码组织单元：文件名=public 类名、目录=包名，几百人的项目里任何代码都能按「包名.类名」唯一定位——像标准化写字楼，每家公司必须挂门牌。

```java
// 连程序入口都是类的静态方法
public class MathUtil {
    static int add(int a, int b) { return a + b; }   // static：属于类本身，不 new 就能调
    public static void main(String[] args) { System.out.println(add(1, 2)); }
}
```
### 仪式感二：类型 everywhere

Python 变量装什么都行；Java 变量「标了类型」，装错直接编译失败。这不是麻烦，是**编译器替你查错**：`age = "十八"` 这种笔误 Python 运行到才炸，Java 编译期就拦下（`var` 可推断局部变量，但参数与返回值仍要写明——类型是 API 契约）。

| 值 | Python 写法 | Java 写法 | 备注 |
| ---- | ---- | ---- | ---- |
| 整数年龄 | age = 18 | int age = 18; | 基本类型：int/long/double/boolean |
| 姓名 | name = "小明" | String name = "小明"; | String 是对象类型，首字母大写 |
| 可能没有 | name = None | String name = null; | null ≈ Java 版 None |

### 仪式感三：JVM——一次编写，到处运行

Python 由解释器边读边执行；Java 先编译成**字节码**（.class 文件）再由 JVM 执行——字节码不面向任何操作系统，平台差异被 JVM 吃掉：

```text
Student.java ──javac 编译──→ Student.class（字节码）──JVM──→ Windows/macOS/Linux 都能跑
```

同一份 .class，开发机（Windows）与公司服务器（Linux）结果一致——「一次编写，到处运行」是 Java 常青企业后端的立身之本；Kotlin/Scala 也编译成同一字节码，无缝互调。

### 三支柱之一：封装——数据藏起来，接口露出去

字段不设防，任何代码都能写 `student.score = -50`，校验无处安放；private + getter/setter 之后，**所有赋值都必须过 setScore 这道门**——校验写一处、全项目生效。Python 靠下划线约定和 @property 达成同样效果，Java 把它升级为语言强制。类比：不设防的广场 vs 凭门禁卡进机房（变更全走登记处）。

```java
class Student {
    private int score;                         // private：类外禁止直接访问
    public Student(int score) { this.score = score; }   // 构造方法：创建即初始化
    public int getScore() { return score; }    // 读接口
    public void setScore(int score) {          // 写的唯一通道：内嵌校验
        if (score < 0 || score > 100) throw new IllegalArgumentException("分数必须在 0-100");
        this.score = score;
    }
}
```
### 三支柱之二：继承——extends 复用父类

Python 的 `class GradStudent(Person)` ↔ Java 的 `GradStudent extends Person`，`super().__init__()` ↔ `super(name)`——子类不写一行就能用父类的字段与方法，还能追加自己的。注意 Java 是**单继承**（只能 extends 一个父类），多种能力靠接口组合（下一节）。

```java
class Person {
    protected String name;                    // protected：子类可见，外部不可见
    Person(String name) { this.name = name; }
    public void introduce() { System.out.println("我是 " + name); }
}
class GradStudent extends Person {            // extends：白拿 Person 的字段与方法
    GradStudent(String name) { super(name); } // super：先初始化父类那一半
}
```
### 三支柱之三：多态——同一调用，不同表现

规则一句话：**编译看左边（引用类型），运行看右边（实际对象）**。编译器只检查 Person 有没有这个方法；真正执行哪一版，JVM 按对象实际类型分派。Python 靠鸭子类型天然做到，Java 要求先进同一个父类/接口才有资格进同一个循环——约束换来编译期可查。

```java
// 在 GradStudent 里重写父类方法（@Override：写错方法签名编译器会报警）
@Override
public void introduce() { System.out.println("学生 " + name + " 向你问好"); }
Person p = new GradStudent("小刚", "AI 实验室");   // 父类引用，指向子类对象
p.introduce();    // 输出：学生 小刚 向你问好 —— 不是父类那句「我是 小刚」
for (Person one : List.of(new Person("老王"), new GradStudent("小刚", "AI"))) {
    one.introduce();   // 同一行代码，两类对象各显神通；明年新增 Teacher，循环不用改
}
```
### 接口与泛型：合同与类型参数

接口（interface）只规定「能做什么」不给实现；实现类签合同（implements）必须兑现全部条款，兑现后 `Collections.sort(students)` 就知道怎么排 Student。对照 Python 鸭子类型：「有这个方法就能用」vs「先声明实现接口才能用」，强制声明的回报是 IDE 补全、编译期查错、清晰的架构边界——调用方只依赖接口不绑死具体类（Spring 课反复变现）。泛型把类型当参数传：`List<String>` 读作「只装 String 的列表」（呼应 TS 泛型课），把类型错误提前到编译期。

```java
interface Comparable<T> { int compareTo(T other); }   // 简化示意：JDK 真实存在
class Student implements Comparable<Student> {
    private int score;
    public int compareTo(Student other) {             // 兑现合同：按分数比
        return Integer.compare(this.score, other.score);
    }
}
```
### 集合两兄弟：ArrayList 与 HashMap

入门先记两兄弟；尖括号是泛型（`new ArrayList<>()` 右边菱形让编译器推断）；for-each 就是 Python 的 for-in；Map 取不到返回 null 而不是抛 KeyError——判空责任在你。

| Java | Python 亲戚 | 定位与复杂度 |
| ---- | ---- | ---- |
| ArrayList<E> | list | 动态数组：add/get(i) O(1)，中间插删 O(n) |
| HashMap<K,V> | dict | 键值对：put/get 平均 O(1) |
| HashSet<E> | set | 去重集合：contains O(1) |

### == 与 equals：常量池设下的陷阱

`==` 对基本类型比值，对对象**比引用**（是不是同一个实例）；字符串字面量会被 JVM 放进**字符串常量池**，`"hi" == "hi"` 恰好 true——但 new 出来的对象必是 false。结论一句话：**对象比较一律 equals()，== 只留给基本类型**。常量池的「恰好相等」会把 bug 藏到联调才炸，随堂练习还会遇到。

```java
String a = "hi", b = "hi", c = new String("hi");
a == b        // true  —— 常量池里同一个对象（恰好相等，会骗过你）
a == c        // false —— 引用不同
a.equals(c)   // true  —— equals 比内容
```
### 异常：try/catch 与检查型异常

结构与 Python 的 try/except 同形，finally 同 Python。Java 独有**检查型异常**（checked exception）：文件不存在、网络断开这类「预期内事故」，编译器强制你 catch 或在签名声明 throws——把「记得 except」从自觉升级为法律；NPE 这类运行时异常不受检查，也因此成了 Java 最著名的崩溃来源。

```java
try {
    int n = Integer.parseInt("abc");   // 抛 NumberFormatException
} catch (NumberFormatException e) {
    System.out.println("非法数字: " + e.getMessage());
}
```

## 代码示例

主线任务：写一个**学生成绩管理小程序**——Student（封装）+ GraduateStudent（继承+多态）+ ArrayList/HashMap（集合）+ Stream 流式统计 + try/catch（异常），覆盖本课全部概念，从零敲到跑通约 20 分钟。

### 第 0 步：准备环境

安装 JDK 17 及以上（adoptium.net 或 dev.java 下载页），终端确认：

```bash
java -version
# 预期输出类似：openjdk version "17.0.x" —— ≥ 17 即可
```

### 第 1 步：完整源码

存为 `StudentManager.java`（文件名必须与 public 类名一致；Student、GraduateStudent 是同文件的包私有类）：

```java
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 学生：演示封装 */
class Student {
    private final String name;                 // final：姓名不可变
    private int score;
    Student(String name, int score) { this.name = name; this.score = score; }
    public String getName() { return name; }
    public int getScore() { return score; }
    public void setScore(int score) {          // 写的唯一通道，内嵌校验
        if (score < 0 || score > 100) throw new IllegalArgumentException("分数必须在 0-100，收到 " + score);
        this.score = score;
    }
    public String rank() {                     // 等级规则：子类可重写换标准
        return score >= 90 ? "优秀" : score >= 60 ? "及格" : "不及格";
    }
    @Override
    public String toString() { return name + "(" + score + ")"; }   // 决定打印的样子
}

/** 研究生：演示继承 + 多态（及格线降到 55） */
class GraduateStudent extends Student {
    GraduateStudent(String name, int score) { super(name, score); }   // 复用父类构造
    @Override
    public String rank() {                     // 重写：同一调用不同表现
        return getScore() >= 55 ? "及格" : "不及格";
    }
}

/** 主程序：集合 + 流式统计 + 异常 */
public class StudentManager {

    public static void main(String[] args) {
        List<Student> students = new ArrayList<>();
        students.add(new Student("小明", 92));
        students.add(new Student("小红", 75));
        students.add(new GraduateStudent("小刚", 58));   // 父类列表装子类对象
        students.add(new Student("小蓝", 40));

        Map<String, Integer> scores = new HashMap<>();   // ① HashMap：名字 → 分数
        for (Student s : students) {                     // for-each 遍历
            scores.put(s.getName(), s.getScore());
        }
        System.out.println("成绩表: " + scores);
        System.out.println("小红的等级: " + scores.get("小红"));
        for (Student s : students) {                     // ② 多态：同一循环，不同表现
            System.out.println(s + " → " + s.rank());
        }
        // ③ Stream 流式统计：让数据流过一道道「工序」
        double avg = students.stream().mapToInt(Student::getScore).average().orElse(0);
        long passed = students.stream().filter(s -> s.getScore() >= 60).count();
        Student top = students.stream().max(Comparator.comparingInt(Student::getScore)).orElseThrow();
        System.out.println("平均分: " + avg + "，≥60 人数: " + passed);
        System.out.println("第一名: " + top);
        try {                                            // ④ 异常：非法修改被封装拦下
            students.get(0).setScore(-1);
        } catch (IllegalArgumentException e) {
            System.out.println("拦截到非法修改: " + e.getMessage());
        }
    }
}
```

### 第 2 步：编译并运行

```bash
javac StudentManager.java     # 编译：生成 StudentManager.class 等字节码
java StudentManager           # 运行：JVM 执行字节码
```

预期输出：

```text
成绩表: {小明=92, 小红=75, 小刚=58, 小蓝=40}
小红的等级: 及格
小明(92) → 优秀
小红(75) → 及格
小刚(58) → 及格
小蓝(40) → 不及格
平均分: 66.25，≥60 人数: 2
第一名: 小明(92)
拦截到非法修改: 分数必须在 0-100，收到 -1
```

### 第 3 步：对照 Python 读懂输出

- `scores` 打印成 `{小明=92, ...}`——HashMap 的 toString 形态，等价于 Python dict 的 `{'小明': 92}`；
- 「小刚(58) → 及格」：58 在 Student 的规则里不及格，但 GraduateStudent 重写了 rank()——**调用处代码完全一样，行为按对象实际类型切换**，多态第一次显形；
- 平均分 66.25：stream 把「列表 → 抽分数 → 求平均」串成流水线，对应 Python 的 `sum()/len()` 组合，`Student::getScore` 方法引用 ≈ Python 的 lambda 取字段；
- 最后一行：setScore 的校验住在 Student 类内部，main 里 try/catch 接住——封装让校验只有一处，异常让错误有明确出口；
- 第 0 步只装 JDK 就能跑通第 1 步到第 3 步：因为程序只用 JDK 自带类库，没有第三方依赖——这个局限正是下一篇 Maven 要解决的。

## 常见坑

1. **坑 1：文件名与 public 类名不一致**。现象：javac 报 `class StudentManager is public, should be declared in a file named StudentManager.java`。原因：Java 用文件名定位 public 类，包名=目录基于同一约定。排查：一个 .java 文件只允许一个 public 类且文件名与之相同；其余类作包私有类放同一文件。
2. **坑 2：用 == 比字符串/对象**。现象：`"hi" == new String("hi")` 得 false；从网络/数据库拿来的字符串与本地字面量 == 永远 false。原因：== 比引用，new 出来的对象必然不同；常量池让纯字面量「恰好相等」，把 bug 藏到联调才炸。排查：对象比较全部改 equals()，`Objects.equals(a, b)` 还能顺带防 null。
3. **坑 3：整数除法截断**。现象：平均分算出 66 而不是 66.25。原因：`sum / count` 两侧都是 int，Java 直接截断（与 C 一致）。排查：除号任一侧转浮点（`sum * 1.0 / count`），或从一开始就用 double 存分数。
4. **坑 4：NullPointerException（NPE）**。现象：`scores.get("不存在").toString()` 直接炸出红色堆栈。原因：对 null 调方法；HashMap.get 取不到返回 null，不像 Python 抛 KeyError。排查：取值后先判空或用 getOrDefault；新代码用 Optional<T> 表达「可能没有」。
5. **坑 5：包装类型 == 的缓存陷阱**。现象：`Integer a=127, b=127` 时 a==b 是 true，`Integer c=128, d=128` 时 c==d 却是 false。原因：JVM 缓存 -128~127 的 Integer，区间内 == 恰好命中同一对象，出界就是两个新对象。排查：包装类型（Integer/Long/Double）比较一律 equals。
6. **坑 6：static 方法里访问实例变量**。现象：在 main 里直接用 `name`，编译报错 non-static variable cannot be referenced。原因：static 属于类，实例字段属于对象，类这一层没有它。排查：new 出对象再访问，或把变量也声明成 static（慎用，破坏封装）。

## 小练习

1. 给 Student 加 `isPassed()`（内部调 rank() 判断不是「不及格」），在 main 里用多态循环打印每个人的通过状态——全程不修改 GraduateStudent。
2. 把 Stream 求平均改写成手写 for 循环版本，各跑一次对比输出是否一致，并用一句话评价哪种更可读、为什么。
3. 排序练习：让 students 按 score 从高到低打印（提示：`students.sort(Comparator.comparingInt(Student::getScore).reversed());`），再想一想 Comparable 与 Comparator 各适合什么场景。
4. **综合任务**：把小程序升级为「命令行成绩录入器」——用 `Scanner` 循环读入 `姓名 分数`（空格分隔），非法分数被 setScore 拦截后提示重输；输入 `exit` 后打印全部统计（平均分/及格数/第一名）。要求：Student 类一行不改就能完成——体会封装好的类有多好接。
