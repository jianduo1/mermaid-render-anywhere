import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

/**
 * Mermaid 渲染提供者基类
 * 包含通用的渲染、导出、跳转等功能
 */
export abstract class BaseMermaidProvider {
    protected _extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
    }

    /**
     * 抽象方法：显示 Mermaid 图表
     * 子类必须实现此方法来定义具体的显示方式
     */
    abstract showMermaid(
        mermaidBlocks: string[], 
        title: string, 
        locationInfo?: {name: string; lineNumber: number; type: string; mermaidLineNumber: number}[], 
        filePath?: string
    ): void;

    /**
     * 抽象方法：显示单个 Mermaid 图表
     */
    abstract showSingleMermaid(
        mermaidCode: string, 
        contextInfo: {name: string; type: string}, 
        lineNumber: number, 
        filePath?: string
    ): void;

    /**
     * 抽象方法：显示大图预览
     * 子类实现不同的全屏显示策略
     */
    abstract showFullscreenPreview(svg: string, title: string, index: number): void;

    /**
     * 跳转到函数/方法定义
     */
    protected async _jumpToFunction(lineNumber: number, fileName?: string) {
        try {
            let targetDocument: vscode.TextDocument | undefined;

            if (fileName) {
                // 如果指定了文件名，先尝试在已打开的编辑器中找到
                const visibleEditors = vscode.window.visibleTextEditors;
                const existingEditor = visibleEditors.find((editor) => path.basename(editor.document.fileName) === fileName);

                if (existingEditor) {
                    targetDocument = existingEditor.document;
                } else {
                    // 如果没有找到已打开的文件，尝试在工作空间中查找并打开
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (workspaceFolders) {
                        for (const folder of workspaceFolders) {
                            const fileUri = vscode.Uri.joinPath(folder.uri, fileName);
                            try {
                                await vscode.workspace.fs.stat(fileUri);
                                targetDocument = await vscode.workspace.openTextDocument(fileUri);
                                break;
                            } catch {
                                // 文件不存在，继续查找
                            }
                        }
                    }

                    // 如果还是没找到，尝试递归搜索
                    if (!targetDocument && workspaceFolders) {
                        const foundFiles = await vscode.workspace.findFiles(`**/${fileName}`, null, 1);
                        if (foundFiles.length > 0) {
                            targetDocument = await vscode.workspace.openTextDocument(foundFiles[0]);
                        }
                    }
                }
            } else {
                // 如果没有指定文件名，使用当前活动编辑器
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor) {
                    targetDocument = activeEditor.document;
                }
            }

            if (targetDocument && lineNumber > 0) {
                const position = new vscode.Position(lineNumber - 1, 0);

                // 打开文档并跳转到指定行
                const editor = await vscode.window.showTextDocument(targetDocument, vscode.ViewColumn.One);

                // 设置光标位置和选择
                editor.selection = new vscode.Selection(position, position);

                // 滚动到指定行并居中显示
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            } else {
                const message = fileName ? `无法找到文件 "${fileName}"` : "无法找到目标文件或行号无效";
                vscode.window.showWarningMessage(message);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`跳转失败: ${error}`);
        }
    }

    /**
     * 导出图片
     */
    protected async _exportImage(svg: string, index: number, isDarkTheme: boolean = true, fileName?: string) {
        try {
            // 获取当前工作目录或用户主目录作为默认保存位置
            let defaultPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();

            // 验证路径是否可写
            try {
                fs.accessSync(defaultPath, fs.constants.W_OK);
            } catch (accessError) {
                // 如果默认路径不可写，使用用户主目录
                const homeDir = os.homedir();
                try {
                    fs.accessSync(homeDir, fs.constants.W_OK);
                    defaultPath = homeDir;
                } catch (homeAccessError) {
                    vscode.window.showErrorMessage(`无法访问可写目录。请检查文件系统权限。`);
                    return;
                }
            }

            // 构建安全的默认文件名：文件名-索引-主题.svg
            const safeFileName = fileName || "mermaid-chart";
            const theme = isDarkTheme ? "dark" : "light";
            const defaultFileName = `${safeFileName}-${index + 1}-${theme}.svg`;
            const defaultUri = vscode.Uri.file(path.join(defaultPath, defaultFileName));

            // 让用户选择保存路径
            const uri = await vscode.window.showSaveDialog({
                filters: {
                    SVG文件: ["svg"],
                    PNG图片: ["png"],
                },
                defaultUri: defaultUri,
            });

            if (!uri) {
                return; // 用户取消了保存
            }

            // 验证目标路径是否可写
            const targetDir = path.dirname(uri.fsPath);
            try {
                fs.accessSync(targetDir, fs.constants.W_OK);
            } catch (targetAccessError) {
                vscode.window.showErrorMessage(`无法写入到目标目录: ${targetDir}。请选择其他位置或检查权限。`);
                return;
            }

            const isPng = uri.fsPath.toLowerCase().endsWith(".png");

            if (isPng) {
                // 对于PNG，我们暂时保存为SVG并提示用户
                const svgPath = uri.fsPath.replace(".png", ".svg");
                fs.writeFileSync(svgPath, svg);
                vscode.window.showInformationMessage(`SVG已保存到: ${svgPath}。PNG导出功能需要额外的依赖，请使用在线工具转换。`);
            } else {
                // 直接保存SVG
                fs.writeFileSync(uri.fsPath, svg);
                vscode.window.showInformationMessage(`SVG已保存到: ${uri.fsPath}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`导出失败: ${error}`);
        }
    }

    /**
     * 处理错误报告
     */
    protected async _handleErrorReport(errorInfo: any) {
        try {
            console.error("WebView错误报告:", errorInfo);

            // 构建错误报告信息
            const errorReport = [
                `Mermaid WebView 错误报告`,
                `时间: ${errorInfo.timestamp}`,
                `浏览器: ${errorInfo.userAgent}`,
                `Mermaid可用: ${errorInfo.mermaidAvailable}`,
                `Mermaid版本: ${errorInfo.mermaidVersion}`,
                `渲染尝试次数: ${errorInfo.renderAttempts}`,
                `已渲染图表数: ${errorInfo.renderedChartsCount}`,
                `总图表数: ${errorInfo.totalChartsCount}`,
                ``,
                `请将此信息反馈给开发者以帮助改进扩展。`,
            ].join("\n");

            // 显示错误信息
            const action = await vscode.window.showErrorMessage("图表渲染出现问题，是否要查看详细错误信息？", "查看详情", "复制报告", "忽略");

            if (action === "查看详情") {
                // 在新文档中显示错误报告
                const doc = await vscode.workspace.openTextDocument({
                    content: errorReport,
                    language: "plaintext",
                });
                await vscode.window.showTextDocument(doc);
            } else if (action === "复制报告") {
                // 复制错误报告到剪贴板
                await vscode.env.clipboard.writeText(errorReport);
                vscode.window.showInformationMessage("错误报告已复制到剪贴板");
            }
        } catch (error) {
            console.error("处理错误报告时出错:", error);
            vscode.window.showErrorMessage("处理错误报告时出错");
        }
    }

    /**
     * 生成 Mermaid 卡片 HTML
     */
    protected _generateMermaidCards(
        mermaidBlocks: string[], 
        locationInfo?: {name: string; lineNumber: number; type: string; mermaidLineNumber: number}[], 
        filePath?: string
    ): string {
        if (mermaidBlocks.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <div class="empty-state-text">
                        没有找到Mermaid图表<br>
                        请在函数文档中添加 \`\`\`mermaid 代码块
                    </div>
                </div>
            `;
        }

        return mermaidBlocks
            .map((code, index) => {
                const locationData = locationInfo && locationInfo[index] ? locationInfo[index] : null;
                // 生成更有意义的标题
                let title = `${index + 1} / ${mermaidBlocks.length}`;
                if (locationData && locationData.name && locationData.name !== "定位") {
                    title = locationData.name;
                }

                // 根据类型选择图标和显示文本
                let icon = "📍";
                let displayText = "定位";
                let targetLineNumber = 0;

                if (locationData) {
                    targetLineNumber = locationData.lineNumber;
                    switch (locationData.type) {
                        case "function":
                            icon = "🔧";
                            displayText = `Func: ${locationData.name}:${locationData.lineNumber}`;
                            break;
                        case "method":
                            icon = "⚙️";
                            displayText = `Meth: ${locationData.name}:${locationData.lineNumber}`;
                            break;
                        case "class":
                            icon = "🏗️";
                            displayText = `Class: ${locationData.name}:${locationData.lineNumber}`;
                            break;
                        case "location":
                            icon = "📍";
                            displayText = locationData.name;
                            targetLineNumber = locationData.mermaidLineNumber; // 跳转到mermaid代码块位置
                            break;
                        default:
                            icon = "📍";
                            displayText = locationData.name || "定位";
                            break;
                    }
                }

                return `
                    <div class="mermaid-card" data-index="${index}">
                        <div class="card-header" onclick="toggleCard(this)">
                            <div class="card-title">
                                <span class="collapse-indicator">▼</span>
                                <div class="chart-title-text ${locationData ? "chart-title-with-function" : "chart-title-basic"}">
                                    <span>📊 ${title}</span>
                                    ${
                                        locationData
                                            ? ` - <span class="location-info" onclick="event.stopPropagation(); jumpToFunction(${targetLineNumber}, '${path.basename(filePath || "")}')" title="点击跳转到源码位置">${icon} ${displayText}</span>`
                                            : ""
                                    }
                                </div>
                            </div>
                            <div class="card-actions">
                                <button class="action-btn" onclick="event.stopPropagation(); showPreview(${index})" title="预览大图">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                </button>
                                <button class="action-btn" onclick="event.stopPropagation(); copyCode(\`${code.replace(/`/g, "\\`").replace(/\n/g, "\\n").replace(/"/g, "&quot;")}\`)" title="复制代码">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                    </svg>
                                </button>
                                <button class="action-btn" onclick="event.stopPropagation(); exportImage(${index})" title="导出图片">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="7,10 12,15 17,10"/>
                                        <line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="mermaid-code" style="display: none;">${code}</div>
                        <div class="mermaid-viewport expanded">
                            <div class="loading">
                                <div class="spinner"></div>
                            </div>
                        </div>
                    </div>
                `;
            })
            .join("");
    }

    /**
     * 获取 webview HTML 内容
     */
    protected _getWebviewHtml(
        webview: vscode.Webview,
        mermaidBlocks: string[], 
        title: string, 
        locationInfo?: {name: string; lineNumber: number; type: string; mermaidLineNumber: number}[], 
        filePath?: string
    ): string {
        // 读取HTML模板文件 - 修正路径，从providers目录向上一级找到webview.html
        const templatePath = path.join(__dirname, "..", "webview.html");
        let htmlTemplate = fs.readFileSync(templatePath, "utf8");

        // 获取资源文件的webview URI - 修正路径，从providers目录向上一级
        const mermaidLibPath = vscode.Uri.file(path.join(__dirname, "..", "libs", "mermaid.min.js"));
        const mermaidLibUri = webview.asWebviewUri(mermaidLibPath);

        const webviewScriptPath = vscode.Uri.file(path.join(__dirname, "..", "webview.js"));
        const webviewScriptUri = webview.asWebviewUri(webviewScriptPath);

        const webviewStylesPath = vscode.Uri.file(path.join(__dirname, "..", "webview.css"));
        const webviewStylesUri = webview.asWebviewUri(webviewStylesPath);

        // 使用传入的title作为fileName
        const fileName = title || "mermaid-chart";

        // 先注入文件名和位置信息到HTML中，供JavaScript使用（必须在URI替换之前）
        htmlTemplate = htmlTemplate.replace(
            '<script src="./webview.js"></script>',
            `<script>
                window.currentFileName = '${fileName}';
                window.locationInfo = ${JSON.stringify(locationInfo || [])};
            </script>\n    <script src="./webview.js"></script>`
        );

        // 然后替换模板变量和URI
        htmlTemplate = htmlTemplate
            .replace("{{FUNCTION_NAME}}", title)
            .replace("{{MERMAID_CARDS}}", this._generateMermaidCards(mermaidBlocks, locationInfo, filePath))
            .replace("./libs/mermaid.min.js", mermaidLibUri?.toString() || "./libs/mermaid.min.js")
            .replace("./webview.js", webviewScriptUri?.toString() || "./webview.js")
            .replace("./webview.css", webviewStylesUri?.toString() || "./webview.css");

        return htmlTemplate;
    }

    /**
     * 处理 webview 消息的通用逻辑
     */
    protected _handleWebviewMessage(data: any) {
        switch (data.type) {
            case "copyCode":
                vscode.env.clipboard.writeText(data.code);
                vscode.window.showInformationMessage("代码已复制到剪贴板");
                break;
            case "exportImage":
                this._exportImage(data.svg, data.index, data.isDarkTheme, data.fileName);
                break;
            case "jumpToFunction":
                this._jumpToFunction(data.lineNumber, data.fileName);
                break;
            case "showFullscreenImage":
                // 显示全屏大图预览 - 由子类实现具体策略
                this.showFullscreenPreview(data.svg, data.title, data.index);
                break;
            case "reportError":
                this._handleErrorReport(data.errorInfo);
                break;
        }
    }
}