---
layout: article
title: "锁机制"
description: "- \"定义：多线程环境下为保证共享资源健康、线程安全的一种手段。\"   - \"悲观锁：每次拿数据都认为别人会修改，所以每次拿数据都会上锁。\"   - \"乐观锁：假设不会冲突，更新时检查版本号或使用 CAS 算法。\"   - \"可重入锁：允许线程多次获取同一个锁，避免死锁。\"   - \"公平锁与非公平锁：按申请顺序获取锁 vs 允许插队，后者性能更高。\""
date: 2026-10-12
category: "云商城"
tags:
  - "Java"
  - "并发"
  - "锁"
permalink: /posts/2026-10-12-lock-mechanism.html
---

### 1、什么是锁

java 当中的锁是在多线程环境下为保证共享资源健康、线程安全的一种手段。线程操作某个共享资源之前，先对资源加一层锁，保证操作期间没有其他线程访问资源，当操作完成后，再释放锁。

### 2、常见锁类型

#### 1）悲观锁

一段执行逻辑加上悲观锁，不同线程同时执行时，只能有一个线程执行，其他的线程在入口处等待，直到锁被释放。悲观锁就是很悲观，每次去拿数据的时候都认为别人会修改，所以每次在拿数据的时候都会上锁，这样别人想拿这个数据就会等待直到拿到锁。

Java 中的悲观锁一般有两种实现方式：

- synchronized 关键字
- 基于 Java 同步器 AQS 的各种实现类

（1）基于 synchronized 的实现

是 Java 中的关键字、底层由 Jvm 虚拟机实现的同步机制，通过两条监听器指令：MONITORENTER（进入）、MONITOREXIT（退出）来实现同步效果。

synchronized 有三种使用方式：

- 修饰静态方法：锁住的是类，该类下创建的所有对象都被锁住
- 修饰实例方法：锁住的是当前对象，当前对象所属类创建的其他对象不受影响
- 修饰代码块（静态代码块、实例代码块）：根据代码块所出区域来区别，如代码块在静态方法中，那锁的是整个类、如代码块在实例方法中，那锁住的是当前实例对象。

（2）基于 AQS 的实现类

AQS 全称（AbstractQueuedSynchronizer）抽象的队列式的同步器，AQS 定义了一套多线程访问共享资源的同步器框架，许多同步类实现都依赖于它，如常用的 ReentrantLock。

