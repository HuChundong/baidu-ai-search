# curl 测试命令

## 1. 健康检查

检查服务是否正常运行：

```bash
curl http://localhost:3000/api/health
```

## 2. 基本搜索请求（GET 方式，与百度格式相同）

使用默认超时设置，自动添加 JSON 格式要求：

```bash
curl "http://localhost:3000/api/search?word=周杰伦生日"
```

## 3. 带超时参数的搜索请求

自定义超时时间（毫秒）：

```bash
curl "http://localhost:3000/api/search?word=周杰伦生日&timeout=60000"
```

## 4. 简单测试查询

快速测试（会自动添加"用json输出"）：

```bash
curl "http://localhost:3000/api/search?word=你好"
```

## 5. URL 编码示例

如果查询包含特殊字符，会自动 URL 编码：

```bash
curl "http://localhost:3000/api/search?word=周杰伦%20生日"
```

## 6. 格式化输出（使用 jq，如果已安装）

```bash
curl "http://localhost:3000/api/search?word=周杰伦生日" | jq .
```

## 7. 查看详细响应信息

```bash
curl -v "http://localhost:3000/api/search?word=周杰伦生日"
```

## 8. Windows PowerShell 版本

```powershell
# 健康检查
Invoke-RestMethod -Uri "http://localhost:3000/api/health"

# 搜索请求（GET 方式）
$query = [System.Web.HttpUtility]::UrlEncode("周杰伦生日")
Invoke-RestMethod -Uri "http://localhost:3000/api/search?word=$query"
```

## 预期响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    // 解析后的 JSON 对象（从剪切板内容中提取）
  },
  "json": "{\n  \"formatted\": \"json string\"\n}",
  "raw": "原始剪切板内容",
  "format": "json",
  "source": "clipboard",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "screenshot": {
    "path": "./screenshots/..."
  }
}
```

**注意**：
- `data`: 解析后的 JSON 对象，可直接使用
- `json`: 格式化的 JSON 字符串（美化后的）
- `raw`: 原始剪切板内容
- 系统会自动在查询中添加"用json输出"要求

### 错误响应

```json
{
  "success": false,
  "error": "错误信息",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

