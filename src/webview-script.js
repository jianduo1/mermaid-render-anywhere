/**
 * Mermaid WebView 渲染器
 * 
 * 这是一个优化的Mermaid图表渲染系统，具有以下特性：
 * - 懒加载渲染：只渲染可见区域的图表，提升性能
 * - 智能重试机制：渲染失败时自动重试，提高成功率
 * - 主题适配：自动适配VSCode的亮色/暗色主题
 * - 交互功能：支持缩放、拖拽、预览等操作
 * - 错误处理：完善的错误处理和用户反馈机制
 * 
 * @author Mermaid Render Anywhere Extension
 * @version 2.0.0 (优化版本)
 */

/**
 * 渲染状态管理器
 * 管理所有图表的渲染状态和配置
 */
class RenderStateManager {
    constructor() {
        this.isRendering = false;
        this.renderAttempts = 0;
        this.maxAttempts = 3;
        this.renderedCharts = new Set();
        this.failedCharts = new Set();
    }

    /**
     * 重置渲染状态
     */
    reset() {
        this.isRendering = false;
        this.renderAttempts = 0;
        this.renderedCharts.clear();
        this.failedCharts.clear();
    }

    /**
     * 标记图表为已渲染
     * @param {number} index - 图表索引
     */
    markAsRendered(index) {
        this.renderedCharts.add(index);
        this.failedCharts.delete(index);
    }

    /**
     * 标记图表为渲染失败
     * @param {number} index - 图表索引
     */
    markAsFailed(index) {
        this.failedCharts.add(index);
        this.renderedCharts.delete(index);
    }

    /**
     * 检查图表是否已渲染
     * @param {number} index - 图表索引
     * @returns {boolean}
     */
    isRendered(index) {
        return this.renderedCharts.has(index);
    }

    /**
     * 检查图表是否渲染失败
     * @param {number} index - 图表索引
     * @returns {boolean}
     */
    hasFailed(index) {
        return this.failedCharts.has(index);
    }
}

/**
 * 懒加载管理器
 * 使用IntersectionObserver实现图表的懒加载
 */
class LazyLoadManager {
    constructor(renderCallback) {
        this.observer = null;
        this.renderCallback = renderCallback;
        this.isSupported = !!window.IntersectionObserver;
    }

    /**
     * 初始化懒加载观察器
     * @returns {boolean} 是否初始化成功
     */
    initialize() {
        if (!this.isSupported) {
            console.warn('浏览器不支持 IntersectionObserver，回退到立即渲染');
            return false;
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    const index = parseInt(card.dataset.index);
                    
                    if (this.renderCallback) {
                        console.log(`懒加载触发：渲染图表 ${index + 1}`);
                        this.renderCallback(card, index);
                    }
                    
                    // 渲染后停止观察
                    this.observer.unobserve(card);
                }
            });
        }, {
            root: null,
            rootMargin: '100px', // 提前100px开始加载
            threshold: 0.1
        });

        return true;
    }

    /**
     * 添加元素到观察列表
     * @param {HTMLElement} element - 要观察的元素
     */
    observe(element) {
        if (this.observer && element) {
            this.observer.observe(element);
        }
    }

    /**
     * 停止观察所有元素
     */
    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

/**
 * 滚轮锁定管理器
 * 控制全局滚轮行为：缩放模式 vs 位移模式
 * 
 * 功能说明：
 * - 解锁状态：滚轮进行缩放操作
 * - 锁定状态：滚轮进行位移操作
 * - 状态持久化到 localStorage
 * - 同时控制卡片预览和大图预览的滚轮行为
 */
class ScrollLockManager {
    constructor() {
        this.isLocked = false; // false: 缩放模式, true: 位移模式
        this.lockBtn = null;
    }

    /**
     * 初始化滚轮锁定管理器
     */
    initialize() {
        this.lockBtn = document.getElementById('scrollLockBtn');
        if (this.lockBtn) {
            this.lockBtn.addEventListener('click', () => this.toggleLock());
        }
        
        // 从localStorage读取之前的设置
        const savedLockState = localStorage.getItem('mermaid-scroll-lock');
        if (savedLockState !== null) {
            this.isLocked = savedLockState === 'true';
        }
        
        this.updateLockButton();
        console.log('滚轮锁定管理器初始化完成，当前模式:', this.isLocked ? '位移模式' : '缩放模式');
    }

    /**
     * 切换锁定状态
     */
    toggleLock() {
        this.isLocked = !this.isLocked;
        localStorage.setItem('mermaid-scroll-lock', this.isLocked.toString());
        this.updateLockButton();
        console.log('滚轮模式切换为:', this.isLocked ? '位移模式' : '缩放模式');
    }

    /**
     * 更新锁定按钮状态
     */
    updateLockButton() {
        if (!this.lockBtn) return;
        
        // 更新按钮图标和标题
        if (this.isLocked) {
            // 锁定状态 - 位移模式
            this.lockBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
            `;
            this.lockBtn.title = '当前：位移模式（点击切换为缩放模式）';
            this.lockBtn.classList.add('locked');
        } else {
            // 解锁状态 - 缩放模式
            this.lockBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0 1 5.5-4.9"/>
                </svg>
            `;
            this.lockBtn.title = '当前：缩放模式（点击切换为位移模式）';
            this.lockBtn.classList.remove('locked');
        }
    }

    /**
     * 获取当前锁定状态
     * @returns {boolean} true: 位移模式, false: 缩放模式
     */
    getLockState() {
        return this.isLocked;
    }
}

/**
 * 主题管理器
 * 处理亮色/暗色主题切换和SVG样式适配
 */
class ThemeManager {
    constructor() {
        this.isDarkTheme = true;
        this.themeBtn = null;
    }

    /**
     * 初始化主题管理器
     */
    initialize() {
        this.themeBtn = document.getElementById('toggleTheme');
        if (this.themeBtn) {
            this.themeBtn.addEventListener('click', () => this.toggleTheme());
        }
        
        // 检测初始主题
        this.detectInitialTheme();
    }

