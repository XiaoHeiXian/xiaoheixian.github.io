---
layout: article
title: "Git 分布式版本控制工具"
description: "概述：Git 是分布式版本控制系统，相比 SVN 具有无单点故障、容错性强的优势。 核心概念：分为工作区、暂存区和本地版本库，并最终推送到远程仓库。 环境配置：安装后需全局配置 user.name 与 user.email。 本地操作：涵盖 init、status、add、commit、reset、rm 及 .gitignore 忽略配置。 远程操作：支持 remote 管理、clone 克隆、fetch/pull 拉取与 push 推送。"
date: 2026-11-09
category: "软件架构"
tags:
  - "开发工具"
  - "Git"
  - "版本控制"
permalink: /posts/2026-11-09-git-version-control.html
---

## 1. Git概述

### 1.1 Git历史

Git 诞生于一个极富纷争大举创新的年代。Linux 内核开源项目有着为数众多的参与者。绝大多数的 Linux 内核维护工作都花在了提交补丁和保存归档的繁琐事务上（1991 - 2002年间）。到 2002 年，整个项目组开始启用一个专有的分布式版本控制系统 BitKeeper 来管理和维护代码。

到了 2005 年，开发 BitKeeper 的商业公司同 Linux 内核开源社区的合作关系结束，他们收回了 Linux 内核社区免费使用 BitKeeper 的权力。这就迫使 Linux 开源社区（特别是 Linux 的缔造者 Linus Torvalds）基于使用 BitKeeper 时的经验教训，开发出自己的版本系统。

他们对新的系统制订了若干目标：

- 速度
- 简单的设计
- 对非线性开发模式的强力支持（允许成千上万个并行开发的分支）
- 完全分布式
- 有能力高效管理类似 Linux 内核一样的超大规模项目（速度和数据量）

### 1.2 Git与SVN对比

SVN 是集中式版本控制系统，版本库是集中放在中央服务器的，而开发人员工作的时候，用的都是自己的电脑，所以首先要从中央服务器下载最新的版本，然后开发，开发完后，需要把自己开发的代码提交到中央服务器。

集中式版本控制工具缺点：

- 服务器单点故障
- 容错性差

Git 是分布式版本控制系统（Distributed Version Control System，简称 DVCS），分为两种类型的仓库：本地仓库和远程仓库。

- 本地仓库：是在开发人员自己电脑上的 Git 仓库
- 远程仓库：是在远程服务器上的 Git 仓库

相关操作：

- Clone：克隆，就是将远程仓库复制到本地
- Push：推送，就是将本地仓库代码上传到远程仓库
- Pull：拉取，就是将远程仓库代码下载到本地仓库

### 1.3 Git工作流程

工作流程如下：

1. 从远程仓库中克隆代码到本地仓库
2. 从本地仓库中 checkout 代码然后进行代码修改
3. 在提交前先将代码提交到暂存区
4. 提交到本地仓库。本地仓库中保存修改的各个历史版本
5. 修改完成后，需要和团队成员共享代码时，将代码 push 到远程仓库

### 1.4 Git下载与安装

双击下载的安装文件来安装 Git。

安装完成后在电脑桌面（也可以是其他目录）点击右键，如果能够看到如下两个菜单则说明 Git 安装成功。

- Git GUI：Git 提供的图形界面工具
- Git Bash：Git 提供的命令行工具

## 2. Git代码托管服务

### 2.1 常用的Git代码托管服务

前面我们已经知道了 Git 中存在两种类型的仓库，即本地仓库和远程仓库。那么我们如何搭建 Git 远程仓库呢？我们可以借助互联网上提供的一些代码托管服务来实现，其中比较常用的有 GitHub、码云、GitLab 等。

- GitHub（地址：https://github.com/）是一个面向开源及私有软件项目的托管平台，因为只支持 Git 作为唯一的版本库格式进行托管，故名 GitHub。
- 码云（地址：https://gitee.com/）是国内的一个代码托管平台，由于服务器在国内，所以相比于 GitHub，码云速度会更快。
- GitLab（地址：https://about.gitlab.com/）是一个用于仓库管理系统的开源项目，使用 Git 作为代码管理工具，并在此基础上搭建起来的 web 服务。

### 2.2 在码云注册账号

要想使用码云的相关服务，需要注册账号（地址：https://gitee.com/signup）。

### 2.3 登录码云并创建Git远程仓库

注册完成后就可以使用刚刚注册的邮箱进行登录（地址：https://gitee.com/login）。

