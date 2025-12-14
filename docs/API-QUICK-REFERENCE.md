# API 快速参考

## Base URL

```
http://localhost:48091
```

## 响应格式

```json
{
  "status": 1,        // 1=成功, 0=失败
  "code": "OK",       // 响应代码
  "message": "...",   // 可选消息
  "data": { ... }     // 响应数据
}
```

---

## REST API 端点

### 服务器信息

```http
GET /api/server_info              # 获取服务器信息
GET /api/custom_skins             # 获取自定义皮肤列表
```

### 客户端连接

```http
GET  /api/client/connect          # 获取客户端ID
POST /api/client/connect/ycyim    # 通过役次元IM连接设备
```

**连接设备请求体**:
```json
{
  "clientId": "uuid",
  "uid": "ycy_uid",
  "token": "ycy_token"
}
```

### 游戏控制

```http
GET  /api/game                    # 获取API信息
GET  /api/game/:id                # 获取游戏状态
POST /api/game/:id/command        # 发送指令
GET  /api/game/:id/triggers       # 获取事件配置
POST /api/game/:id/triggers       # 更新事件配置
POST /api/game/:id/lol/start      # 启动LoL联动
POST /api/game/:id/lol/stop       # 停止LoL联动
```

**发送指令请求体**:
```json
{
  "commandId": 1  // 0-6
}
```

**更新事件配置请求体**:
```json
{
  "triggers": [
    {
      "eventType": "ChampionKill",
      "enabled": true,
      "commandId": 2
    }
  ]
}
```

### MCP API

```http
GET  /api/mcp/:id/sse             # SSE连接（实时事件）
POST /api/mcp/:id/command         # 发送指令
GET  /api/mcp/:id/status          # 获取状态
GET  /api/mcp/:id/triggers        # 获取事件配置
POST /api/mcp/:id/triggers        # 更新事件配置
POST /api/mcp/:id/lol/start       # 启动LoL联动
POST /api/mcp/:id/lol/stop        # 停止LoL联动
GET  /api/mcp/sessions            # 获取所有会话
```

---

## WebSocket API

**连接**: `ws://localhost:48091/ws/`

### 客户端 → 服务器

```json
// 绑定客户端
{ "event": "bindClient", "clientId": "uuid" }

// 启动LoL联动
{ "event": "startLoL" }

// 停止LoL联动
{ "event": "stopLoL" }

// 更新事件配置
{ "event": "updateEventTriggers", "triggers": [...] }

// 发送指令
{ "event": "sendCommand", "commandId": 1 }
```

### 服务器 → 客户端

```json
// 客户端已绑定
{ "event": "clientBound", "clientId": "uuid" }

// 设备连接/断开
{ "event": "deviceConnected" }
{ "event": "deviceDisconnected" }

// LoL连接/断开
{ "event": "lolConnected" }
{ "event": "lolDisconnected" }

// 游戏开始/结束
{ "event": "gameStarted", "playerName": "..." }
{ "event": "gameEnded" }

// 事件触发
{ "event": "eventTriggered", "eventType": "...", "commandId": 1 }

// 配置更新
{ "event": "configUpdated", "triggers": [...] }

// 游戏信息更新
{ "event": "gameInfoUpdated", "gameInfo": {...} }
```

---

## 事件类型

| 事件 | 说明 |
|------|------|
| `FirstBlood` | 一血 |
| `FirstTower` | 首拆 |
| `ChampionKill` | 击杀英雄 |
| `ChampionDeath` | 英雄死亡 |
| `MultiKill` | 多杀 |
| `DragonKill` | 击杀小龙 |
| `BaronKill` | 击杀大龙 |
| `TurretKill` | 摧毁防御塔 |
| `InhibitorKill` | 摧毁水晶 |
| `Ace` | 团灭 |
| `Victory` | 胜利 |
| `Defeat` | 失败 |

---

## 指令 ID

