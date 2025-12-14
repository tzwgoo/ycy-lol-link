# YCY LoL Link API 文档

## 目录

- [概述](#概述)
- [认证](#认证)
- [响应格式](#响应格式)
- [错误代码](#错误代码)
- [REST API](#rest-api)
  - [服务器信息](#服务器信息)
  - [客户端连接](#客户端连接)
  - [游戏控制](#游戏控制)
  - [MCP API](#mcp-api)
- [WebSocket API](#websocket-api)
- [事件类型](#事件类型)

---

## 概述

YCY LoL Link 提供三套 API：

1. **REST API** - 用于基本的游戏控制和配置
2. **WebSocket API** - 用于实时双向通信
3. **MCP API** - 用于 AI 客户端集成（支持 SSE）

**Base URL**: `http://localhost:48091`

**API 版本**: `2.0.0`

---

## 认证

当前版本不需要认证。如果部署为公开服务，建议在反向代理层添加认证。

---

## 响应格式

所有 API 响应都遵循统一的格式：

### 成功响应

```json
{
  "status": 1,
  "code": "OK",
  "data": { ... }
}
```

### 错误响应

```json
{
  "status": 0,
  "code": "ERR::ERROR_CODE",
  "message": "错误描述"
}
```

**字段说明**：
- `status`: 状态码，`1` 表示成功，`0` 表示失败
- `code`: 响应代码，成功时为 `OK`，失败时为错误代码
- `message`: 可选的消息说明
- `data`: 响应数据（根据不同接口而异）

---

## 错误代码

| 错误代码 | 说明 |
|---------|------|
| `ERR::INVALID_PARAMS` | 参数无效或缺失 |
| `ERR::GAME_NOT_FOUND` | 游戏会话不存在 |
| `ERR::DEVICE_NOT_CONNECTED` | 设备未连接 |
| `ERR::YCYIM_CONNECT_FAILED` | 役次元 IM 连接失败 |
| `ERR::CREATE_CLIENT_ID_FAILED` | 创建客户端 ID 失败 |
| `ERR::NOT_IMPLEMENTED` | 功能未实现 |

---

## REST API

### 服务器信息

#### 获取服务器信息

获取服务器配置信息，包括 WebSocket URL 和 API Base URL。

**请求**

```http
GET /api/server_info
```

**响应**

```json
{
  "status": 1,
  "code": "OK",
  "server": {
    "wsUrl": "/ws/",
    "apiBaseHttpUrl": "http://127.0.0.1:48091"
  }
}
```

#### 获取自定义皮肤列表

获取可用的自定义皮肤列表。

**请求**

```http
GET /api/custom_skins
```

**响应**

```json
{
  "status": 1,
  "code": "OK",
  "customSkins": [
    {
      "id": "default",
      "name": "默认皮肤",
      "description": "系统默认皮肤"
    }
  ]
}
```

---

### 客户端连接

#### 获取客户端连接信息

生成一个新的客户端 ID，用于后续的连接和控制。

**请求**

```http
GET /api/client/connect
```

**响应**

```json
{
  "status": 1,
  "code": "OK",
  "clientId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 通过役次元 IM 连接设备

使用役次元 IM 凭据连接设备。

**请求**

```http
POST /api/client/connect/ycyim
Content-Type: application/json

{
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "uid": "your_ycy_uid",
  "token": "your_ycy_token"
}
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `clientId` | string | 是 | 客户端 ID |
| `uid` | string | 是 | 役次元用户 ID |
| `token` | string | 是 | 役次元认证 Token |

**响应**

```json
{
  "status": 1,
  "code": "OK",
  "message": "役次元IM连接成功",
  "clientId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 游戏控制

#### 获取游戏 API 信息

获取游戏 API 的版本和支持的事件类型。

**请求**

```http
GET /api/game
```

**响应**

```json
{
  "status": 1,
  "code": "OK",
  "version": "2.0.0",
  "eventTypes": [
    "FirstBlood",
    "FirstTower",
    "ChampionKill",
    "ChampionDeath",
    "DragonKill",
    "BaronKill",
    "Ace",
    "Victory",
    "Defeat"
  ]
}
```

#### 获取游戏状态

获取指定客户端的游戏状态。

**请求**

```http
GET /api/game/:clientId
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `clientId` | string | 客户端 ID |

**响应**

```json
{
  "status": 1,
  "code": "OK",
  "gameStatus": {
    "deviceConnected": true,
    "lolConnected": true,
    "inGame": false
  }
}
```

**字段说明**：
- `deviceConnected`: 设备是否已连接
- `lolConnected`: LoL 客户端是否已连接
- `inGame`: 是否在游戏中

#### 发送游戏指令

向设备发送指令。

**请求**

```http
POST /api/game/:clientId/command
Content-Type: application/json

{
  "commandId": 1
}
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `clientId` | string | 客户端 ID |

**请求体参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `commandId` | number | 是 | 指令 ID (0-6) |

**指令 ID 说明**：
- `0`: 停止
- `1-6`: 不同强度的指令

**响应**

```json
{
  "status": 1,
  "code": "OK"
}
```

#### 获取事件触发配置

获取游戏事件的触发配置。

**请求**

```http
GET /api/game/:clientId/triggers
```

**响应**

```json
{
  "status": 1,
  "code": "OK",
  "triggers": [
    {
      "eventType": "ChampionKill",
      "enabled": true,
      "commandId": 2
    },
    {
      "eventType": "ChampionDeath",
      "enabled": true,
      "commandId": 3
    }
  ]
}
```

#### 更新事件触发配置

更新游戏事件的触发配置。

**请求**

```http
POST /api/game/:clientId/triggers
Content-Type: application/json

{
  "triggers": [
    {
      "eventType": "ChampionKill",
      "enabled": true,
      "commandId": 2
    },
    {
      "eventType": "ChampionDeath",
      "enabled": true,
      "commandId": 3
    }
  ]
}
```

**请求体参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `triggers` | array | 是 | 事件触发配置数组 |
| `triggers[].eventType` | string | 是 | 事件类型 |
| `triggers[].enabled` | boolean | 是 | 是否启用 |
| `triggers[].commandId` | number | 是 | 指令 ID (0-6) |

**响应**

```json
{
  "status": 1,
  "code": "OK"
}
```

#### 启动 LoL 联动

启动英雄联盟游戏事件监听。

**请求**

```http
POST /api/game/:clientId/lol/start
```

**响应**

```json
{
  "status": 1,
  "code": "OK"
}
```

#### 停止 LoL 联动

停止英雄联盟游戏事件监听。

**请求**

```http
POST /api/game/:clientId/lol/stop
```

**响应**

```json
{
  "status": 1,
  "code": "OK"
}
```

---

### MCP API

MCP (Model Control Protocol) API 专为 AI 客户端设计，支持 Server-Sent Events (SSE) 进行实时事件推送。

#### SSE 连接

建立 SSE 连接以接收实时事件。

**请求**

```http
GET /api/mcp/:clientId/sse
X-Session-Id: optional-session-id
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `clientId` | string | 客户端 ID |

**请求头**

| 头部 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `X-Session-Id` | string | 否 | 会话 ID，用于断线重连 |

**响应**

连接建立后，服务器会持续推送事件：

```
event: connected
data: {"connectionId":"...","gameId":"...","status":{...}}

event: eventTriggered
data: {"eventType":"ChampionKill","commandId":2}

event: gameStarted
data: {"playerName":"Summoner123"}
```

**事件类型**：

| 事件 | 数据 | 说明 |
|------|------|------|
| `connected` | `{connectionId, gameId, status}` | 连接建立 |
| `deviceConnected` | `{}` | 设备已连接 |
| `deviceDisconnected` | `{}` | 设备已断开 |
| `lolConnected` | `{}` | LoL 客户端已连接 |
| `lolDisconnected` | `{}` | LoL 客户端已断开 |
| `gameStarted` | `{playerName}` | 游戏开始 |
| `gameEnded` | `{}` | 游戏结束 |
| `eventTriggered` | `{eventType, commandId}` | 事件触发 |
| `gameInfoUpdated` | `{...}` | 游戏信息更新 |

#### MCP - 发送指令

通过 MCP API 发送游戏指令。

**请求**

```http
POST /api/mcp/:clientId/command
Content-Type: application/json

{
  "commandId": 1
}
```

**响应**

```json
{
  "status": 1,
  "code": "OK"
}
```

#### MCP - 获取游戏状态

**请求**

```http
GET /api/mcp/:clientId/status
```

**响应**

```json
{
  "status": 1,
  "code": "OK",
  "gameStatus": {
    "deviceConnected": true,
    "lolConnected": true,
    "inGame": false
  }
}
```

#### MCP - 获取事件触发配置

**请求**

```http
GET /api/mcp/:clientId/triggers
```

**响应**

```json
{
  "status": 1,
  "code": "OK",
  "triggers": [...]
}
```

#### MCP - 更新事件触发配置

**请求**

```http
POST /api/mcp/:clientId/triggers
Content-Type: application/json

{
  "triggers": [...]
}
```

**响应**

```json
{
  "status": 1,
  "code": "OK"
}
```

#### MCP - 启动 LoL 联动

**请求**

```http
POST /api/mcp/:clientId/lol/start
```

**响应**

```json
{
  "status": 1,
  "code": "OK"
}
```

#### MCP - 停止 LoL 联动

**请求**

```http
POST /api/mcp/:clientId/lol/stop
```

**响应**

```json
{
  "status": 1,
  "code": "OK"
}
```

#### MCP - 获取所有活跃会话

获取所有活跃的游戏会话列表。

**请求**

```http
GET /api/mcp/sessions
```

**响应**

```json
{
  "status": 1,
  "code": "OK",
  "sessions": [
    {
      "gameId": "550e8400-e29b-41d4-a716-446655440000",
      "deviceConnected": true,
      "lolConnected": true,
      "inGame": false,
      "playerName": "Summoner123"
    }
  ]
}
```

---

## WebSocket API

WebSocket 连接用于实时双向通信。

**连接 URL**: `ws://localhost:48091/ws/`

### 连接流程

1. 建立 WebSocket 连接
2. 发送 `bindClient` 消息绑定客户端
3. 接收和发送消息

### 消息格式

所有消息都是 JSON 格式：

```json
{
  "event": "eventName",
  "requestId": "optional-request-id",
  "data": { ... }
}
```

### 客户端发送的消息

#### bindClient - 绑定客户端

```json
{
  "event": "bindClient",
  "clientId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### startLoL - 启动 LoL 联动

```json
{
  "event": "startLoL"
}
```

#### stopLoL - 停止 LoL 联动

```json
{
  "event": "stopLoL"
}
```

#### updateEventTriggers - 更新事件配置

```json
{
  "event": "updateEventTriggers",
  "triggers": [
    {
      "eventType": "ChampionKill",
      "enabled": true,
      "commandId": 2
    }
  ]
}
```

#### sendCommand - 发送指令

```json
{
  "event": "sendCommand",
  "commandId": 1
}
```

### 服务器发送的消息

#### clientBound - 客户端已绑定

```json
{
  "event": "clientBound",
  "clientId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### deviceConnected - 设备已连接

```json
{
  "event": "deviceConnected"
}
```

#### deviceDisconnected - 设备已断开

```json
{
  "event": "deviceDisconnected"
}
```

#### lolConnected - LoL 客户端已连接

```json
{
  "event": "lolConnected"
}
```

#### lolDisconnected - LoL 客户端已断开

```json
{
  "event": "lolDisconnected"
}
```

#### gameStarted - 游戏开始

```json
{
  "event": "gameStarted",
  "playerName": "Summoner123"
}
```

#### gameEnded - 游戏结束

```json
{
  "event": "gameEnded"
}
```

#### eventTriggered - 事件触发

```json
{
  "event": "eventTriggered",
  "eventType": "ChampionKill",
  "commandId": 2
}
```

#### configUpdated - 配置更新

```json
{
  "event": "configUpdated",
  "triggers": [...]
}
```

#### gameInfoUpdated - 游戏信息更新

```json
{
  "event": "gameInfoUpdated",
  "gameInfo": {
    "gameTime": 123.45,
    "activePlayer": {
      "championName": "Ahri",
      "level": 10,
      "currentGold": 5000
    },
    "allPlayers": [...]
  }
}
```

---

## 事件类型

### LoL 游戏事件

| 事件类型 | 说明 | 触发时机 |
|---------|------|---------|
| `FirstBlood` | 一血 | 游戏中第一次击杀英雄 |
| `FirstTower` | 首拆 | 摧毁第一座防御塔 |
| `ChampionKill` | 击杀英雄 | 击杀敌方英雄 |
| `ChampionDeath` | 英雄死亡 | 己方英雄死亡 |
| `MultiKill` | 多杀 | 短时间内多次击杀 |
| `DragonKill` | 击杀小龙 | 击杀元素龙 |
| `BaronKill` | 击杀大龙 | 击杀纳什男爵 |
| `TurretKill` | 摧毁防御塔 | 摧毁敌方防御塔 |
| `InhibitorKill` | 摧毁水晶 | 摧毁敌方水晶 |
| `Ace` | 团灭 | 团灭敌方队伍 |
| `Victory` | 胜利 | 游戏胜利 |
| `Defeat` | 失败 | 游戏失败 |

---

## 使用示例

### 示例 1: 基本流程

```javascript
// 1. 获取客户端 ID
const response = await fetch('http://localhost:48091/api/client/connect');
const { clientId } = await response.json();

// 2. 连接设备
await fetch('http://localhost:48091/api/client/connect/ycyim', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId,
    uid: 'your_uid',
    token: 'your_token'
  })
});

// 3. 启动 LoL 联动
await fetch(`http://localhost:48091/api/game/${clientId}/lol/start`, {
  method: 'POST'
});

// 4. 配置事件触发
await fetch(`http://localhost:48091/api/game/${clientId}/triggers`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    triggers: [
      { eventType: 'ChampionKill', enabled: true, commandId: 2 },
      { eventType: 'ChampionDeath', enabled: true, commandId: 3 }
    ]
  })
});
```

### 示例 2: WebSocket 连接

```javascript
const ws = new WebSocket('ws://localhost:48091/ws/');

ws.onopen = () => {
  // 绑定客户端
  ws.send(JSON.stringify({
    event: 'bindClient',
    clientId: 'your-client-id'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.event) {
    case 'eventTriggered':
      console.log(`事件触发: ${message.eventType}`);
      break;
    case 'gameStarted':
      console.log(`游戏开始，玩家: ${message.playerName}`);
      break;
  }
};
```

### 示例 3: MCP SSE 连接

```javascript
const eventSource = new EventSource(
  `http://localhost:48091/api/mcp/${clientId}/sse`
);

eventSource.addEventListener('connected', (e) => {
  const data = JSON.parse(e.data);
  console.log('已连接:', data);
});

eventSource.addEventListener('eventTriggered', (e) => {
  const data = JSON.parse(e.data);
  console.log('事件触发:', data.eventType);
});

eventSource.addEventListener('gameStarted', (e) => {
  const data = JSON.parse(e.data);
  console.log('游戏开始:', data.playerName);
});
```

---

## 注意事项

1. **客户端 ID 管理**: 客户端 ID 在服务器重启后会失效，需要重新获取
2. **设备连接**: 发送指令前必须先连接设备
3. **LoL 客户端**: 启动 LoL 联动前，确保英雄联盟客户端正在运行
4. **事件配置**: 事件配置存储在内存中，服务器重启后会恢复为默认配置
5. **并发限制**: 建议每个设备只建立一个连接
6. **SSE 连接**: MCP SSE 连接会自动保持活跃，客户端断开后需要重新连接

---

## 更新日志

### v2.0.0 (2025-01-14)

- 移除数据库依赖，改用内存存储
- 完善 MCP API，添加更多端点
- 增强 SSE 事件推送
- 优化 WebSocket 消息处理
- 更新 API 文档

---

## 支持

如有问题或建议，请访问：
- GitHub Issues: https://github.com/ycy-lol-link/ycy-lol-link/issues
- 项目主页: https://github.com/ycy-lol-link/ycy-lol-link
