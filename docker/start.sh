#!/bin/sh
# 启动脚本：根据 MODE 环境变量选择启动 API 或 MCP 服务

MODE=${MODE:-mcp}

case "$MODE" in
  api)
    echo "Starting API server..."
    exec node src/server.js
    ;;
  mcp)
    echo "Starting MCP server..."
    exec node src/mcp/server.js
    ;;
  *)
    echo "Error: Invalid MODE value: $MODE"
    echo "Valid values are: 'api' or 'mcp'"
    exit 1
    ;;
esac

