---
layout: article
title: "Git 进阶：分支、标签、工具集成与 SSH"
description: "分支管理：掌握查看、创建、切换、推送、合并与删除分支的操作。 标签管理：为特定提交打上版本标签，便于版本发布与回溯。 TortoiseGit：使用图形化界面工具简化 Git 日常操作。 IDEA 集成：在 IDEA 中直接完成提交、分支切换、合并与冲突解决。 SSH 协议：配置密钥对，实现免密安全的数据传输。"
date: 2026-11-09
category: "软件架构"
tags:
  - "开发工具"
  - "Git"
  - "版本控制"
  - "IDEA"
  - "SSH"
permalink: /posts/2026-11-09-git-advanced-branch-tag-tools.html
---

## 3.7 Git分支

几乎所有的版本控制系统都以某种形式支持分支。 使用分支意味着你可以把你的工作从开发主线上分离开来，以免影响开发主线。 Git 的 master 分支并不是一个特殊分支。 它跟其它分支没有区别。 之所以几乎每一个仓库都有 master 分支，是因为 git init 命令默认创建它，并且大多数人都懒得去改动它。

在本章节我们会学习到关于分支的相关命令，具体如下：

### 1、查看分支

    # 列出所有本地分支
    $ git branch

    # 列出所有远程分支
    $ git branch -r

    # 列出所有本地分支和远程分支
    $ git branch -a

### 2、创建分支

    $ git branch b1

    $ git branch
    b1
    * master

### 3、切换分支

    $ git checkout b1
    Switched to branch 'b1'

思考：分支之间是独立的嘛？

在 b1 分支，创建 b1.txt。 在 master 分支能看到吗？

工作区是公共的，暂存区是私有的，commit 是归属的。 你看到的“master 能看到 b1 的数据”，是工作区共享 + index 残留。

### 4、推送至远程仓库分支

    $ git push origin b1

### 5、合并分支

    $ git merge b3
    Updating 18d8a0a..8a52d65
    Fast-forward
     hello3.txt | 1 +
     1 file changed, 1 insertion(+)

有时候合并操作不会如此顺利。 如果你在两个不同的分支中，对同一个文件的同一个部分进行了不同的修改，Git 就没法合并它们，同时会提示文件冲突。此时需要我们打开冲突的文件并修复冲突内容，最后执行 git add 命令来标识冲突已解决。

    $ git merge b3
    Auto-merging UserMapper.xml
    CONFLICT (content): Merge conflict in UserMapper.xml
    Automatic merge failed; fix conflicts and then commit the result.

### 6、删除分支

    $ git branch -d b1
    Deleted branch b1 (was 520a40d).

如果要删除的分支中进行了一些开发动作，此时执行上面的删除命令并不会删除分支，如果坚持要删除此分支，可以将命令中的 -d 参数改为 -D。

    $ git branch -d b2
    error: The branch 'b2' is not fully merged.
    If you are sure you want to delete it, run 'git branch -D b2'.

    $ git branch -D b2
    Deleted branch b2 (was 075ab59).

如果要删除远程仓库中的分支，可以使用命令：

    git push origin -d branchName

### 7、综合应用

前面我们已经学习完成了 Git 分支相关的命令，本章节我们通过一个现实中的工作场景来对这些命令进行一个综合练习。

工作场景如下：

开发某个网站。

为实现某个新的需求，创建一个分支 feature/user-uuid。

在这个分支上开展工作。

正在此时，你突然接到一个电话说有个很严重的问题需要紧急修补。 你将按照如下方式来处理：

切换到你的线上分支（production branch）。

为这个紧急任务新建一个分支 hotfix/critical-bug，并在其中修复它。

在测试通过之后，切换回线上分支，然后合并这个修补分支，最后将改动推送到线上分支。

切换回你最初工作的分支上，继续工作。

## 3.8 Git标签

像其他版本控制系统（VCS）一样，Git 可以给历史中的某一个提交打上标签，以示重要。 比较有代表性的是人们会使用这个功能来标记发布结点（v1.0、v1.2等）。 标签指的是某个分支某个特定时间点的状态。 通过标签，可以很方便的切换到标记时的状态。

