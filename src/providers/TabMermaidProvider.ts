import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { BaseMermaidProvider } from "./BaseMermaidProvider";

/**
 * 页签 Mermaid 预览提供者
 * 使用 WebviewPanel 在编辑器页签中显示 Mermaid 图表
 */
export class TabMermaidProvider extends BaseMermaidProvider {
    private static instance: TabMermaidProvider;
    private _panel: vscode.WebviewPanel | undefined;
    private _currentMermaidBlocks: string[] = [];
    private _currentLocationInfo?: {name: string; lineNumber: number; type: string; mermaidLineNumber: number}[];
    private _currentFilePath?: string;
    private _currentTitle: string = "Mermaid 图表预览";

    constructor(extensionUri: vscode.Uri) {
        super(extensionUri);
    }

    public static getInstance(extensionUri: vscode.Uri): TabMermaidProvider {
        if (!TabMermaidProvider.instance) {
            TabMermaidProvider.instance = new TabMermaidProvider(extensionUri);
        }
        return TabMermaidProvider.instance;
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
        // 保存当前数据
        this._currentMermaidBlocks = mermaidBlocks;
        this._currentLocationInfo = locationInfo;
        this._currentFilePath = filePath;
        this._currentTitle = title;

        // 如果已有面板，先关闭
        if (this._panel) {
            this._panel.dispose();
        }

        // 创建新的面板 - 使用 Beside 列创建拆分编辑器效果
        this._panel = vscode.window.createWebviewPanel(
            "mermaidTabPreview", 
            "🎨 Mermaid 预览", 
            vscode.ViewColumn.Beside, 
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this._extensionUri],
            }
        );

        // 设置HTML内容
        this._panel.webview.html = this._getWebviewHtml(
            this._panel.webview,
            mermaidBlocks, 
            title, 
            locationInfo, 
            filePath
        );

        // 处理面板关闭
        this._panel.onDidDispose(() => {
            this._panel = undefined;
        });

        // 处理来自webview的消息
        this._panel.webview.onDidReceiveMessage((data) => {
            this._handleWebviewMessage(data);
        });
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
     * 显示大图预览 - 页签模式：在当前页签内全屏显示
     */
    public showFullscreenPreview(svg: string, title: string, index: number): void {
        if (this._panel) {
            this._showInTabFullscreen(svg, title, index);
        }
    }

    /**
     * 在当前页签内显示全屏预览
     */
    private _showInTabFullscreen(svg: string, title: string, index: number): void {
        if (!this._panel) return;

        // 生成页签内全屏HTML
        const fullscreenHtml = this._getInTabFullscreenHtml(svg, title, index);
        
        // 更新webview内容为全屏模式
        this._panel.webview.html = fullscreenHtml;
        
        // 更新面板标题
        this._panel.title = "🎨 Mermaid 预览 - 全屏";
    }

    /**
     * 获取页签内全屏HTML内容
     */
    private _getInTabFullscreenHtml(svg: string, title: string, index: number): string {
        // 获取资源文件的webview URI - 修正路径，从providers目录向上一级
        const webviewStylesPath = vscode.Uri.file(path.join(__dirname, "..", "webview.css"));
        const webviewStylesUri = this._panel?.webview.asWebviewUri(webviewStylesPath);

        return `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>全屏预览 - ${title}</title>
            <link rel="stylesheet" href="${webviewStylesUri}">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                html, body {
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                
                .tab-fullscreen-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    width: 100%;
                    height: 100%;
                    background: var(--vscode-editor-background);
                    display: flex;
                    flex-direction: column;
                    z-index: 1000;
                }
                
                .tab-fullscreen-header {
                    position: relative;
                    height: 50px;
                    background: var(--vscode-titleBar-activeBackground);
                    border-bottom: 1px solid var(--vscode-panel-border);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 20px;
                    flex-shrink: 0;
                }
                
                .tab-fullscreen-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--vscode-titleBar-activeForeground);
                }
                
                .tab-fullscreen-controls {
                    display: flex;
                    gap: 10px;
                }
                
                .tab-fullscreen-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: 1px solid var(--vscode-button-border);
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.2s ease;
                }
                
                .tab-fullscreen-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .exit-btn {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                
                .exit-btn:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }
                
                .tab-fullscreen-content {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    overflow: hidden;
                }
                
                .svg-container {
                    max-width: 100%;
                    max-height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--vscode-editor-background);
                    border-radius: 8px;
                    padding: 20px;
                    border: 1px solid var(--vscode-panel-border);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                
                .svg-container svg {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }
                
                /* 动画效果 */
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                
                .tab-fullscreen-container {
                    animation: fadeIn 0.3s ease-out;
                }
                
                .svg-container {
                    animation: fadeIn 0.4s ease-out 0.1s both;
                }
            </style>
        </head>
        <body>
            <div class="tab-fullscreen-container">
                <div class="tab-fullscreen-header">
                    <div class="tab-fullscreen-title">${title} - 页签内全屏预览</div>
                    <div class="tab-fullscreen-controls">
                        <button class="tab-fullscreen-btn" onclick="exportImage()" title="导出图片">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            导出图片
                        </button>
                        <button class="tab-fullscreen-btn exit-btn" onclick="exitFullscreen()" title="退出全屏">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
                                <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                                <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
                                <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
                            </svg>
                            退出全屏
                        </button>
                    </div>
                </div>
                
                <div class="tab-fullscreen-content">
                    <div class="svg-container">
                        ${svg}
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                // 导出图片功能
                function exportImage() {
                    const svgElement = document.querySelector('.svg-container svg');
                    if (svgElement) {
                        const svgData = new XMLSerializer().serializeToString(svgElement);
                        vscode.postMessage({
                            type: 'exportImage',
                            svg: svgData,
                            index: ${index},
                            isDarkTheme: document.body.classList.contains('vscode-dark'),
                            fileName: window.currentFileName || 'mermaid-chart'
                        });
                    }
                }
                
                // 退出全屏功能
                function exitFullscreen() {
                    vscode.postMessage({
                        type: 'exitTabFullscreen'
                    });
                }
                
                // 键盘快捷键支持
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') {
                        exitFullscreen();
                    }
                });
                
                // 注入当前文件名
                window.currentFileName = '${this._currentTitle || 'mermaid-chart'}';
            </script>
        </body>
        </html>
        `;
    }

    /**
     * 处理 webview 消息（覆盖基类方法以处理页签特有的消息）
     */
    protected _handleWebviewMessage(data: any) {
        switch (data.type) {
            case "exitTabFullscreen":
                // 退出页签内全屏，恢复正常预览
                this._exitTabFullscreen();
                break;
            default:
                // 其他消息交给基类处理
                super._handleWebviewMessage(data);
                break;
        }
    }

    /**
     * 退出页签内全屏模式
     */
    private _exitTabFullscreen(): void {
        if (this._panel) {
            // 恢复正常的webview内容
            this._panel.webview.html = this._getWebviewHtml(
                this._panel.webview,
                this._currentMermaidBlocks,
                this._currentTitle,
                this._currentLocationInfo,
                this._currentFilePath
            );
            
            // 恢复面板标题
            this._panel.title = "🎨 Mermaid 预览";
        }
    }

    /**
     * 获取当前面板实例
     */
    public getPanel(): vscode.WebviewPanel | undefined {
        return this._panel;
    }

    /**
     * 刷新当前面板
     */
    public refresh(): void {
        if (this._panel) {
            this._panel.webview.html = this._getWebviewHtml(
                this._panel.webview,
                this._currentMermaidBlocks,
                this._currentTitle,
                this._currentLocationInfo,
                this._currentFilePath
            );
        }
    }
}