| ID | 说明 |
|----|------|
| 0 | 停止 |
| 1-6 | 不同强度的指令 |

---

## 错误代码

| 代码 | 说明 |
|------|------|
| `ERR::INVALID_PARAMS` | 参数无效 |
| `ERR::GAME_NOT_FOUND` | 游戏不存在 |
| `ERR::DEVICE_NOT_CONNECTED` | 设备未连接 |
| `ERR::YCYIM_CONNECT_FAILED` | IM连接失败 |

---

## 快速开始

### 1. 获取客户端ID

```bash
curl http://localhost:48091/api/client/connect
```

### 2. 连接设备

```bash
curl -X POST http://localhost:48091/api/client/connect/ycyim \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "YOUR_CLIENT_ID",
    "uid": "YOUR_UID",
    "token": "YOUR_TOKEN"
  }'
```

### 3. 启动LoL联动

```bash
curl -X POST http://localhost:48091/api/game/YOUR_CLIENT_ID/lol/start
```

### 4. 配置事件

```bash
curl -X POST http://localhost:48091/api/game/YOUR_CLIENT_ID/triggers \
  -H "Content-Type: application/json" \
  -d '{
    "triggers": [
      {"eventType": "ChampionKill", "enabled": true, "commandId": 2},
      {"eventType": "ChampionDeath", "enabled": true, "commandId": 3}
    ]
  }'
```

### 5. 发送指令

```bash
curl -X POST http://localhost:48091/api/game/YOUR_CLIENT_ID/command \
  -H "Content-Type: application/json" \
  -d '{"commandId": 1}'
```

---

## JavaScript 示例

### REST API

```javascript
// 获取客户端ID
const res = await fetch('http://localhost:48091/api/client/connect');
const { clientId } = await res.json();

// 连接设备
await fetch('http://localhost:48091/api/client/connect/ycyim', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clientId, uid: 'xxx', token: 'xxx' })
});

// 启动LoL联动
await fetch(`http://localhost:48091/api/game/${clientId}/lol/start`, {
  method: 'POST'
});
```

### WebSocket

```javascript
const ws = new WebSocket('ws://localhost:48091/ws/');

ws.onopen = () => {
  ws.send(JSON.stringify({ event: 'bindClient', clientId }));
};

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  console.log('收到消息:', msg);
};
```

### SSE (MCP)

```javascript
const es = new EventSource(`http://localhost:48091/api/mcp/${clientId}/sse`);

es.addEventListener('connected', (e) => {
  console.log('已连接:', JSON.parse(e.data));
});

es.addEventListener('eventTriggered', (e) => {
  console.log('事件触发:', JSON.parse(e.data));
});
```

---

## Python 示例

### REST API

```python
import requests

# 获取客户端ID
res = requests.get('http://localhost:48091/api/client/connect')
client_id = res.json()['clientId']

# 连接设备
requests.post('http://localhost:48091/api/client/connect/ycyim', json={
    'clientId': client_id,
    'uid': 'xxx',
    'token': 'xxx'
})

# 启动LoL联动
requests.post(f'http://localhost:48091/api/game/{client_id}/lol/start')

# 发送指令
requests.post(f'http://localhost:48091/api/game/{client_id}/command', json={
    'commandId': 1
})
```

### SSE

```python
import sseclient
import requests

url = f'http://localhost:48091/api/mcp/{client_id}/sse'
response = requests.get(url, stream=True)
client = sseclient.SSEClient(response)

for event in client.events():
    print(f'事件: {event.event}, 数据: {event.data}')
```

---

## 注意事项

1. ⚠️ 客户端ID在服务器重启后失效
2. ⚠️ 发送指令前必须先连接设备
3. ⚠️ 启动LoL联动前确保游戏客户端运行
4. ⚠️ 事件配置存储在内存中
5. ⚠️ 建议每个设备只建立一个连接

---

## 更多信息

详细文档: [API.md](./API.md)
