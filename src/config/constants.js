/**
 * 配置常量
 */

export const CONFIG = {
  // 服务器配置
  SERVER: {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || '0.0.0.0'
  },

  // 浏览器池配置
  BROWSER_POOL: {
    // CDP 连接地址（Docker 容器中的浏览器）
    // 可以是 HTTP URL (http://host:port) 或 WebSocket URL (ws://host:port)
    // Playwright 会自动从 HTTP 端点获取 WebSocket URL
    CDP_ENDPOINT: process.env.CDP_ENDPOINT || 'ws://192.168.2.192:4398',
    // 最大并发连接数
    MAX_CONNECTIONS: parseInt(process.env.MAX_CONNECTIONS || '10'),
    // 连接超时时间（毫秒）
    CONNECTION_TIMEOUT: parseInt(process.env.CONNECTION_TIMEOUT || '30000'),
    // 连接重试次数
    MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3'),
    // 重试延迟（毫秒）
    RETRY_DELAY: parseInt(process.env.RETRY_DELAY || '1000')
  },

  // 搜索服务配置
  SEARCH: {
    // 默认超时时间（毫秒）
    DEFAULT_TIMEOUT: parseInt(process.env.SEARCH_TIMEOUT || '60000'),
    // 百度 AI 搜索基础 URL
    BASE_URL: 'https://chat.baidu.com',
    // 设备类型：'mobile' 或 'desktop'（默认 mobile，加速加载）
    DEVICE_TYPE: process.env.DEVICE_TYPE || 'mobile',
    // User-Agent（移动端，加速网络加载）
    USER_AGENT_MOBILE: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    // User-Agent（桌面端）
    USER_AGENT_DESKTOP: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    // 视口配置
    VIEWPORT: {
      // 移动端视口（iPhone 14 Pro，较小视口加速加载）
      MOBILE: { width: 393, height: 852 },
      // 桌面端视口
      DESKTOP: { width: 1920, height: 1080 }
    },
    // 截图配置
    SCREENSHOT: {
      // 是否启用错误截图（默认启用，错误时自动截图用于调试）
      // 正常流程不截图，只有错误时才截图
      ENABLED: process.env.ENABLE_ERROR_SCREENSHOT !== 'false',
      // 截图保存目录
      DIR: process.env.SCREENSHOT_DIR || './screenshots',
      // 是否在响应中返回截图（base64，默认不返回）
      INCLUDE_IN_RESPONSE: process.env.SCREENSHOT_IN_RESPONSE === 'true'
    },
    // 复制按钮配置（用于从剪切板获取内容）
    COPY_BUTTON: {
      // 是否使用复制按钮方式（默认启用）
      ENABLED: process.env.USE_COPY_BUTTON !== 'false',
      // 复制按钮选择器（可通过环境变量配置）
      SELECTOR: process.env.COPY_BUTTON_SELECTOR || '[class*="copy"], [class*="Copy"], button[aria-label*="复制"], button[aria-label*="copy"], .copy-btn, #copy-btn',
      // 等待复制按钮出现的超时时间（毫秒）
      WAIT_TIMEOUT: parseInt(process.env.COPY_BUTTON_TIMEOUT || '30000'),
      // 点击后等待剪切板更新的时间（毫秒）
      CLIPBOARD_WAIT: parseInt(process.env.CLIPBOARD_WAIT || '1000')
    },
    // 获取当前 User-Agent（根据设备类型）
    get USER_AGENT() {
      return this.DEVICE_TYPE === 'mobile' ? this.USER_AGENT_MOBILE : this.USER_AGENT_DESKTOP;
    },
    // 获取当前视口（根据设备类型）
    get VIEWPORT_SIZE() {
      return this.VIEWPORT[this.DEVICE_TYPE.toUpperCase()] || this.VIEWPORT.MOBILE;
    }
  },

};