    /**
     * 检测初始主题（独立于VSCode主题）
     */
    detectInitialTheme() {
        // 从localStorage读取用户之前的主题选择，如果没有则默认为深色主题
        const savedTheme = localStorage.getItem('mermaid-preview-theme');
        
        if (savedTheme) {
            this.isDarkTheme = savedTheme === 'dark';
            console.log('从本地存储恢复主题:', this.isDarkTheme ? '深色' : '浅色');
        } else {
            // 默认使用深色主题，因为对于流程图来说深色背景通常有更好的对比度
            this.isDarkTheme = true;
            console.log('使用默认深色主题');
        }
        
        // 设置body的主题类，但不依赖VSCode主题
        document.body.className = this.isDarkTheme ? 'dark-theme' : 'light-theme';
        
        // 立即更新卡片背景和主题按钮
        this.updateThemeButton();
        setTimeout(() => {
            this.updateCardBackgrounds();
        }, 100);
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        document.body.className = this.isDarkTheme ? 'dark-theme' : 'light-theme';
        
        // 保存用户的主题选择到localStorage
        localStorage.setItem('mermaid-preview-theme', this.isDarkTheme ? 'dark' : 'light');
        
        console.log('主题切换到:', this.isDarkTheme ? '深色' : '浅色');
        
        this.updateThemeButton();
        
        // 立即更新主题样式
        this.updateAllThemes();
        
        // 延迟再次更新，确保所有样式都已应用
        setTimeout(() => {
            this.updateAllThemes();
        }, 50);
        
        // 重新初始化Mermaid并重新渲染
        if (window.mermaidRenderer) {
            window.mermaidRenderer.reinitializeWithTheme();
        }
    }

    /**
     * 更新主题按钮图标
     */
    updateThemeButton() {
        if (!this.themeBtn) return;
        
        this.themeBtn.innerHTML = this.isDarkTheme ? 
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' :
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }

    /**
     * 更新所有主题样式
     */
    updateAllThemes() {
        this.updateCardBackgrounds();
        this.updateSvgThemes();
    }

    /**
     * 更新卡片背景
     */
    updateCardBackgrounds() {
        const cards = document.querySelectorAll('.mermaid-card');
        // 根据当前主题确定背景色 - 深色使用深灰色，浅色使用纯白色
        const bgColor = this.isDarkTheme ? '#2d2d2d' : '#ffffff';
        const borderColor = this.isDarkTheme ? '#404040' : '#e1e1e1';
        
        console.log('更新卡片背景，当前主题:', this.isDarkTheme ? '深色' : '浅色', '背景色:', bgColor, '卡片数量:', cards.length);
        
        cards.forEach((card, index) => {
            // 更新卡片主体背景和边框
            card.style.setProperty('background-color', bgColor, 'important');
            card.style.setProperty('border-color', borderColor, 'important');
            // console.log(`卡片 ${index + 1} 主体背景已更新:`, bgColor);
            
            // 更新视口背景
            const viewport = card.querySelector('.mermaid-viewport');
            if (viewport) {
                viewport.style.setProperty('background-color', bgColor, 'important');
            }
            
            // 更新容器背景，确保SVG周围区域也有正确的背景色
            const container = card.querySelector('.mermaid-container');
            if (container) {
                container.style.setProperty('background-color', bgColor, 'important');
            }
        });
        
        // 同时更新预览模态框的背景
        const previewContent = document.querySelector('.preview-content');
        if (previewContent) {
            previewContent.style.setProperty('background-color', bgColor, 'important');
        }
        
        const previewModal = document.querySelector('.preview-modal');
        if (previewModal) {
            previewModal.style.setProperty('background-color', bgColor, 'important');
            previewModal.style.setProperty('border-color', borderColor, 'important');
        }
    }

    /**
     * 更新所有SVG主题
     */
    updateSvgThemes() {
        const svgs = document.querySelectorAll('.mermaid-container svg');
        svgs.forEach(svg => this.updateSvgTheme(svg));
    }

    /**
     * 更新单个SVG主题
     * @param {SVGElement} svg - SVG元素
     */
    updateSvgTheme(svg) {
        if (!svg) return;
        
        // 根据当前主题直接设置背景色和文本颜色
        const bgColor = this.isDarkTheme ? '#2d2d2d' : '#ffffff';
        const textColor = this.isDarkTheme ? '#ffffff' : '#000000';
        
        console.log('更新SVG主题:', this.isDarkTheme ? '深色' : '浅色', '背景色:', bgColor);
        
        // 设置SVG背景 - 确保SVG本身有背景色
        svg.style.backgroundColor = bgColor;
        
        // 为SVG添加背景矩形（如果Mermaid没有生成背景）
        this.ensureSvgBackground(svg, bgColor);
        
        // 更新文本颜色
        const texts = svg.querySelectorAll('text, tspan');
        texts.forEach(text => {
            text.style.fill = textColor;
        });
        
        // 更新节点背景
        this.updateSvgNodeColors(svg);
    }
    
    /**
     * 确保SVG有背景矩形
     * @param {SVGElement} svg - SVG元素
     * @param {string} bgColor - 背景颜色
     */
    ensureSvgBackground(svg, bgColor) {
        // 检查是否已有背景矩形
        let bgRect = svg.querySelector('.svg-background');
        
        if (!bgRect) {
            // 创建背景矩形
            bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bgRect.classList.add('svg-background');
            
            // 将背景矩形插入到最前面
            svg.insertBefore(bgRect, svg.firstChild);
        }
        
        // 设置背景矩形属性
        const viewBox = svg.getAttribute('viewBox');
        if (viewBox) {
            const [x, y, width, height] = viewBox.split(' ').map(Number);
            bgRect.setAttribute('x', x);
            bgRect.setAttribute('y', y);
            bgRect.setAttribute('width', width);
            bgRect.setAttribute('height', height);
        } else {
            // 如果没有viewBox，使用SVG的宽高
            const bbox = svg.getBBox();
            bgRect.setAttribute('x', bbox.x - 10);
            bgRect.setAttribute('y', bbox.y - 10);
            bgRect.setAttribute('width', bbox.width + 20);
            bgRect.setAttribute('height', bbox.height + 20);
        }
        
        bgRect.setAttribute('fill', bgColor);
        bgRect.setAttribute('stroke', 'none');
    }

