很好，这个问题本质是在问：

OpenClaw 的 skill 到底是“一个 Markdown 文件”，还是“一个完整的插件包”？

答案是：

✅ 最简单的 skill 可以只有一个 .md 文件
❗但很多实际 skill 会包含额外配置或运行依赖

下面我们按“复杂度层级”拆开讲，这样你能立刻判断某个 skill 需要什么。

⸻

一、最小 skill：只有 Markdown

这是 OpenClaw 支持的最轻量形式。

一个基础 skill 本质是：

prompt + metadata + tool 声明

通常写在：

skill-name.md

内容类似：

---

name: translator
description: translate text
tools: []

---

You are a translator...

这种 skill：

✅ 不需要额外文件
✅ 不依赖 MCP
✅ 不需要安装环境

OpenClaw 直接读取并执行。

适合：
• 翻译
• 总结
• prompt workflow
• LLM chain

⸻

二、声明工具的 skill

如果 .md 里有：

tools:

- filesystem.read

那意味着：

👉 skill 本身还是只有 md
👉 但你必须已有 MCP server

否则：

tool unavailable

所以：

skill 文件不增加
但运行环境需要工具支持。

⸻

三、带配置文件的 skill

一些 skill 会附带：

skill.yaml
config.json
manifest.yml

用于：
• 默认模型
• 参数
• 权限
• MCP endpoint 映射

这种属于：

👉 可选增强
👉 不一定必须

OpenClaw 能运行 md，但高级行为需要配置文件。

⸻

四、带代码的 skill（高级）

复杂 skill 可能包含：

skill/
├── skill.md
├── handler.py
├── tools/
└── requirements.txt

用于：
• 自定义工具逻辑
• API 调用
• 数据处理

这种 skill：

❗需要依赖安装
❗需要运行环境

但这不是 OpenClaw 的基础要求，而是扩展能力。

⸻

五、Docker 化 skill

有些 skill 会提供：

docker-compose.yml

用于：
• 自动启动 MCP server
• 运行依赖服务

这属于：

👉 打包便利方案
👉 非核心 requirement

⸻

判断 skill 是否需要额外文件的方法

看 skill README 或 md 头部：

如果你看到：

tools: []

👉 纯 md skill

⸻

如果看到：

requires MCP

👉 需要工具 server

⸻

如果看到：

pip install
npm install

👉 有运行依赖

⸻

实际运行规则

OpenClaw 加载 skill 时：

读取 md → 解析 metadata → 注册能力

它不会强制检查：
• Python 环境
• Node 模块
• MCP server

只有在调用时才报错。

⸻

总结

可以这样理解：

✔ 最简单情况

skill = 一个 md 文件

即可运行。

⸻

✔ 复杂 skill

可能需要：
• MCP server
• 配置文件
• 依赖代码

但这些是“功能需求”，不是 skill 机制本身。

⸻

一句话总结：

Markdown 是 skill 的核心载体，但是否需要额外文件，取决于 skill 的功能设计，而不是 OpenClaw 的硬性要求。

⸻

如果你愿意，我可以继续讲：

✅ 写一个从零开始的最小 skill
✅ skill metadata 规范
✅ 如何声明 MCP 工具
✅ skill 调度流程
✅ 多 skill 组合
✅ skill 权限模型
✅ 自动加载机制

你想深入哪部分？
