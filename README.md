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

### 🎯 双模式预览

| 特性 | 📁 文件预览模式 | 🎨 脚本预览模式 |
|------|---------------|---------------|
| **触发方式** | 右键菜单 / `Cmd+R` | 点击代码块上方的预览按钮 |
| **预览范围** | 整个文件中的所有Mermaid图表 | 单个Mermaid代码块 |
| **适用场景** | 查看文件整体架构和流程 | 快速预览特定函数/方法的图表 |
| **界面布局** | 侧边栏多卡片展示 | 侧边栏单图表聚焦 |
| **智能定位** | 自动识别所有函数/类位置 | 精确定位当前代码块上下文 |
| **导出功能** | 支持批量导出 | 支持单图表导出 |
| **跳转功能** | 跳转到对应函数/类定义 | 跳转到Mermaid代码块位置 |

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

### 📁 文件预览模式
1. 在包含Mermaid图表的文件中右键选择 **"提取所有Mermaid图表"**
2. 或使用快捷键 `Cmd+R` 快速打开
3. 在侧边栏查看文件中的所有Mermaid图表

### 🎨 脚本预览模式  
1. 在代码中的Mermaid代码块上方会自动显示 **"🎨 预览图表"** 按钮
2. 点击按钮即可预览当前代码块的图表
3. 支持函数、方法、类中的Mermaid图表智能识别

### 🎛️ 预览操作
- **拖拽移动**: 鼠标拖拽图表
- **缩放操作**: 鼠标滚轮或缩放按钮
- **全屏预览**: 点击预览按钮查看大图
- **复制导出**: 复制代码或导出SVG图片



## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+R` | 打开文件预览模式 |

## ⚙️ 配置选项

在VSCode设置中搜索 "Mermaid Render Anywhere" 可配置以下选项：

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `mermaidRenderAnywhere.enableDisplayInlinedButton` | boolean | `true` | 启用/禁用Mermaid代码块上方的内联预览按钮 |

### 配置示例

在 `settings.json` 中添加：

```json
{
  "mermaidRenderAnywhere.enableDisplayInlinedButton": false
}
```

> 💡 **提示**: 如果你只想使用文件预览模式，可以将此选项设为 `false` 来隐藏内联预览按钮。

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🔗 相关链接

- [GitHub仓库](https://github.com/jianduo1/mermaid-render-anywhere)
- [Mermaid官方文档](https://mermaid.js.org/)
- [VSCode扩展开发指南](https://code.visualstudio.com/api) 