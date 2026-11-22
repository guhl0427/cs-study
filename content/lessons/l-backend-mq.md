---
id: l-backend-mq
slug: mq
title: 消息队列：异步、解耦与削峰
difficulty: 2
estMinutes: 80
tags: [MQ, RabbitMQ, 后端]
summary: 下单接口为什么要 1.6 秒？——MQ 的三大用途（异步/解耦/削峰）、生产者消费者模型、ack 与幂等、重试上限与死信队列，跟着把「下单发短信」改造成队列架构。
updated: 2026-11-22
resources:
  - id: r-rabbitmq-tutorial
    title: RabbitMQ 官方教程
    url: https://www.rabbitmq.com/tutorials
    type: doc
    difficulty: 2
    note: 六个渐进式教程，本课模型出自第一个。
  - id: r-mq-cloud
    title: CloudAMQP · RabbitMQ 入门
    url: https://www.cloudamqp.com/blog/part1-rabbitmq-for-beginners-what-is-rabbitmq.html
    type: doc
    difficulty: 2
    note: 新手友好的概念讲解。
  - id: r-mq-dlx
    title: RabbitMQ 官方文档 · Dead Letter Exchanges
    url: https://www.rabbitmq.com/docs/dlx
    type: doc
    difficulty: 3
    note: 死信队列的权威机制说明，本课第 5 步的依据。
---

> 一句话定义：消息队列是**服务之间的「邮政系统」**——生产者把消息投进队列就走人，消费者按自己的节奏取件处理；它用「延迟满足」换来异步、解耦与削峰三大能力。

## 概念讲解

**没有 MQ 的同步调用有多痛？** 拆一笔账：

```text
下单接口（同步串行）：
  写订单 100ms → 发短信 800ms → 发邮件 500ms → 加积分 200ms
  = 用户盯着转圈 1.6 秒；短信服务一挂，整个下单失败
```

三个痛点，正好对应 MQ 的三大经典用途：

1. **异步**：主流程只做「写订单」（100ms 拿到结果），通知类任务投递到队列慢慢做——用户 0.1 秒看到「下单成功」；
2. **解耦**：下单服务不认识短信服务，只广播一条「订单已创建」事件。明天加「送优惠券」？新增一个订阅者即可，下单代码一行不改；
3. **削峰**：秒杀瞬间 1 万 QPS 涌进来，队列挡在前面当「蓄水池」，数据库按自己的处理能力匀速消费。

**核心模型：生产者 → 队列 → 消费者**：

```text
下单服务(生产者) ──投递──► [ order-events 队列 ] ──消费──► 通知服务(消费者)
                              │                ──消费──► 积分服务(消费者)
                              │                    （多消费者可订阅同一队列）
```

**RabbitMQ 和 Kafka 是什么关系？** 一句话定位：**RabbitMQ 是邮局**——按队列收件、投件，路由灵活（交换机+路由键），消息确认精细，适合业务事件（下单、通知、任务分发）；**Kafka 是磁带日志**——消息按顺序追加到磁盘日志，消费者各自记「读到第几条」，可以回放历史消息，海量吞吐，适合埋点日志流与大数据管道。本课学的「队列 + 消费者 + ack」心智模型两者通用，名词不同而已；后面微服务课遇到 Kafka 就不会陌生。

**代价必须认清**：一致性从「实时」变「最终」——邮件晚几秒到没关系；消费者可能失败需要重试；重试必然带来重复投递。所以 MQ 不是免费的午餐，它把复杂度从「同步耦合」转移到「消息可靠性」。

**消息顺序性：一个隐形陷阱**。同一个队列配多个消费者时，消息被并行抢走，处理顺序不再有保证（消息 1 给了消费者 A 还在处理，消息 2 已被消费者 B 处理完）。要严格有序，只有两条路：一个队列一个消费者串行消费；或按业务键拆队列（订单 42 的消息只进 `order-42` 队列）。Kafka 的解法更系统：按**分区**保序——同一订单键路由到同一分区，分区内严格有序。设计前先问自己：**业务真需要全局顺序吗？** 多数场景只要「同一订单的消息有序」就够了。

**事务消息的直觉**：新问题来了——「数据库写成功了，消息却没发出去」怎么办？直觉方案是**本地消息表**：把「发消息」也变成一笔数据库操作，业务数据和「待发消息」在同一个本地事务里落库；后台任务定时扫表，把待发消息投给 MQ、成功后标记完成。这样要么都成功要么都不发生，不依赖分布式事务这种重型武器。记住直觉即可：**把跨系统的两步，合并成一个本地事务 + 一个补偿任务**。

**ack（确认）机制是可靠性的关键**：消费者「处理完才确认」，处理中崩溃的消息会被重新投递给其他消费者——这个机制反过来要求消费逻辑必须写**幂等**（同一个订单号只处理一次，重复收到就跳过）。