    /**
     * 更新SVG节点颜色
     * @param {SVGElement} svg - SVG元素
     */
    updateSvgNodeColors(svg) {
        const rects = svg.querySelectorAll('rect');
        rects.forEach(rect => {
            const fill = rect.getAttribute('fill');
            if (fill) {
                const currentFill = fill.toLowerCase();
                if (this.isDarkTheme && (currentFill === '#ffffff' || currentFill === 'white')) {
                    rect.setAttribute('fill', '#2d2d30');
                } else if (!this.isDarkTheme && (currentFill === '#000000' || currentFill === 'black')) {
                    rect.setAttribute('fill', '#ffffff');
                }
            }
        });
    }

    /**
     * 将十六进制颜色转换为RGB
     * @param {string} hex - 十六进制颜色值
     * @returns {object|null} RGB对象或null
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}

/**
 * 图表交互管理器
 * 处理图表的缩放、拖拽等交互功能
 */
class ChartInteractionManager {
    constructor(scrollLockManager = null) {
        this.currentScale = 1;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.currentTranslate = { x: 0, y: 0 };
        this.currentContainer = null;
        this.scrollLockManager = scrollLockManager;
    }

    /**
     * 为图表容器添加交互功能
     * @param {HTMLElement} container - 图表容器
     * @param {number} index - 图表索引
     */
    addInteractions(container, index) {
        if (!container) return;

        const svg = container.querySelector('svg');
        if (!svg) return;

        // 确保SVG有合适的尺寸
        this.setupSvgDimensions(svg);

        // 添加事件监听器
        container.addEventListener('wheel', (e) => this.handleZoom(e, container));
        container.addEventListener('mousedown', (e) => this.startDrag(e, container));
        container.addEventListener('dblclick', () => this.resetZoom(container));
        
        // 设置鼠标样式
        container.style.cursor = 'grab';
    }

    /**
     * 设置SVG尺寸
     * @param {SVGElement} svg - SVG元素
     */
    setupSvgDimensions(svg) {
        if (!svg.getAttribute('width')) {
            svg.setAttribute('width', '100%');
        }
        if (!svg.getAttribute('height')) {
            svg.style.height = 'auto';
        }
    }

    /**
     * 处理缩放和位移
     * @param {WheelEvent} event - 滚轮事件
     * @param {HTMLElement} container - 容器元素
     */
    handleZoom(event, container) {
        event.preventDefault();
        
        // 检查滚轮锁定状态
        const isLocked = this.scrollLockManager ? this.scrollLockManager.getLockState() : false;
        
        if (isLocked) {
            // 锁定模式：位移
            const moveDistance = 30; // 位移距离
            const deltaX = event.deltaX || 0;
            const deltaY = event.deltaY || 0;
            
            // 根据滚轮方向进行位移
            this.currentTranslate.x -= deltaX * 0.5;
            this.currentTranslate.y -= deltaY * 0.5;
        } else {
            // 解锁模式：缩放
            const rect = container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const mouseX = event.clientX - centerX;
            const mouseY = event.clientY - centerY;
            
            const delta = event.deltaY > 0 ? 0.9 : 1.1;
            this.currentScale = Math.max(0.1, Math.min(5, this.currentScale * delta));
        }
        
        this.updateTransform(container);
    }

    /**
     * 开始拖拽
     * @param {MouseEvent} event - 鼠标事件
     * @param {HTMLElement} container - 容器元素
     */
    startDrag(event, container) {
        if (event.button !== 0) return; // 只处理左键
        
        this.isDragging = true;
        this.currentContainer = container;
        this.dragStart.x = event.clientX - this.currentTranslate.x;
        this.dragStart.y = event.clientY - this.currentTranslate.y;
        
        container.style.cursor = 'grabbing';
        
        // 添加全局事件监听器
        document.addEventListener('mousemove', this.drag.bind(this));
        document.addEventListener('mouseup', this.endDrag.bind(this));
    }

    /**
     * 拖拽处理
     * @param {MouseEvent} event - 鼠标事件
     */
    drag(event) {
        if (!this.isDragging || !this.currentContainer) return;
        
        this.currentTranslate.x = event.clientX - this.dragStart.x;
        this.currentTranslate.y = event.clientY - this.dragStart.y;
        
        this.updateTransform(this.currentContainer);
    }

    /**
     * 结束拖拽
     */
    endDrag() {
        if (this.currentContainer) {
            this.currentContainer.style.cursor = 'grab';
        }
        
        this.isDragging = false;
        this.currentContainer = null;
        
        // 移除全局事件监听器
        document.removeEventListener('mousemove', this.drag.bind(this));
        document.removeEventListener('mouseup', this.endDrag.bind(this));
    }

    /**
     * 重置缩放
     * @param {HTMLElement} container - 容器元素
     */
    resetZoom(container) {
        this.currentScale = 1;
        this.currentTranslate.x = 0;
        this.currentTranslate.y = 0;
        this.updateTransform(container);
    }

    /**
     * 更新变换
     * @param {HTMLElement} container - 容器元素
     */
    updateTransform(container) {
        const svg = container.querySelector('svg');
        if (svg) {
            svg.style.transform = `translate(${this.currentTranslate.x}px, ${this.currentTranslate.y}px) scale(${this.currentScale})`;
        }
    }
}

/**
 * Mermaid 渲染器主类
 * 核心渲染逻辑和状态管理
 */
class MermaidRenderer {
    constructor() {
        this.renderState = new RenderStateManager();
        this.lazyLoader = new LazyLoadManager(this.handleLazyRender.bind(this));
        this.themeManager = new ThemeManager();
        this.scrollLockManager = new ScrollLockManager();
        this.interactionManager = new ChartInteractionManager(this.scrollLockManager);
        this.vscode = acquireVsCodeApi();
    }

    /**
     * 初始化渲染器
     */
    async initialize() {
        console.log('初始化Mermaid渲染器');
        
        // 初始化各个管理器
        this.themeManager.initialize();
        this.scrollLockManager.initialize();
        
        // 等待Mermaid库加载
        const mermaidLoaded = await this.waitForMermaid();
        if (!mermaidLoaded) {
            throw new Error('Mermaid库加载失败');
        }
        
        // 初始化Mermaid配置
        this.initializeMermaid();
        
        // 开始渲染流程
        await this.startRenderProcess();
    }

