/**
 * 搜索服务核心逻辑
 * 通过点击复制按钮获取剪切板内容
 */

import { getBrowserPool } from './browserPool.js';
import { CONFIG } from '../config/constants.js';

export class SearchService {
  constructor() {
    this.browserPool = getBrowserPool();
  }

  /**
   * 执行搜索
   * @param {string} query - 搜索关键词
   * @param {object} options - 选项
   * @returns {Promise<object>} 搜索结果
   */
  async search(query, options = {}) {
    const timeout = options.timeout || CONFIG.SEARCH.DEFAULT_TIMEOUT;
    const startTime = Date.now();
    const timings = {};

    let connection = null;
    let page = null;
    let context = null;

    try {
      // 获取浏览器连接
      connection = await this.browserPool.acquire();
      const browser = connection.browser;

      // 创建浏览器上下文和页面
      const deviceType = CONFIG.SEARCH.DEVICE_TYPE;
      const userAgent = CONFIG.SEARCH.USER_AGENT;
      const viewport = CONFIG.SEARCH.VIEWPORT_SIZE;
      
      context = await browser.newContext({
        userAgent: userAgent,
        viewport: viewport,
        permissions: ['clipboard-read', 'clipboard-write'],
        ...(deviceType === 'mobile' && {
          isMobile: true,
          hasTouch: true
        })
      });

      page = await context.newPage();

      // 拦截非必要资源以加速页面加载
      await context.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (['image', 'media', 'font'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      // 导航到搜索页面
      const searchUrl = this.buildSearchUrl(query);
      await page.goto(searchUrl, {
        waitUntil: 'commit',
        timeout: timeout
      });

      // 等待内容就绪：停止回答消失 -> 网络空闲 -> DOM稳定
      await this.waitForStopButtonDisappear(page, timeout);
      await this.waitForNetworkIdle(page, 10000);
      await this.waitForDOMStable(page, timeout);

      // 获取复制按钮并读取剪切板内容
      const clipboardText = await this.getContentFromClipboard(page);
      
      if (!clipboardText || !clipboardText.trim()) {
        throw new Error('Failed to get content from clipboard');
      }
      
      return clipboardText;

    } catch (error) {
      // 失败时截取全页面截图用于调试
      if (page && !page.isClosed() && CONFIG.SEARCH.SCREENSHOT.ENABLED) {
        try {
          await this.takeScreenshot(page, `ERROR_${query}`, true);
        } catch (screenshotError) {
          // 截图失败不影响错误抛出
        }
      }
      
      throw error;
    } finally {
      // 清理资源
      if (page) {
        try {
          await page.close();
        } catch (error) {
          console.error('Error closing page:', error);
        }
      }

      if (context) {
        try {
          await context.close();
        } catch (error) {
          console.error('Error closing context:', error);
        }
      }

      if (connection) {
        connection.release();
      }
    }
  }



  /**
   * 等待"停止回答"按钮消失（说明内容生成完成）
   */
  async waitForStopButtonDisappear(page, timeout) {
    const stopButtonSelectors = [
      'button:has-text("停止回答")',
      'button:has-text("停止")',
      '[class*="stop"]:has-text("停止回答")',
      '[class*="Stop"]:has-text("停止回答")'
    ];

    const startTime = Date.now();
    const checkInterval = 200; // 每 200ms 检查一次
    const maxWaitTime = timeout || 30000;

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // 检查是否存在"停止回答"按钮
        const hasStopButton = await page.evaluate((selectors) => {
          for (const selector of selectors) {
            try {
              const element = document.querySelector(selector);
              if (element && element.offsetParent !== null) {
                // 元素存在且可见
                return true;
              }
            } catch (e) {
              // 选择器可能不支持，继续下一个
            }
          }
          
          // 也检查文本内容
          const bodyText = document.body?.textContent || '';
          if (bodyText.includes('停止回答')) {
            // 检查是否在按钮中
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent?.includes('停止回答') && btn.offsetParent !== null) {
                return true;
              }
            }
          }
          
          return false;
        }, stopButtonSelectors);

        if (!hasStopButton) {
          return true;
        }

        // 如果还存在，等待一段时间后再次检查
        await page.waitForTimeout(checkInterval);
      } catch (error) {
        // 如果检查出错，假设已完成
        console.warn('Error checking stop button:', error.message);
        return true;
      }
    }

    return false;
  }

  /**
   * 等待复制按钮出现（使用超时设置，不设置检查次数上限）
   */
  async waitForCopyButton(page, timeout) {
    const selector = CONFIG.SEARCH.COPY_BUTTON.SELECTOR;
    const selectors = selector.split(',').map(s => s.trim());
    const startTime = Date.now();
    const checkInterval = 100; // 每 100ms 检查一次
    
    // 持续检查直到超时
    while (Date.now() - startTime < timeout) {
      try {
        // 检查页面是否已关闭
        if (page.isClosed()) {
          return false;
        }

        // 最高优先级：检测 span 元素，内部文本是 "Copy Code"
        try {
          const spans = await page.$$('span').catch(() => []);
          for (const span of spans) {
            try {
              const text = await span.textContent().catch(() => '');
              if (text && text.trim() === 'Copy Code') {
                const isVisible = await span.isVisible().catch(() => false);
                if (isVisible) {
                  return true;
                }
              }
            } catch (error) {
              continue;
            }
          }
        } catch (error) {
          // 继续尝试其他选择器
        }

        // 尝试所有选择器
        for (const sel of selectors) {
          try {
            const element = await page.$(sel).catch(() => null);
            if (element) {
              const isVisible = await element.isVisible().catch(() => false);
              if (isVisible) {
                return true;
              }
            }
          } catch (error) {
            // 继续尝试下一个选择器
            continue;
          }
        }
        
        // 也尝试文本匹配的按钮
        try {
          const buttons = await page.$$('button').catch(() => []);
          for (const btn of buttons) {
            try {
              const text = await btn.textContent().catch(() => '');
              if (text && (text.includes('复制') || text.includes('copy'))) {
                const isVisible = await btn.isVisible().catch(() => false);
                if (isVisible) {
                  console.log('Copy button found by text content');
                  return true;
                }
              }
            } catch (error) {
              // 继续检查下一个按钮
              continue;
            }
          }
        } catch (error) {
          // 继续检查
        }
        
        // 等待一段时间后再次检查
        await page.waitForTimeout(checkInterval).catch(() => {
          // 如果页面已关闭，退出循环
          return;
        });
      } catch (error) {
        // 如果页面已关闭或其他错误，退出循环
        if (error.message.includes('closed') || page.isClosed()) {
          console.warn('Page closed during copy button check');
          return false;
        }
        // 其他错误，继续尝试
        await page.waitForTimeout(checkInterval).catch(() => {});
      }
    }
    
    return false;
  }

  /**
   * 等待网络请求闲置（使用更短的 idle 时间）
   */
  async waitForNetworkIdle(page, timeout) {
    try {
      // 使用更短的 networkidle 等待时间（默认是 500ms，我们尝试更短的）
      // 通过监听网络请求来实现更快的检测
      return new Promise((resolve, reject) => {
        let idleTimer = null;
        let requestCount = 0;
        const idleDuration = 200; // 200ms 内没有请求就认为 idle（比默认 500ms 更快）
        const timeoutTimer = setTimeout(() => {
          if (idleTimer) clearTimeout(idleTimer);
          resolve(false);
        }, timeout);

        const checkIdle = () => {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            if (requestCount === 0) {
              clearTimeout(timeoutTimer);
              resolve(true);
            } else {
              requestCount = 0;
              checkIdle();
            }
          }, idleDuration);
        };

        // 监听请求开始
        page.on('request', () => {
          requestCount++;
          checkIdle();
        });

        // 监听请求完成
        page.on('response', () => {
          requestCount = Math.max(0, requestCount - 1);
          checkIdle();
        });

        // 立即检查一次
        checkIdle();
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * 等待 DOM 稳定（不再变动）
   * 通过监听 DOM 变化，如果一段时间内没有变化则认为稳定
   */
  async waitForDOMStable(page, timeout) {
    const stableDuration = 500; // DOM 稳定持续时间（毫秒）
    const checkInterval = 100; // 检查间隔（毫秒）
    const maxWaitTime = timeout || 30000; // 最大等待时间
    
    return new Promise((resolve, reject) => {
      let lastMutationCount = 0;
      let stableStartTime = null;
      let checkTimer = null;
      let timeoutTimer = null;
      let observer = null;

      const startTime = Date.now();

      timeoutTimer = setTimeout(() => {
        cleanup();
        resolve(false);
      }, maxWaitTime);

      // 清理函数
      const cleanup = () => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (checkTimer) {
          clearInterval(checkTimer);
          checkTimer = null;
        }
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
      };

      // 检查 DOM 是否稳定
      const checkStable = async () => {
        try {
          // 检查"停止回答"元素是否消失（这是 DOM 稳定的重要条件）
          // 检查所有可能包含"停止回答"文字的元素（button、span、div 等）
          const stopButtonExists = await page.evaluate(() => {
            // 查找所有可能包含"停止回答"的元素
            const allElements = document.querySelectorAll('button, span, div, a, [role="button"]');
            for (const el of allElements) {
              const text = el.textContent || el.innerText || '';
              // 检查元素内部文字是否包含"停止回答"且元素可见
              if (text.includes('停止回答') && el.offsetParent !== null) {
                return true;
              }
            }
            // 也检查 body 的文本内容（作为备用）
            const bodyText = document.body?.textContent || document.body?.innerText || '';
            if (bodyText.includes('停止回答')) {
              // 再次确认是否在可见元素中
              const visibleElements = document.querySelectorAll('*');
              for (const el of visibleElements) {
                if (el.offsetParent !== null) {
                  const text = el.textContent || el.innerText || '';
                  if (text.trim() === '停止回答' || text.includes('停止回答')) {
                    return true;
                  }
                }
              }
            }
            return false;
          });

          // 如果"停止回答"元素还存在，DOM 不稳定，重置计时
          if (stopButtonExists) {
            lastMutationCount = 0; // 重置，强制重新开始计时
            stableStartTime = null;
            return; // 继续等待
          }

          // 获取当前 DOM 的哈希值（通过计算元素数量和一些关键属性）
          const currentMutationCount = await page.evaluate(() => {
            // 计算 DOM 的简单哈希：元素数量 + 文本内容长度
            const body = document.body;
            if (!body) return 0;
            return body.children.length + (body.textContent || '').length;
          });

          // 如果 DOM 没有变化
          if (currentMutationCount === lastMutationCount) {
            // 如果还没有开始计时，开始计时
            if (stableStartTime === null) {
              stableStartTime = Date.now();
            } else {
              // 如果已经稳定了足够长的时间
              if (Date.now() - stableStartTime >= stableDuration) {
                cleanup();
                resolve(true);
                return;
              }
            }
          } else {
            // DOM 有变化，重置稳定计时
            lastMutationCount = currentMutationCount;
            stableStartTime = null;
          }
        } catch (error) {
          cleanup();
          resolve(false);
        }
      };

      page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new MutationObserver(() => {
            // DOM 变化时，通过自定义事件通知
            window.__domChanged = true;
            window.__domChangeTime = Date.now();
          });
          
          observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: true
          });

          window.__domObserverReady = true;
          resolve();
        });
      }).catch(() => {
        // 如果注入失败，使用轮询方式
      });

      // 定期检查 DOM 稳定性
      checkTimer = setInterval(checkStable, checkInterval);
      
      // 立即检查一次
      checkStable();
    });
  }

  /**
   * 构建搜索 URL
   * 自动在 query 中拼接 JSON 格式要求
   */
  buildSearchUrl(query) {
    // 自动拼接 JSON 格式要求
    const prefix = '请根据以下要求生成回答：';
    const jsonFormatSuffix = '，无论是否有结果，必须使用markdown的json格式输出';
    
    // 检查 query 中是否已经包含 JSON 格式要求
    const finalQuery =prefix + query + jsonFormatSuffix;

    return `${CONFIG.SEARCH.BASE_URL}/search?word=${encodeURIComponent(finalQuery)}`;
  }

  /**
   * 截图（用于调试）
   * @param {Page} page - Playwright 页面对象
   * @param {string} query - 查询关键词（用于生成文件名）
   * @param {boolean} fullPage - 是否截取全页面（默认 false，只截取视口）
   */
  async takeScreenshot(page, query, fullPage = false) {
    try {
      // 确保截图目录存在
      const fs = await import('fs');
      const path = await import('path');
      
      const screenshotDir = CONFIG.SEARCH.SCREENSHOT.DIR;
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      // 生成文件名（使用时间戳和查询关键词的部分内容）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const querySlug = (query || 'unknown').substring(0, 20).replace(/[^\w]/g, '_');
      const filename = `screenshot_${timestamp}_${querySlug}.png`;
      const filepath = path.join(screenshotDir, filename);

      // 截图
      await page.screenshot({
        path: filepath,
        fullPage: fullPage, // 错误时截取全页面，正常时只截取视口
        type: 'png'
      });

      return filepath;
    } catch (error) {
      console.error('Error taking screenshot:', error);
      return null;
    }
  }


  /**
   * 通过点击复制按钮获取剪切板内容
   * 持续检测直到找到按钮或超时
   */
  async getContentFromClipboard(page) {
    const selector = CONFIG.SEARCH.COPY_BUTTON.SELECTOR;
    const clipboardWait = 200; // 减少等待时间到 200ms（从 1000ms 减少）
    const timeout = 10000; // 最多等待 10 秒
    const checkInterval = 100; // 每 100ms 检查一次
    const startTime = Date.now();

    const selectors = selector.split(',').map(s => s.trim());
    let copyButton = null;
    let foundSelector = null;

    // 持续检测直到找到按钮或超时
    while (Date.now() - startTime < timeout) {
      try {
        if (page.isClosed()) {
          throw new Error('Page closed while looking for copy button');
        }

        // 最高优先级：检测 span 元素，内部文本是 "Copy Code"
        try {
          const spans = await page.$$('span').catch(() => []);
          for (const span of spans) {
            try {
              const text = await span.textContent().catch(() => '');
              if (text && text.trim() === 'Copy Code') {
                const isVisible = await span.isVisible().catch(() => false);
              if (isVisible) {
                copyButton = span;
                foundSelector = 'span[text="Copy Code"]';
                break;
              }
              }
            } catch (error) {
              continue;
            }
          }
        } catch (error) {
          // 继续尝试其他选择器
        }

        // 如果找到了最高优先级的按钮，跳出循环
        if (copyButton) {
          break;
        }

        // 尝试所有配置的选择器
        for (const sel of selectors) {
          try {
            copyButton = await page.$(sel).catch(() => null);
            if (copyButton) {
              const isVisible = await copyButton.isVisible().catch(() => false);
              if (isVisible) {
                foundSelector = sel;
                break;
              }
              copyButton = null; // 不可见，继续查找
            }
          } catch (error) {
            continue;
          }
        }

        // 如果找到了，跳出循环
        if (copyButton) {
          break;
        }

        // 如果所有选择器都失败，尝试查找包含"复制"或"copy"文本的按钮
        try {
          const buttons = await page.$$('button').catch(() => []);
          for (const btn of buttons) {
            try {
              const text = await btn.textContent().catch(() => '');
              if (text && (text.includes('复制') || text.includes('copy'))) {
                const isVisible = await btn.isVisible().catch(() => false);
                if (isVisible) {
                  copyButton = btn;
                  foundSelector = 'text-content';
                  break;
                }
              }
            } catch (error) {
              continue;
            }
          }
        } catch (error) {
          // 继续检查
        }

        // 如果找到了，跳出循环
        if (copyButton) {
          break;
        }

        // 等待一段时间后再次检查
        await page.waitForTimeout(checkInterval).catch(() => {
          // 如果页面已关闭，退出循环
          throw new Error('Page closed during copy button search');
        });
      } catch (error) {
        if (error.message.includes('closed')) {
          throw error;
        }
        // 其他错误，继续尝试
        await page.waitForTimeout(checkInterval).catch(() => {});
      }
    }

    if (!copyButton) {
      throw new Error(`Copy button not found within ${timeout}ms. Tried: ${selectors.join(', ')}`);
    }

    // 立即操作，避免元素被移除
    // 不预先检查，直接尝试操作，如果失败则重新查找

    // 确保按钮可见且可点击（如果不可见，尝试滚动，但要处理元素可能被移除的情况）
    try {
      const isVisible = await copyButton.isVisible().catch(() => false);
      if (!isVisible) {
        try {
          await copyButton.scrollIntoViewIfNeeded();
          await page.waitForTimeout(50); // 减少等待时间
        } catch (scrollError) {
          // 如果滚动失败，尝试重新查找
          for (const sel of selectors) {
            try {
              const btn = await page.$(sel).catch(() => null);
              if (btn) {
                const visible = await btn.isVisible().catch(() => false);
                if (visible) {
                  copyButton = btn;
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
          if (!copyButton) {
            throw new Error('Copy button was removed from DOM during scroll');
          }
        }
      }
    } catch (error) {
      if (error.message.includes('removed')) {
        throw error;
      }
      // 其他错误，继续尝试点击
    }

    // 清空剪切板
    await page.evaluate(() => {
      navigator.clipboard.writeText('');
    }).catch(() => {
      // 剪切板清空失败不影响后续操作
    });

    // 点击复制按钮
    try {
      await copyButton.click();
    } catch (clickError) {
      // 如果点击失败，尝试使用 JavaScript 点击
      try {
        await copyButton.evaluate((btn) => btn.click());
      } catch (jsClickError) {
        // 如果还是失败，尝试重新查找并点击
        for (const sel of selectors) {
          try {
            const btn = await page.$(sel).catch(() => null);
            if (btn) {
              const visible = await btn.isVisible().catch(() => false);
              if (visible) {
                await btn.click().catch(() => btn.evaluate((b) => b.click()));
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
    }
    
    // 等待剪切板更新
    await page.waitForTimeout(clipboardWait);

    // 读取剪切板内容
    const clipboardText = await page.evaluate(async () => {
      try {
        // 使用 Clipboard API
        if (navigator.clipboard && navigator.clipboard.readText) {
          return await navigator.clipboard.readText();
        }
        // 备用方案：使用 document.execCommand
        const textarea = document.createElement('textarea');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        document.execCommand('paste');
        const text = textarea.value;
        document.body.removeChild(textarea);
        return text;
      } catch (error) {
        console.error('Error reading clipboard:', error);
        return null;
      }
    });

    if (!clipboardText || !clipboardText.trim()) {
      throw new Error('Clipboard is empty after clicking copy button');
    }

    // 直接返回剪切板文本，不做任何解析
    return clipboardText;
  }

}

// 单例实例
let searchServiceInstance = null;

/**
 * 获取搜索服务单例
 */
export function getSearchService() {
  if (!searchServiceInstance) {
    searchServiceInstance = new SearchService();
  }
  return searchServiceInstance;
}

