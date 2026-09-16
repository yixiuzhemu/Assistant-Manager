# Assistant-Manager（AI 助手管理平台）

面向 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）的 **AI 助手管理插件**，
单包双入口架构：Host 端管理 `~/.dsh/assistant/` 下每个助手的 Markdown 档案，Client 端渲染设置面板与 Chat 集成的助手选择器。

## 技术栈

- TypeScript + React（Hooks + Context）
- Cordis 插件框架（双入口：Host / Client）
- CSS Modules（样式隔离）
- YAML frontmatter（助手配置解析）

## 功能特性

| 功能 | 说明 |
| --- | --- |
| 助手卡片 | 卡片式 UI，一键查看、选择和管理 AI 助手 |
| Chat 创建 | 点击"创建助手"自动新建会话，由大模型生成助手配置 |
| 上下文注入 | 从 Chat 工具栏选择助手，自动注入其档案作为系统提示词 |
| 独立存储 | 每个助手存储在 `~/.dsh/assistant/<id>/assistant.md` |
| 搜索过滤 | 按名称、描述或标签快速查找助手 |
| 双语支持 | 完整的英文和简体中文本地化 |

## 快速开始

```bash
# 安装插件
dsh plugin --profile web add @assistant-manager/assistant-manager

# 重启 dsh web 后，打开 设置 → 助手
```

## 使用说明

### 创建助手

1. 点击 **"+ 创建助手"**
2. 自动新建会话并跳转到 Chat 界面，预填充创建提示词
3. 根据提示填写助手信息：
   - **名称**（必填）
   - **描述**（一句话定位）
   - **领域标签**（逗号分隔）
   - **能力标签**（逗号分隔）
   - **头像**（可选，emoji 或 URL，默认 🤖）
   - **定制化信息**（可选的特殊行为或风格）
4. 大模型生成配置并自动保存

### 选择助手

1. 点击 Chat 工具栏的助手选择下拉框
2. 选择助手激活，其档案将作为上下文注入
3. 选择"不使用助手"停用上下文注入

### 助手配置格式

```markdown
---
name: 编程专家
avatar: 👨‍💻
description: 专注于代码审查和调试的资深编程专家
tags:
  - 编程
  - 代码审查
capabilities:
  - 代码生成
  - Bug分析
customInfo: 偏好 TypeScript 和 Rust
---

# 编程专家

## 角色定义
你是一位资深的编程专家...
```

## 项目结构

```
src/
├── index.ts                    # Host 入口：AssistantRegistry
├── assistant-store.ts          # 文件系统存储
├── types.ts                    # 类型定义
├── client/
│   ├── index.ts                # Client 入口
│   ├── controller.ts           # 状态控制器
│   ├── assistant-remote.ts     # Remote 命名空间
│   ├── locales.ts              # 国际化 (en/zh)
│   ├── create-bridge.ts        # 创建事件桥接
│   ├── AssistantSection.tsx    # 设置面板组件
│   ├── AssistantChatSelector.tsx # 助手选择下拉框
│   └── CreateAssistantBridge.tsx # 会话创建桥接
```

## 架构说明

| 入口 | 平面 | 职责 |
| --- | --- | --- |
| `.` | Host (Node) | 管理助手文件夹，暴露 `assistant` Remote 命名空间 |
| `./client` | Client (Web) | 设置面板 + Chat 选择器，注入 `settings.section` 和 `chat.toolbar` |

## 版本兼容性

`@deepseek-ai/dsh-*` `0.1.5-rc.2` 或更新版本。

## 许可证

MIT