登录成功后就可以创建 Git 远程仓库。

创建完成后可以查看仓库信息。每个 Git 远程仓库都会对应一个网络地址，可以点击克隆/下载按钮弹出窗口并点击复制按钮获得这个网络地址。

我们当前创建的 Git 远程仓库对应的地址为：https://gitee.com/hong-hh-hu/myGitRepo.git

### 2.4 邀请其他用户成为仓库成员

前面已经在码云上创建了自己的远程仓库，目前仓库成员只有自己一个人（身份为管理员）。在企业实际开发中，一个项目往往是由多个人共同开发完成的，为了使多个参与者都有权限操作远程仓库，就需要邀请其他项目参与者成为当前仓库的成员。

## 3. Git常用命令

### 3.1 环境配置

当安装 Git 后首先要做的事情是设置用户名称和 email 地址。这是非常重要的，因为每次 Git 提交都会使用该用户信息。

设置用户信息：

    git config --global user.name "itcast"
    git config --global user.email "hello@itcast.cn"

查看配置信息：

    git config --list
    git config user.name

通过上面的命令设置的信息会保存在 ~/.gitconfig 文件中。

### 3.2 获取Git仓库

要使用 Git 对我们的代码进行版本控制，首先需要获得 Git 仓库。

获取 Git 仓库通常有两种方式：

- 在本地初始化一个 Git 仓库
- 从远程仓库克隆

#### 3.2.1 在本地初始化一个Git仓库

执行步骤如下：

1. 在电脑的任意位置创建一个空目录（例如 repo1）作为我们的本地 Git 仓库。
2. 进入这个目录中，点击右键打开 Git bash 窗口。
3. 执行命令 git init。

如果在当前目录中看到 .git 文件夹（此文件夹为隐藏文件夹）则说明 Git 仓库创建成功。

#### 3.2.2 从远程仓库克隆

可以通过 Git 提供的命令从远程仓库进行克隆，将远程仓库克隆到本地。命令形式为：

    git clone 远程Git仓库地址

### 3.3 工作目录、暂存区以及版本库概念

为了更好的学习 Git，我们需要了解 Git 相关的一些概念，这些概念在后面的学习中会经常提到。

- 版本库：前面看到的 .git 隐藏文件夹就是版本库，版本库中存储了很多配置信息、日志信息和文件版本信息等。
- 工作目录（工作区）：包含 .git 文件夹的目录就是工作目录，主要用于存放开发的代码。
- 暂存区：.git 文件夹中有很多文件，其中有一个 index 文件就是暂存区，也可以叫做 stage。暂存区是一个临时保存修改文件的地方。

工作区 -> (git add) -> 暂存区 -> (git commit) -> 版本库

### 3.4 Git工作目录下文件的两种状态

Git 工作目录下的文件存在两种状态：

- untracked 未跟踪（未被纳入版本控制）
- tracked 已跟踪（被纳入版本控制）
    - Unmodified 未修改状态
    - Modified 已修改状态
    - Staged 已暂存状态

这些文件的状态会随着我们执行 Git 的命令发生变化。

### 3.5 本地仓库操作

git status 查看文件状态：

    $ git status
    On branch master
    Your branch is ahead of 'origin/master' by 2 commits.
      (use "git push" to publish your local commits)

    Untracked files:
      (use "git add <file>..." to include in what will be committed)
            .gitignore

    nothing added to commit but untracked files present (use "git add" to track)

也可以使用 git status -s 使输出信息更加简洁：

    $ git status -s
    ?? .gitignore

git add 将未跟踪的文件加入暂存区：

    $ git add hello.txt

将新创建的文件加入暂存区后查看文件状态：

    $ git status
    On branch master
    Your branch is ahead of 'origin/master' by 2 commits.
      (use "git push" to publish your local commits)

    Changes to be committed:
      (use "git reset HEAD <file>..." to unstage)
            new file:   hello.txt

git reset 将暂存区的文件取消暂存：

    $ git reset hello.txt

将文件取消暂存后查看文件状态：

    $ git status
    On branch master
    Your branch is ahead of 'origin/master' by 2 commits.
      (use "git push" to publish your local commits)

    Untracked files:
      (use "git add <file>..." to include in what will be committed)
            hello.txt

    nothing added to commit but untracked files present (use "git add" to track)