![架构示意图](https://xiaoheixian.github.io/posts/assets/353_65.png)

同步队列示意：

    线程1 --> 持有锁 --> 修改数据
    线程1 <-- 等待获取锁 <-- 同步队列：线程2, 线程3, 线程4
    线程N --> 直接获取锁 --> 进入同步队列排队

它维护了一个 volatile int state（代表共享资源）和一个 FIFO 线程等待队列（多线程争用资源被阻塞时会进入此队列）。

【知识点】

volatile 是 Java 语言的关键字，用于修饰变量，主要解决多线程环境下的内存可见性和指令重排序问题，确保变量修改对所有线程立即生效。

volatile 修饰的变量在修改后会立即对其他线程可见，且禁止编译器对该变量的指令进行优化重组（如延迟加载或缓存）。例如，当多个线程共享同一变量时，使用 volatile 可确保每个线程都能获取变量的最新值。

volatile 通过强制刷新缓存并同步主内存中的值，保证多线程间的内存可见性。在 Java 内存模型（JMM）中，volatile 变量被视为特殊类型，直接映射到主内存，避免因缓存导致的延迟更新问题。

以 ReentrantLock 为例，state 初始化为 0，表示未锁定状态。A 线程 lock() 时，会调用 tryLock() 独占该锁并将 state+1。此后，其他线程再 tryLock() 时就会失败，请求锁的线程会被放入同步队列中等待，直到 A 线程 unlock() 到 state=0（即释放锁）为止，其它线程才有机会获取该锁。当然，释放锁之前，A 线程自己是可以重复获取此锁的（state 会累加），这就是可重入的概念。但要注意，获取多少次就要释放多少次，这样才能保证 state 是能回到零态的。

基于 AQS 的锁：

- ReentrantLock：实现独占锁机制，同一时刻仅允许一个线程获取锁，适用于写操作频繁或需要完全独占资源的场景。
- ReentrantReadWriteLock：采用读写分离策略，允许多个读线程同时持有读锁，但写操作（包括升级读锁）会阻塞所有读写线程，确保数据一致性。专为读多写少的场景设计，通过允许多读线程并行提升性能，但需注意写锁的独占性可能导致写操作延迟。
- StampedLock（基于读写锁优化，对读锁更加细化了一层，但同时使用也更加复杂，用的不多）
- Semaphore（信号量，可用于限流）
- CountDownLatch（可用于计数，一般用于在多线程环境下需要执行固定次数逻辑的地方）。

#### 2）乐观锁

一段执行逻辑加上乐观锁，不同线程同时执行时，可以同时进入执行，在最后更新数据的时候要检查这些数据是否被其他线程修改了（版本和执行初是否相同），没有修改则进行更新，否则放弃本次操作。乐观锁则是一种在数据处理过程中的锁机制，它假设多个进程或系统并发访问共享资源时，不会彼此冲突，因此在数据处理过程中不会加锁。只是在更新数据时，会判断在此期间有没有其他进程对数据进行过修改，如果有则采取回滚等方式解决，没有则完成更新。

乐观锁的实现：

- 基于版本号机制
- 基于 CAS 算法

（1）基于 CAS 算法

CAS（Compare And Swap/Set）比较并交换，CAS 算法的过程：它包含 3 个参数 CAS(V,E,N)。V 表示要更新的变量(内存值)，E 表示预期值(旧的)，N 表示新值。当且仅当 V 值等于 E 值时，才会将 V 的值设为 N，如果 V 值和 E 值不同，则说明已经有其他线程做了更新，则当前线程什么都不做。最后，CAS 返回当前 V 的真实值。

CAS 流程图：

    开始 --> 判断 V = E ? --> 是 --> 修改数据 --> 结束
                    |
                    否 --> 更新 E --> 重新判断

CAS 操作是抱着乐观的态度进行的(乐观锁)，它总是认为自己可以成功完成操作。当多个线程同时使用 CAS 操作一个变量时，只有一个会胜出，并成功更新，其余均会失败。失败的线程不会被挂起，仅是被告知失败，并且允许再次尝试，当然也允许失败的线程放弃操作。基于这样的原理，CAS 操作即使没有锁，也可以发现其他线程对当前线程的干扰，并进行恰当的处理。

CAS 会导致“ABA 问题”。CAS 算法实现一个重要前提需要取出内存中某时刻的数据，而在下时刻比较并替换，那么在这个时间差类会导致数据的变化。比如说一个线程 one 从内存位置 V 中取出 A，这时候另一个线程 two 也从内存中取出 A，并且 two 进行了一些操作变成了 B，然后 two 又将 V 位置的数据变成 A，这时候线程 one 进行 CAS 操作发现内存中仍然是 A，然后 one 操作成功。尽管线程 one 的 CAS 操作成功，但是不代表这个过程就是没有问题的。

（2）基于版本号机制实现

一般是在数据表中加上一个数据版本号 version 字段，表示数据被修改的次数。当数据被修改时，version 值会加一。当线程 A 要更新数据值时，在读取数据的同时也会读取 version 值，在提交更新时，若刚才读取到的 version 值为当前数据库中的 version 值相等时才更新，否则重试更新操作，直到更新成功。

举一个简单的例子：假设数据库中帐户信息表中有一个 version 字段，当前值为 1；而当前帐户余额字段（balance）为 $100。

操作员 A 此时将其读出（version=1），并从其帐户余额中扣除 $50（$100-$50）。

在操作员 A 操作的过程中，操作员 B 也读入此用户信息（version=1），并从其帐户余额中扣除 $20（$100-$20）。

操作员 A 完成了修改工作，将数据版本号（version=1），连同帐户扣除后余额（balance=$50），提交至数据库更新，此时由于提交数据版本等于数据库记录当前版本，数据被更新，数据库记录 version 更新为 2。

操作员 B 完成了操作，也将版本号（version=1）试图向数据库提交数据（balance=$80），但此时比对数据库记录版本时发现，操作员 B 提交的数据版本号为 1，数据库记录当前版本也为 2，不满足“提交版本必须等于当前版本才能执行更新”的乐观锁策略，因此，操作员 B 的提交被驳回。这样就避免了操作员 B 用基于 version=1 的旧数据修改的结果覆盖操作员 A 的操作结果的可能。

基于版本号（version）的方式可以解决 ABA 问题，乐观锁每次在执行数据的修改操作时，都会带上一个版本号，一旦版本号和数据的版本号一致就可以执行修改操作并对版本号执行+1 操作，否则就执行失败。因为每次操作的版本号都会随之增加，所以不会出现 ABA 问题，因为版本号只会增加不会减少。

【示例】在 mall-test-service 项目演示

①创建 Stock 类

    public class Stock {
        private static Stock instance;
        private Integer stockNum = 10;
        @Getter
        private Long version = 0L;
        private ReentrantLock lock = new ReentrantLock();
        private Stock() {}
        public static Stock getInstance() {
            if (instance == null) {
                instance = new Stock();
            }
            return instance;
        }

        /**
         * 不加锁减库存
         * @throws Exception
         */
        public void dcount() throws Exception {
            if (stockNum > 0) {
                Thread.sleep(100); // 模拟修改延时
                stockNum--;
                version++;
            } else {
                throw new Exception("库存不足");
            }
        }

        /**
         * 加乐观锁减库存
         * @param num
         * @param currentVersion
         * @throws Exception
         */
        public void dcount(int num, long currentVersion) throws Exception {
            if (stockNum > 0) {
                Thread.sleep(100);
                if (currentVersion == version) {
                    stockNum -= num;
                    version++;
                } else {
                    throw new Exception("并发操作异常");
                }
            } else {
                throw new Exception("库存不足");
            }
        }

        /**
         * 加悲观锁减库存
         * @param num
         * @throws Exception
         */
        public void dcount(int num) throws Exception {
            try {
                lock.lock(); // 获取锁
                if (stockNum > 0) {
                    Thread.sleep(100);
                    stockNum -= num;
                    version++;
                } else {
                    throw new Exception("库存不足");
                }
            } finally {
                lock.unlock(); // 释放锁
            }
        }

        public String toString() {
            return "Stock{" +
                "stockNum=" + stockNum +
                ", version=" + version +
                '}';
        }
    }

②创建控制器

    @RestController
    @RequestMapping("/lock")
    public class LockController {
        /**
         * 测试乐观锁
         * @return
         */
        @PutMapping("/unlock")
        public void unlock() {
            Stock stock = Stock.getInstance();
            try {
                stock.dcount();
                System.out.println(stock.toString());
            } catch (Exception e) {
                System.out.println(stock.toString() + e.getMessage());
            }
        }

        @PutMapping("/optimistic")
        public void optimistic() {
            Stock stock = Stock.getInstance();
            Long version = stock.getVersion();
            try {
                stock.dcount(1, version);
                System.out.println(stock.toString());
            } catch (Exception e) {
                System.out.println(stock.toString() + e.getMessage());
            }
        }

        @PutMapping("/sync")
        public void sync() {
            Stock stock = Stock.getInstance();
            try {
                stock.dcount(1);
                System.out.println(stock.toString());
            } catch (Exception e) {
                System.out.println(stock.toString() + e.getMessage());
            }
        }
    }

③压测试（不加锁）

控制台显示结果：

    Stock{stockNum=9, version=1}
    Stock{stockNum=8, version=2}
    Stock{stockNum=7, version=3}
    Stock{stockNum=6, version=4}
    Stock{stockNum=5, version=5}
    Stock{stockNum=3, version=6}
    Stock{stockNum=3, version=6}
    Stock{stockNum=2, version=7}
    Stock{stockNum=1, version=8}
    Stock{stockNum=-1, version=10}
    Stock{stockNum=0, version=9}
    Stock{stockNum=-2, version=11}
    Stock{stockNum=-3, version=12}

④压测（加乐观锁）

控制台显示结果：

    Stock{stockNum=9, version=1} 并发操作异常
    Stock{stockNum=9, version=1} 并发操作异常
    Stock{stockNum=9, version=1} 并发操作异常
    Stock{stockNum=8, version=2}
    Stock{stockNum=8, version=2} 并发操作异常
    Stock{stockNum=8, version=2} 并发操作异常
    Stock{stockNum=8, version=2} 并发操作异常

在分布式系统中，配置信息需要被多个服务共享和更新。使用乐观锁可以减少锁的竞争，提高配置更新的效率，但是有可能会出现少卖现象。

⑤压测（加悲观锁）

控制台显示结果：

    Stock{stockNum=9, version=1}
    Stock{stockNum=8, version=2}
    Stock{stockNum=7, version=3}
    Stock{stockNum=6, version=4}
    Stock{stockNum=5, version=5}
    Stock{stockNum=4, version=6}
    Stock{stockNum=3, version=7}
    Stock{stockNum=2, version=8}
    Stock{stockNum=1, version=9}
    Stock{stockNum=0, version=10}
    Stock{stockNum=0, version=10} 库存不足
    Stock{stockNum=0, version=10} 库存不足

### 3、锁的可重入机制

（1）可重入锁：如 Java 中的 ReentrantLock，Synchronized，ReentrantReadWriteLock，允许线程多次获取同一个锁，而不会导致死锁或其他并发问题。这种锁的实现机制通常包括一个计数器来跟踪锁的持有次数，只有当计数器归零时，锁才会被释放，允许其他线程获取。这种机制确保了线程可以在持有锁的情况下再次进入需要该锁的代码段，而不会出现问题。

    public class ReentrantLockService {

        @Autowired
        private ReentrantLock reentrantLock

        public void outerMethod(String resourceId) {
            RLock lock = reentrantLock.getLock("lock:" + resourceId);

            lock.lock(); // 第一次加锁
            try {
                log.info("外层方法获取锁");
                innerMethod(resourceId); // 再次获取同一把锁
            } finally {
                lock.unlock(); // 释放第一次锁
            }
        }

        public void innerMethod(String resourceId) {
            RLock lock = reentrantLock.getLock("lock:" + resourceId);

            lock.lock(); // 第二次加锁（可重入）
            try {
                log.info("内层方法再次获取锁");
                // 业务逻辑
            } finally {
                lock.unlock(); // 释放第二次锁
            }
        }
    }

（2）不可重入锁：如某些简单的自旋锁，不允许线程多次获取同一个锁。当一个线程已经持有锁时，其他尝试获取该锁的线程将被阻塞，直到持有锁的线程释放它。这种机制简单，但可能导致死锁或其他并发问题，特别是在复杂的并发场景中。

总的来说，可重入锁和不可重入锁的主要区别在于它们对线程多次获取同一个锁的处理方式不同。可重入锁通过复杂的机制允许线程多次获取锁，而不可重入锁则不允许这种情况，可能导致更复杂的并发问题。

### 4、公平锁和非公平锁

（1）公平锁：如 ReentrantLock，ReentrantReadWriteLock，多个线程按照申请锁的顺序来获取锁。在并发环境中，每个线程会先查看此锁维护的等待队列，如果当前等待队列为空，则占有锁，如果等待队列不为空，则加入到等待队列的末尾，按照 FIFO 的原则从队列中拿到线程，然后占有锁。

（2）非公平锁：如 Synchronized，线程尝试获取锁，如果获取不到，则再采用公平锁的方式。多个线程获取锁的顺序，不是按照先到先得的顺序，有可能后申请锁的线程比先申请的线程优先获取锁。非公平锁的性能高于公平锁，有可能造成线程饥饿（某个线程很长一段时间获取不到锁）。

### 5、共享锁与独占锁

（1）共享锁：如 ReentrantReadWriteLock 的读，可以有多个线程获取读锁，以共享的方式持有锁。和乐观锁、读写锁同义。

（2）独占锁：如 ReentrantLock，Synchronized，ReentrantReadWriteLock 写，只能有一个线程获取锁，以独占的方式持有锁。和悲观锁、互斥锁同义。

### 6、synchronized 和 ReentrantLock

（1）基本概念

Synchronized：是 Java 内置的关键字，用于实现线程同步，可以修饰方法或代码块。它通过 JVM 实现，属于隐式锁。

ReentrantLock：是 Java 并发包（java.util.concurrent.locks）中的一个类，属于显式锁，提供了比 synchronized 更灵活的锁机制。

（2）锁的获取与释放

Synchronized：锁的获取和释放由 JVM 自动管理，无需手动干预。如果发生异常，JVM 会自动释放锁。

ReentrantLock：必须手动调用 lock() 和 unlock() 方法。必须在 finally 块中释放锁，否则可能导致死锁。

（3）公平性

Synchronized：默认是非公平锁，无法直接控制锁的公平性。

ReentrantLock：可以选择公平锁或非公平锁：

    ReentrantLock fairLock = new ReentrantLock(true); // 公平锁
    ReentrantLock unfairLock = new ReentrantLock(false); // 非公平锁（默认）

（4）可中断性

Synchronized：线程在等待锁时无法被中断，只能一直等待。

ReentrantLock：提供了 lockInterruptibly() 方法，允许线程在等待锁时响应中断。

    lock.lockInterruptibly(); // 可以被中断

（5）尝试获取锁

Synchronized：没有直接的方法尝试获取锁，只能阻塞等待。

ReentrantLock：提供了 tryLock() 方法，可以尝试获取锁，如果获取失败则立即返回

    if (lock.tryLock()) {
        try {
            // 同步代码
        } finally {
            lock.unlock();
        }
    } else {
        // 获取锁失败的处理
    }

（6）锁绑定多个条件

Synchronized：只能使用 Object 的 wait()、notify() 和 notifyAll() 方法，且所有线程共享同一个条件队列。

ReentrantLock：可以绑定多个 Condition 对象，实现更精细的线程等待和唤醒

    Condition condition = lock.newCondition();
    lock.lock();
    try {
        condition.await(); // 线程等待
        condition.signal(); // 唤醒线程
    } finally {
        lock.unlock();
    }

（7）性能

Synchronized：JVM 对 synchronized 进行了大量优化（如锁粗化、锁消除、偏向锁、轻量级锁等），性能接近 ReentrantLock。

ReentrantLock：在高并发场景下，性能优于 synchronized，但需要手动管理锁的获取和释放，增加了代码复杂度。

（8）可读性

Synchronized：代码更简洁，易于理解和维护。

ReentrantLock：代码更复杂，需要手动管理锁的获取和释放，容易出错（如忘记释放锁）。

（9）使用场景

Synchronized：适用于简单的同步需求，代码简洁，易于维护。适合不需要复杂锁机制（如公平性、可中断性、多条件）的场景。

ReentrantLock：适用于需要更灵活的锁机制（如公平性、可中断性、多条件）的场景。适合高竞争场景，或需要更精细控制线程同步的场景。

### 8、ReentrantReadWriteLock 与 ReentrantLock

ReentrantReadWriteLock 与 ReentrantLock 均为 Java 并发工具包中的锁机制实现，主要区别在于功能设计和适用场景：

（1）功能设计

ReentrantLock：实现独占锁机制，同一时刻仅允许一个线程获取锁。

ReentrantReadWriteLock：采用读写分离策略，允许多个读线程同时持有读锁，但写操作（包括升级读锁）会阻塞所有读写线程，确保数据一致性。

（2）适用场景

ReentrantLock：适用于写操作频繁或需要完全独占资源的场景。

ReentrantReadWriteLock：专为读多写少的场景设计，通过允许多读线程并行提升性能，但需注意写锁的独占性可能导致写操作延迟。

## 流程图文字推演

### 悲观锁执行流程

线程1获取锁 --> 执行同步代码 --> 释放锁 --> 线程2获取锁 --> 执行同步代码 --> 释放锁

### 乐观锁（CAS）执行流程

线程读取内存值 V 和预期值 E --> 执行操作 --> 准备更新时比较当前 V 是否等于 E --> 相等则更新为 N，返回成功 --> 不相等则放弃更新或重试

### 可重入锁获取流程

外层方法获取锁 --> 计数器+1 --> 内层方法再次获取锁 --> 计数器+1 --> 内层方法释放锁 --> 计数器-1 --> 外层方法释放锁 --> 计数器归零，锁完全释放

### 读写锁分离流程

读线程请求读锁 --> 无写锁占用，允许多个读线程同时持有 --> 写线程请求写锁 --> 阻塞所有读线程和写线程 --> 写操作完成释放写锁 --> 读线程重新获取读锁

## 💡 **速记**

【核心考点】

锁是多线程环境下保证共享资源安全的手段，分为悲观锁和乐观锁。

悲观锁：每次操作都加锁，Java 中通过 synchronized 和 AQS 实现类（如 ReentrantLock）实现。

乐观锁：假设无冲突，更新时通过版本号或 CAS 检查，适合读多写少场景，但存在 ABA 问题（可用版本号解决）。

可重入锁允许线程多次获取同一锁，避免死锁；公平锁按申请顺序获取，非公平锁允许插队，性能更高。

共享锁（读锁）可多线程持有，独占锁（写锁）仅一个线程持有。

synchronized 是 JVM 内置隐式锁，自动释放；ReentrantLock 是显式锁，需手动释放，支持公平性、可中断、多条件。

ReentrantReadWriteLock 读写分离，适合读多写少场景。

【高频逻辑链】

悲观锁：线程1加锁 --> 执行 --> 释放 --> 线程2加锁 --> 执行。

乐观锁：读取版本 --> 执行操作 --> 提交时比较版本 --> 一致则更新，否则重试。

可重入锁：外层加锁计数+1 --> 内层加锁计数+1 --> 内层释放计数-1 --> 外层释放计数归零。

【关键避坑】

ReentrantLock 必须在 finally 中手动释放锁，否则会导致死锁。

CAS 存在 ABA 问题，可通过版本号机制解决。

非公平锁性能高但可能导致线程饥饿，公平锁按 FIFO 保证公平但性能较低。