在本节中，我们将学习：

### 1、列出已有的标签

    # 列出所有 tag
    $ git tag

    # 查看 tag 信息
    $ git show [tag]

### 2、创建新标签

    # 新建一个 tag
    $ git tag [tagName]

    $ git tag
    v0.1
    v0.2

    $ git tag v0.3

    $ git tag
    v0.1
    v0.2
    v0.3

### 3、将标签推送至远程仓库

    # 提交指定 tag
    $ git push [remote] [tag]

### 4、检出标签

    # 新建一个分支，指向某个 tag
    $ git checkout -b [branch] [tag]

### 5、删除标签

    # 删除本地 tag
    $ git tag -d [tag]

    # 删除远程 tag
    $ git push origin :refs/tags/[tag]

## 4. 使用TortoiseGit管理文件版本

### 4.1 TortoiseGit下载与安装

TortoiseGit 是一款开源的 Git 图形界面工具，使用 TortoiseGit 可以简化 Git 相关的操作（本质上还是执行的 Git 相关命令）。

TortoiseGit 下载地址：https://tortoisegit.org/download/

下载完成可以得到如下安装程序：

    TortoiseGit-2.7.0.0-64bit.msi

直接双击安装即可，安装完成后在桌面（也可以是其他目录）点击右键，看到如下菜单则说明安装成功：

    Git Clone...
    Git Create repository here...
    TortoiseGit >

### 4.2 TortoiseGit使用

在前面我们已经通过 Git 命令完成了 Git 的常用操作，本章节我们会通过 TortoiseGit 来完成如下操作：

- 创建仓库
- 克隆仓库
- 将文件添加到暂存区
- 提交文件
- 推送本地仓库至远程仓库
- 拉取代码
- 创建分支
- 切换分支
- 合并分支

创建仓库：在目录中点击右键 -> Git Create repository here...

克隆仓库：在目录中点击右键 -> Git Clone...

将文件添加到暂存区：选择文件点击右键 -> TortoiseGit -> Add...

提交文件：选择文件点击右键 -> Git Commit -> "master"...

推送本地仓库至远程仓库：在目录中点击右键 -> TortoiseGit -> Push...

## 5. 在IDEA中使用Git

### 5.1 在IDEA中配置Git

安装好 IntelliJ IDEA 后，如果 Git 安装在默认路径下，那么 IDEA 会自动找到 Git 的位置，如果更改了 Git 的安装位置则需要手动配置下 Git 的路径。

选择 File -> Settings 打开设置窗口，找到 Version Control 下的 git 选项：

在 Path to Git executable 中填入 Git 的安装路径（如 C:\Program Files\Git\cmd\git.exe）。

选择 git 的安装目录后可以点击 “Test” 按钮测试是否正确配置。

### 5.2 在IDEA中使用Git

- 将文件添加到暂存区：选择文件点击右键 -> Git -> Add
- 提交文件：点击工具栏的绿色勾（Commit）按钮
- 提交文件格式说明：
    - feat：新功能
    - fix：Bug 修复
    - docs：文档
    - style：代码格式
    - refactor：重构
    - test：测试
    - chore：构建/工具
    - build：构建系统
    - ci：CI/CD
    - revert：回滚
- 将代码推送到远程仓库：右键项目 -> Git -> Repository -> Push...
- 从远程仓库克隆工程到本地：IDEA 启动界面 -> Check out from Version Control -> Git
- 从远程拉取代码：右键项目 -> Git -> Repository -> Pull...
- 版本对比：右键文件 -> Git -> Compare with...
- 创建分支：右键项目 -> Git -> Repository -> Branches... -> New Branch
- 切换分支：右键项目 -> Git -> Repository -> Branches... -> 选择分支 -> Checkout
- 分支合并：右键项目 -> Git -> Repository -> Merge Changes...
- 版本管理（Tag 规范）：v主版本.次版本.修订号-描述
    - v1.0.0：第一个正式发行版
    - v1.1.0：新增功能
    - v1.1.1：Bug 修复
    - v2.0.0：不兼容变更
    - v1.2.0-rc.1：候选发布版
    - v1.2.0-beta.2：测试版

