/**
 * Express 服务器入口
 */

import express from 'express';
import searchRoutes from './routes/search.js';
import { CONFIG } from './config/constants.js';

const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 路由
app.use('/api', searchRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    service: 'Baidu AI Search Proxy',
    version: '1.0.0',
    endpoints: {
      search: 'GET /api/search?word=your_query',
      health: 'GET /api/health'
    },
    example: {
      url: '/api/search?word=周杰伦生日',
      description: '自动在查询中添加 JSON 格式要求，确保返回 JSON 格式'
    }
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
const PORT = CONFIG.SERVER.PORT;
const HOST = CONFIG.SERVER.HOST;

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`CDP Endpoint: ${CONFIG.BROWSER_POOL.CDP_ENDPOINT}`);
  console.log(`Max Connections: ${CONFIG.BROWSER_POOL.MAX_CONNECTIONS}`);
});

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  try {
    const { getBrowserPool } = await import('./services/browserPool.js');
    const browserPool = getBrowserPool();
    await browserPool.closeAll();
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  try {
    const { getBrowserPool } = await import('./services/browserPool.js');
    const browserPool = getBrowserPool();
    await browserPool.closeAll();
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});