**死信队列（DLQ）：失败消息的安置点**。重试不该无限——一条永远失败的消息反复重投会堵住整个队列；也不该静默丢弃——丢一条订单消息就是丢业务。标准答案是死信队列：

```text
                正常路径
 producer ──► [ sms-retry 队列 ] ──► 消费成功 ──► ack，结束
                     │                   │
                     │                处理失败（带 retry 计数重投）
                     │                   │ retry < 3：回到队列再试
                     │                retry ≥ 3
                     │                   ▼
                     │        basic_reject(requeue=False)
                     │                   │
                     ▼                   ▼
                [ dlx 死信交换机 ] ──► [ dead-letter 队列 ] ──► 人工排查/补偿/告警
```

消息超过重试上限后被 reject 且不重回队列，由死信交换机（Dead Letter Exchange, DLX）转进死信队列，交给人工排查或补偿任务接管——**既不无限重试堵队列，也不静默丢数据**。

**什么时候不该用 MQ**：需要「立刻知道结果」的调用（支付校验、扣库存防超卖）不适合异步——判断标准只有一条：**调用方是否关心结果**。关心结果 → 同步；不关心（通知、日志、积分）→ 队列。

## 代码示例

主线：用 RabbitMQ 的最简模型（Python）跑通「投递 → 消费 → ack → 幂等」全流程：

**第 1 步：跑起来**（本地装 RabbitMQ 或用 docker：`docker run -d -p 5672:5672 rabbitmq:3`）：

```bash
pip install pika
```

**第 2 步：生产者——投递后立刻返回**：

```python
# producer.py
import pika, json

conn = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
ch = conn.channel()
ch.queue_declare(queue="order-events")          # 声明队列（幂等操作）

msg = {"event": "order.created", "orderId": 42, "user": "小明"}
ch.basic_publish(exchange="", routing_key="order-events",
                 body=json.dumps(msg),          # 消息体：JSON 字符串
                 properties=pika.BasicProperties(delivery_mode=2))  # 2 = 持久化到磁盘
print("已投递，立刻返回")                        # 主流程不等处理结果
```

**第 3 步：消费者——常驻进程，处理完才 ack**：

```python
# consumer.py
import pika, json, time

sent_log: set[int] = set()                       # 幂等去重表（生产中放 Redis/数据库）

def callback(ch, method, props, body):
    msg = json.loads(body)
    order_id = msg["orderId"]

    if order_id in sent_log:                     # 幂等：重复投递直接跳过
        print(f"订单 {order_id} 已处理过，跳过")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    time.sleep(1)                                # 模拟：发短信很慢（且可能失败）
    print(f"给 {msg['user']} 发短信：订单 {order_id} 已创建")
    sent_log.add(order_id)
    ch.basic_ack(delivery_tag=method.delivery_tag)   # 处理完才确认——可靠性的关键

conn = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
ch = conn.channel()
ch.queue_declare(queue="order-events")
ch.basic_consume(queue="order-events", on_message_callback=callback)
print("消费者就绪，等待消息（Ctrl+C 退出）")
ch.start_consuming()
```

**第 4 步：亲手验证「处理完才 ack」**：

```bash
python producer.py        # 窗口 1：投递一条消息
python consumer.py        # 窗口 2：看到「正在发短信」时 Ctrl+C 杀掉消费者
python consumer.py        # 再启动：同一条消息被重新投递——消息没有丢
```

这就是「至少一次投递」：ack 之前消费者死了，消息会回来。配合幂等，才能既不丢消息、又不重复处理。

**第 5 步：分支主线——给消费者加上「重试 3 次 → 死信队列」**（用独立队列 `sms-retry`，不与主线冲突）：

```python
# consumer_dlq.py
import pika, json

conn = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
ch = conn.channel()
MAX_RETRY = 3

# ① 死信设施：dlx 交换机 + dead-letter 队列，绑到死信路由键
ch.exchange_declare(exchange="dlx", exchange_type="direct", durable=True)
ch.queue_declare(queue="dead-letter", durable=True)
ch.queue_bind(queue="dead-letter", exchange="dlx", routing_key="sms-dead")

# ② 主队列挂上死信路由：被 reject 的消息自动转投 dlx 交换机
ch.queue_declare(queue="sms-retry", durable=True,
                 arguments={"x-dead-letter-exchange": "dlx",
                            "x-dead-letter-routing-key": "sms-dead"})

def process(msg):
    if msg["orderId"] % 2 == 1:            # 模拟：奇数订单必然失败
        raise RuntimeError("短信网关超时")

def callback(ch_, method, props, body):
    msg = json.loads(body)
    retries = (props.headers or {}).get("retry", 0)
    try:
        process(msg)
        ch_.basic_ack(method.delivery_tag)           # 成功：确认
        print(f"订单 {msg['orderId']} 短信发送成功")
    except Exception:
        if retries >= MAX_RETRY:
            # ③ 超上限：reject 且不重回队列 → 经 DLX 进死信队列
            ch_.basic_reject(method.delivery_tag, requeue=False)
            print(f"订单 {msg['orderId']} 重试 {retries} 次仍失败，已转死信")
        else:
            # ④ 未超限：带计数字段重投一次，再确认当前这条
            ch_.basic_publish(exchange="", routing_key="sms-retry", body=body,
                              properties=pika.BasicProperties(
                                  delivery_mode=2,
                                  headers={"retry": retries + 1}))
            ch_.basic_ack(method.delivery_tag)
            print(f"订单 {msg['orderId']} 第 {retries + 1} 次失败，已重投")

ch.basic_consume(queue="sms-retry", on_message_callback=callback)
print("消费者就绪（带重试上限）")
ch.start_consuming()
```

