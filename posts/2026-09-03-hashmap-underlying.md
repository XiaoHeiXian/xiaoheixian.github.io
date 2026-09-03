---
layout: article
title: "Java中HashMap的底层实现原理和扩容机制是什么？"
description: "基于数组+链表/红黑树实现，通过key的hash值定位桶索引，达到负载因子0.75时触发2倍扩容并重新计算hash分配位置。"
date: 2026-09-03
category: "Java"
tags:
  - "HashMap"
  - "集合框架"
  - "扩容"
permalink: /posts/2026-09-03-hashmap-underlying.html
---

- **作用**：以键值对形式存储数据，提供均摊 O(1) 时间复杂度的增删改查能力。
- **实现**：通过 `(key.hashCode() & (table.length-1))` 定位桶索引，哈希冲突时采用链表（尾插法）或红黑树（链表长度≥8且数组容量≥64时转换）存储节点。
- **原理**：基于哈希表（数组+链表/红黑树）的散列存储；扩容（`resize`）为原数组 2 倍，旧数据需重新计算 `hash & (newCap-1)` 分配至低位或高位桶，保证负载因子（默认0.75）平衡时空效率。
