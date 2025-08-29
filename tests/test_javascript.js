/**
 * 用户认证类
 * ```mermaid
 * graph TD
 *     A["用户点击锁定/解锁按钮"] --> B["ScrollLockManager.toggleLock()"]
 *     B --> C["更新 isLocked 状态"]
 *     C --> D["保存到 localStorage"]
 *     C --> E["更新按钮UI"]
 *     
 *     F["滚轮事件触发"] --> G{"检查锁定状态"}
 *     G -->|解锁状态| H["缩放模式<br/>ChartInteractionManager.handleZoom()<br/>PreviewManager.handleWheel()"]
 *     G -->|锁定状态| I["位移模式<br/>根据 deltaX/deltaY 移动图表"]
 *     
 *     H --> J["scale变换"]
 *     I --> K["translate变换"]
 *     
 *     L["应用范围"] --> M["卡片预览"]
 *     L --> N["大图预览"]
 *     
 * ```
 */
class UserAuth {
    constructor() {
        this.users = [];
    }

    /**
     * 用户登录流程
     * 
     * ```mermaid
     * sequenceDiagram
     *     participant U as 用户
     *     participant A as 认证系统
     *     participant DB as 数据库
     *     
     *     U->>A: 输入用户名密码
     *     A->>DB: 验证用户信息
     *     DB-->>A: 返回验证结果
     *     alt 验证成功
     *         A-->>U: 返回访问令牌
     *     else 验证失败
     *         A-->>U: 返回错误信息
     *     end
     * ```
     */
    async login(username, password) {
        // 登录逻辑
    }

    /**
     * 用户注册流程
     * 
     * ```mermaid
     * ---
     * title: 用户注册
     * ---
     * graph TD
     * A[开始注册] --> B[输入用户信息]
     * B --> C{信息验证}
     * C -->|通过| D[创建用户账户]
     * C -->|失败| E[显示错误信息]
     * D --> F[发送确认邮件]
     * F --> G[注册完成]
     * E --> B
     * ```
     */
    register(userInfo) {
        // 注册逻辑
    }
}

/**
 * 数据处理函数
 * 
 * ```mermaid
 * flowchart LR
 *     A[原始数据] --> B[数据清洗]
 *     B --> C[数据转换]
 *     C --> D[数据验证]
 *     D --> E[输出结果]
 * ```
 */
function processData(data) {
    return data.map(item => item.processed);
}

/**
 * 异步数据获取
 * 
 * ```mermaid
 * graph TB
 *     A[发起请求] --> B[等待响应]
 *     B --> C{请求成功?}
 *     C -->|是| D[处理数据]
 *     C -->|否| E[错误处理]
 *     D --> F[返回结果]
 *     E --> F
 * ```
 * ```mermaid
 * graph TB
 *     A[发起请求] --> B[等待响应]
 *     B --> C{请求成功?}
 *     C -->|是| D[处理数据]
 *     C -->|否| E[错误处理]
 *     D --> F[返回结果]
 *     E --> F
 * ```
 */
const fetchData = async (url) => {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('请求失败:', error);
    }
};

// 箭头函数示例
const calculateSum = (a, b) => {
    /**
     * 计算逻辑图
     * 
     * ```mermaid
     * graph LR
     *     A[输入 a] --> C[计算 a + b]
     *     B[输入 b] --> C
     *     C --> D[返回结果]
     * ```
     */
    
    return a + b;
};