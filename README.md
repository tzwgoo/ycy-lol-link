# 战败惩罚 - LOL 联动控制

## 功能概览
- 英雄联盟局内事件联动：基于 Live Client Data，支持连接状态、事件触发、受伤/死亡监测。
- 设备连接：通过役次元 IM（uid/token）连接设备，凭据可本地保存并下拉复用。
- 对局展示：前端可查看地图/模式/时间、双方阵容、玩家 KDA/CS、事件提示。

### 源码编译
1. 安装 Node.js（推荐 18+）。
2. 在根目录运行 `pnpm install`（或 npm/yarn）。
3. 分别在 `server` 与 `frontend` 目录执行 `pnpm install` 安装依赖。
4. 回到根目录运行 `npm run build`，随后 `npm start`，访问 `http://localhost:3000`。

### 打包 Windows 可执行文件
1. 安装依赖（包含 `pkg`）：`pnpm install`（或 npm/yarn）。
2. 运行 `npm run electron:dist`。产物在 `dist-electron/win-unpacked/zhanbai-lol-link.exe`，同目录包含运行所需的 `data/public/config` 等资源。
3. 双击 exe 或命令行运行。

## 使用要点
- 连接设备：在前端“连接设备”弹窗输入 uid/token，点击“保存凭据”后可下拉选择再次复用。
- 启用 LoL 联动：在控制面板点击“启动 LoL 联动”，进入对局后自动推送事件与对局信息。
- 事件配置：在“事件配置”中可为各事件（首拆、龙/大龙、ACE、受伤/死亡等）指定指令，支持开启/关闭。

## 目录说明
- `server/`：后端服务（LoL 轮询、设备指令、WebSocket）。
- `frontend/`：前端页面（控制面板、对局展示）。
- `docs/`：接口与事件文档。

## 注意事项
- 请遵守直播平台及相关规则，勿违规使用。
