/**
 * 浏览器池管理
 * 通过 CDP 连接到 Docker 容器中的浏览器实例
 */

import { chromium } from 'playwright-core';
import { CONFIG } from '../config/constants.js';

export class BrowserPool {
  constructor(options = {}) {
    this.cdpEndpoint = options.cdpEndpoint || CONFIG.BROWSER_POOL.CDP_ENDPOINT;
    this.maxConnections = options.maxConnections || CONFIG.BROWSER_POOL.MAX_CONNECTIONS;
    this.connectionTimeout = options.connectionTimeout || CONFIG.BROWSER_POOL.CONNECTION_TIMEOUT;
    this.maxRetries = options.maxRetries || CONFIG.BROWSER_POOL.MAX_RETRIES;
    this.retryDelay = options.retryDelay || CONFIG.BROWSER_POOL.RETRY_DELAY;

    this.connections = new Map(); // 存储活跃连接
    this.waitingQueue = []; // 等待队列
    this.connectionCount = 0;
  }

  /**
   * 获取浏览器连接
   */
  async acquire() {
    // 如果有可用连接，直接返回
    if (this.connectionCount < this.maxConnections) {
      return await this.createConnection();
    }

    // 否则加入等待队列
    return new Promise((resolve, reject) => {
      this.waitingQueue.push({ resolve, reject });
    });
  }

  /**
   * 获取 WebSocket URL 并使用配置的地址替换
   */
  async getWebSocketURL() {
    // 解析配置的端点地址
    let httpUrl = this.cdpEndpoint;
    
    // 如果是 WebSocket URL，转换为 HTTP URL 用于查询
    if (httpUrl.startsWith('ws://')) {
      httpUrl = httpUrl.replace('ws://', 'http://');
    } else if (httpUrl.startsWith('wss://')) {
      httpUrl = httpUrl.replace('wss://', 'https://');
    } else if (!httpUrl.startsWith('http://') && !httpUrl.startsWith('https://')) {
      httpUrl = `http://${httpUrl}`;
    }

    // 从 HTTP 端点获取 WebSocket URL
    const listUrl = new URL('/json/version', httpUrl).toString();
    const response = await fetch(listUrl, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CDP info: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const wsUrl = data.webSocketDebuggerUrl;

    if (!wsUrl) {
      throw new Error('No WebSocket URL found in CDP response');
    }

    // 使用配置的地址替换 WebSocket URL 的地址部分
    const originalWsUrl = new URL(wsUrl);
    const configuredUrl = new URL(httpUrl);
    const newWsUrl = `ws://${configuredUrl.host}${originalWsUrl.pathname}`;

    return newWsUrl;
  }

  /**
   * 创建新的浏览器连接
   */
  async createConnection(retries = 0) {
    try {
      let wsUrl;

      // 如果配置的是 WebSocket URL，直接使用
      if (this.cdpEndpoint.startsWith('ws://') || this.cdpEndpoint.startsWith('wss://')) {
        wsUrl = this.cdpEndpoint;
      } else {
        // 否则从 HTTP 端点获取 WebSocket URL，并使用配置的地址替换
        wsUrl = await this.getWebSocketURL();
      }

      const browser = await chromium.connectOverCDP(wsUrl, {
        timeout: this.connectionTimeout
      });

      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.connections.set(connectionId, {
        browser,
        createdAt: Date.now(),
        inUse: true
      });

      this.connectionCount++;

      return {
        browser,
        connectionId,
        release: () => this.release(connectionId)
      };
    } catch (error) {
      console.error(`Connection attempt ${retries + 1} failed:`, error.message);
      
      if (retries < this.maxRetries) {
        console.warn(`Retrying connection... (${retries + 1}/${this.maxRetries})`);
        await this.delay(this.retryDelay);
        return this.createConnection(retries + 1);
      }
      throw new Error(`Failed to connect to browser after ${this.maxRetries} retries: ${error.message}`);
    }
  }

  /**
   * 释放浏览器连接
   */
  release(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.inUse = false;
    this.connectionCount--;

    // 处理等待队列
    if (this.waitingQueue.length > 0) {
      const { resolve } = this.waitingQueue.shift();
      // 复用现有连接
      connection.inUse = true;
      this.connectionCount++;
      resolve({
        browser: connection.browser,
        connectionId,
        release: () => this.release(connectionId)
      });
    }
  }

  /**
   * 关闭所有连接
   */
  async closeAll() {
    for (const [connectionId, connection] of this.connections.entries()) {
      try {
        await connection.browser.close();
      } catch (error) {
        // 忽略关闭错误
      }
    }
    this.connections.clear();
    this.connectionCount = 0;
    this.waitingQueue = [];
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取连接状态
   */
  getStatus() {
    return {
      activeConnections: this.connectionCount,
      maxConnections: this.maxConnections,
      waitingQueue: this.waitingQueue.length,
      connections: Array.from(this.connections.keys())
    };
  }
}

// 单例实例
let browserPoolInstance = null;

/**
 * 获取浏览器池单例
 */
export function getBrowserPool(options) {
  if (!browserPoolInstance) {
    browserPoolInstance = new BrowserPool(options);
  }
  return browserPoolInstance;
}

