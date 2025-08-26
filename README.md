# Mermaid Render Anywhere

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/jianduo1/mermaid-render-anywhere)
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
  <img src="https://github.com/jianduo1/mermaid-render-anywhere/blob/main/icon.jpg" width="200" alt="Mermaid Render Anywhere Icon">
</div>

## 🖼️ 效果展示

![Demo](https://github.com/jianduo1/mermaid-render-anywhere/blob/main/assets/render.png)


## ✨ 功能特性

### 🎨 弹出式预览
- **拖拽移动**: 点击并拖拽图表进行移动
- **鼠标滚轮缩放**: 使用鼠标滚轮进行缩放
- **按钮缩放**: 点击放大/缩小/重置按钮
- **美观界面**: 现代化的卡片式设计
- **复制代码**: 一键复制Mermaid代码

### 📊 图表支持
- 流程图 (graph)
- 时序图 (sequenceDiagram)  
- 类图 (classDiagram)
- 状态图 (stateDiagram)
- 甘特图 (gantt)
- 饼图 (pie)

### ⚡ 快速操作
- 右键菜单快速访问
- 键盘快捷键支持
- 实时渲染预览

## 🚀 使用方法

1. 将光标放在包含Mermaid图表的Python函数中
2. 右键选择 **"提取所有Mermaid图表"** 或使用快捷键 `Cmd+R`
3. 在弹出的预览窗口中享受拖拽和缩放功能！



## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+R` | 打开Mermaid图表预览 |

## 📝 使用示例

### 🤖 AI辅助工作流生成

**推荐提示词：**
```
💡 分析这个函数功能，在函数doc注释里面，添加mermaid执行链路工作流。
```

使用此提示词让AI分析并生成如下工作流：

```python
def data_processing_pipeline():
    """
    数据处理管道
    
    ```mermaid
    graph TD
        A[输入数据] --> B[数据验证]
        B --> C{数据有效?}
        C -->|是| D[数据清洗]
        C -->|否| E[错误处理]
        D --> F[特征提取]
        F --> G[模型训练]
        G --> H[结果输出]
        E --> H
    ```
    """
    pass

def user_authentication_flow():
    """
    用户认证流程
    
    ```mermaid
    sequenceDiagram
        participant U as 用户
        participant A as 应用
        participant S as 服务器
        
        U->>A: 输入凭证
        A->>S: 验证请求
        S-->>A: 验证结果
        A-->>U: 登录成功/失败
    ```
    """
    pass
```

## 📦 安装

### 从VSCode市场安装
1. 在VSCode中打开扩展面板 (`Ctrl+Shift+X`)
2. 搜索 "Mermaid Render Anywhere"
3. 点击安装

### 从源码安装
```bash
git clone https://github.com/jianduo1/mermaid-render-anywhere.git
cd mermaid-render-anywhere
npm install
npm run compile
```

## 🛠️ 开发

### 环境要求
- Node.js >= 16.x
- VSCode >= 1.74.0
- TypeScript

### 开发步骤
```bash
# 克隆项目
git clone https://github.com/jianduo1/mermaid-render-anywhere.git
cd mermaid-render-anywhere

# 安装依赖
npm install

# 编译项目
npm run compile

# 监听模式 (开发时使用)
npm run watch
```

### 调试
1. 在VSCode中打开项目
2. 按 `F5` 启动调试模式
3. 在新的VSCode窗口中测试扩展

### 项目结构
```
mermaid-render-anywhere/
├── src/
│   ├── extension.ts          # 主扩展文件
│   ├── mermaid-preview.html  # 预览页面模板
│   ├── webview-script.js     # 前端交互脚本
│   ├── webview-styles.css    # 样式文件
│   └── libs/
│       └── mermaid.min.js    # Mermaid库
├── tests/                    # 测试文件
├── package.json             # 项目配置
└── README.md               # 项目说明
```

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 🔗 相关链接

- [GitHub仓库](https://github.com/jianduo1/mermaid-render-anywhere)
- [Mermaid官方文档](https://mermaid.js.org/)
- [VSCode扩展开发指南](https://code.visualstudio.com/api) 