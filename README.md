# Baidu AI Search Proxy

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)

一个基于无头浏览器的百度 AI 搜索代理服务，通过 Playwright 和 Docker 提供稳定、高性能的搜索 API。

## ✨ 特性

- 🚀 **无头浏览器**：使用 Playwright Core 和 Docker 化的 Chromium
- 🔄 **连接池管理**：智能管理浏览器连接，支持并发请求
- ⚡ **性能优化**：拦截图片/媒体资源，使用移动端模拟加速加载
- 📋 **剪贴板提取**：通过复制按钮可靠地提取搜索结果内容
- 🐳 **Docker 就绪**：使用 Docker Compose 一键部署
- 📸 **错误调试**：仅在错误时自动截图，生产环境友好
- 🔌 **MCP 支持**：支持 Model Context Protocol，可集成到 AI 应用中
- 🌐 **RESTful API**：提供简洁的 HTTP API 接口

## 🛠️ 技术栈

- **Node.js** + **Express** - Web 服务器框架
- **Playwright Core** - 浏览器自动化引擎
- **Docker** + **Browserless** - 浏览器容器化方案
- **CDP** - Chrome DevTools Protocol
- **MCP SDK** - Model Context Protocol 官方 SDK

## 📁 项目结构

```
BaiduAiSearch/
├── src/
│   ├── server.js              # Express API 服务器入口
│   ├── mcp/
│   │   └── server.js          # MCP HTTP 服务器（流式响应）
│   ├── routes/
│   │   └── search.js          # 搜索 API 路由
│   ├── services/
│   │   ├── browserPool.js     # 浏览器连接池管理
│   │   └── searchService.js   # 核心搜索逻辑
│   └── config/
│       └── constants.js       # 配置常量
├── docker/
│   ├── Dockerfile.app         # 应用容器构建文件
│   ├── docker-compose.yml     # Docker Compose 配置
│   ├── start.sh               # 启动脚本
│   └── ENV_USAGE.md           # 环境变量使用文档
├── screenshots/               # 错误截图目录（自动创建）
├── test-concurrent.js         # 并发测试脚本
├── MCP_CONFIG.md             # MCP 配置详细文档
├── package.json
└── README.md
```

## 🚀 快速开始

### 方式一：Docker Compose（推荐）

这是最简单的部署方式，适合生产环境。

```bash
cd docker
cp .env.example .env  # 可选：配置环境变量
docker-compose up -d
```

服务将在 `http://localhost:3000` 启动。

**查看服务状态：**
```bash
docker-compose ps
docker-compose logs -f app
```

**停止服务：**
```bash
docker-compose down
```

### 方式二：本地开发

适合开发和调试场景。

1. **安装依赖**

```bash
npm install
```

2. **启动浏览器容器**

```bash
cd docker
docker-compose up -d browser
```

3. **配置环境变量**

```bash
# Windows PowerShell
$env:CDP_ENDPOINT="ws://localhost:9222"

# Linux/macOS
export CDP_ENDPOINT=ws://localhost:9222
```

4. **启动服务器**

```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## 📖 API 文档

### GET /api/search

执行搜索查询。

**查询参数：**
- `word` (必需) - 搜索查询关键词
- `timeout` (可选) - 请求超时时间（毫秒），默认 60000

**响应：**
- Content-Type: `text/plain; charset=utf-8`
- Body: 搜索结果的原始文本内容（从剪贴板提取）

**示例：**

```bash
# 基本搜索
curl "http://localhost:3000/api/search?word=周杰伦生日"