git commit 将暂存区的文件修改提交到本地仓库：

    $ git add hello.txt

    $ git status
    On branch master
    Your branch is ahead of 'origin/master' by 2 commits.
      (use "git push" to publish your local commits)

    Changes to be committed:
      (use "git reset HEAD <file>..." to unstage)
            new file:   hello.txt

    $ git commit -m "init hello.txt" hello.txt
    [master ce61b24] init hello.txt
     1 file changed, 0 insertions(+), 0 deletions(-)
     create mode 100644 hello.txt

git rm 删除文件：

    $ git rm hello.txt
    rm 'hello.txt'

删除文件后查看文件状态：

    $ git status
    On branch master
    Your branch is ahead of 'origin/master' by 6 commits.
      (use "git push" to publish your local commits)

    Changes to be committed:
      (use "git reset HEAD <file>..." to unstage)
            deleted:    hello.txt

上面删除的只是工作区的文件，需要提交到本地仓库：

    $ git commit -m "delete hello.txt"
    [master 625d116] delete hello.txt
     1 file changed, 0 insertions(+), 0 deletions(-)
     delete mode 100644 hello.txt

将文件添加至忽略列表：

一般我们总会有些文件无需纳入 Git 的管理，也不希望它们总出现在未跟踪文件列表。通常都是些自动生成的文件，比如日志文件，或者编译过程中创建的临时文件等。在这种情况下，我们可以在工作目录中创建一个名为 .gitignore 的文件（文件名称固定），列出要忽略的文件模式。下面是一个示例：

    # no .a files
    *.a

    # but do track lib.a, even though you're ignoring .a files above
    !lib.a

    # only ignore the TODO file in the current directory, not subdir/TODO
    /TODO

    # ignore all files in the build/ directory
    build/

    # ignore doc/notes.txt, but not doc/server/arch.txt
    doc/*.txt

    # ignore all .pdf files in the doc/ directory
    doc/**/*.pdf

git log 查看日志记录：

    $ git log
    commit c426b432ed760a96842eb5a0b70fc89881cd5e31 (HEAD -> master)
    Author: itcast <hello@itcast.cn>
    Date:   Tue Feb 12 20:06:36 2019 +0800

        delete abc

    commit 9c454c56168e7a4603659bc44a7bd335cb8d4aa5
    Author: itcast <hello@itcast.cn>
    Date:   Tue Feb 12 20:06:08 2019 +0800

        abc

    commit 625d11650e7a45b1950a24a976de9e0137ec49d2
    Author: itcast <hello@itcast.cn>
    Date:   Tue Feb 12 20:04:10 2019 +0800

        delete hello.txt

    commit 9f3a5aa855c93f3470f56bb29948101dd624b1de
    Author: itcast <hello@itcast.cn>
    Date:   Tue Feb 12 20:00:38 2019 +0800

        init hello.txt

### 3.6 远程仓库操作

前面执行的命令操作都是针对的本地仓库，本章节我们会学习关于远程仓库的一些操作，具体包括：

- 查看远程仓库
- 添加远程仓库
- 从远程仓库克隆
- 移除无效的远程仓库
- 从远程仓库中抓取与拉取
- 推送到远程仓库

查看远程仓库：

如果想查看已经配置的远程仓库服务器，可以运行 git remote 命令。它会列出指定的每一个远程服务器的简写。如果已经克隆了远程仓库，那么至少应该能看到 origin，这是 Git 克隆的仓库服务器的默认名字。

    $ git remote
    origin

    $ git remote -v
    origin  https://gitee.com/ChuanZhiBoKe/myGitRepo.git (fetch)
    origin  https://gitee.com/ChuanZhiBoKe/myGitRepo.git (push)

    $ git remote show origin
    * remote origin
      Fetch URL: https://gitee.com/ChuanZhiBoKe/myGitRepo.git
      Push  URL: https://gitee.com/ChuanZhiBoKe/myGitRepo.git
      HEAD branch: master
      Remote branch:
        master tracked
      Local branch configured for 'git pull':
        master merges with remote master
      Local ref configured for 'git push':
        master pushes to master (fast-forwardable)

添加远程仓库：

运行 git remote add <shortname> <url> 添加一个新的远程 Git 仓库，同时指定一个可以引用的简写。

    $ git remote add origin https://gitee.com/ChuanZhiBoKe/repo1.git

从远程仓库克隆：

如果你想获得一份已经存在了的 Git 仓库的拷贝，这时就要用到 git clone 命令。 Git 克隆的是该 Git 仓库服务器上的几乎所有数据（包括日志信息、历史记录等），而不仅仅是复制工作所需要的文件。 当你执行 git clone 命令的时候，默认配置下远程 Git 仓库中的每一个文件的每一个版本都将被拉取下来。

