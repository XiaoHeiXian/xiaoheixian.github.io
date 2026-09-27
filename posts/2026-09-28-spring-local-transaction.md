---
layout: article
title: "本地事务与 Spring 事务"
description: "- \"本地事务：操作单一数据库，默认一条SQL独占一个事务且自动提交\"   - \"Spring事务分类：编程式事务(代码侵入高) vs 声明式事务(AOP无侵入)\"   - \"声明式事务核心：@Transactional注解\"   - \"核心参数1：isolation(隔离级别)、propagation(传播行为)\"   - \"核心参数2：timeout"
date: 2026-09-28
category: "云商城"
tags:
  - "云商城"
  - "本地事务"
permalink: /posts/2026-09-28-spring-local-transaction.html
---

1、什么是本地事务

大多数场景下，我们的应用都只需要操作单一的数据库，这种情况下的事务称之为本地事务(Local Transaction)。默认情况下，一条 sql 语句独占一个事务，且自动提交，所以没有设置事务的情况下，如果操作中断，无法回滚到初始状态。

2、Spring 事务分类

（1）编程式事务
手动 TransactionTemplate / PlatformTransactionManager 手动开启、提交、回滚，灵活但代码侵入高。

（2）声明式事务（主流）
基于 AOP，@Transactional 注解，无侵入，开发常用。
声明式事务又分为：注解事务、XML 配置事务。

3、声明注解式事务

Spring 提供了注解@Transactional，注解在类或方法上，加入事务支持。@Transactional 参数如下表所示：

| 配置项 | 说明 |
| :--- | :--- |
| isolation | 隔离级别 |
| propagation | 传播行为 |
| timeout | 超时时间。单位为秒，当超时时，会引发异常，默认会导致事务回滚 |
| readOnly | 是否开启只读事务，默认为 false |
| rollbackFor | 只有当方法产生所定义的异常时，才会回滚事务，否则提交事务 |
| rollbackForClassName | 同 rollbackFor，只是使用类名称定义 |
| noRollbackFor | 当产生所定义异常时，将继续提交事务，即产生哪些异常不常不回滚事务 |
| noRollbackForClassName | 同 noRollbackFor，只是使用类名称定义 |

4、事务测试与回滚策略

1）事务测试

（1）在 OrderSeriveImpl 类添加注解@Transactional

（2）在 SkuInfoSeriveImpl 类添加注解@Transactional

（3）测试场景一

从订单服务控制台的 SQL 语句执行情况可以看出：

JDBC Connection [com.mysql.cj.jdbc.ConnectionImpl@258f97f8] will be managed by Spring

==>  Preparing: INSERT INTO order_items ( id, order_id, price, quantity, sku_id, sku_name, image, amount ) VALUES
==> Parameters: 2075729201308856322(Long), 2075729201019449345(String), 100.0(Double), 1(Integer), 1(Long), 商品1(String)
==> Parameters: 2075729201631817730(Long), 2075729201019449345(String), 100.0(Double), 1(Integer), 2(Long), 商品2(String)

Creating a new SqlSession
Registering transaction synchronization for SqlSession [org.apache.ibatis.session.defaults.DefaultSqlSession@1106a4f]

JDBC Connection [com.mysql.cj.jdbc.ConnectionImpl@258f97f8] will be managed by Spring

