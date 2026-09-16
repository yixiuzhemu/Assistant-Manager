/**
 * Locale bundles for the assistant management section and its Chat selector.
 * One namespace (`settings.assistant`) owns every string both surfaces render;
 * the section re-registers on locale change so the nav label follows the
 * active language without a page reload.
 *
 * @module @assistant-manager/assistant-manager/client/locales
 */

/** Locale keys the assistant management surfaces render. */
export type AssistantManagerLocaleKey =
  | 'nav' | 'title' | 'subtitle'
  | 'createAssistant' | 'searchPlaceholder' | 'myAssistants' | 'selected'
  | 'select' | 'deselect' | 'remove' | 'active'
  | 'selectAssistant' | 'noAssistant'
  | 'emptyNone' | 'emptyNoneShort' | 'emptyNoMatch'
  | 'actionFailed' | 'deleteConfirm' | 'cancel'
  | 'configPath'
  | 'createPrompt' | 'createTriggered' | 'noWorkspace'

/** English copy. */
export const en: Record<AssistantManagerLocaleKey, string> = {
  nav: 'Assistants',
  title: 'Assistant Manager',
  subtitle: 'Manage your AI assistants. Select one to inject its profile as context in Chat.',
  createAssistant: 'Create Assistant',
  searchPlaceholder: 'Search assistants…',
  myAssistants: 'My Assistants',
  selected: '1 selected',
  select: 'Select',
  deselect: 'Deselect',
  remove: 'Delete',
  active: 'Active',
  selectAssistant: 'Select Assistant',
  noAssistant: 'No Assistant',
  emptyNone: 'No assistants yet. Create one to get started!',
  emptyNoneShort: 'No assistants yet.',
  emptyNoMatch: 'No assistant matches this search.',
  actionFailed: 'Action failed:',
  deleteConfirm: 'Confirm',
  cancel: 'Cancel',
  configPath: 'Storage: {path}',
  createPrompt: `Now help me create an assistant. Next, you need to confirm the following information with me one by one:

1. **Assistant Name**: (required) The name of the assistant
2. **Description**: (required) A one-line description of the assistant's purpose
3. **Domain Tags**: (required) Comma-separated tags for the assistant's expertise areas (e.g.: programming, code review, debugging)
4. **Capability Tags**: (required) Comma-separated tags for the assistant's capabilities (e.g.: code generation, bug analysis, architecture advice)
5. **Avatar**: (optional) A URL or emoji for the assistant's avatar (defaults to 🤖 if not specified)
6. **Customization Info**: (optional) Any special behavior or style you want the assistant to have

Please ask me for each piece of information one at a time, and wait for my response before moving to the next one.

After collecting all the information, you MUST generate a complete Markdown configuration file with YAML frontmatter. The file format is CRITICAL and must be followed exactly:

**THE FILE MUST START WITH "---" ON THE FIRST LINE, FOLLOWED BY YAML FRONTMATTER, THEN ANOTHER "---", THEN THE MARKDOWN BODY.**

Here is the EXACT format you must use (do not deviate from this):

\`\`\`
---
name: "Assistant Name"
avatar: "🤖"
description: "One-line description"
tags:
  - tag1
  - tag2
capabilities:
  - capability1
  - capability2
customInfo: "Optional customization notes"
---

# Role Definition

[Detailed role definition based on the collected information]

# Domain Expertise

[Domain expertise description]

# Work Style

[Work style description]

# Interaction Approach

[Interaction approach description]
\`\`\`

**CRITICAL REQUIREMENTS:**
1. The file MUST begin with \`---\` on the very first line
2. The YAML frontmatter section MUST contain ALL of these fields: name, avatar, description, tags, capabilities, customInfo
3. The frontmatter section MUST end with another \`---\` on its own line
4. After the second \`---\`, write the markdown body with role definition, domain expertise, work style, and interaction approach
5. The \`tags\` and \`capabilities\` fields MUST be YAML arrays (each item on a new line starting with \`  - \`)

**AFTER GENERATING THE FILE CONTENT:**
Tell me to save the COMPLETE content (including the YAML frontmatter between the two \`---\` markers) as \`assistant.md\` in a new folder. The folder path should be: \`~/.dsh/assistant/<folder-name>/assistant.md\` where <folder-name> is the assistant name in lowercase with spaces replaced by hyphens.

**THE ASSISTANT MODULE WILL FAIL TO LOAD THE ASSISTANT IF THE YAML FRONTMATTER IS MISSING OR INCORRECTLY FORMATTED.**`,
  createTriggered: 'Creating assistant... The prompt has been filled in the Chat input and will be sent automatically.',
  noWorkspace: 'Please select or create a workspace first before creating an assistant.',
}

