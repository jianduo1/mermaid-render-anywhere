# Mermaid Render Anywhere

[![Version](https://img.shields.io/badge/version-0.0.3-blue.svg)](https://github.com/jianduo1/mermaid-render-anywhere)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🤖 AI辅助的效率神器

> **💡 Vibe Coding 最佳实践**  
> 使用AI分析函数功能，自动生成Mermaid执行链路工作流图。开发者只需理解工作流逻辑，无需深入实现细节！

**✨ 核心价值：让AI成为你的代码理解助手**
- 🧠 **自动分析**：智能解析函数逻辑和执行流程
- 📊 **可视化**：自动生成直观的Mermaid工作流图
- ⚡ **高效开发**：专注业务逻辑，减少代码阅读时间
- 🎯 **快速理解**：新手也能快速掌握复杂代码结构

---

在Python函数文档中渲染Mermaid工作流预览的VSCode扩展。支持多种Mermaid图表类型的实时预览，提供现代化的交互体验。

<div align="center">
  <img src="https://raw.githubusercontent.com/jianduo1/mermaid-render-anywhere/main/icon.jpg" width="200" alt="Mermaid Render Anywhere Icon">
</div>

## 🖼️ 效果展示

![Demo](https://raw.githubusercontent.com/jianduo1/mermaid-render-anywhere/main/assets/render.png)


## ✨ 功能特性

### 🎯 两种预览方式

#### 📋 侧栏预览 vs 📑 页签预览

| 特性 | 📋 侧栏预览 | 📑 页签预览 |
|------|-------------|-------------|
| **显示位置** | VSCode左侧栏 | 编辑器页签区域 |
| **触发方式** | 脚本按钮"📋 侧栏预览" / 右键菜单 | 脚本按钮"📑 页签预览" |
| **预览范围** | 单个/多个Mermaid图表 | 单个/多个Mermaid图表 |
| **大图预览** | 覆盖整个IDE界面 | 仅在当前页签内全屏 |
| **多任务处理** | ✅ 可同时编辑代码 | ❌ 占用编辑区域 |
| **空间利用** | 节省编辑区域空间 | 提供更大的预览空间 |
| **适用场景** | 持续参考查看 | 专注图表分析 |
| **交互体验** | 侧栏固定显示 | 类似独立窗口 |

#### 🔄 两步操作流程

1. **第一步 - 打开预览**：
   - 单个图表：点击代码块上方的"📋 侧栏预览"或"📑 页签预览"按钮
   - 多个图表：右键菜单选择"在侧边栏显示Mermaid图表"或快捷键 `Cmd+Shift+M`

2. **第二步 - 大图预览**：
   - 在已打开的预览中点击"预览大图"按钮
   - 侧栏模式：大图覆盖整个IDE界面
   - 页签模式：大图在当前页签内全屏显示

### 🎨 交互体验
- **拖拽移动**: 点击并拖拽图表进行移动
- **鼠标滚轮缩放**: 使用鼠标滚轮进行缩放操作
- **按钮缩放**: 点击放大/缩小/重置按钮精确控制
- **美观界面**: 现代化的卡片式设计，支持明暗主题
- **复制代码**: 一键复制Mermaid代码到剪贴板
- **全屏预览**: 支持全屏大图预览模式

### 📊 图表支持
- 流程图 (graph)
- 时序图 (sequenceDiagram)  
- 类图 (classDiagram)
- 状态图 (stateDiagram)
- 甘特图 (gantt)
- 饼图 (pie)
- 用户旅程图 (journey)
- Git图 (gitgraph)

### ⚡ 智能特性
- **语言支持**: Python, JavaScript, TypeScript, Java, Go
- **智能识别**: 自动识别函数、方法、类中的Mermaid图表
- **实时渲染**: 支持懒加载和智能重试机制
- **错误处理**: 完善的错误提示和恢复机制

## 🚀 使用方法

### 📋 侧栏预览模式  
1. **单个图表**：在代码中的Mermaid代码块上方点击 **"📋 侧栏预览"** 按钮
2. **多个图表**：右键菜单选择 **"在侧边栏显示Mermaid图表"** 或快捷键 `Cmd+Shift+M`
3. 图表将在左侧栏显示，可同时编辑代码
4. 点击预览中的"预览大图"按钮可全屏查看（覆盖整个IDE）

### 📑 页签预览模式  
1. **单个图表**：在代码中的Mermaid代码块上方点击 **"📑 页签预览"** 按钮
2. **多个图表**：右键菜单选择 **"提取所有Mermaid图表"** 或快捷键 `Cmd+R`
3. 图表将在新页签中显示，提供更大的预览空间
4. 点击预览中的"预览大图"按钮可在页签内全屏查看

### 🎛️ 预览操作
- **拖拽移动**: 鼠标拖拽图表
- **缩放操作**: 鼠标滚轮或缩放按钮  
- **全屏预览**: 点击预览按钮查看大图
  - 📋 侧栏模式：覆盖整个IDE界面
  - 📑 页签模式：在当前页签内全屏
- **复制导出**: 复制代码或导出SVG图片



## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+R` | 打开文件预览模式 |

## ⚙️ 配置选项

在VSCode设置中搜索 "Mermaid Render Anywhere" 可配置以下选项：

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `mermaidRenderAnywhere.displayButton.sidebarAndTab` | boolean | `true` | 控制侧栏预览和页签预览按钮显示 |
| `mermaidRenderAnywhere.displayButton.saveAsPng` | boolean | `true` | 控制保存PNG按钮显示，保存为PNG并在第二栏打开 |

### 配置示例

在 `settings.json` 中添加：

```json
{
  "mermaidRenderAnywhere.displayButton.sidebarAndTab": true,
  "mermaidRenderAnywhere.displayButton.saveAsPng": true
}
```

> 💡 **提示**: 
> - 如果你只想使用预览功能，可以将 `saveAsPng` 设为 `false` 来隐藏保存PNG按钮
> - 保存PNG功能需要全局安装 `@mermaid-js/mermaid-cli`：`npm install -g @mermaid-js/mermaid-cli`

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🔗 相关链接

- [GitHub仓库](https://github.com/jianduo1/mermaid-render-anywhere)
- [Mermaid官方文档](https://mermaid.js.org/)
- [VSCode扩展开发指南](https://code.visualstudio.com/api) 