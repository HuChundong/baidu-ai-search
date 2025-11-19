#!/bin/bash

# 百度AI搜索代理服务 - curl 测试命令

# 服务器地址（根据实际情况修改）
BASE_URL="http://localhost:3000"

echo "=========================================="
echo "1. 健康检查"
echo "=========================================="
curl "${BASE_URL}/api/health" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo -e "\n\n"

echo "=========================================="
echo "2. 基本搜索请求（GET 方式，自动添加 JSON 格式要求）"
echo "=========================================="
curl "${BASE_URL}/api/search?word=周杰伦生日" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo -e "\n\n"

echo "=========================================="
echo "3. 带超时参数的搜索请求"
echo "=========================================="
curl "${BASE_URL}/api/search?word=周杰伦生日&timeout=60000" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo -e "\n\n"

echo "=========================================="
echo "4. 简单测试查询（自动添加 JSON 格式要求）"
echo "=========================================="
curl "${BASE_URL}/api/search?word=你好" \
  -w "\n\nHTTP Status: %{http_code}\n"

