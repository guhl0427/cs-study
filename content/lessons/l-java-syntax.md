---
id: l-java-syntax
slug: java-syntax
title: Java 语法与面向对象入门
difficulty: 2
estMinutes: 45
tags: [Java, 面向对象]
summary: 强类型 + 一切皆对象 + 冗长但清晰——从 Python/C 视角速览 Java：类与对象、封装继承多态、异常与集合框架。
updated: 2026-11-22
resources:
  - id: r-java-tutorial
    title: Oracle 官方 Java 教程
    url: https://dev.java/learn/
    type: doc
    difficulty: 1
    note: 官方入门路径，本节对应「Getting Started」与「OOP」章节。
  - id: r-java-idea
    title: IntelliJ IDEA Community
    url: https://www.jetbrains.com/idea/download/
    type: tool
    difficulty: 1
    note: Java 生态事实上的标准 IDE，社区版免费够用。
---

> 一句话定义：Java 是**强类型、面向对象**的编译型语言——类型写死在代码里、逻辑必须装进类，换来的是超大项目的可维护性和二十年内卷不动的就业生态。

## 概念讲解

从 Python 视角看 Java 的「仪式感」，第一眼三件事：

1. **一切都在类里**：`main` 是类的静态方法，连常量都要挂个类——「类」是 Java 组织代码的基本单元；
2. **类型 everywhere**：`int age = 18;` 和 C 一样声明式，`String name = "小明"` 的 String 首字母大写（它是对象不是原始类型）；
3. **编译后跑在 JVM 上**：源码 → javac 编译成 .class 字节码 → 任意装了 JVM 的机器都能跑——「一次编写，到处运行」。

面向对象三大支柱，用「学生管理系统」一句话各自说清：

```text
封装    private 字段 + public getter/setter —— 数据藏起来，接口露出去
继承    class Student extends Person        —— 复用父类的字段与方法
多态    Person p = new Student(); p.introduce() —— 同一调用，运行时表现不同
```

Java 的两个高频词汇提前认识：**接口**（`interface`，只规定「能做什么」不给实现，如 `Comparable`）和**泛型**（`List<String>`，呼应 TypeScript 泛型课——类型参数化）。

集合框架就记两兄弟：`ArrayList`（动态数组，随机访问快）和 `HashMap`（键值对，O(1) 查找）——正好对应 Python 的 list 和 dict。

## 代码示例

一个小类 + 主函数，涵盖封装/构造/集合/循环（`Demo.java`，`javac Demo.java && java Demo` 运行）：

```java
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class Student {
    private String name;                       // 封装：字段私有
    private int score;

    public Student(String name, int score) {   // 构造方法
        this.name = name;
        this.score = score;
    }

    public String getName() { return name; }   // 公开访问接口
    public int getScore() { return score; }
}

public class Demo {
    public static void main(String[] args) {
        List<Student> students = new ArrayList<>();
        students.add(new Student("小明", 92));
        students.add(new Student("小红", 75));

        Map<String, Integer> upper = new HashMap<>();   // 名字 → 分数
        for (Student s : students) {                    // for-each 遍历
            upper.put(s.getName(), s.getScore());
        }
        System.out.println(upper);                      // {小明=92, 小红=75}
        System.out.println("平均分: " + upper.values().stream()
                .mapToInt(Integer::intValue).average().orElse(0));  // 平均分: 83.5
    }
}
```

异常处理和 Python 同形（try/catch 对应 try/except），检查型异常一提即可。

## 常见坑

1. **坑 1：文件名必须与 public 类名一致**。`Demo.java` 里只能有一个 public Demo 类——编译报错「class X is public, should be declared in a file named X.java」先看这个。
2. **坑 2：`==` 比对象比的是引用**。`"a" == "a"` 可能因为字符串常量池恰好相等而骗过你；对象比较一律 `equals()`（`str1.equals(str2)`）。
3. **坑 3：整数除法截断**。`9 / 2` 得 `4`——和 C 一样，要浮点先转 `9 / 2.0`。
4. **坑 4：NullPointerException**。Java 最著名异常：对 null 调方法必炸。新代码用 `Optional<T>` 表达「可能没有」，呼应「Python 入门」的 get 兜底思想。

## 小练习

1. 给 Student 加一个 `isPassed()` 方法（score ≥ 60），用多态写一个 `GraduateStudent` 重写它（及格线 55）。
2. 把示例的 stream 求平均改成手写 for 循环版本，对比哪种更可读。
3. 思考题：对照 Python 的鸭子类型——Java 必须 `implements Comparable` 才能排序，这个「强制声明」换来的是什么？
