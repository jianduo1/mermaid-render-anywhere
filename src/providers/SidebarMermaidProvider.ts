import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { BaseMermaidProvider } from "./BaseMermaidProvider";

/**
 * 侧栏 Mermaid 预览提供者
 * 使用 WebviewViewProvider 在侧栏中显示 Mermaid 图表
 */
export class SidebarMermaidProvider extends BaseMermaidProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'mermaidSidebar';
    
    private _view?: vscode.WebviewView;
    private _currentMermaidBlocks: string[] = [];
    private _currentLocationInfo?: {name: string; lineNumber: number; type: string; mermaidLineNumber: number}[];
    private _currentFilePath?: string;
    private _currentTitle: string = "Mermaid 图表预览";

    constructor(extensionUri: vscode.Uri) {
        super(extensionUri);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log("SidebarMermaidProvider.resolveWebviewView called");
        this._view = webviewView;

        webviewView.webview.options = {
            // 允许脚本
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        // 设置初始HTML内容 - 如果没有数据，显示欢迎页面
        if (this._currentMermaidBlocks.length === 0) {
            webviewView.webview.html = this._getWelcomeHtml();
            console.log("Sidebar showing welcome HTML");
        } else {
            try {
                webviewView.webview.html = this._getWebviewHtml(
                    webviewView.webview,
                    this._currentMermaidBlocks,
                    this._currentTitle,
                    this._currentLocationInfo,
                    this._currentFilePath
                );
                console.log("Sidebar webview HTML set successfully");
            } catch (error) {
                console.error("Error setting sidebar webview HTML:", error);
                webviewView.webview.html = this._getWelcomeHtml();
            }
        }

        // 处理来自webview的消息
        webviewView.webview.onDidReceiveMessage(data => {
            this._handleWebviewMessage(data);
        });
    }

    /**
     * 显示 Mermaid 图表（多个）
     */
    public showMermaid(
        mermaidBlocks: string[], 
        title: string, 
        locationInfo?: {name: string; lineNumber: number; type: string; mermaidLineNumber: number}[], 
        filePath?: string
    ): void {
        console.log("SidebarMermaidProvider.showMermaid called with:", {
            blocksCount: mermaidBlocks.length,
            title,
            locationInfoCount: locationInfo?.length,
            filePath
        });

        // 保存当前数据
        this._currentMermaidBlocks = mermaidBlocks;
        this._currentLocationInfo = locationInfo;
        this._currentFilePath = filePath;
        this._currentTitle = title;

        if (this._view) {
            console.log("Updating existing view");
            // 如果视图已经存在，更新内容
            this._view.webview.html = this._getWebviewHtml(
                this._view.webview,
                mermaidBlocks,
                title,
                locationInfo,
                filePath
            );
            
            // 显示视图
            this._view.show?.(true);
        } else {
            console.log("View not ready, showing sidebar container");
            // 如果视图还没有创建，先显示侧栏
            vscode.commands.executeCommand('workbench.view.extension.mermaidContainer');
        }
    }

    /**
     * 显示单个 Mermaid 图表
     */
    public showSingleMermaid(
        mermaidCode: string, 
        contextInfo: {name: string; type: string}, 
        lineNumber: number, 
        filePath?: string
    ): void {
        // 构建单个图表的数据
        const mermaidBlocks = [mermaidCode];
        const locationInfo = [
            {
                name: contextInfo.name,
                lineNumber: lineNumber,
                type: contextInfo.type,
                mermaidLineNumber: lineNumber,
            },
        ];

        // 生成标题
        const fileName = filePath ? path.basename(filePath, path.extname(filePath)) : "Mermaid图表";
        let title = "";

        switch (contextInfo.type) {
            case "function":
                title = `${fileName} - 函数 ${contextInfo.name}`;
                break;
            case "method":
                title = `${fileName} - 方法 ${contextInfo.name}`;
                break;
            case "class":
                title = `${fileName} - 类 ${contextInfo.name}`;
                break;
            default:
                title = `${fileName} - ${contextInfo.name}`;
                break;
        }

        // 调用通用的showMermaid方法
        this.showMermaid(mermaidBlocks, title, locationInfo, filePath);
    }

    /**
     * 显示大图预览 - 侧栏模式：覆盖整个 IDE
     */
    public showFullscreenPreview(svg: string, title: string, index: number): void {
        this._showFullscreenOverlay(svg, title, index);
    }

    /**
     * 创建全屏覆盖预览（覆盖整个IDE）
     */
    private async _showFullscreenOverlay(svg: string, title: string, index: number) {
        try {
            // 先隐藏侧边栏和面板以获得更好的全屏效果
            try {
                await vscode.commands.executeCommand("workbench.action.closeSidebar");
            } catch (error) {
                console.log("关闭侧边栏失败:", error);
            }

            try {
                await vscode.commands.executeCommand("workbench.action.closePanel");
            } catch (error) {
                console.log("关闭面板失败:", error);
            }

            // 尝试关闭辅助栏（可能在某些版本中不存在）
            try {
                await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
            } catch (error) {
                console.log("关闭辅助栏命令不存在，跳过");
            }

            // 创建全屏webview面板，占据整个工作区
            const fullscreenPanel = vscode.window.createWebviewPanel(
                "mermaidFullscreenOverlay", 
                "🎨 Mermaid 预览 - 全屏", 
                vscode.ViewColumn.Active, 
                {
                    enableScripts: true,
                    retainContextWhenHidden: false,
                    localResourceRoots: [this._extensionUri],
                    enableFindWidget: false,
                    enableCommandUris: false,
                }
            );

            // 设置HTML内容 - 使用特殊的全屏样式
            fullscreenPanel.webview.html = this._getFullscreenOverlayHtml(fullscreenPanel.webview, svg, title, index);

            // 尝试让面板获得焦点并最大化
            fullscreenPanel.reveal(vscode.ViewColumn.Active, false);

            // 处理面板关闭
            fullscreenPanel.onDidDispose(() => {
                // 恢复侧边栏（如果之前是打开的）
                try {
                    vscode.commands.executeCommand("workbench.action.toggleSidebarVisibility");
                } catch (error) {
                    console.log("恢复侧边栏失败:", error);
                }
            });

            // 处理来自全屏webview的消息
            fullscreenPanel.webview.onDidReceiveMessage((data) => {
                switch (data.type) {
                    case "closeFullscreen":
                        fullscreenPanel.dispose();
                        break;
                    case "exportImage":
                        this._exportImage(data.svg, data.index, data.isDarkTheme, data.fileName);
                        break;
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`全屏预览失败: ${error}`);
        }
    }

    /**
     * 获取全屏覆盖HTML内容
     */
    private _getFullscreenOverlayHtml(webview: vscode.Webview, svg: string, title: string, index: number): string {
        // 读取HTML模板文件 - 修正路径，从providers目录向上一级
        const templatePath = path.join(__dirname, "..", "fullscreen.html");
        let htmlTemplate = fs.readFileSync(templatePath, "utf8");

        // 获取资源文件的webview URI - 修正路径，从providers目录向上一级
        const fullscreenScriptPath = vscode.Uri.file(path.join(__dirname, "..", "fullscreen.js"));
        const fullscreenScriptUri = webview.asWebviewUri(fullscreenScriptPath);
        
        const fullscreenStylesPath = vscode.Uri.file(path.join(__dirname, "..", "fullscreen.css"));
        const fullscreenStylesUri = webview.asWebviewUri(fullscreenStylesPath);

        // 注入变量到HTML中，供JavaScript使用
        htmlTemplate = htmlTemplate.replace(
            '<script src="./fullscreen.js"></script>',
            `<script>
                window.chartIndex = ${index};
                window.chartTitle = '${title}';
            </script>\n    <script src="./fullscreen.js"></script>`
        );

        // 替换模板变量和URI
        htmlTemplate = htmlTemplate
            .replace("{{TITLE}}", title)
            .replace("{{SVG_CONTENT}}", svg)
            .replace("./fullscreen.js", fullscreenScriptUri?.toString() || "./fullscreen.js")
            .replace("./fullscreen.css", fullscreenStylesUri?.toString() || "./fullscreen.css");

        return htmlTemplate;
    }

    /**
     * 获取当前视图实例
     */
    public getView(): vscode.WebviewView | undefined {
        return this._view;
    }

    /**
     * 获取欢迎页面HTML
     */
    private _getWelcomeHtml(): string {
        return `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Mermaid Sidebar</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-sideBar-background);
                        margin: 0;
                        padding: 20px;
                    }
                    .welcome-container {
                        text-align: center;
                        padding: 20px 0;
                    }
                    .welcome-title {
                        font-size: 18px;
                        font-weight: 600;
                        margin-bottom: 16px;
                        color: var(--vscode-foreground);
                    }
                    .welcome-text {
                        font-size: 14px;
                        line-height: 1.5;
                        margin-bottom: 12px;
                        color: var(--vscode-descriptionForeground);
                    }
                    .welcome-icon {
                        font-size: 48px;
                        margin-bottom: 20px;
                        opacity: 0.8;
                    }
                    .usage-tip {
                        background: var(--vscode-textBlockQuote-background);
                        border-left: 4px solid var(--vscode-textBlockQuote-border);
                        padding: 12px;
                        margin: 16px 0;
                        border-radius: 4px;
                    }
                    .usage-tip-title {
                        font-weight: 600;
                        margin-bottom: 8px;
                        color: var(--vscode-foreground);
                    }
                    .usage-tip-text {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                    }
                </style>
            </head>
            <body>
                <div class="welcome-container">
                    <div class="welcome-icon">📊</div>
                    <div class="welcome-title">Mermaid 图表预览</div>
                    <div class="welcome-text">在这里查看 Mermaid 图表</div>
                    
                    <div class="usage-tip">
                        <div class="usage-tip-title">💡 使用方法</div>
                        <div class="usage-tip-text">
                            • 点击代码块上方的"📋 侧栏预览"按钮<br>
                            • 或使用右键菜单"在侧边栏显示Mermaid图表"<br>
                            • 快捷键: Cmd+Shift+M
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * 刷新当前视图
     */
    public refresh(): void {
        if (this._view) {
            if (this._currentMermaidBlocks.length === 0) {
                this._view.webview.html = this._getWelcomeHtml();
            } else {
                this._view.webview.html = this._getWebviewHtml(
                    this._view.webview,
                    this._currentMermaidBlocks,
                    this._currentTitle,
                    this._currentLocationInfo,
                    this._currentFilePath
                );
            }
        }
    }
}