# 带超时设置
curl "http://localhost:3000/api/search?word=Python编程&timeout=60000"
```

**响应示例：**
```
周杰伦（Jay Chou）的生日是1979年1月18日。
```

### GET /api/health

健康检查端点，用于监控服务状态。

**响应：**
```json
{
  "success": true,
  "status": "healthy",
  "browserPool": {
    "active": 0,
    "idle": 0,
    "total": 0
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /

服务信息端点。

**响应：**
```json
{
  "service": "Baidu AI Search Proxy",
  "version": "1.0.0",
  "endpoints": {
    "search": "GET /api/search?word=your_query",
    "health": "GET /api/health"
  },
  "example": {
    "url": "/api/search?word=周杰伦生日",
    "description": "自动在查询中添加 JSON 格式要求，确保返回 JSON 格式"
  }
}
```

## ⚙️ 配置

### 环境变量

所有配置项都可以通过环境变量设置：

```bash
# 服务器配置
PORT=3000                    # 服务器端口（默认：3000）
HOST=0.0.0.0                 # 服务器监听地址（默认：0.0.0.0）

# 浏览器池配置
CDP_ENDPOINT=ws://browser:3000  # CDP 连接地址
MAX_CONNECTIONS=10            # 最大并发连接数（默认：10）
CONNECTION_TIMEOUT=30000      # 连接超时时间（毫秒，默认：30000）

# 搜索服务配置
SEARCH_TIMEOUT=60000          # 搜索超时时间（毫秒，默认：60000）
DEVICE_TYPE=mobile            # 设备类型：mobile 或 desktop（默认：mobile）

# 截图配置
ENABLE_ERROR_SCREENSHOT=true  # 是否启用错误截图（默认：true）
SCREENSHOT_DIR=./screenshots  # 截图保存目录（默认：./screenshots）
```

### Docker 环境变量配置

在 Docker 部署中，推荐使用 `.env` 文件：

1. **复制示例文件**
```bash
cd docker
cp .env.example .env
```

2. **编辑配置**
```bash
# 修改应用端口
APP_PORT=8080

# 增加最大并发连接数
MAX_CONNECTIONS=20

# 修改设备类型
DEVICE_TYPE=desktop
```

3. **启动服务**
```bash
docker-compose up -d
```

详细的环境变量说明请参考 [`docker/ENV_USAGE.md`](./docker/ENV_USAGE.md)。

## 🐳 Docker 部署详解

### 架构说明

Docker Compose 会启动两个服务：

- **应用容器** (`app`): 轻量级 Node.js Alpine 镜像，运行 Express 服务
- **浏览器容器** (`browser`): Browserless Chromium 镜像，提供 CDP 服务
- **网络隔离**: 浏览器服务不对外暴露端口，只能通过内部网络访问
- **独立更新**: 应用和浏览器服务可以独立更新，互不影响

### 扩展浏览器实例

如果需要更多浏览器实例以支持更高并发，可以修改 `docker-compose.yml` 添加更多 `browser` 服务：

```yaml
services:
  browser-1:
    # ... 配置 ...
  browser-2:
    # ... 配置 ...
```

然后更新 `CDP_ENDPOINT` 配置或使用负载均衡。

## 🔌 MCP (Model Context Protocol) 支持

本项目支持通过 MCP 协议暴露搜索功能，可以集成到支持 MCP 的 AI 应用中（如 Claude Desktop、Cursor 等）。

### 快速开始

1. **启动 MCP 服务器**

```bash
# 生产模式
npm run mcp

# 开发模式（自动重启）
npm run mcp:dev
```

MCP 服务器将在 `http://localhost:3001` 启动（可通过 `MCP_PORT` 环境变量修改）。

2. **使用 API**

```bash
# 列出可用工具
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# 调用搜索工具（流式响应）
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "baidu_search",
      "arguments": {
        "query": "Python 编程"
      }
    }
  }'
```

### 详细文档

更多信息请参考 [MCP_CONFIG.md](./MCP_CONFIG.md)，包括：
- 完整的 API 文档
- 多种语言的示例代码（JavaScript、Python 等）
- Docker 部署配置
- 故障排查指南

## 🧪 测试

运行并发测试：

```bash
npm run test:concurrent
```

这将发送 5 个并发请求，使用随机查询测试服务稳定性。

## 🔍 工作原理

1. **导航**：打开百度 AI 搜索页面并提交查询
2. **内容检测**：
   - 等待"停止回答"按钮消失（表示内容生成完成）
   - 等待网络空闲（10 秒超时）
   - 等待 DOM 稳定（无变化 + 停止按钮消失）
3. **提取**：查找复制按钮并读取剪贴板内容
4. **响应**：返回原始剪贴板文本

### 性能优化

- 拦截图片、媒体和字体资源，减少网络请求
- 使用移动端模拟，加速页面加载
- 高效的 DOM 稳定性检测
- 智能的复制按钮检测，支持多种选择器

## 🛠️ 开发

### 开发模式

```bash
# API 服务器开发模式（自动重启）
npm run dev

# MCP 服务器开发模式（自动重启）
npm run mcp:dev
```

### 构建 Docker 镜像

```bash
npm run docker:build
```

### Docker 管理命令

```bash
# 启动服务
npm run docker:up

# 停止服务
npm run docker:down

# 查看日志
npm run docker:logs
```

## 🐛 错误处理

- 所有错误都会被捕获并记录
- 失败的请求会自动捕获全页面截图用于调试
- 截图保存在 `screenshots/` 目录，文件名以 `ERROR_` 前缀
- 正常成功的请求不会截图（生产环境友好）

## 📊 性能指标

服务针对速度进行了优化：

- **资源拦截**：自动拦截图片、媒体和字体资源
- **移动端模拟**：使用移动端 User-Agent 和视口，加速加载
- **DOM 稳定性检测**：高效的 DOM 变化监听
- **智能按钮检测**：支持多种复制按钮选择器，按优先级检测

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 许可证

本项目采用 [MIT 许可证](./LICENSE)。

## ⚠️ 免责声明

本项目仅用于教育和研究目的。使用本服务时，请遵守百度的服务条款和使用限制。作者不对因使用本服务而产生的任何后果负责。

## 🔗 相关链接

- [MCP 配置文档](./MCP_CONFIG.md)
- [Docker 环境变量文档](./docker/ENV_USAGE.md)
- [Model Context Protocol 官方文档](https://modelcontextprotocol.io/)

## 📮 问题反馈

如果遇到问题或有功能建议，请在 [GitHub Issues](https://github.com/yourusername/baidu-ai-search/issues) 中提交。

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**