    /**
     * 等待Mermaid库加载完成
     * @param {number} maxWait - 最大等待时间（毫秒）
     * @returns {Promise<boolean>} 是否加载成功
     */
    async waitForMermaid(maxWait = 2000) {
        const startTime = Date.now();
        console.log('等待Mermaid库加载...');
        
        if (typeof mermaid !== 'undefined') {
            console.log('Mermaid库已可用');
            return true;
        }
        
        while (typeof mermaid === 'undefined' && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        const loaded = typeof mermaid !== 'undefined';
        console.log(loaded ? 'Mermaid库加载成功' : 'Mermaid库加载超时');
        
        return loaded;
    }

    /**
     * 初始化Mermaid配置
     */
    initializeMermaid() {
        if (typeof mermaid === 'undefined') {
            console.warn('Mermaid库未加载');
            return false;
        }
        
        const config = {
            startOnLoad: false,
            theme: this.themeManager.isDarkTheme ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: 12,
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true
            },
            sequence: {
                useMaxWidth: true
            },
            gantt: {
                useMaxWidth: true
            }
        };
        
        // 根据主题设置自定义主题变量
        if (this.themeManager.isDarkTheme) {
            // 深色主题 - 提高连线对比度
            config.themeVariables = {
                // 主要颜色
                primaryColor: '#4a9eff',
                primaryTextColor: '#ffffff',
                primaryBorderColor: '#6bb6ff',
                
                // 背景色
                background: '#2d2d2d',
                secondaryColor: '#3a3a3a',
                tertiaryColor: '#4a4a4a',
                
                // 连线和边框颜色 - 使用高对比度的颜色
                lineColor: '#8cc8ff',          // 亮蓝色连线，确保在深色背景下清晰可见
                edgeLabelBackground: '#2d2d2d',
                
                // 类图特定颜色
                classText: '#ffffff',
                classBkgColor: '#3a3a3a',
                classBorderColor: '#6bb6ff',   // 亮蓝色边框
                
                // 关系线颜色
                relationColor: '#8cc8ff',      // 关系线使用亮蓝色
                relationLabelColor: '#ffffff',
                relationLabelBackground: '#2d2d2d',
                
                // 其他图表类型的连线颜色
                cScale0: '#8cc8ff',
                cScale1: '#66b3ff',
                cScale2: '#4da6ff',
                
                // 文本颜色
                textColor: '#ffffff',
                labelTextColor: '#ffffff',
                
                // 节点颜色
                nodeBkg: '#3a3a3a',
                nodeBorder: '#6bb6ff',
                
                // 确保箭头和标记也有足够的对比度
                arrowheadColor: '#8cc8ff'
            };
        } else {
            // 浅色主题 - 确保在白色背景下有足够对比度
            config.themeVariables = {
                // 主要颜色
                primaryColor: '#0066cc',
                primaryTextColor: '#000000',
                primaryBorderColor: '#0066cc',
                
                // 背景色
                background: '#ffffff',
                secondaryColor: '#f5f5f5',
                tertiaryColor: '#e5e5e5',
                
                // 连线和边框颜色
                lineColor: '#0066cc',
                edgeLabelBackground: '#ffffff',
                
                // 类图特定颜色
                classText: '#000000',
                classBkgColor: '#f9f9f9',
                classBorderColor: '#0066cc',
                
                // 关系线颜色
                relationColor: '#0066cc',
                relationLabelColor: '#000000',
                relationLabelBackground: '#ffffff',
                
                // 其他图表类型的连线颜色
                cScale0: '#0066cc',
                cScale1: '#0052a3',
                cScale2: '#003d7a',
                
                // 文本颜色
                textColor: '#000000',
                labelTextColor: '#000000',
                
                // 节点颜色
                nodeBkg: '#f9f9f9',
                nodeBorder: '#0066cc',
                
                // 箭头颜色
                arrowheadColor: '#0066cc'
            };
        }
        
        mermaid.initialize(config);
        
        return true;
    }

    /**
     * 重新初始化（主题切换时）
     */
    reinitializeWithTheme() {
        this.initializeMermaid();
        this.renderState.renderedCharts.clear();
        this.startRenderProcess();
    }

    /**
     * 开始渲染流程
     */
    async startRenderProcess() {
        if (this.renderState.isRendering) {
            console.log('渲染正在进行中，跳过重复调用');
            return;
        }
        
        this.renderState.isRendering = true;
        this.renderState.renderAttempts++;
        
        console.log(`开始渲染流程 (尝试 ${this.renderState.renderAttempts}/${this.renderState.maxAttempts})`);
        
        try {
            const cards = document.querySelectorAll('.mermaid-card');
            console.log(`找到 ${cards.length} 个图表卡片`);
            
            // 决定渲染策略
            const uselazyLoading = this.shouldUseLazyLoading(cards.length);
            
            if (uselazyLoading) {
                await this.renderWithLazyLoading(cards);
            } else {
                await this.renderAllImmediately(cards);
            }
            
            // 更新主题样式
            setTimeout(() => {
                this.themeManager.updateAllThemes();
            }, 200);
            
        } catch (error) {
            console.error('渲染失败:', error);
            await this.handleRenderError(error);
        } finally {
            this.renderState.isRendering = false;
        }
    }

    /**
     * 判断是否应该使用懒加载
     * @param {number} chartCount - 图表数量
     * @returns {boolean}
     */
    shouldUseLazyLoading(chartCount) {
        return this.lazyLoader.isSupported && chartCount > 3;
    }

    /**
     * 使用懒加载策略渲染
     * @param {NodeList} cards - 图表卡片列表
     */
    async renderWithLazyLoading(cards) {
        console.log('使用懒加载策略');
        
        if (!this.lazyLoader.initialize()) {
            // 如果懒加载初始化失败，回退到立即渲染
            return this.renderAllImmediately(cards);
        }
        
        const immediateRenderPromises = [];
        
        cards.forEach((card, index) => {
            card.dataset.index = index;
            
            if (index < 3) {
                // 立即渲染前3个
                const codeElement = card.querySelector('.mermaid-code');
                const mermaidCode = codeElement ? codeElement.textContent.trim() : '';
                
                if (mermaidCode) {
                    immediateRenderPromises.push(this.renderChart(card, mermaidCode, index));
                }
            } else {
                // 其余的添加到懒加载观察器
                this.lazyLoader.observe(card);
            }
        });
        
        await Promise.allSettled(immediateRenderPromises);
        console.log('前3个图表渲染完成，其余图表将懒加载');
    }

