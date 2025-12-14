# YCY LoL Link

<div align="center">

**英雄联盟游戏事件联动控制系统**

[![License](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

</div>

## 📖 项目简介

YCY LoL Link 是一个基于英雄联盟 Live Client Data API 的游戏事件联动系统，支持通过役次元 IM 连接设备，实现游戏内事件（如击杀、死亡、推塔等）与外部设备的实时联动控制。

### ✨ 核心特性

- 🎮 **实时游戏监控**：基于 LoL Live Client Data API，实时监测游戏状态和事件
- 🔗 **设备联动**：通过役次元 IM 连接设备，支持多种指令控制
- ⚙️ **事件配置**：灵活配置游戏事件触发条件和对应指令
- 🌐 **Web 控制台**：提供友好的 Web 界面进行配置和监控
- 🔌 **MCP API**：支持 Model Control Protocol，可与 AI 客户端集成
- 📊 **实时数据展示**：查看对局信息、KDA、CS 等实时数据
- 🖥️ **跨平台支持**：支持 Windows、Linux、macOS

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm/pnpm/yarn

### 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装服务端依赖
cd server && npm install

# 安装前端依赖
cd ../frontend && npm install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev
```

### 生产构建

```bash
# 构建前端和后端
npm run build

# 启动服务
npm start
```

访问 `http://localhost:48091` 打开控制台。

### 打包 Electron 应用

```bash
# 构建并打包为 Windows 可执行文件
npm run electron:dist
```

打包后的文件位于 `dist-electron/win-unpacked/` 目录。

## 📁 项目结构

```
ycy-lol-link/
├── server/              # 后端服务
│   ├── src/
│   │   ├── controllers/ # 控制器（HTTP/WebSocket）
│   │   ├── managers/    # 管理器（游戏、IM）
│   │   ├── services/    # 服务（LoL 客户端、设备）
│   │   ├── models/      # 数据模型
│   │   └── types/       # 类型定义
│   ├── data/            # 数据文件
│   └── public/          # 静态资源
├── frontend/            # 前端应用
│   ├── src/
│   │   ├── components/  # Vue 组件
│   │   ├── stores/      # Pinia 状态管理
│   │   ├── apis/        # API 接口
│   │   └── utils/       # 工具函数
│   └── public/          # 公共资源
├── electron/            # Electron 主进程
├── shared/              # 共享类型定义
└── docs/                # 文档

```

## 🎯 使用指南

### 1. 连接设备

1. 打开 Web 控制台
2. 点击"连接设备"按钮
3. 输入役次元 IM 的 UID 和 Token
4. 点击"保存凭据"以便下次复用
5. 连接成功后，设备状态会显示为"已连接"

### 2. 配置事件触发

1. 在控制台点击"事件配置"
2. 为不同的游戏事件（首拆、击杀、死亡等）配置对应的指令
3. 启用/禁用特定事件
4. 保存配置

### 3. 启动 LoL 联动

1. 确保英雄联盟客户端已启动
2. 在控制台点击"启动 LoL 联动"
3. 进入游戏后，系统会自动监测事件并发送指令

### 支持的游戏事件

- 🏰 **首拆**：摧毁第一座防御塔
- 🐉 **击杀小龙**：击杀元素龙
- 🐲 **击杀大龙**：击杀纳什男爵
- ⚔️ **击杀英雄**：击杀敌方英雄
- 💀 **英雄死亡**：己方英雄死亡
- 🎯 **ACE**：团灭敌方
- 🏆 **胜利/失败**：游戏结束

## 🔧 配置说明

### 服务器配置

编辑 `server/config.yaml`：

```yaml
port: 48091                    # 服务端口
host: "localhost"              # 监听地址
openBrowser: true              # 启动时自动打开浏览器
enableAccessLogger: false      # 启用访问日志
```

### 事件配置

事件配置存储在数据库中，可通过 Web 控制台或 API 进行修改。

## 🌐 API 文档

### REST API

服务启动后访问 `/api/docs` 查看完整的 OpenAPI 文档。

主要端点：

- `GET /api/server_info` - 获取服务器信息
- `GET /api/client/connect` - 获取客户端连接信息
- `POST /api/client/connect/ycyim` - 通过役次元 IM 连接设备
- `GET /api/game/:id` - 获取游戏状态
- `POST /api/game/:id/command` - 发送游戏指令
- `GET /api/game/:id/triggers` - 获取事件触发配置
- `POST /api/game/:id/triggers` - 更新事件触发配置
- `POST /api/game/:id/lol/start` - 启动 LoL 联动
- `POST /api/game/:id/lol/stop` - 停止 LoL 联动

### WebSocket API

连接到 `/ws` 进行实时通信。

支持的消息类型：

- `bindClient` - 绑定客户端
- `startLoL` - 启动 LoL 联动
- `stopLoL` - 停止 LoL 联动
- `updateEventTriggers` - 更新事件配置
- `sendCommand` - 发送指令

### MCP API

支持 Model Control Protocol，可与 AI 客户端集成：

- `GET /api/mcp/:id/sse` - SSE 连接
- `POST /api/mcp/:id/command` - 发送指令
- `GET /api/mcp/:id/status` - 获取状态
- `GET /api/mcp/:id/triggers` - 获取事件配置
- `POST /api/mcp/:id/triggers` - 更新事件配置

## 🛠️ 技术栈

### 后端

- **框架**：Koa.js
- **语言**：TypeScript
- **数据库**：SQLite (TypeORM)
- **WebSocket**：ws
- **API 文档**：koa-swagger-decorator

### 前端

- **框架**：Vue 3
- **状态管理**：Pinia
- **UI 库**：PrimeVue
- **构建工具**：Vite
- **样式**：WindiCSS

### 桌面应用

- **框架**：Electron
- **打包工具**：electron-builder

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 开发说明

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规则
- 提交前确保代码能够正常构建

### 调试

```bash
# 后端调试
cd server
npm run dev

# 前端调试
cd frontend
npm run dev

# Electron 调试
npm run electron:dev
```

## ⚠️ 注意事项

1. **游戏客户端要求**：需要英雄联盟客户端处于运行状态
2. **网络要求**：确保能够访问 LoL Live Client Data API (默认端口 2999)
3. **设备连接**：需要有效的役次元 IM 凭据
4. **使用规范**：请遵守游戏平台和直播平台的相关规则，勿违规使用

## 📄 许可证

本项目采用 [GNU General Public License v3.0](LICENSE) 许可证。

## 🙏 致谢

- 感谢 Riot Games 提供的 Live Client Data API
- 感谢役次元提供的 IM SDK
- 感谢所有贡献者的支持

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**

</div>
