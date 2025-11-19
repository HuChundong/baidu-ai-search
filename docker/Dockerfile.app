# Node.js 应用容器
# 使用 Alpine Linux 作为基础镜像，最小化镜像大小

FROM node:22-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 设置 npm 镜像源（使用国内镜像加速）
RUN npm config set registry https://registry.npmmirror.com

# 安装依赖（生产依赖）
# 如果有 package-lock.json 使用 npm ci（更快且更可靠），否则使用 npm install
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev && npm cache clean --force; \
    else \
      npm install --omit=dev && npm cache clean --force; \
    fi

# 生产阶段
FROM node:22-alpine

# 安装必要的运行时依赖
RUN apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 从构建阶段复制依赖
COPY --from=builder /app/node_modules ./node_modules

# 复制应用代码
COPY --chown=nodejs:nodejs . .

# 移动启动脚本到根目录并设置权限和所有者
RUN mv docker/start.sh /app/start.sh && \
    chmod +x /app/start.sh && \
    chown nodejs:nodejs /app/start.sh

# 创建截图目录
RUN mkdir -p screenshots && chown -R nodejs:nodejs screenshots

# 切换到非 root 用户
USER nodejs

# 暴露端口（API 和 MCP 模式都使用 3000）
EXPOSE 3000

# 使用 dumb-init 处理信号（确保优雅关闭）
ENTRYPOINT ["dumb-init", "--"]

# 启动应用（使用启动脚本根据 MODE 环境变量选择服务）
CMD ["/app/start.sh"]