    /**
     * 立即渲染所有图表
     * @param {NodeList} cards - 图表卡片列表
     */
    async renderAllImmediately(cards) {
        console.log('使用立即渲染策略');
        
        const renderPromises = [];
        cards.forEach((card, index) => {
            card.dataset.index = index;
            
            const codeElement = card.querySelector('.mermaid-code');
            const mermaidCode = codeElement ? codeElement.textContent.trim() : '';
            
            if (mermaidCode) {
                renderPromises.push(this.renderChart(card, mermaidCode, index));
            }
        });
        
        await Promise.allSettled(renderPromises);
        console.log('所有图表渲染完成');
    }

    /**
     * 处理懒加载渲染
     * @param {HTMLElement} card - 图表卡片
     * @param {number} index - 图表索引
     */
    handleLazyRender(card, index) {
        if (this.renderState.isRendered(index)) {
            return;
        }
        
        const codeElement = card.querySelector('.mermaid-code');
        const mermaidCode = codeElement ? codeElement.textContent.trim() : '';
        
        if (mermaidCode) {
            this.renderChart(card, mermaidCode, index);
        }
    }

    /**
     * 渲染单个图表
     * @param {HTMLElement} card - 图表卡片
     * @param {string} mermaidCode - Mermaid代码
     * @param {number} index - 图表索引
     */
    async renderChart(card, mermaidCode, index) {
        if (this.renderState.isRendered(index)) {
            console.log(`图表 ${index + 1} 已渲染，跳过`);
            return;
        }
        
        const viewport = card.querySelector('.mermaid-viewport');
        if (!viewport) return;
        
        try {
            console.log(`开始渲染图表 ${index + 1}`);
            
            // 显示加载状态
            viewport.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
            
            // 创建临时容器用于渲染
            const tempDiv = document.createElement('div');
            tempDiv.style.visibility = 'hidden';
            tempDiv.style.position = 'absolute';
            document.body.appendChild(tempDiv);
            
            // 渲染图表
            const result = await mermaid.render(`mermaid-${index}-${Date.now()}`, mermaidCode, tempDiv);
            
            // 创建图表容器
            const container = document.createElement('div');
            container.className = 'mermaid-container';
            container.innerHTML = result.svg;
            
            // 添加交互功能
            this.interactionManager.addInteractions(container, index);
            
            // 替换加载状态
            viewport.innerHTML = '';
            viewport.appendChild(container);
            
            // 清理临时容器
            document.body.removeChild(tempDiv);
            
            // 标记为已渲染
            this.renderState.markAsRendered(index);
            
            console.log(`图表 ${index + 1} 渲染成功`);
            
            // 应用主题样式
            setTimeout(() => {
                this.themeManager.updateSvgTheme(container.querySelector('svg'));
            }, 100);
            
        } catch (error) {
            console.error(`图表 ${index + 1} 渲染失败:`, error);
            this.renderState.markAsFailed(index);
            this.showChartError(viewport, error, index);
        }
    }

    /**
     * 显示图表错误
     * @param {HTMLElement} viewport - 视口元素
     * @param {Error} error - 错误对象
     * @param {number} index - 图表索引
     */
    showChartError(viewport, error, index) {
        viewport.innerHTML = `
            <div class="error-message">
                <div class="error-icon">⚠️</div>
                <div class="error-text">
                    图表渲染失败<br>
                    <small>${error.message || '未知错误'}</small>
                </div>
                <button class="retry-btn" onclick="window.mermaidRenderer.retryChart(${index})">重试</button>
            </div>
        `;
    }

    /**
     * 重试渲染单个图表
     * @param {number} index - 图表索引
     */
    async retryChart(index) {
        const card = document.querySelector(`.mermaid-card[data-index="${index}"]`);
        if (!card) return;
        
        this.renderState.renderedCharts.delete(index);
        this.renderState.failedCharts.delete(index);
        
        const codeElement = card.querySelector('.mermaid-code');
        const mermaidCode = codeElement ? codeElement.textContent.trim() : '';
        
        if (mermaidCode) {
            await this.renderChart(card, mermaidCode, index);
        }
    }

    /**
     * 处理渲染错误
     * @param {Error} error - 错误对象
     */
    async handleRenderError(error) {
        // 如果还有重试次数，延迟重试
        if (this.renderState.renderAttempts < this.renderState.maxAttempts) {
            console.log(`渲染失败，${1000}ms后重试...`);
            setTimeout(() => {
                this.renderState.isRendering = false;
                this.startRenderProcess();
            }, 1000);
        } else {
            console.error('渲染完全失败，显示错误页面');
            this.showGlobalError(error.message);
        }
    }

    /**
     * 显示全局错误
     * @param {string} errorMessage - 错误消息
     */
    showGlobalError(errorMessage = '') {
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">😵</div>
                    <div class="error-title">图表渲染失败</div>
                    <div class="error-message">
                        Mermaid图表无法正常渲染，请检查以下几点：<br>
                        • 图表代码语法是否正确<br>
                        • 网络连接是否正常<br>
                        • 浏览器是否支持所需功能<br>
                        ${errorMessage ? `<br><small>错误详情：${errorMessage}</small>` : ''}
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: center; margin-top: 16px;">
                        <button class="retry-btn" onclick="window.mermaidRenderer.retryAll()">重试渲染</button>
                        <button class="retry-btn" onclick="location.reload()">重新加载</button>
                        <button class="retry-btn" onclick="window.mermaidRenderer.reportIssue()">报告问题</button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * 重试所有图表
     */
    retryAll() {
        console.log('用户触发重试所有图表');
        
        // 重置状态
        this.renderState.reset();
        this.lazyLoader.disconnect();
        
        // 重新渲染
        this.startRenderProcess();
    }

    /**
     * 报告问题
     */
    reportIssue() {
        const errorInfo = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            mermaidAvailable: typeof mermaid !== 'undefined',
            mermaidVersion: typeof mermaid !== 'undefined' ? (mermaid.version || 'unknown') : 'not available',
            renderAttempts: this.renderState.renderAttempts,
            renderedChartsCount: this.renderState.renderedCharts.size,
            totalChartsCount: document.querySelectorAll('.mermaid-card').length,
            failedChartsCount: this.renderState.failedCharts.size
        };
        
        console.error('错误报告信息:', errorInfo);
        
        // 发送错误信息给扩展
        this.vscode.postMessage({
            type: 'reportError',
            errorInfo: errorInfo
        });
    }
}

/**
 * UI 控制器
 * 处理用户界面交互和控制
 */
class UIController {
    constructor(renderer) {
        this.renderer = renderer;
        this.allChartsCollapsed = false;
        this.previewManager = new PreviewManager(renderer.scrollLockManager);
    }

