---
layout: article
title: "RocketMQ 部署"
description: "- \"创建集群局域网：docker network create --subnet=192.168.10.0/24 mq_net\"   - \"安装NameServer：创建挂载目录，Docker部署暴露9876端口\"   - \"安装Broker：创建目录，复制并修改broker.conf\"   - \"broker.conf核心配置：集群名、Broker名"
date: 2026-10-01
category: "云商城"
tags:
  - "微服务"
  - "消息队列"
  - "RocketMQ"
  - "部署"
permalink: /posts/2026-10-01-rocketmq-deploy.html
---

1）创建集群局域网

因为一个 RocketMQ 由 nameserver 和 broker 组成，需要将这些组件部署在同一个局域网内，才能通信。

    docker network create --subnet=192.168.10.0/24 mq_net

2）安装 NameServer

（1）创建安装目录，用来映射日志和数据存储

    mkdir -p /data/local/rmq/srv/logs /data/local/rmq/srv/store

（2）部署

    docker run --name rmqnamesrv -p 9876:9876 --network mq_net --ip 192.168.10.100 -v /data/local/rmq/srv/logs:/root/logs -v /data/local/rmq/srv/store:/root/store -d apache/rocketmq sh mqnamesrv

3）安装 broker

（1）创建安装目录

    mkdir -p /data/local/rmq/broker01/logs /data/local/rmq/broker01/store /data/local/rmq/broker01/conf

（2）查看 rmqnamesrv 的安装路径

    # 执行指令
    docker exec rmqnamesrv /bin/bash -c "pwd; exec /bin/bash"

显示结果：（记住红色目录）

    /home/rocketmq/rocketmq-5.5.0/bin

（3）编辑配置文件 rmq/broker01/conf/broker.conf

将容器文件复制到本地（容器目录与查看到的安装路径一致）：

    docker cp rmqnamesrv:/home/rocketmq/rocketmq-5.5.0/conf/broker.conf /data/local/rmq/broker01/conf/

修改配置文件，内容如下：（修改红色部分）

    # 所属集群名字
    brokerClusterName=DefaultCluster

    # broker 名字，第二台 broker-b
    brokerName=broker-a

    # 0 表示 Master，> 0 表示 Slave
    brokerId=0

    # nameServer 地址，分号分割
    namesrvAddr=192.168.10.100:9876

    # 对外 IP（宿主机公网/内网 IP，客户端能访问的机器 IP）
    brokerIP1=192.168.100.101

    # 删除文件时间点，默认凌晨 4 点
    deleteWhen=04

    # 文件保留时间，默认 48 小时
    fileReservedTime=1

    # Broker 的角色
    # - ASYNC_MASTER 异步复制 Master
    # - SYNC_MASTER 同步双写 Master
    # - SLAVE
    brokerRole=ASYNC_MASTER

    # 刷盘方式
    # - ASYNC_FLUSH 异步刷盘
    # - SYNC_FLUSH 同步刷盘
    flushDiskType=ASYNC_FLUSH

（4）部署

    docker run -d --name rmqbroker01 -p 10911:10911 -p 10909:10909 --network mq_net --ip 192.168.10.11 -v /data/local/rmq/broker01/logs:/root/logs -v /data/local/rmq/broker01/store:/root/store -v /data/local/rmq/broker01/conf/broker.conf:/home/rocketmq/rocketmq-5.5.0/conf/broker.conf -e "NAMESRV_ADDR=rmqnamesrv:9876" -e JAVA_OPT="-Xms256m -Xmx512m" apache/rocketmq sh mqbroker -c /home/rocketmq/rocketmq-5.5.0/conf/broker.conf

3）安装 Web 控制台 rocketmq-console-ng

（1）安装

    docker run -d --name rmqadmin -e "JAVA_OPTS=-Drocketmq.namesrv.addr=192.168.10.100:9876 -Dcom.rocketmq.sendMessageWithVIPChannel=false -Duser.timezone='Asia/Shanghai'" -p 9999:8080 --network mq_net --ip 192.168.10.254 styletang/rocketmq-console-ng

（2）打开控制台

在浏览器输入 IP:9999，点击菜单集群，出现如下图页面（RocketMq-console-ng 页面）。

（3）测试创建主题

点击菜单 Topic，可以创建删除主题。

修改主题窗口包含以下字段：
- 集群名：DefaultCluster
- BROKER_NAME：broker-a
- 主题名：test
- 写队列数量：16
- 读队列数量：16
- perm：6
点击“提交”按钮完成创建。

---

💡 **速记**

**【部署准备（网络与目录）】**
1. **创建局域网**：`docker network create --subnet=192.168.10.0/24 mq_net`
2. **NameServer目录**：`mkdir -p /data/local/rmq/srv/logs /data/local/rmq/srv/store`
3. **Broker目录**：`mkdir -p /data/local/rmq/broker01/logs /data/local/rmq/broker01/store /data/local/rmq/broker01/conf`

**【NameServer 部署】**
*   `docker run --name rmqnamesrv -p 9876:9876 --network mq_net --ip 192.168.10.100 -v /data/local/rmq/srv/logs:/root/logs -v /data/local/rmq/srv/store:/root/store -d apache/rocketmq sh mqnamesrv`

**【Broker 配置文件（核心考点）】**
*   复制容器内配置文件：`docker cp rmqnamesrv:/home/rocketmq/rocketmq-5.5.0/conf/broker.conf /data/local/rmq/broker01/conf/`
*   关键配置：
    *   `brokerClusterName=DefaultCluster`
    *   `brokerName=broker-a`
    *   `brokerId=0`（0为Master，>0为Slave）
    *   `namesrvAddr=192.168.10.100:9876`
    *   `brokerIP1=192.168.100.101`（宿主机IP）
    *   `brokerRole=ASYNC_MASTER`（异步复制）
    *   `flushDiskType=ASYNC_FLUSH`（异步刷盘）

**【Broker 部署】**
*   `docker run -d --name rmqbroker01 -p 10911:10911 -p 10909:10909 --network mq_net --ip 192.168.10.11 -v /data/local/rmq/broker01/logs:/root/logs -v /data/local/rmq/broker01/store:/root/store -v /data/local/rmq/broker01/conf/broker.conf:/home/rocketmq/rocketmq-5.5.0/conf/broker.conf -e "NAMESRV_ADDR=rmqnamesrv:9876" -e JAVA_OPT="-Xms256m -Xmx512m" apache/rocketmq sh mqbroker -c /home/rocketmq/rocketmq-5.5.0/conf/broker.conf`

**【Web 控制台部署】**
*   `docker run -d --name rmqadmin -e "JAVA_OPTS=-Drocketmq.namesrv.addr=192.168.10.100:9876 -Dcom.rocketmq.sendMessageWithVIPChannel=false -Duser.timezone='Asia/Shanghai'" -p 9999:8080 --network mq_net --ip 192.168.10.254 styletang/rocketmq-console-ng`
*   访问地址：`http://IP:9999`
*   创建主题：菜单 Topic -> 填写集群名、BROKER_NAME、主题名、队列数（16/16）、perm=6 -> 提交。
