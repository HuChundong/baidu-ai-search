# 环境变量配置文件使用说明

## 快速开始

### 1. 复制示例文件

```bash
cd docker
cp .env.example .env
```

### 2. 编辑配置文件

使用你喜欢的编辑器打开 `.env` 文件：

```bash
# Linux/Mac
nano .env
# 或
vim .env

# Windows (PowerShell)
notepad .env
# 或使用 VS Code
code .env
```

### 3. 修改配置项

根据你的需求修改配置，例如：

```bash
# 修改应用端口为 8080
APP_PORT=8080

# 增加最大并发连接数到 20
MAX_CONNECTIONS=20

# 使用桌面端设备类型
DEVICE_TYPE=desktop

# 禁用错误截图
ENABLE_ERROR_SCREENSHOT=false
```

### 4. 启动服务

```bash
docker-compose up -d
```

Docker Compose 会自动读取 `docker/.env` 文件中的环境变量。

## 配置项说明

### 服务模式配置

- `MODE`: 服务运行模式，可选值：
  - `api`: API 模式（Express REST API 服务）
  - `mcp`: MCP 模式（Model Context Protocol 服务，默认值）
  - **注意**：两个模式不能同时启动，只能选择其中一个

### 应用端口配置

- `APP_PORT`: 宿主机对外暴露的端口（默认: 3000）
  - 容器内应用固定监听 3000 端口
  - 此环境变量控制宿主机端口映射，例如设置为 8080 时，访问 `http://localhost:8080` 会映射到容器内的 3000 端口
  - API 和 MCP 模式都使用此配置（两个服务不会同时运行）

### 浏览器池配置

- `MAX_CONNECTIONS`: 最大并发连接数（默认: 10）
- `CONNECTION_TIMEOUT`: 连接超时时间，单位毫秒（默认: 30000）
- `MAX_RETRIES`: 连接重试次数（默认: 3）
- `RETRY_DELAY`: 重试延迟，单位毫秒（默认: 1000）

### 搜索服务配置

- `SEARCH_TIMEOUT`: 搜索超时时间，单位毫秒（默认: 60000）
- `DEVICE_TYPE`: 设备类型，可选 `mobile` 或 `desktop`（默认: mobile）

### 截图配置

- `ENABLE_ERROR_SCREENSHOT`: 是否启用错误截图，`true` 或 `false`（默认: true）
- `SCREENSHOT_DIR`: 截图保存目录（默认: ./screenshots）
- `SCREENSHOT_IN_RESPONSE`: 是否在响应中返回截图 base64，`true` 或 `false`（默认: false）

### 复制按钮配置

- `USE_COPY_BUTTON`: 是否使用复制按钮方式，`true` 或 `false`（默认: true）
- `COPY_BUTTON_TIMEOUT`: 复制按钮等待超时时间，单位毫秒（默认: 30000）
- `CLIPBOARD_WAIT`: 点击后等待剪切板更新的时间，单位毫秒（默认: 1000）

### Browserless 浏览器服务配置

- `MAX_CONCURRENT_SESSIONS`: 最大并发会话数（默认: 10）
- `BROWSER_CONNECTION_TIMEOUT`: 浏览器连接超时时间，单位毫秒（默认: 300000）

## 其他使用方式

### 方式一：使用 .env 文件（推荐）

这是最简单和推荐的方式，所有配置集中在一个文件中管理。

### 方式二：命令行环境变量

你也可以直接在命令行设置环境变量：

```bash
APP_PORT=8080 MAX_CONNECTIONS=20 docker-compose up -d
```

### 方式三：系统环境变量

在系统级别设置环境变量，Docker Compose 会自动读取。

## 注意事项

1. **`.env` 文件不会被提交到 Git**
   - `.env` 文件已经在 `.gitignore` 中，不会被版本控制
   - `.env.example` 是示例文件，可以提交到仓库

2. **配置优先级**
   - 命令行环境变量 > `.env` 文件 > docker-compose.yml 中的默认值

3. **修改配置后**
   - 修改 `.env` 文件后，需要重启服务才能生效：
     ```bash
     docker-compose down
     docker-compose up -d
     ```

4. **验证配置**
   - 可以通过以下命令查看容器的环境变量：
     ```bash
     docker-compose exec app env | grep MAX_CONNECTIONS
     ```