==>  Preparing: INSERT INTO order_info ( order_id, create_time, user_id, total_amount, status, order_type, recipient
==> Parameters: 2075729201019449345(String), 2026-07-11T07:49:41.535242(LocalDateTime), 116(Long), 200.0(Double),

Releasing transactional SqlSession [org.apache.ibatis.session.defaults.DefaultSqlSession@1106a9cc]

Transaction synchronization deregistering SqlSession [org.apache.ibatis.session.defaults.DefaultSqlSession@1106a4f]
Transaction synchronization closing SqlSession [org.apache.ibatis.session.defaults.DefaultSqlSession@1106a9cc]

同步事务被注销，查看两张的数据都为空，这表明本地事务并未提交，而是执行了回滚操作。

（4）测试场景二
从商品服务控制台的 SQL 语句执行情况可以看出：

JDBC Connection [com.mysql.cj.jdbc.ConnectionImpl@35603e1e] will be managed by Spring

==>  Preparing: UPDATE sku_info SET spu_id=?, price=?, sku_name=?, sku_attribute=?, num=?, brand_id=?, brand_name=?
==> Parameters: 1(Long), 5999.0(Double), 小米10 至尊纪念版 双模5G 骁龙865 120HZ高刷新率 120倍长焦镜头 120W快充 8GB+128G
==> Parameters: 1(Long), 7999.0(Double), 小米10 至尊纪念版 双模5G 骁龙865 120HZ高刷新率 120倍长焦镜头 120W快充 128GB+256

Transaction synchronization deregistering SqlSession [org.apache.ibatis.session.defaults.DefaultSqlSession@7cf84379]
Transaction synchronization closing SqlSession [org.apache.ibatis.session.defaults.DefaultSqlSession@7cf84379]

同步事务被注销，查看商品1和商品2的数量都没有变化，执行了回滚操作。

2）回滚策略

声明式事务默认只针对运行时异常（RuntimeException）回滚，编译时异常不回滚。可以通过@Transactional 中相关属性设置回滚策略：
- rollbackFor：回滚策略，需要设置一个 Class 类型的对象
- rollbackForClassName：回滚策略，需要设置一个字符串类型的全类名
- noRollbackFor：不回滚策略，需要设置一个 Class 类型的对象
- noRollbackForClassName：不回滚策略，需要设置一个字符串类型的全类名

注意：异常不能在 catch 中捕获，捕获之后的异常已经被处理，相当没有异常发生，事务不再回滚。

如果将方法的异常抛出如下：

    throw new RuntimeException();

事务正常回滚。

如果将方法的异常抛出如下：

    throw new Exception();

事务不会回滚，需要在事务注解说明回滚策略：

    @Transactional(rollbackFor = Exception.class)

在测试场景二时发现：虽然商品库存数量已回滚，但订单表和订单明细表也已回滚。原因是在生成订单的方法，远程调用失败抛出了运行期异常：

    throw new BusinessException(stockResult.getCode(), stockResult.getMsg());

这个异常是在方法内抛出的，方法可以识别异常，数据进行了回滚。

如果将抛出异常修改如下：

    throw new Exception(stockResult.getMsg());

执行测试后会发现订单表和订单明细表的数据没有回滚。虽然方法抛出了异常，方法也识别了异常（没有捕获），但声明式事务默认只针对运行时异常（RuntimeException）回滚。

如果添加回滚策略：

    @Transactional(rollbackFor = Exception.class)

执行测试后会发现订单表和订单明细表的数据是可以回滚的。

3）只读事务

对一个查询操作来说，如果我们把它设置成只读，就能够明确告诉数据库，这个操作不涉及写操作。这样数据库就能够针对查询操作进行优化。只读事务通过属性 readOnly = true 来设置。

设置只读事务的好处：
- 普通读写事务会申请读写锁、维护 undo 日志、事务 ID。只读事务标记后，MySQL 判定无修改操作，不生成 undo 日志、不维护事务变更快照，减少内存与 IO 消耗。
- 提前禁用事务提交 / 回滚逻辑，省去 commit、rollback、刷新缓存等流程。减少事务同步器资源注册、解绑开销，提升执行速度。

设置只读服务的两种方法：
方法一：
将事务注解在类上，类的所有方法都注册绑定了事务管理器

    @Transactional
    public class SkuInfoServiceImpl extends ServiceImpl<SkuInfoMapper, SkuInfo> implements ISkuInfoService {

然后在不需要事务管理的方法上注解只读事务

    @Transactional(readOnly = true)
    public List<ProductDTO> listBySpuId(Long spuId) {

方法二：
将事务注解在类的方法上，只有被注解的方法注册绑定了事务管理器，其它方法没有事务管理

    @Transactional
    public void decreaseStock(Map<Long,Integer> deductMap) {

4）超时

事务在执行过程中，有可能因为遇到某些问题，导致程序卡住，从而长时间占用数据库资源。而长时间占用资源，大概率是因为程序运行出现了问题。此时这个可能出问题的程序应该被回滚，撤销它已做的操作，事务结束，把资源让出来，让其他正常程序可以执行。可以通过属性 timeout 来设置超时，时间为秒。如果设置 timeout = -1，永不超时。

    @Transactional(timeout=1)

5）隔离级别

数据库系统必须具有隔离并发运行各个事务的能力，使它们不会相互影响，避免各种并发问题。一个事务与其他事务隔离的程度称为隔离级别。SQL 标准中规定了多种事务隔离级别，不同隔离级别对应不同的干扰程度，隔离级别越高，数据一致性就越好，但并发性越弱。隔离级别一共有四种，由属性 isolation 设置，它们的值是 Isolation 枚举常量：
- 读未提交：READ UNCOMMITTED
- 读已提交：READ COMMITTED
- 可重复读：REPEATABLE READ
- 串行化：SERIALIZABLE

默认是 isolation = Isolation.DEFAULT，默认为数据库的隔离级别。

    @Transactional(isolation = Isolation.READ_COMMITTED, timeout=1)

6）传播行为

当事务方法被另一个事务方法调用时，必须指定事务应该如何传播。事务的传播机制，由属性 propagation 设置，它们的值是 Propagation 枚举常量：
- REQUIRED：方法 A 调用时候没有事务新建一个事务，在方法 A 中调用方法 B，将使用相同的事务，如果方法 B 发生异常需要回滚，整个事务回滚。
- REQUIRES_NEW：方法 A 调用方法 B 时，无论是否存在事务都开启一个新事务，这样 B 方法异常不会导致 A 的数据回滚。
- NESTED：和 REQUIRES_NEW 类似，但是只支持 JDBC，不支持 JPA 或 Hibernate。
- SUPPORTS：方法调用时有事务就用事务，没事务就不用事务。
- NOT_SUPPORTED：强制方法不在事务中执行，若有事务，在方法调用到结束阶段先挂起事务。
- NEVER：强制不能有事务，若有事务就抛出异常。
- MANDATORY：强制必须有事务，如果没有事务就抛出异常

默认是 propagation= Propagation.REQUIRED。

    @Transactional(isolation = Isolation.READ_COMMITTED, propagation = Propagation.REQUIRED)

上例中，OrderSerevice 中的订单和订单详情实际上调用的是 OrderInfoService 和 OrderDetailService 两个服务，默认的传播行为为 REQUIRED。

---

💡 **速记**

**【本地事务】**
操作单一数据库，默认一条 SQL 独占一个事务且自动提交。不设置事务的情况下，中断无法回滚。

**【Spring 事务分类】**
1. **编程式事务**：`TransactionTemplate` / `PlatformTransactionManager`，手动开启提交回滚，灵活但代码侵入高。
2. **声明式事务（主流）**：基于 AOP，`@Transactional` 注解，无侵入。

**【@Transactional 核心参数（高频考点）】**
*   `isolation`：隔离级别。
*   `propagation`：传播行为。
*   `timeout`：超时时间（秒），超时抛异常并回滚。`-1` 永不超时。
*   `readOnly`：是否只读，默认 `false`。只读事务不生成 undo 日志，减少 IO，提升查询速度。
*   `rollbackFor`：指定回滚的异常（Class 对象），默认只针对 `RuntimeException` 回滚。
*   `rollbackForClassName`：指定回滚的异常（全类名字符串）。
*   `noRollbackFor`：指定不回滚的异常（Class 对象）。
*   `noRollbackForClassName`：指定不回滚的异常（全类名字符串）。

**【回滚策略注意点】**
*   默认只针对**运行时异常（RuntimeException）**回滚，编译时异常（如 `Exception`）不回滚。
*   如果需要所有异常都回滚，必须加 `@Transactional(rollbackFor = Exception.class)`。
*   异常不能在 `catch` 中捕获，捕获后事务不会回滚。

**【四大隔离级别】**
1. `READ UNCOMMITTED`（读未提交）
2. `READ COMMITTED`（读已提交）
3. `REPEATABLE READ`（可重复读）
4. `SERIALIZABLE`（串行化）
*   默认 `Isolation.DEFAULT`。

**【七大传播行为（高频考点）】**
*   `REQUIRED`（默认）：有事务则用，无则新建。B 异常导致 A 回滚。
*   `REQUIRES_NEW`：无论是否存在事务，都开启新事务。B 异常不会导致 A 回滚。
*   `NESTED`：类似 `REQUIRES_NEW`，只支持 JDBC。
*   `SUPPORTS`：有就用，没有就不用。
*   `NOT_SUPPORTED`：强制不在事务中执行。
*   `NEVER`：强制不能有事务，有则抛异常。
*   `MANDATORY`：强制必须有事务，没有则抛异常。
