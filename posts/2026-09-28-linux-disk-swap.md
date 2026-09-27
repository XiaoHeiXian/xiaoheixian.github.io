---
layout: article
title: "Linux 磁盘扩容和创建虚拟内存"
description: "- \"创建虚拟内存：查看内存(free -h) -> 创建文件(dd) -> 设置权限(chmod) -> 格式化(mkswap) -> 启用(swapon) -> 开机自启(fstab)\"   - \"磁盘扩容：虚拟机设置扩展硬盘 -> fdisk 创建分区 -> partprobe 刷新 -> mkfs 格式化 -> mount 挂载 -> fstab"
date: 2026-09-28
category: "Linux"
tags:
  - "Linux"
  - "运维"
  - "磁盘"
permalink: /posts/2026-09-28-linux-disk-swap.html
---

1、创建虚拟内存

如果你的虚拟内存<4G，需要扩容。

1）查看虚拟内存

    free -h

结果如下：

                  total        used        free      shared  buff/cache   available
    Mem:           3.7G        1.7G        130M        11M         1.8G        1.7G
    Swap:          6.0G        4.6M        6.0G

2）创建虚拟内存

（1）创建指定大小的空文件

比如创建一个 4GB 的交换文件。你可以根据实际内存和需求调整 count 后面的数字（4096 就是 4GB）。

    sudo dd if=/dev/zero of=/swapfile bs=1M count=4096

注意：如果你的文件系统支持，fallocate -l 4G /swapfile 这条命令会更快，但 dd 命令的兼容性更好，在老旧系统上更稳妥。

（2）设置安全权限

为了防止其他用户读取，需要把权限设置为只有 root 才能读写。

    sudo chmod 600 /swapfile

（3）格式化为 Swap 文件系统

    sudo mkswap /swapfile

（4）立即启用 Swap

    sudo swapon /swapfile

（5）设置开机自动启用

编辑 /etc/fstab 文件，在末尾添加一行：

    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

（6）验证是否成功

执行以下命令，如果看到 Swap 行显示了你设置的大小，就说明成功了。

    free -h

2、磁盘扩容

1）扩展虚拟磁盘

（1）关闭虚拟机
（2）扩展容量
虚拟机设置 -> 硬盘 -> 扩展 -> 输入新大小（如 100GB）
（3）启动虚拟机

2）重新分区

（1）创建新分区

    fdisk /dev/sda

在 fdisk 交互界面中执行：

    n        # 新建分区
    p        # 主分区
    4        # 分区号
    回车     # 默认起始位置（自动使用剩余空间开头）
    回车     # 默认结束位置（使用所有剩余空间）
    w        # 写入并退出

（2）强制刷新分区表

    partprobe /dev/sda

（3）格式化分区

    mkfs.ext4 /dev/sda4

（4）挂载分区

    # 创建挂载点并挂载
    mkdir /data
    mount /dev/sda4 /data
    chown root:root /data
    chmod 755 /data

（5）设置开机自动挂载

在 /etc/fstab 中添加挂载项

---

💡 **速记**

**【创建虚拟内存（核心步骤）】**
1. **查看内存**：`free -h`
2. **创建文件**：`sudo dd if=/dev/zero of=/swapfile bs=1M count=4096` (4GB)
3. **设置权限**：`sudo chmod 600 /swapfile`
4. **格式化**：`sudo mkswap /swapfile`
5. **立即启用**：`sudo swapon /swapfile`
6. **开机自启**：`echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab`
7. **验证**：`free -h`

**【磁盘扩容（核心步骤）】**
1. **虚拟机设置**：关闭虚拟机 -> 硬盘 -> 扩展 -> 输入新大小 -> 启动虚拟机。
2. **重新分区**：`fdisk /dev/sda` -> `n`(新建) -> `p`(主分区) -> `4`(分区号) -> 回车(默认起始) -> 回车(默认结束) -> `w`(写入退出)。
3. **刷新分区表**：`partprobe /dev/sda`
4. **格式化**：`mkfs.ext4 /dev/sda4`
5. **挂载**：`mkdir /data` -> `mount /dev/sda4 /data` -> `chown root:root /data` -> `chmod 755 /data`。
6. **开机自动挂载**：编辑 `/etc/fstab` 添加挂载项。
