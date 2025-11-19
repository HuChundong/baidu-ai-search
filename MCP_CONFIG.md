# MCP (Model Context Protocol) 配置指南

本项目支持通过 MCP 协议暴露百度 AI 搜索功能，使用官方 SDK 的 `StreamableHTTPServerTransport` 实现流式 HTTP 服务。

## 什么是 MCP？

MCP (Model Context Protocol) 是一个开放协议，用于 AI 应用与外部数据源和服务的安全集成。通过 MCP，AI 助手可以访问工具、资源和提示，扩展其能力。

## 安装依赖

```bash
npm install
```

## 启动 MCP 服务器

```bash
# 生产模式
npm run mcp

# 开发模式（自动重启）
npm run mcp:dev
```

MCP 服务器将在 `http://localhost:3001` 启动（可通过 `MCP_PORT` 环境变量修改）。

## API 端点

### MCP 端点（统一入口）

**POST** `/mcp`

这是唯一的 MCP 协议端点，使用官方 SDK 的 `StreamableHTTPServerTransport` 实现，支持所有 MCP 协议操作。

**支持的 JSON-RPC 方法：**
- `tools/list` - 列出可用工具
- `tools/call` - 调用工具（支持流式响应）

**请求示例：**

```json
// 列出工具
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}

// 调用工具
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "baidu_search",
    "arguments": {
      "query": "Python 编程最佳实践",
      "timeout": 60000
    }
  }
}
```

**响应：**

使用官方 SDK 的 Streamable HTTP 协议，支持流式响应和标准 JSON 响应。

### 健康检查

**GET** `/mcp/health`

**响应：**
```json
{
  "status": "healthy",
  "service": "Baidu AI Search MCP Server",
  "version": "1.0.0"
}
```

## 使用示例

### cURL 示例

#### 列出工具
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

#### 调用搜索工具
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "baidu_search",
      "arguments": {
        "query": "Python 编程",
        "timeout": 60000
      }
    }
  }'
```

### JavaScript/Node.js 示例

使用官方 MCP SDK 客户端：

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// 创建客户端
const client = new Client({
  name: 'baidu-search-client',
  version: '1.0.0',
});

// 连接到服务器
const transport = new StreamableHTTPClientTransport(
  new URL('http://localhost:3001/mcp')
);
await client.connect(transport);

// 列出工具
const tools = await client.listTools();
console.log('Available tools:', tools);

// 调用工具
const result = await client.callTool({
  name: 'baidu_search',
  arguments: {
    query: 'Python 编程',
    timeout: 60000,
  },
});
console.log('Search result:', result);
```

或使用原生 fetch：

```javascript
// 列出工具
const listTools = async () => {
  const response = await fetch('http://localhost:3001/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    }),
  });
  return await response.json();
};

// 调用工具
const callTool = async (query) => {
  const response = await fetch('http://localhost:3001/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'baidu_search',
        arguments: { query },
      },
    }),
  });
  return await response.json();
};
```

### Python 示例

```python
import requests
import json

# 列出工具
def list_tools():
    response = requests.post(
        'http://localhost:3001/mcp',
        json={
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'tools/list',
        }
    )
    return response.json()

# 调用工具
def call_tool(query):
    response = requests.post(
        'http://localhost:3001/mcp',
        json={
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'tools/call',
            'params': {
                'name': 'baidu_search',
                'arguments': {
                    'query': query,
                },
            },
        }
    )
    return response.json()
```

## 环境变量

MCP 服务器使用以下环境变量：

- `MCP_PORT`: MCP 服务器端口（默认: 3001）
- `CDP_ENDPOINT`: 浏览器 CDP 端点（默认: `ws://192.168.2.192:4399`）
- `MAX_CONNECTIONS`: 最大并发连接数（默认: 10）
- `SEARCH_TIMEOUT`: 搜索超时时间（默认: 60000）
- `DEVICE_TYPE`: 设备类型（mobile/desktop，默认: mobile）

## Docker 部署

### 方式 1：作为独立服务

在 `docker-compose.yml` 中添加 MCP 服务：

```yaml
services:
  mcp:
    build:
      context: ..
      dockerfile: docker/Dockerfile.app
    container_name: baidu-ai-search-mcp
    ports:
      - "${MCP_PORT:-3001}:3001"
    environment:
      - MCP_PORT=3001
      - CDP_ENDPOINT=ws://browser:3000
      # ... 其他环境变量
    command: ["node", "src/mcp/server.js"]
    depends_on:
      - browser
    networks:
      - app-network
```

### 方式 2：与主应用一起运行

修改主应用，同时启动 Express 和 MCP 服务器。

## 故障排查

### 1. 服务器无法启动

- 检查端口是否被占用
- 检查环境变量配置
- 查看日志输出

### 2. 工具调用失败

- 检查浏览器服务是否运行
- 检查 `CDP_ENDPOINT` 环境变量
- 查看服务器日志

### 3. 流式响应不工作

- 确保客户端支持 Server-Sent Events
- 检查网络连接
- 尝试使用同步端点 `/mcp/tools/call-sync`

## 更多信息

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [JSON-RPC 2.0 规范](https://www.jsonrpc.org/specification)