## 6. 使用SSH协议传输数据

### 6.1 Git支持的传输协议

由于 Git 的远程仓库并不在我们本地，当我们在使用远程仓库的时候（例如克隆、拉取、推送）就会涉及到数据的网络传输，Git 支持多种数据传输协议：

- 本地协议（Local）
- HTTPS 协议
- SSH（Secure Shell）协议
- Git 协议

我们前面的操作都是基于 HTTPS 协议进行的，本章节我们会学习如何使用 SSH 协议。

### 6.2 什么是SSH协议

SSH 为 Secure Shell（安全外壳协议）的缩写，由 IETF 的网络小组（Network Working Group）所制定。 SSH 是目前较可靠，专为远程登录会话和其他网络服务提供安全性的协议。 利用 SSH 协议可以有效防止远程管理过程中的信息泄露问题。

由于本地 Git 仓库和远程仓库之间的传输是通过 SSH 加密的，所以必须要让远程仓库服务器认证你的身份。在认证之前，必须要生成 SSH key。

使用 ssh 协议通信时，推荐使用基于密钥的验证方式。你必须为自己创建一对密匙（公钥和私钥），并把公钥放到需要访问的服务器上。

### 6.3 配置SSH协议

可以使用 Git 提供的命令行工具 Git Bash 生成公钥和私钥，具体操作过程如下：

1、使用命令 ssh-keygen -t rsa -b 4096 生成公钥和私钥，执行完成后在 window 本地用户 .ssh 目录 C:\Users\用户名\.ssh 下面生成如下名称的公钥和私钥：

    id_rsa 私钥
    id_rsa.pub 公钥

2、复制公钥文件内容至码云服务器。

在 Gitee 的设置中找到 SSH 公钥，将刚刚生成的 id_rsa.pub 文件中的内容粘贴进去，点击确定。

配置成功后，就可以使用 SSH 地址进行克隆等操作了：

    $ git clone git@gitee.com:hong-hh-hu/repo1.git

## 7. 流程图文字推演

### Git 分支工作流（Feature Branch Workflow）

从 master 拉取最新代码 --> 创建并切换到新分支（如 feature/login） --> 在新分支开发并提交代码 --> 推送新分支到远程仓库 --> 提交 Pull Request 或 Merge Request --> 代码评审通过后合并到 master --> 删除已合并的本地和远程分支

### 解决冲突流程

执行 git merge 或 git pull 提示冲突 --> 打开冲突文件 --> 找到冲突标记（<<<<<<< HEAD、=======、>>>>>>> 分支名） --> 手动修改保留需要的代码 --> 删除冲突标记 --> 执行 git add . 标记已解决 --> 执行 git commit 提交合并结果

## 💡 **速记**

【核心考点】

分支操作：创建（git branch）、切换（git checkout）、合并（git merge）、删除（git branch -d）。合并冲突需手动修改代码、删除冲突标记并重新提交。

标签管理：用于标记发布版本（如 v1.0.0）。创建（git tag）、推送（git push origin tag）、删除（git tag -d）。

SSH 配置：通过 ssh-keygen 生成公私钥，将公钥配置到代码托管平台，即可实现免密安全传输。

IDEA 集成：熟练使用 IDEA 的 Git 插件进行 Add、Commit、Push、Pull、Branch 操作，注意提交信息的规范（feat、fix 等）。

【高频逻辑链】

功能开发分支流：从 master 切出 feature 分支 --> 开发完成并 commit --> push 到远程 --> 合并回 master。

冲突解决：合并报错 --> 编辑冲突文件（删标记） --> git add . --> git commit。

【关键避坑】

合并冲突时，必须彻底清理文件中的冲突标记（<<<<<<<、=======、>>>>>>>），否则代码无法编译运行。

删除未合并的分支时，需使用 git branch -D 强制删除。删除远程分支使用 git push origin -d 分支名。