/** Simplified Chinese copy. */
export const zh: Record<AssistantManagerLocaleKey, string> = {
  nav: '助手',
  title: '助手管理',
  subtitle: '管理你的 AI 助手。选择一个助手将其信息作为上下文注入到 Chat 对话中。',
  createAssistant: '创建助手',
  searchPlaceholder: '搜索助手…',
  myAssistants: '我的助手',
  selected: '已选择 1 个',
  select: '选择',
  deselect: '取消选择',
  remove: '删除',
  active: '使用中',
  selectAssistant: '选择助手',
  noAssistant: '不使用助手',
  emptyNone: '还没有任何助手，创建一个开始使用吧！',
  emptyNoneShort: '还没有任何助手。',
  emptyNoMatch: '没有匹配此搜索的助手。',
  actionFailed: '操作失败：',
  deleteConfirm: '确认删除',
  cancel: '取消',
  configPath: '存储路径：{path}',
  createPrompt: `现在帮我创建一个助手。接下来你需要依次向我确认以下信息：

1. **助手名称**：（必填）助手的名称
2. **助手描述**：（必填）一句话描述助手定位
3. **擅长领域标签**：（必填）用逗号分隔的领域标签（如：编程,代码审查,调试）
4. **能力标签**：（必填）用逗号分隔的能力标签（如：代码生成,Bug分析,架构建议）
5. **头像**：（可选）URL或emoji，不提供则使用默认头像 🤖
6. **定制化信息**：（可选）任何你希望助手具备的特殊行为或风格

请逐个询问我这些信息，等待我的回答后再询问下一个。

收集完所有信息后，你**必须**生成一个带有 YAML frontmatter 的完整 Markdown 配置文件。文件格式**至关重要**，必须严格遵循：

**文件必须从第一行的 "---" 开始，然后是 YAML frontmatter，再是另一个 "---"，最后是 Markdown 正文。**

以下是你**必须**使用的确切格式（不要偏离）：

\`\`\`
---
name: "助手名称"
avatar: "🤖"
description: "一句话描述"
tags:
  - 标签1
  - 标签2
capabilities:
  - 能力1
  - 能力2
customInfo: "可选的定制化信息"
---

# 角色定义

[基于收集的信息生成详细的角色定义]

# 擅长领域

[擅长领域描述]

# 工作风格

[工作风格描述]

# 交互方式

[交互方式描述]
\`\`\`

**关键要求：**
1. 文件**必须**以 \`---\` 开头（第一行）
2. YAML frontmatter 部分**必须**包含所有字段：name, avatar, description, tags, capabilities, customInfo
3. frontmatter 部分**必须**以另一个 \`---\` 结束（单独一行）
4. 在第二个 \`---\` 之后，编写包含角色定义、擅长领域、工作风格和交互方式的 markdown 正文
5. \`tags\` 和 \`capabilities\` 字段**必须**是 YAML 数组（每项在新行以 \`  - \` 开头）

**生成文件内容后：**
告诉我将**完整内容**（包括两个 \`---\` 标记之间的 YAML frontmatter）保存为 \`assistant.md\` 文件，放在新文件夹中。文件夹路径应为：\`~/.dsh/assistant/<文件夹名>/assistant.md\`，其中 <文件夹名> 是助手名称的小写形式，空格替换为连字符。

**如果 YAML frontmatter 缺失或格式不正确，助手模块将无法加载该助手。**`,
  createTriggered: '正在创建助手... 提示词已填入 Chat 输入框并会自动发送。',
  noWorkspace: '请先选择或创建一个工作分区，然后再创建助手。',
}