    /**
     * 初始化UI控制器
     */
    initialize() {
        this.initializeEventListeners();
        this.previewManager.initialize();
    }

    /**
     * 初始化事件监听器
     */
    initializeEventListeners() {
        // 全部折叠/展开按钮
        const toggleAllBtn = document.getElementById('toggleAllCharts');
        if (toggleAllBtn) {
            toggleAllBtn.addEventListener('click', () => this.toggleAllCharts());
        }
        
        // ESC键关闭预览
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.previewManager.closePreview();
            }
        });
        
        // 窗口焦点事件
        window.addEventListener('focus', () => {
            setTimeout(() => {
                if (this.renderer.themeManager) {
                    this.renderer.themeManager.updateAllThemes();
                }
            }, 100);
        });
        
        // 防止右键菜单
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    /**
     * 切换卡片展开/折叠状态
     * @param {HTMLElement} headerElement - 卡片头部元素
     */
    toggleCard(headerElement) {
        const card = headerElement.closest('.mermaid-card');
        const viewport = card.querySelector('.mermaid-viewport');
        const indicator = headerElement.querySelector('.collapse-indicator');
        
        if (viewport.classList.contains('expanded')) {
            // 折叠
            viewport.classList.remove('expanded');
            viewport.classList.add('collapsed');
            card.classList.add('collapsed');
            indicator.textContent = '▶';
        } else {
            // 展开
            viewport.classList.remove('collapsed');
            viewport.classList.add('expanded');
            card.classList.remove('collapsed');
            indicator.textContent = '▼';
            
            // 如果还没有渲染，则渲染图表
            const index = parseInt(card.dataset.index);
            if (!this.renderer.renderState.isRendered(index)) {
                this.renderer.handleLazyRender(card, index);
            }
        }
    }

    /**
     * 全部图表折叠/展开
     */
    toggleAllCharts() {
        const cards = document.querySelectorAll('.mermaid-card');
        const toggleBtn = document.getElementById('toggleAllCharts');
        
        cards.forEach(card => {
            const viewport = card.querySelector('.mermaid-viewport');
            const indicator = card.querySelector('.collapse-indicator');
            
            if (this.allChartsCollapsed) {
                // 展开
                viewport.classList.remove('collapsed');
                viewport.classList.add('expanded');
                card.classList.remove('collapsed');
                indicator.textContent = '▼';
            } else {
                // 折叠
                viewport.classList.remove('expanded');
                viewport.classList.add('collapsed');
                card.classList.add('collapsed');
                indicator.textContent = '▶';
            }
        });
        
        // 更新按钮状态
        this.allChartsCollapsed = !this.allChartsCollapsed;
        if (toggleBtn) {
            toggleBtn.innerHTML = this.allChartsCollapsed ?
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>' :
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
            toggleBtn.title = this.allChartsCollapsed ? "全部图表展开" : "全部图表折叠";
        }
    }

    /**
     * 复制代码
     * @param {string} code - 要复制的代码
     */
    copyCode(code) {
        this.renderer.vscode.postMessage({
            type: 'copyCode',
            code: code
        });
    }

    /**
     * 导出图片
     * @param {number} index - 图表索引
     */
    exportImage(index) {
        const card = document.querySelector(`.mermaid-card[data-index="${index}"]`);
        if (!card) return;
        
        const svg = card.querySelector('.mermaid-container svg');
        if (!svg) {
            console.warn('未找到SVG元素');
            return;
        }
        
        const svgData = new XMLSerializer().serializeToString(svg);
        
        // 构建包含函数/类名的文件名
        let fileName = window.currentFileName || 'mermaid-chart';
        
        // 如果有位置信息，根据图表索引获取对应的函数/类名
        if (window.locationInfo && window.locationInfo[index]) {
            const locationData = window.locationInfo[index];
            if (locationData && locationData.name) {
                // 根据类型构建不同的前缀
                let prefix = '';
                switch (locationData.type) {
                    case 'functions':
                        prefix = 'func';
                        break;
                    case 'methods':
                        prefix = 'method';
                        break;
                    case 'classes':
                        prefix = 'class';
                        break;
                    default:
                        prefix = 'item';
                }
                fileName = `${fileName}-${prefix}-${locationData.name}`;
            }
        }
        
        console.log('导出图片 - 基础文件名:', window.currentFileName, '图表索引:', index);
        console.log('导出图片 - 位置信息:', window.locationInfo ? window.locationInfo[index] : 'undefined');
        console.log('导出图片 - 最终文件名:', fileName);
        
        this.renderer.vscode.postMessage({
            type: 'exportImage',
            svg: svgData,
            index: index,
            fileName: fileName,
            isDarkTheme: this.renderer.themeManager.isDarkTheme
        });
    }

    /**
     * 跳转到函数
     * @param {number} lineNumber - 行号
     * @param {string} fileName - 文件名
     */
    jumpToFunction(lineNumber, fileName) {
        this.renderer.vscode.postMessage({
            type: 'jumpToFunction',
            lineNumber: lineNumber,
            fileName: fileName
        });
    }
}

/**
 * 增强版预览管理器
 * 处理图表预览功能，支持缩放、拖拽、全屏等高级功能
 */
class PreviewManager {
    constructor(scrollLockManager = null) {
        // 缩放和变换状态
        this.previewScale = 1;
        this.minScale = 0.1;
        this.maxScale = 10;
        this.scaleStep = 0.1;
        
        // 拖拽状态
        this.previewIsDragging = false;
        this.previewDragStart = { x: 0, y: 0 };
        this.previewCurrentTranslate = { x: 0, y: 0 };
        
        // 当前预览的图表信息
        this.currentIndex = -1;
        this.currentSvg = null;
        this.originalSvgSize = { width: 0, height: 0 };
        
        // 滚轮锁定管理器引用
        this.scrollLockManager = scrollLockManager;
    }

