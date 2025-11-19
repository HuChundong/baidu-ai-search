/**
 * 搜索路由处理
 */

import express from 'express';
import { getSearchService } from '../services/searchService.js';

const router = express.Router();

/**
 * GET /api/search
 * 执行搜索请求（格式与百度 AI 搜索相同：/search?word=xxx）
 */
router.get('/search', async (req, res) => {
  try {
    // 从 query 参数获取（与百度格式相同）
    const query = req.query.word || req.query.query;
    const timeout = req.query.timeout ? parseInt(req.query.timeout) : undefined;

    // 验证请求参数
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({
        error: 'Missing or invalid query parameter. Use ?word=your_query or ?query=your_query'
      });
    }

    // 获取搜索服务
    const searchService = getSearchService();

    // 执行搜索（会自动在 query 中拼接 JSON 格式要求）
    const result = await searchService.search(query.trim(), {
      timeout: timeout
    });

    // 直接返回纯文本（剪切板上拿到什么就返回什么）
    res.status(200).set('Content-Type', 'text/plain; charset=utf-8').send(result);

  } catch (error) {
    console.error('Route error:', error);
    // 确保错误被正确处理，不会导致服务崩溃
    try {
      res.status(500).json({
        error: error.message || 'Internal server error'
      });
    } catch (responseError) {
      // 如果响应已经发送，记录错误但不抛出
      console.error('Error sending error response:', responseError);
    }
  }
});

/**
 * GET /api/health
 * 健康检查
 */
router.get('/health', async (req, res) => {
  try {
    const { getBrowserPool } = await import('../services/browserPool.js');
    const browserPool = getBrowserPool();
    const status = browserPool.getStatus();

    res.status(200).json({
      success: true,
      status: 'healthy',
      browserPool: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

