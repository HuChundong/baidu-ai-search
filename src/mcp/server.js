/**
 * MCP (Model Context Protocol) HTTP Server
 * 使用官方 SDK 的 StreamableHTTPServerTransport 实现流式 HTTP 服务
 */

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { getSearchService } from '../services/searchService.js';

// 创建 MCP 服务器
const server = new McpServer({
  name: 'baidu-ai-search',
  version: '1.0.0',
});

// 注册搜索工具
server.registerTool(
  'baidu_search',
  {
    title: 'Baidu AI Search',
    description: '使用百度 AI 搜索查询信息。自动在查询中添加 JSON 格式要求，返回搜索结果。',
    inputSchema: {
      query: z.string().describe('搜索查询关键词'),
      timeout: z.number().optional().describe('请求超时时间（毫秒），默认 60000'),
    },
    outputSchema: {
      result: z.string().describe('搜索结果文本'),
    },
  },
  async ({ query, timeout }) => {
    try {
      if (!query || typeof query !== 'string' || query.trim() === '') {
        throw new Error('Missing or invalid query parameter');
      }

      const searchService = getSearchService();
      const result = await searchService.search(query.trim(), {
        timeout: timeout || 60000,
      });

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
        structuredContent: {
          result,
        },
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error.message || 'Internal server error',
              details: error.stack,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

// 创建 Express 应用
const app = express();
app.use(express.json());

// MCP 端点：处理所有 MCP 请求
app.post('/mcp', async (req, res) => {
  // 使用无状态模式（每个请求创建新的 transport）
  // 这样可以避免不同客户端使用相同 JSON-RPC ID 时的冲突
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // 无状态模式
      enableJsonResponse: true, // 启用 JSON 响应
    });

    // 当连接关闭时清理 transport
    res.on('close', () => {
      transport.close();
    });

    // 连接服务器到 transport
    await server.connect(transport);
    
    // 处理请求
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
          data: error.message,
        },
        id: null,
      });
    }
  }
});

// 健康检查
app.get('/mcp/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Baidu AI Search MCP Server',
    version: '1.0.0',
  });
});

// 根路径信息
app.get('/mcp', (req, res) => {
  res.json({
    service: 'Baidu AI Search MCP Server',
    version: '1.0.0',
    endpoint: 'POST /mcp',
    description: '使用官方 SDK 的 StreamableHTTPServerTransport 实现',
  });
});

// 启动服务器
// 使用 PORT 环境变量（与 API 模式保持一致，默认 3000）
const port = parseInt(process.env.PORT || '3000');
app.listen(port, '0.0.0.0', () => {
  console.log(`Baidu AI Search MCP Server running on http://0.0.0.0:${port}`);
  console.log(`MCP endpoint: POST http://localhost:${port}/mcp`);
  console.log(`Health check: GET http://localhost:${port}/mcp/health`);
}).on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