```bash
python consumer_dlq.py    # 窗口 1
# 窗口 2：把 producer.py 的队列名改成 sms-retry、orderId 改成 41（奇数必失败）再投递
```

预期输出：

```text
订单 41 第 1 次失败，已重投
订单 41 第 2 次失败，已重投
订单 41 第 3 次失败，已重投
订单 41 重试 3 次仍失败，已转死信
```

**第 6 步：验尸——从死信队列取回消息**：

```python
# peek_dlq.py
import pika, json

conn = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
ch = conn.channel()
ch.queue_declare(queue="dead-letter", durable=True)
method, props, body = ch.basic_get("dead-letter", auto_ack=False)
if body:
    print("死信内容:", json.loads(body), "重试次数:", (props.headers or {}).get("retry", 0))
    ch.basic_ack(method.delivery_tag)
else:
    print("死信队列为空")
```

输出说明了什么：死信里躺着那条「重试 3 次仍失败」的订单 41 消息——它没有丢（还在磁盘上），也没有堵住正常队列（sms-retry 已清空）。生产中这一步通常接告警与补偿任务。到这里，「投递 → 消费 → ack → 幂等 → 重试 → 死信」的可靠性闭环全部走通。

## 常见坑

1. **坑 1：什么都往队列里塞**。现象：支付校验走队列后，用户页面一直转圈等不到结果。原因：把「调用方关心结果」的同步调用错放成异步。排查与对策：判断标准是「是否关心结果」，不是「哪个更酷」。
2. **坑 2：消费逻辑不幂等**。现象：一封邮件发三遍、积分加了三次。原因：重试机制必然带来重复投递，消费端没有去重。排查与对策：幂等的标准实现是业务唯一键 + 去重表（见主线 sent_log）。
3. **坑 3：没有死信处理**。现象：一条消息永远失败，反复重投堵住整个队列。原因：失败路径只有「重试」一条路。排查与对策：设置重试上限，超限转入死信队列人工排查（见主线第 5 步）。
4. **坑 4：消息没持久化**。现象：Broker 重启后消息全丢。原因：默认内存队列。排查与对策：声明队列与消息都加持久化（durable=True / delivery_mode=2）。
5. **坑 5：事件里塞了整包数据导致强耦合**。现象：「订单已创建」事件带 40 个字段，消费者跟着生产者的表结构改。原因：把事件当成了共享数据库。排查与对策：事件只带 id 与必要事实，需要详情让消费者自己查或订阅专门的事件。
6. **坑 6：忘了 ack 也忘了 nack**。现象：处理失败的消息既不确认也不拒绝，堵住预取额度。原因：异常路径漏写了确认逻辑。排查与对策：失败路径要么 nack 重投，要么 reject 转死信，二选一，不能悬着。

## 小练习

1. 走通主线四步，亲手在「发短信」时杀掉消费者，观察消息被重新投递；再验证幂等表把第二次投递跳过。
2. 把「下单 → 短信/邮件/积分」的同步架构画成 MQ 架构图（一个事件、三个消费者），标出哪一步从 1.6 秒变成 0.1 秒。
3. 判断以下场景适合同步还是异步（MQ），并说明理由：发欢迎邮件 / 扣库存 / 生成订单号 / 发货后送积分 / 支付扣款校验。
4. 综合任务：把主线第 5 步的死信分支跑通——奇数订单重试 3 次后转入死信队列，用 peek_dlq.py 取回并打印死信内容；再想想：如果要求「重试间隔 10 秒」而不是立刻重投，架构该怎么变？（提示：死信队列 + TTL + 转回主队列。）
5. 思考题：幂等消费为什么通常用「业务唯一键 + 去重表」实现，而不是消息自带的 messageId？（提示：同一次下单被生产者重试时会生成不同 messageId。）
