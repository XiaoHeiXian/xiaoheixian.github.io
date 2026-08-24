window.BLOG_ARTICLES = [
  {
    id: 'java-jvm',
    title: 'JVM内存模型与各个区域的作用',
    url: 'posts/2026-08-25-jvm.html',
    publishedAt: '2026-08-25',
    category: 'JVM',
    tags: ['Java', 'jvm', '内存模型'],
    summary: 'JVM 内存分为 线程私有（程序计数器、虚拟机栈、本地方法栈）和 线程共享（堆、方法区）两大部分。在项目中，堆 是 GC 主要关注区，栈 决定线程数量，方法区 存类元信息。'
  },
  {
    id: 'java-final',
    title: 'Java 中 final 关键字的作用',
    url: 'posts/2026-08-25-final.html',
    publishedAt: '2026-08-25',
    category: 'Java',
    tags: ['Java', 'final'],
    summary: '修饰类不可继承、方法不可重写、变量引用不可变。'
  },
  // {
  //   id: 'moon-robot-playthrough',
  //   title: '月亮机器人双线毕业流程',
  //   url: 'posts/2026-08-25-moon-robot-playthrough.html',
  //   publishedAt: '2026-08-25',
  //   category: '兴趣记录',
  //   tags: ['游戏流程', '饥荒联机版', 'WX-78'],
  //   summary: '从前期加点到月亮与暗影双线推进的一份完整流程记录。'
  // },
  // {
  //   id: 'circuit-recipes',
  //   title: '电路改装配方与效果一览',
  //   url: 'posts/2026-08-24-circuit-recipes.html',
  //   publishedAt: '2026-08-24',
  //   category: '兴趣记录',
  //   tags: ['游戏资料', '电路改装', '饥荒联机版'],
  //   summary: '整理电路的制作配方、插口占用、效果、扫描对象和技能树强化。'
  // }
];
