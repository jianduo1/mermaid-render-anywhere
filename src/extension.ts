import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";


// 清理注释符号的辅助函数
function cleanCommentSymbols(code: string): string {
  // 按行处理，移除每行开头的注释符号
  const lines = code.split('\n');
  const cleanedLines = lines.map(line => {
    // 移除行首的空格、星号、斜杠等注释符号
    return line.replace(/^\s*[\*\/]*\s*/, '');
  });
  
  // 重新组合，保持原有的缩进结构
  return cleanedLines.join('\n').trim();
}

// 语言特定的模式定义
interface LanguagePattern {
  functions: RegExp[];
  classes: RegExp[];
  methods: RegExp[];
}

const languagePatterns: Record<string, LanguagePattern> = {
  python: {
    functions: [
      /^(\s*)(?:async\s+)?def\s+(\w+)\s*\(/,
      /^(\s*)@\w+\s*\n\s*(?:async\s+)?def\s+(\w+)\s*\(/m
    ],
    classes: [
      /^(\s*)class\s+(\w+)\s*[\(:]?/
    ],
    methods: [
      /^(\s*)(?:async\s+)?def\s+(\w+)\s*\(\s*self/
    ]
  },
  javascript: {
    functions: [
      /^(\s*)(?:async\s+)?function\s+(\w+)\s*\(/,
      /^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
      /^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(/,
      /^(\s*)(\w+)\s*:\s*(?:async\s+)?function\s*\(/
    ],
    classes: [
      /^(\s*)class\s+(\w+)\s*(?:\{|extends|$)/,
      /^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*class\s*/
    ],
    methods: [
      /^(\s*)(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/
    ]
  },
  typescript: {
    functions: [
      /^(\s*)(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/,
      /^(\s*)(?:const|let|var)\s+(\w+)\s*:\s*\([^)]*\)\s*=>/,
      /^(\s*)(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/
    ],
    classes: [
      /^(\s*)(?:export\s+)?(?:abstract\s+)?class\s+(\w+)\s*/,
      /^(\s*)(?:export\s+)?interface\s+(\w+)\s*/
    ],
    methods: [
      /^(\s*)(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:\{]/
    ]
  },
  // TypeScript JSX
  typescriptreact: {
    functions: [
      /^(\s*)(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/,
      /^(\s*)(?:const|let|var)\s+(\w+)\s*:\s*React\.FC/,
      /^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/
    ],
    classes: [
      /^(\s*)(?:export\s+)?(?:abstract\s+)?class\s+(\w+)\s*/,
      /^(\s*)(?:export\s+)?interface\s+(\w+)\s*/
    ],
    methods: [
      /^(\s*)(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:\{]/
    ]
  },
  // JavaScript JSX
  javascriptreact: {
    functions: [
      /^(\s*)(?:async\s+)?function\s+(\w+)\s*\(/,
      /^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
      /^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(/
    ],
    classes: [
      /^(\s*)class\s+(\w+)\s*(?:\{|extends|$)/,
      /^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*class\s*/
    ],
    methods: [
      /^(\s*)(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/
    ]
  },
  java: {
    functions: [
      /^(\s*)(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*\{/
    ],
    classes: [
      /^(\s*)(?:public\s+)?(?:abstract\s+)?class\s+(\w+)\s*/,
      /^(\s*)(?:public\s+)?interface\s+(\w+)\s*/
    ],
    methods: [
      /^(\s*)(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*\{/
    ]
  },
  go: {
    functions: [
      // 普通函数: func functionName(params) returnType
      /^(\s*)func\s+(\w+)\s*\([^)]*\)(?:\s*\([^)]*\)|\s*\w+|\s*\*\w+)?\s*\{/,
      // 无返回值函数: func functionName(params)
      /^(\s*)func\s+(\w+)\s*\([^)]*\)\s*\{/
    ],
    classes: [
      // 结构体: type StructName struct
      /^(\s*)type\s+(\w+)\s+struct\s*\{/,
      // 接口: type InterfaceName interface
      /^(\s*)type\s+(\w+)\s+interface\s*\{/,
      // 类型别名: type TypeName = OtherType 或 type TypeName OtherType
      /^(\s*)type\s+(\w+)\s+(?:=\s*)?[\w\[\]]+/
    ],
    methods: [
      // 方法: func (receiver Type) methodName(params) returnType
      /^(\s*)func\s*\([^)]+\)\s*(\w+)\s*\([^)]*\)(?:\s*\([^)]*\)|\s*\w+|\s*\*\w+)?\s*\{/,
      // 无返回值方法: func (receiver Type) methodName(params)
      /^(\s*)func\s*\([^)]+\)\s*(\w+)\s*\([^)]*\)\s*\{/
    ]
  }
};

// 提取文件中所有的Mermaid代码块
function extractAllMermaidFromFile(document: vscode.TextDocument): {mermaidBlocks: string[]; locationInfo?: {name: string; lineNumber: number; type: string; mermaidLineNumber: number}[]} {
  const text = document.getText();
  const lines = text.split("\n");
  const mermaidBlocks: string[] = [];
  const locationInfo: {name: string; lineNumber: number; type: string; mermaidLineNumber: number}[] = [];
  
  // 匹配mermaid代码块 - 支持注释中的格式
  // 匹配标准格式: ```mermaid ... ```
  // 匹配注释格式: * ```mermaid ... * ```
  const mermaidPattern = /(?:^\s*\*?\s*)?```mermaid\s*([\s\S]*?)\s*```(?:\s*\*?\s*$)?/gm;
  let match;
  let blockIndex = 0;
  
  while ((match = mermaidPattern.exec(text)) !== null) {
    let code = match[1].trim();
    
    // 清理Java/C++风格的多行注释中的星号
    code = cleanCommentSymbols(code);
    
    if (code) {
      // 允许重复的mermaid代码块，因为可能在不同位置有相同的图表
      mermaidBlocks.push(code);
      
      const matchStartLine = text.substring(0, match.index).split("\n").length - 1;
      const matchEndLine = text.substring(0, match.index + match[0].length).split("\n").length - 1;
      const mermaidLineNumber = matchStartLine + 1;
      
      // 获取语言特定的模式
      const patterns = languagePatterns[document.languageId];
      let foundInfo: {name: string; lineNumber: number; type: string} | null = null;
      
      if (patterns) {
        // 根据语言类型决定搜索方向
        const searchForward = document.languageId === 'java' || document.languageId === 'javascript' || document.languageId === 'typescript' || document.languageId === 'typescriptreact' || document.languageId === 'javascriptreact' || document.languageId === 'go';
        
        if (searchForward) {
          // 向后查找函数定义（Java/JS注释在函数前面）
          let searchLimit = Math.min(matchStartLine + 50, lines.length); // 限制搜索范围，避免匹配到其他地方的代码
          
          for (let i = matchStartLine; i < searchLimit; i++) {
            const line = lines[i];
            
            // 优先检查方法定义（在类内部）
            for (const methodPattern of patterns.methods) {
              const methodMatch = methodPattern.exec(line);
              if (methodMatch) {
                const name = methodMatch[2] || methodMatch[1];
                if (name && !foundInfo) {
                  foundInfo = {
                    name: name,
                    lineNumber: i + 1,
                    type: 'method'
                  };
                  break;
                }
              }
            }
            
            // 然后检查函数定义
            if (!foundInfo) {
              for (const funcPattern of patterns.functions) {
                const funcMatch = funcPattern.exec(line);
                if (funcMatch) {
                  const name = funcMatch[2] || funcMatch[1];
                  if (name) {
                    foundInfo = {
                      name: name,
                      lineNumber: i + 1,
                      type: 'function'
                    };
                    break;
                  }
                }
              }
            }
            
            // 最后检查类定义（但要确保这个mermaid块确实属于这个类）
            if (!foundInfo) {
              for (const classPattern of patterns.classes) {
                const classMatch = classPattern.exec(line);
                if (classMatch) {
                  const name = classMatch[2] || classMatch[1];
                  if (name) {
                    // 检查这个mermaid块是否在类定义之前（类注释）
                    const distanceFromClass = i - matchEndLine;
                    if (distanceFromClass <= 10 && distanceFromClass >= 0) { // 只有当mermaid块结束后10行内且在类定义之前时才关联
                      foundInfo = {
                        name: name,
                        lineNumber: i + 1,
                        type: 'class'
                      };
                    }
                    break;
                  }
                }
              }
            }
            
            if (foundInfo) break;
          }
        } else {
          // 向前查找函数定义（Python docstring在函数后面）
          for (let i = matchStartLine; i >= 0; i--) {
            const line = lines[i];
            
            // 检查类定义
            for (const classPattern of patterns.classes) {
              const classMatch = classPattern.exec(line);
              if (classMatch) {
                const name = classMatch[2] || classMatch[1];
                if (name && !foundInfo) {
                  foundInfo = {
                    name: name,
                    lineNumber: i + 1,
                    type: 'class'
                  };
                }
              }
            }
            
            // 检查方法定义（在类内部）
            if (!foundInfo) {
              for (const methodPattern of patterns.methods) {
                const methodMatch = methodPattern.exec(line);
                if (methodMatch) {
                  const name = methodMatch[2] || methodMatch[1];
                  if (name) {
                    foundInfo = {
                      name: name,
                      lineNumber: i + 1,
                      type: 'method'
                    };
                    break;
                  }
                }
              }
            }
            
            // 检查函数定义
            if (!foundInfo) {
              for (const funcPattern of patterns.functions) {
                const funcMatch = funcPattern.exec(line);
                if (funcMatch) {
                  const name = funcMatch[2] || funcMatch[1];
                  if (name) {
                    foundInfo = {
                      name: name,
                      lineNumber: i + 1,
                      type: 'function'
                    };
                    break;
                  }
                }
              }
            }
            
            if (foundInfo) break;
          }
        }
      }
      
      // 如果没找到具体的函数/类定义，使用通用的"定位"
      if (!foundInfo) {
        foundInfo = {
          name: "定位",
          lineNumber: mermaidLineNumber,
          type: 'location'
        };
      }
      
      locationInfo.push({
        ...foundInfo,
        mermaidLineNumber: mermaidLineNumber
      });
      
      blockIndex++;
    }
  }
  
  return {mermaidBlocks, locationInfo: locationInfo.length > 0 ? locationInfo : undefined};
}



// 弹出式预览面板提供者
class PopupMermaidPreviewProvider {
  private static instance: PopupMermaidPreviewProvider;
  private _panel: vscode.WebviewPanel | undefined;
  private _fullscreenPanel: vscode.WebviewPanel | undefined;
  private _extensionUri: vscode.Uri;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }

  public static getInstance(extensionUri: vscode.Uri): PopupMermaidPreviewProvider {
    if (!PopupMermaidPreviewProvider.instance) {
      PopupMermaidPreviewProvider.instance = new PopupMermaidPreviewProvider(extensionUri);
    }
    return PopupMermaidPreviewProvider.instance;
  }

  public showPopup(mermaidBlocks: string[], functionName: string, locationInfo?: {name: string; lineNumber: number; type: string; mermaidLineNumber: number}[], filePath?: string) {
    console.log('showPopup 接收到的参数 - functionName:', functionName, 'filePath:', filePath);
    
    // 如果已有面板，先关闭
    if (this._panel) {
      this._panel.dispose();
    }

    // 创建新的面板 - 使用 Beside 列创建拆分编辑器效果
    this._panel = vscode.window.createWebviewPanel("mermaidPopup", `🎨 ${functionName} - Mermaid 预览`, vscode.ViewColumn.Beside, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this._extensionUri],
    });

    // 设置HTML内容
    this._panel.webview.html = this._getPopupHtml(mermaidBlocks, functionName, locationInfo, filePath);

    // 处理面板关闭
    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });

    // 处理来自webview的消息
    this._panel.webview.onDidReceiveMessage((data) => {
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
        case "showPreview":
          // 预览功能已经在HTML中的JavaScript处理
          break;
        case "enterFullscreenPreview":
          // 进入全屏预览模式 - 可以在这里添加额外的IDE级别处理
          // 比如隐藏某些UI元素或调整窗口状态
          break;
        case "exitFullscreenPreview":
          // 退出全屏预览模式 - 恢复正常状态
          break;
        case "showFullscreenImage":
          // 显示全屏大图预览
          this._showFullscreenImage(data.svg, data.title, data.index);
          break;
        case "reportError":
          this._handleErrorReport(data.errorInfo);
          break;
      }
    });
  }

  private async _jumpToFunction(lineNumber: number, fileName?: string) {
    try {
      let targetDocument: vscode.TextDocument | undefined;
      
      if (fileName) {
        // 如果指定了文件名，先尝试在已打开的编辑器中找到
        const visibleEditors = vscode.window.visibleTextEditors;
        const existingEditor = visibleEditors.find(editor => 
          path.basename(editor.document.fileName) === fileName
        );
        
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
        if (activeEditor && activeEditor.viewColumn !== this._panel?.viewColumn) {
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
        editor.revealRange(
          new vscode.Range(position, position), 
          vscode.TextEditorRevealType.InCenter
        );
        
        // vscode.window.showInformationMessage(`已跳转到 ${fileName || '当前文件'} 的第 ${lineNumber} 行`);
      } else {
        const message = fileName ? `无法找到文件 "${fileName}"` : "无法找到目标文件或行号无效";
        vscode.window.showWarningMessage(message);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`跳转失败: ${error}`);
    }
  }

  private async _handleErrorReport(errorInfo: any) {
    try {
      console.error('WebView错误报告:', errorInfo);
      
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
        `请将此信息反馈给开发者以帮助改进扩展。`
      ].join('\n');
      
      // 显示错误信息
      const action = await vscode.window.showErrorMessage(
        '图表渲染出现问题，是否要查看详细错误信息？',
        '查看详情',
        '复制报告',
        '忽略'
      );
      
      if (action === '查看详情') {
        // 在新文档中显示错误报告
        const doc = await vscode.workspace.openTextDocument({
          content: errorReport,
          language: 'plaintext'
        });
        await vscode.window.showTextDocument(doc);
      } else if (action === '复制报告') {
        // 复制错误报告到剪贴板
        await vscode.env.clipboard.writeText(errorReport);
        vscode.window.showInformationMessage('错误报告已复制到剪贴板');
      }
      
    } catch (error) {
      console.error('处理错误报告时出错:', error);
      vscode.window.showErrorMessage('处理错误报告时出错');
    }
  }

  private async _exportImage(svg: string, index: number, isDarkTheme: boolean = true, fileName?: string) {
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
      const safeFileName = fileName || 'mermaid-chart';
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

  private async _showFullscreenImage(svg: string, title: string, index: number) {
    try {
      // 如果已有全屏面板，先关闭
      if (this._fullscreenPanel) {
        this._fullscreenPanel.dispose();
      }

      // 先隐藏侧边栏和面板以获得更好的全屏效果
      try {
        await vscode.commands.executeCommand('workbench.action.closeSidebar');
      } catch (error) {
        console.log('关闭侧边栏失败:', error);
      }
      
      try {
        await vscode.commands.executeCommand('workbench.action.closePanel');
      } catch (error) {
        console.log('关闭面板失败:', error);
      }
      
      // 尝试关闭辅助栏（可能在某些版本中不存在）
      try {
        await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
      } catch (error) {
        console.log('关闭辅助栏命令不存在，跳过');
      }
      
      // 创建全屏webview面板，占据整个工作区
      this._fullscreenPanel = vscode.window.createWebviewPanel(
        "mermaidFullscreenOverlay",
        `🎨 ${title} - 全屏预览`,
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
      this._fullscreenPanel.webview.html = this._getFullscreenOverlayHtml(svg, title, index);

      // 尝试让面板获得焦点并最大化
      this._fullscreenPanel.reveal(vscode.ViewColumn.Active, false);

      // 处理面板关闭
      this._fullscreenPanel.onDidDispose(() => {
        this._fullscreenPanel = undefined;
        // 恢复侧边栏（如果之前是打开的）
        try {
          vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');
        } catch (error) {
          console.log('恢复侧边栏失败:', error);
        }
      });

      // 处理来自全屏webview的消息
      this._fullscreenPanel.webview.onDidReceiveMessage((data) => {
        switch (data.type) {
          case "closeFullscreen":
            if (this._fullscreenPanel) {
              this._fullscreenPanel.dispose();
            }
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

  private _getPopupHtml(mermaidBlocks: string[], functionName: string, locationInfo?: {name: string; lineNumber: number; type: string; mermaidLineNumber: number}[], filePath?: string): string {
    // 读取HTML模板文件
    const templatePath = path.join(__dirname, 'mermaid-preview.html');
    let htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    
    // 获取资源文件的webview URI
    const mermaidLibPath = vscode.Uri.file(path.join(__dirname, 'libs', 'mermaid.min.js'));
    const mermaidLibUri = this._panel?.webview.asWebviewUri(mermaidLibPath);
    
    const webviewScriptPath = vscode.Uri.file(path.join(__dirname, 'webview-script.js'));
    const webviewScriptUri = this._panel?.webview.asWebviewUri(webviewScriptPath);
    
    const webviewStylesPath = vscode.Uri.file(path.join(__dirname, 'webview-styles.css'));
    const webviewStylesUri = this._panel?.webview.asWebviewUri(webviewStylesPath);
    
    // 直接使用传入的functionName作为fileName，因为调用方已经正确计算了文件名
    // functionName 实际上就是从 path.basename(filePath, path.extname(filePath)) 得来的
    const fileName = functionName || 'mermaid-chart';
    
    // 先注入文件名和位置信息到HTML中，供JavaScript使用（必须在URI替换之前）
    console.log('注入到webview的fileName:', fileName);
    console.log('注入到webview的locationInfo:', locationInfo);
    htmlTemplate = htmlTemplate.replace(
      '<script src="./webview-script.js"></script>',
      `<script>
        window.currentFileName = '${fileName}';
        window.locationInfo = ${JSON.stringify(locationInfo || [])};
      </script>\n    <script src="./webview-script.js"></script>`
    );
    
    // 然后替换模板变量和URI
    htmlTemplate = htmlTemplate
      .replace('{{FUNCTION_NAME}}', functionName)
      .replace('{{MERMAID_CARDS}}', this._generateMermaidCards(mermaidBlocks, locationInfo, filePath))
      .replace('./libs/mermaid.min.js', mermaidLibUri?.toString() || './libs/mermaid.min.js')
      .replace('./webview-script.js', webviewScriptUri?.toString() || './webview-script.js')
      .replace('./webview-styles.css', webviewStylesUri?.toString() || './webview-styles.css');
    
    return htmlTemplate;
  }
  


  private _generateMermaidCards(mermaidBlocks: string[], locationInfo?: {name: string; lineNumber: number; type: string; mermaidLineNumber: number}[], filePath?: string): string {
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
            case 'function':
              icon = "🔧";
              displayText = `Func: ${locationData.name}:${locationData.lineNumber}`;
              break;
            case 'method':
              icon = "⚙️";
              displayText = `Meth: ${locationData.name}:${locationData.lineNumber}`;
              break;
            case 'class':
              icon = "🏗️";
              displayText = `Class: ${locationData.name}:${locationData.lineNumber}`;
              break;
            case 'location':
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
                <div class="chart-title-text ${locationData ? 'chart-title-with-function' : 'chart-title-basic'}">
                  <span>📊 ${title}</span>
                  ${locationData ? ` - <span class="location-info" onclick="event.stopPropagation(); jumpToFunction(${targetLineNumber}, '${path.basename(filePath || '')}')" title="点击跳转到源码位置">${icon} ${displayText}</span>` : ""}
                </div>
              </div>
              <div class="card-actions">
                  <button class="action-btn" onclick="event.stopPropagation(); showPreview(${index})" title="预览大图">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                      </svg>
                  </button>
                  <button class="action-btn" onclick="event.stopPropagation(); copyCode(\`${code.replace(/`/g, '\\`').replace(/\n/g, '\\n').replace(/"/g, '&quot;')}\`)" title="复制代码">
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

  private _getFullscreenOverlayHtml(svg: string, title: string, index: number): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>全屏预览 - ${title}</title>
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
            background: rgba(0, 0, 0, 0.95);
            color: white;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999999;
        }
        
        .overlay-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            flex-direction: column;
            z-index: 999999;
            backdrop-filter: blur(10px);
        }
        
        .overlay-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: rgba(0, 0, 0, 0.8);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 30px;
            z-index: 1000000;
            opacity: 0.9;
            transition: opacity 0.3s ease;
            backdrop-filter: blur(20px);
        }
        
        .overlay-header:hover {
            opacity: 1;
        }
        
        .overlay-title {
            font-size: 18px;
            font-weight: 600;
            color: white;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
        }
        
        .overlay-controls {
            display: flex;
            gap: 15px;
        }
        
        .overlay-btn {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
        }
        
        .overlay-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.4);
            transform: translateY(-1px);
        }
        
        .close-btn {
            background: rgba(220, 53, 69, 0.8);
            border-color: rgba(220, 53, 69, 0.5);
        }
        
        .close-btn:hover {
            background: rgba(220, 53, 69, 1);
            border-color: rgba(220, 53, 69, 0.8);
        }
        
        .overlay-content {
            position: fixed;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow: hidden;
        }
        
        .svg-container {
            max-width: 95vw;
            max-height: 85vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 12px;
            padding: 20px;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .svg-container svg {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }
        
        /* 键盘提示 */
        .keyboard-hint {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: rgba(255, 255, 255, 0.8);
            padding: 12px 24px;
            border-radius: 20px;
            font-size: 14px;
            opacity: 0.7;
            z-index: 1000000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
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
        
        .overlay-container {
            animation: fadeIn 0.3s ease-out;
        }
        
        .svg-container {
            animation: fadeIn 0.4s ease-out 0.1s both;
        }
        
        /* 鼠标移动时显示控制栏 */
        .overlay-header {
            transform: translateY(-100%);
            transition: transform 0.3s ease, opacity 0.3s ease;
        }
        
        .overlay-container:hover .overlay-header,
        .overlay-header:hover {
            transform: translateY(0);
        }
        
        /* 初始显示控制栏 */
        .overlay-container.show-header .overlay-header {
            transform: translateY(0);
        }
    </style>
</head>
<body>
    <div class="overlay-container show-header" id="overlayContainer">
        <div class="overlay-header">
            <div class="overlay-title">${title} - 全屏预览</div>
            <div class="overlay-controls">
                <button class="overlay-btn" onclick="exportImage()" title="导出图片">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    导出图片
                </button>
                <button class="overlay-btn close-btn" onclick="closeFullscreen()" title="关闭全屏 (ESC)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    关闭
                </button>
            </div>
        </div>
        
        <div class="overlay-content">
            <div class="svg-container">
                ${svg}
            </div>
        </div>
        
        <div class="keyboard-hint">
            按 ESC 键关闭全屏预览
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function closeFullscreen() {
            vscode.postMessage({
                type: 'closeFullscreen'
            });
        }
        
        function exportImage() {
            const svg = document.querySelector('svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                vscode.postMessage({
                    type: 'exportImage',
                    svg: svgData,
                    index: ${index},
                    fileName: '${title}-fullscreen',
                    isDarkTheme: true
                });
            }
        }
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeFullscreen();
            }
        });
        
        // 鼠标移动显示控制栏
        let headerTimer;
        const container = document.getElementById('overlayContainer');
        
        document.addEventListener('mousemove', () => {
            container.classList.add('show-header');
            clearTimeout(headerTimer);
            headerTimer = setTimeout(() => {
                container.classList.remove('show-header');
            }, 3000);
        });
        
        // 初始显示控制栏，3秒后自动隐藏
        setTimeout(() => {
            container.classList.remove('show-header');
        }, 3000);
        
        // 点击背景关闭
        document.addEventListener('click', (e) => {
            if (e.target === container || e.target.classList.contains('overlay-content')) {
                closeFullscreen();
            }
        });
    </script>
</body>
</html>`;
  }

  private _getFullscreenHtml(svg: string, title: string, index: number): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>全屏预览 - ${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            overflow: hidden;
            height: 100vh;
            width: 100vw;
        }
        
        .fullscreen-container {
            position: relative;
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .fullscreen-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 50px;
            background-color: var(--vscode-titleBar-activeBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            z-index: 1000;
            opacity: 0.9;
            transition: opacity 0.3s ease;
        }
        
        .fullscreen-header:hover {
            opacity: 1;
        }
        
        .fullscreen-title {
            font-size: 14px;
            font-weight: 500;
            color: var(--vscode-titleBar-activeForeground);
        }
        
        .fullscreen-controls {
            display: flex;
            gap: 10px;
        }
        
        .fullscreen-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: background-color 0.2s ease;
        }
        
        .fullscreen-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .fullscreen-content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 60px 20px 20px;
            overflow: hidden;
        }
        
        .svg-container {
            max-width: 100%;
            max-height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .svg-container svg {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        
        /* 键盘提示 */
        .keyboard-hint {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--vscode-notifications-background);
            color: var(--vscode-notifications-foreground);
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 12px;
            opacity: 0.8;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div class="fullscreen-container">
        <div class="fullscreen-header">
            <div class="fullscreen-title">${title} - 全屏预览</div>
            <div class="fullscreen-controls">
                <button class="fullscreen-btn" onclick="exportImage()" title="导出图片">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    导出
                </button>
                <button class="fullscreen-btn" onclick="closeFullscreen()" title="关闭 (ESC)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    关闭
                </button>
            </div>
        </div>
        
        <div class="fullscreen-content">
            <div class="svg-container">
                ${svg}
            </div>
        </div>
        
        <div class="keyboard-hint">
            按 ESC 键关闭全屏预览
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function closeFullscreen() {
            vscode.postMessage({
                type: 'closeFullscreen'
            });
        }
        
        function exportImage() {
            const svg = document.querySelector('svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                vscode.postMessage({
                    type: 'exportImage',
                    svg: svgData,
                    index: ${index},
                    fileName: '${title}-fullscreen',
                    isDarkTheme: document.body.classList.contains('vscode-dark')
                });
            }
        }
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeFullscreen();
            }
        });
        
        // 自动隐藏头部控制栏
        let headerTimer;
        const header = document.querySelector('.fullscreen-header');
        
        document.addEventListener('mousemove', () => {
            header.style.opacity = '0.9';
            clearTimeout(headerTimer);
            headerTimer = setTimeout(() => {
                header.style.opacity = '0.3';
            }, 3000);
        });
        
        // 初始化时也启动定时器
        headerTimer = setTimeout(() => {
            header.style.opacity = '0.3';
        }, 3000);
    </script>
</body>
</html>`;
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Render Mermaid in Function Doc 扩展已激活");
  
  // 创建弹出式预览提供者
  const popupProvider = PopupMermaidPreviewProvider.getInstance(context.extensionUri);
  
  // 注册提取所有Mermaid图表命令
  let extractAllPopupCommand = vscode.commands.registerCommand("mermaid-render-anywhere.extractAllMermaidPopup", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("请先打开一个文件");
      return;
    }

    const {mermaidBlocks, locationInfo} = extractAllMermaidFromFile(editor.document);
    
    if (mermaidBlocks.length === 0) {
      vscode.window.showWarningMessage("当前文件中没有找到Mermaid图表");
      return;
    }

    // 显示弹出式预览
    const fileName = path.basename(editor.document.fileName, path.extname(editor.document.fileName));
    const filePath = editor.document.fileName;
    console.log('命令调用 - fileName:', fileName, 'filePath:', filePath);
    // 使用fileName作为functionName在标题中显示，同时传递完整的filePath用于导出文件名
    popupProvider.showPopup(mermaidBlocks, fileName, locationInfo, filePath);
    
    vscode.window.showInformationMessage(`🎨 已提取并显示 ${mermaidBlocks.length} 个Mermaid图表`);
  });

  // 注册测试命令
  let testCommand = vscode.commands.registerCommand("mermaid-render-anywhere.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from Render Mermaid in Function Doc!");
  });

  context.subscriptions.push(extractAllPopupCommand, testCommand);
}

export function deactivate() {
  console.log("Render Mermaid in Function Doc 扩展已停用");
} 

