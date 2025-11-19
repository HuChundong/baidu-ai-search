/**
 * 并发测试脚本
 * 随机搜索内容，测试5个并发请求
 */

import http from 'http';
import { URL } from 'url';

// 配置
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const CONCURRENT_REQUESTS = 5;
const TEST_QUERIES = [
  '周杰伦生日',
  'Python编程',
  '人工智能发展',
  '北京天气',
  'JavaScript教程',
  '机器学习算法',
  '区块链技术',
  '云计算服务',
  '大数据分析',
  '物联网应用',
  '量子计算',
  '生物医学工程',
  '环境科学',
  '经济学原理',
  '历史事件'
];

/**
 * 随机选择一个查询
 */
function getRandomQuery() {
  return TEST_QUERIES[Math.floor(Math.random() * TEST_QUERIES.length)];
}

/**
 * 发送单个搜索请求
 */
function sendSearchRequest(query, index) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const searchUrl = new URL(`${BASE_URL}/api/search`);
    searchUrl.searchParams.set('word', query);

    const req = http.get(searchUrl.toString(), (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        const result = {
          index,
          query,
          statusCode: res.statusCode,
          duration,
          success: res.statusCode === 200,
          dataLength: data.length,
          preview: data.substring(0, 100) + (data.length > 100 ? '...' : '')
        };

        if (res.statusCode === 200) {
          resolve(result);
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      const errorResult = {
        index,
        query,
        duration,
        success: false,
        error: error.message || 'Network error',
        statusCode: 0
      };
      reject(errorResult);
    });

    req.setTimeout(120000, () => {
      req.destroy();
      const duration = Date.now() - startTime;
      reject({
        index,
        query,
        duration,
        success: false,
        error: 'Request timeout'
      });
    });
  });
}

/**
 * 运行并发测试
 */
async function runConcurrentTest() {
  console.log('='.repeat(60));
  console.log('并发测试开始');
  console.log(`API URL: ${BASE_URL}`);
  console.log(`并发数: ${CONCURRENT_REQUESTS}`);
  console.log('='.repeat(60));
  console.log('');

  const startTime = Date.now();
  const requests = [];

  // 创建并发请求
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    const query = getRandomQuery();
    console.log(`[${i + 1}] 启动请求: ${query}`);
    requests.push(
      sendSearchRequest(query, i + 1)
        .then(result => {
          console.log(`[${result.index}] ✓ 成功 (${result.duration}ms) - ${result.query}`);
          return result;
        })
        .catch(error => {
          const errorInfo = typeof error === 'object' && error !== null ? error : { error };
          const idx = errorInfo.index || i + 1;
          const qry = errorInfo.query || query;
          const dur = errorInfo.duration || 0;
          const errMsg = errorInfo.error || errorInfo.message || 'Unknown error';
          console.error(`[${idx}] ✗ 失败 (${dur}ms) - ${qry}`);
          console.error(`    错误: ${errMsg}`);
          return {
            index: idx,
            query: qry,
            duration: dur,
            success: false,
            error: errMsg,
            statusCode: errorInfo.statusCode || 0
          };
        })
    );
  }

  // 等待所有请求完成
  const results = await Promise.all(requests);
  const totalTime = Date.now() - startTime;

  // 统计结果
  console.log('');
  console.log('='.repeat(60));
  console.log('测试结果统计');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`总请求数: ${CONCURRENT_REQUESTS}`);
  console.log(`成功: ${successful.length}`);
  console.log(`失败: ${failed.length}`);
  console.log(`成功率: ${((successful.length / CONCURRENT_REQUESTS) * 100).toFixed(1)}%`);
  console.log(`总耗时: ${totalTime}ms`);
  console.log('');

  if (successful.length > 0) {
    const durations = successful.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    console.log('响应时间统计:');
    console.log(`  平均: ${avgDuration.toFixed(0)}ms`);
    console.log(`  最短: ${minDuration}ms`);
    console.log(`  最长: ${maxDuration}ms`);
    console.log('');
  }

  if (failed.length > 0) {
    console.log('失败请求详情:');
    failed.forEach(f => {
      console.log(`  [${f.index}] ${f.query}: ${f.error || 'Unknown error'}`);
    });
    console.log('');
  }

  console.log('详细结果:');
  results.forEach(r => {
    if (r.success) {
      console.log(`  [${r.index}] ✓ ${r.query} - ${r.duration}ms - ${r.dataLength} bytes`);
    } else {
      console.log(`  [${r.index || '?'}] ✗ ${r.query || 'Unknown'} - ${r.error || 'Unknown error'}`);
    }
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

// 运行测试
runConcurrentTest().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});