    /**
     * 初始化预览管理器
     */
    initialize() {
        const overlay = document.getElementById('previewOverlay');
        if (!overlay) return;

        // 点击遮罩层关闭预览
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closePreview();
            }
        });

        // 键盘事件监听
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        console.log('预览管理器初始化完成');
    }

    /**
     * 显示预览
     * @param {number} index - 图表索引
     */
    showPreview(index) {
        const card = document.querySelector(`.mermaid-card[data-index="${index}"]`);
        if (!card) {
            console.warn(`未找到索引为 ${index} 的图表卡片`);
            return;
        }
        
        const svg = card.querySelector('.mermaid-container svg');
        if (!svg) {
            console.warn(`图表 ${index + 1} 中未找到SVG元素`);
            return;
        }
        
        const overlay = document.getElementById('previewOverlay');
        const content = document.getElementById('previewContent');
        const title = document.getElementById('previewTitle');
        
        if (!overlay || !content) {
            console.error('预览弹窗元素未找到');
            return;
        }
        
        // 保存当前预览信息
        this.currentIndex = index;
        this.currentSvg = svg;
        
        // 获取原始SVG尺寸
        this.getOriginalSvgSize(svg);
        
        // 设置标题
        if (title) {
            title.textContent = `图表 ${index + 1} 预览 (${this.originalSvgSize.width}×${this.originalSvgSize.height})`;
        }
        
        // 克隆并准备SVG
        const clonedSvg = this.prepareClonedSvg(svg);
        
        // 清空并添加新内容
        content.innerHTML = '';
        content.appendChild(clonedSvg);
        
        // 设置预览容器事件监听
        this.setupPreviewInteractions(content);
        
        // 设置默认面板全屏模式
        const modal = overlay.querySelector('.preview-modal');
        if (modal) {
            modal.style.maxWidth = '100vw';
            modal.style.maxHeight = '100vh';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.borderRadius = '0';
        }
        
        // 显示预览弹窗
        overlay.style.display = 'flex';
        
        // 重置并适应屏幕
        this.previewScale = 1;
        this.previewCurrentTranslate = { x: 0, y: 0 };
        this.updatePreviewTransform();
        this.updatePreviewInfo();
        this.fitToScreen();
        
        console.log(`显示图表 ${index + 1} 预览`);
    }

    /**
     * 获取原始SVG尺寸
     * @param {SVGElement} svg - SVG元素
     */
    getOriginalSvgSize(svg) {
        const bbox = svg.getBBox();
        this.originalSvgSize = {
            width: Math.round(bbox.width || svg.clientWidth || 800),
            height: Math.round(bbox.height || svg.clientHeight || 600)
        };
    }

    /**
     * 准备克隆的SVG
     * @param {SVGElement} svg - 原始SVG元素
     * @returns {SVGElement} 克隆的SVG元素
     */
    prepareClonedSvg(svg) {
        const clonedSvg = svg.cloneNode(true);
        
        // 重置变换
        clonedSvg.style.transform = '';
        clonedSvg.style.transformOrigin = 'center center';
        clonedSvg.style.transition = 'transform 0.2s ease';
        clonedSvg.style.cursor = 'grab';
        
        // 确保SVG有合适的尺寸设置
        if (!clonedSvg.getAttribute('width')) {
            clonedSvg.setAttribute('width', this.originalSvgSize.width);
        }
        if (!clonedSvg.getAttribute('height')) {
            clonedSvg.setAttribute('height', this.originalSvgSize.height);
        }
        
        return clonedSvg;
    }

    /**
     * 设置预览交互事件
     * @param {HTMLElement} content - 预览内容容器
     */
    setupPreviewInteractions(content) {
        // 移除之前的事件监听器
        const existingHandlers = content._previewHandlers;
        if (existingHandlers) {
            content.removeEventListener('wheel', existingHandlers.wheel);
            content.removeEventListener('mousedown', existingHandlers.mousedown);
            content.removeEventListener('dblclick', existingHandlers.dblclick);
        }

        // 创建新的事件处理器
        const handlers = {
            wheel: (e) => this.handleWheel(e),
            mousedown: (e) => this.handleMouseDown(e),
            dblclick: (e) => this.handleDoubleClick(e)
        };

        // 添加事件监听器
        content.addEventListener('wheel', handlers.wheel, { passive: false });
        content.addEventListener('mousedown', handlers.mousedown);
        content.addEventListener('dblclick', handlers.dblclick);

        // 保存处理器引用以便后续清理
        content._previewHandlers = handlers;
    }

    /**
     * 处理滚轮缩放和位移
     * @param {WheelEvent} event - 滚轮事件
     */
    handleWheel(event) {
        event.preventDefault();
        
        // 检查滚轮锁定状态
        const isLocked = this.scrollLockManager ? this.scrollLockManager.getLockState() : false;
        
        if (isLocked) {
            // 锁定模式：位移
            const deltaX = event.deltaX || 0;
            const deltaY = event.deltaY || 0;
            
            // 根据滚轮方向进行位移
            this.previewCurrentTranslate.x -= deltaX * 0.5;
            this.previewCurrentTranslate.y -= deltaY * 0.5;
            
            this.updatePreviewTransform();
        } else {
            // 解锁模式：缩放
            const delta = event.deltaY > 0 ? -this.scaleStep : this.scaleStep;
            const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.previewScale + delta));
            
            if (newScale !== this.previewScale) {
                // 计算缩放中心点
                const rect = event.currentTarget.getBoundingClientRect();
                const centerX = event.clientX - rect.left - rect.width / 2;
                const centerY = event.clientY - rect.top - rect.height / 2;
                
                // 调整变换位置以保持缩放中心
                const scaleFactor = newScale / this.previewScale;
                this.previewCurrentTranslate.x -= centerX * (scaleFactor - 1);
                this.previewCurrentTranslate.y -= centerY * (scaleFactor - 1);
                
                this.previewScale = newScale;
                this.updatePreviewTransform();
                this.updatePreviewInfo();
            }
        }
    }

    /**
     * 处理鼠标按下（开始拖拽）
     * @param {MouseEvent} event - 鼠标事件
     */
    handleMouseDown(event) {
        if (event.button !== 0) return; // 只处理左键
        
        event.preventDefault();
        this.previewIsDragging = true;
        
        this.previewDragStart.x = event.clientX - this.previewCurrentTranslate.x;
        this.previewDragStart.y = event.clientY - this.previewCurrentTranslate.y;
        
        // 更新鼠标样式
        const svg = document.querySelector('#previewContent svg');
        if (svg) svg.style.cursor = 'grabbing';
        
        // 添加全局鼠标事件
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    /**
     * 处理鼠标移动（拖拽中）
     * @param {MouseEvent} event - 鼠标事件
     */
    handleMouseMove(event) {
        if (!this.previewIsDragging) return;
        
        this.previewCurrentTranslate.x = event.clientX - this.previewDragStart.x;
        this.previewCurrentTranslate.y = event.clientY - this.previewDragStart.y;
        
        this.updatePreviewTransform();
    }

    /**
     * 处理鼠标释放（结束拖拽）
     */
    handleMouseUp() {
        this.previewIsDragging = false;
        
        // 恢复鼠标样式
        const svg = document.querySelector('#previewContent svg');
        if (svg) svg.style.cursor = 'grab';
        
        // 移除全局鼠标事件
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    /**
     * 处理双击（重置缩放）
     */
    handleDoubleClick() {
        this.fitToScreen();
    }

    /**
     * 处理键盘事件
     * @param {KeyboardEvent} event - 键盘事件
     */
    handleKeyDown(event) {
        const overlay = document.getElementById('previewOverlay');
        if (!overlay || overlay.style.display === 'none') return;

        switch (event.key) {
            case 'Escape':
                this.closePreview();
                break;
            case '=':
            case '+':
                event.preventDefault();
                this.zoomIn();
                break;
            case '-':
                event.preventDefault();
                this.zoomOut();
                break;
            case '0':
                event.preventDefault();
                this.fitToScreen();
                break;

        }
    }

    /**
     * 放大
     */
    zoomIn() {
        const newScale = Math.min(this.maxScale, this.previewScale + this.scaleStep);
        if (newScale !== this.previewScale) {
            this.previewScale = newScale;
            this.updatePreviewTransform();
            this.updatePreviewInfo();
        }
    }

    /**
     * 缩小
     */
    zoomOut() {
        const newScale = Math.max(this.minScale, this.previewScale - this.scaleStep);
        if (newScale !== this.previewScale) {
            this.previewScale = newScale;
            this.updatePreviewTransform();
            this.updatePreviewInfo();
        }
    }

    /**
     * 重置为100%
     */
    fitToScreen() {
        const content = document.getElementById('previewContent');
        const svg = content?.querySelector('svg');
        if (!svg || !content) return;

        // 直接设置为100%缩放比例
        this.previewScale = 1;
        this.previewCurrentTranslate = { x: 0, y: 0 };
        
        this.updatePreviewTransform();
        this.updatePreviewInfo();
        
        console.log(`重置为100%：缩放比例 ${(this.previewScale * 100).toFixed(0)}%`);
    }





    /**
     * 更新预览变换
     */
    updatePreviewTransform() {
        const svg = document.querySelector('#previewContent svg');
        if (svg) {
            svg.style.transform = `translate(${this.previewCurrentTranslate.x}px, ${this.previewCurrentTranslate.y}px) scale(${this.previewScale})`;
        }
    }

    /**
     * 更新预览信息显示
     */
    updatePreviewInfo() {
        const title = document.getElementById('previewTitle');
        if (title && this.currentIndex >= 0) {
            const scalePercent = Math.round(this.previewScale * 100);
            title.textContent = `图表 ${this.currentIndex + 1} 预览 (${this.originalSvgSize.width}×${this.originalSvgSize.height}) - ${scalePercent}%`;
        }
    }

    /**
     * 关闭预览
     */
    closePreview() {
        const overlay = document.getElementById('previewOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        
        // 重置状态
        this.currentIndex = -1;
        this.currentSvg = null;
        // 移除isFullscreen，因为我们始终保持面板全屏模式
        
        console.log('预览已关闭');
    }

    // 兼容性方法（保持向后兼容）
    previewFitToScreen() { this.fitToScreen(); }
}

// 全局实例
let mermaidRenderer = null;
let uiController = null;

/**
 * 应用程序入口点
 * 初始化所有组件并启动应用
 */
async function initializeApp() {
    try {
        console.log('🚀 初始化Mermaid WebView应用 v2.0');
        
        // 创建核心实例
        mermaidRenderer = new MermaidRenderer();
        uiController = new UIController(mermaidRenderer);
        
        // 设置全局引用
        window.mermaidRenderer = mermaidRenderer;
        window.uiController = uiController;
        
        // 初始化组件
        uiController.initialize();
        
        // 启动渲染器
        await mermaidRenderer.initialize();
        
        console.log('✅ 应用初始化完成');
        
    } catch (error) {
        console.error('❌ 应用初始化失败:', error);
        
        // 显示初始化错误
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">💥</div>
                    <div class="error-title">应用初始化失败</div>
                    <div class="error-message">
                        无法正常启动Mermaid渲染器<br>
                        <small>错误详情：${error.message}</small>
                    </div>
                    <button class="retry-btn" onclick="location.reload()">重新加载</button>
                </div>
            `;
        }
    }
}

// 全局函数（供HTML调用）
function toggleCard(headerElement) {
    if (uiController) {
        uiController.toggleCard(headerElement);
    }
}

function copyCode(code) {
    if (uiController) {
        uiController.copyCode(code);
    }
}

function exportImage(index) {
    if (uiController) {
        uiController.exportImage(index);
    }
}

function jumpToFunction(lineNumber, fileName) {
    if (uiController) {
        uiController.jumpToFunction(lineNumber, fileName);
    }
}

function showPreview(index) {
    if (uiController && uiController.previewManager) {
        uiController.previewManager.showPreview(index);
    }
}

function closePreview() {
    if (uiController && uiController.previewManager) {
        uiController.previewManager.closePreview();
    }
}

function previewFitToScreen() {
    if (uiController && uiController.previewManager) {
        uiController.previewManager.previewFitToScreen();
    }
}



function zoomIn() {
    if (uiController && uiController.previewManager) {
        uiController.previewManager.zoomIn();
    }
}

function zoomOut() {
    if (uiController && uiController.previewManager) {
        uiController.previewManager.zoomOut();
    }
}





// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}