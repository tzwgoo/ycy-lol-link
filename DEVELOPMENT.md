# 开发指南

## 开发模式启动

### 方式一：Electron 开发模式（推荐，支持热更新）

只需一条命令即可启动完整的开发环境：

```bash
npm run electron:dev
```

这个命令会自动：
1. 启动前端开发服务器（Vite，端口 5173）- 支持热更新
2. 启动后端服务器（Node.js，端口 3000）
3. 启动 Electron 窗口，加载前端开发服务器

**优势：**
- ✅ 前端代码修改后自动热更新，无需重启
- ✅ 一条命令启动所有服务
- ✅ 自动打开开发者工具
- ✅ 完整的 Electron 环境测试

**注意：**
- 按 `Ctrl+C` 会自动停止所有服务
- 首次启动需要等待约 5 秒让服务器启动

### 方式二：浏览器开发模式

如果不需要测试 Electron 特性，可以直接在浏览器中开发：

**终端 1 - 启动后端：**
```bash
cd server
npm run dev
```

**终端 2 - 启动前端：**
```bash
cd frontend
npm run dev
```

然后在浏览器访问 `http://localhost:5173`

## 生产构建

### 构建前端和后端

```bash
npm run build
```

这会：
1. 构建前端（`frontend/src` → `frontend/dist`）
2. 构建后端（`server/src` → `server/dist`）
3. 复制前端到后端 public 目录

### 打包 Electron 应用

```bash
npm run electron:dist
```

产物在 `dist-electron/` 目录

## 项目结构

```
ycy-lol-link/
├── frontend/          # 前端代码（Vue 3 + TypeScript）
│   ├── src/
│   │   ├── pages/     # 页面组件
│   │   ├── stores/    # Pinia 状态管理
│   │   ├── apis/      # API 封装
│   │   └── components/# 通用组件
│   └── dist/          # 构建产物
├── server/            # 后端代码（Node.js + TypeScript）
│   ├── src/
│   └── dist/          # 构建产物
├── electron/          # Electron 主进程
│   └── main.js
└── electron-start.js  # 开发环境启动脚本
```

## 开发流程

1. **修改前端代码**：直接修改 `frontend/src/` 下的文件，保存后自动热更新
2. **修改后端代码**：修改 `server/src/` 下的文件，需要重启后端服务器
3. **测试 Electron**：使用 `npm run electron:dev` 在 Electron 环境中测试

## 常见问题

### Q: 修改前端代码后没有更新？
A: 确保使用 `npm run electron:dev` 启动，而不是 `npm start`

### Q: 端口被占用？
A: 检查端口 48091（后端）和 5173（前端）是否被占用，关闭占用的进程

### Q: Electron 窗口显示错误页面？
A: 等待服务器完全启动（约 5 秒），或检查控制台输出的错误信息

## 技术栈

- **前端**：Vue 3 + TypeScript + Vite + PrimeVue + Pinia
- **后端**：Node.js + TypeScript + Koa + WebSocket
- **桌面**：Electron
