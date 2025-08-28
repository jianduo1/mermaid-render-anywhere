/**
 * 全屏预览脚本
 * 处理全屏预览模式下的用户交互和功能
 */

// VSCode API 实例
const vscode = acquireVsCodeApi();

/**
 * 关闭全屏预览
 */
function closeFullscreen() {
    vscode.postMessage({
        type: 'closeFullscreen'
    });
}

/**
 * 导出图片
 */
function exportImage() {
    const svg = document.querySelector('svg');
    if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        vscode.postMessage({
            type: 'exportImage',
            svg: svgData,
            index: window.chartIndex || 0,
            fileName: (window.chartTitle || 'mermaid-chart') + '-fullscreen',
            isDarkTheme: true
        });
    }
}

/**
 * 初始化全屏预览功能
 */
function initializeFullscreenPreview() {
    // ESC键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeFullscreen();
        }
    });
    
    // 鼠标移动显示控制栏
    let headerTimer;
    const container = document.getElementById('overlayContainer');
    
    if (container) {
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
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initializeFullscreenPreview);

// 如果DOM已经加载完成，立即初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFullscreenPreview);
} else {
    initializeFullscreenPreview();
}