克隆仓库的命令格式是：

    git clone [url]

移除无效的远程仓库：

如果因为一些原因想要移除一个远程仓库 ，可以使用 git remote rm。

    $ git remote rm origin

注意：此命令只是从本地移除远程仓库的记录，并不会真正影响到远程仓库。

从远程仓库中抓取与拉取：

git fetch 是从远程仓库获取最新版本到本地仓库，不会自动 merge。

    $ git fetch origin master
    From https://gitee.com/ChuanZhiBoKe/repo1
     * branch            master     -> FETCH_HEAD
     * [new branch]      master     -> origin/master

    $ git merge origin/master

git pull 是从远程仓库获取最新版本并 merge 到本地仓库。

    $ git pull origin master
    From https://gitee.com/ChuanZhiBoKe/repo1
     * branch            master     -> FETCH_HEAD
     * [new branch]      master     -> origin/master

注意：如果当前本地仓库不是从远程仓库克隆，而是本地创建的仓库，并且仓库中存在文件，此时再从远程仓库拉取文件的时候会报错（fatal: refusing to merge unrelated histories），解决此问题可以在 git pull 命令后加入参数 --allow-unrelated-histories。

推送到远程仓库：

当你想分享你的代码时，可以将其推送到远程仓库。 命令形式：

    git push [remote-name] [branch-name]

推送时出现身份认证：使用私人令牌（PAT）代替密码。

第一步：获取 Gitee 私人访问令牌（PAT）

1. 登录 Gitee 网页版。
2. 点击右上角头像 -> 【设置】。
3. 在左侧菜单找到 【安全设置】 -> 【私人令牌】。
4. 点击右上角 【+ 生成新令牌】。
5. 令牌描述：随便填（比如“我的电脑”）。
6. 勾选权限：必须勾选 projects（包含仓库的读写权限）。
7. 点击 【提交】。
8. 重要：复制弹出的那串长令牌（Token），它只会在此时显示一次，关闭就找不到了。

正确填法：

- Username：你的 Gitee 用户名（或绑定的手机号/邮箱，但通常填用户名最稳妥）。
- Password：你在 Gitee 后台生成的私人访问令牌（一串很长的字母数字组合，通常以 gitee_ 开头）。

## 4. 流程图文字推演

### Git 工作流程

远程仓库（Remote） --> Clone --> 本地仓库（Repository） --> Checkout --> 工作区（Workspace）

工作区（Workspace） --> Add --> 暂存区（Index/Stage） --> Commit --> 本地仓库（Repository）

本地仓库（Repository） --> Push --> 远程仓库（Remote）

远程仓库（Remote） --> Pull（Fetch + Merge） --> 工作区（Workspace）

### push 流程

方式一：远程克隆进行 push

1. git clone https://gitee.com/hong-hh-hu/mall-c-cloud.git
2. 在工作区创建 hello.txt，用 git add . 将文件添加到暂存区
3. git commit -m 'add hello.txt' 将暂存区的文件添加到版本库
4. 查看 git remote
5. git push origin master 将代码推送到远程

方式二：本地仓库初始化

1. git init 初始化本地仓库
2. 在工作区创建 hello.txt，用 git add . 将文件添加到暂存区
3. git commit -m 'add hello.txt' 将暂存区的文件添加到版本库
4. git remote add origin https://gitee.com/hong-hh-hu/23repo1.git 添加远程仓库 origin 的仓库地址
5. git push origin master

## 💡 **速记**

【核心考点】

Git 是分布式版本控制系统，本地和远程都有完整仓库，无单点故障。工作流核心为：工作区 -> 暂存区 -> 本地仓库 -> 远程仓库。

常用命令分类记忆：

- 本地操作：init、status、add、commit、reset、rm、log。
- 远程操作：remote、clone、fetch、pull、push。
- 忽略文件：配置 .gitignore，支持通配符（如 *.a、!lib.a、build/）。

【高频逻辑链】

环境配置（user.name/email） --> 获取仓库（init/clone） --> 编写代码 --> 暂存（add） --> 提交（commit） --> 拉取（pull） --> 推送（push）。

【关键避坑】

git pull 相当于 git fetch + git merge，如果本地仓库是独立创建的，拉取远程代码时可能报错“refusing to merge unrelated histories”，需加上 --allow-unrelated-histories 参数。

推送到 Gitee 时，输入密码的环节现在通常需要填写“私人令牌（PAT）”而非登录密码，需提前在后台生成并保存。
