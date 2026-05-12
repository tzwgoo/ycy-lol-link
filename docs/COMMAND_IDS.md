# 当前指令 ID 说明

本文档说明项目中当前实际使用的 `commandId`。

## 变更背景

项目已将旧的数字指令值 `0` 到 `6` 迁移为英文字符串指令 ID。

- 旧格式：`0`、`1`、`2`、`3`、`4`、`5`、`6`
- 新格式：`command_zero` 到 `command_six`

这样做的目的主要是统一前后端类型、避免继续依赖纯数字值，并为后续切换到更业务化的英文命名保留空间。

## 当前可用指令 ID

| 指令 ID | 展示名称 | 说明 |
| --- | --- | --- |
| `command_zero` | `Command Zero` | 当前可直接用于手动发送和事件触发 |
| `command_one` | `Command One` | 当前可直接用于手动发送和事件触发 |
| `command_two` | `Command Two` | 当前可直接用于手动发送和事件触发 |
| `command_three` | `Command Three` | 当前可直接用于手动发送和事件触发 |
| `command_four` | `Command Four` | 当前可直接用于手动发送和事件触发 |
| `command_five` | `Command Five` | 当前可直接用于手动发送和事件触发 |
| `command_six` | `Command Six` | 当前可直接用于手动发送和事件触发 |

## 默认事件绑定

当前默认事件配置如下：

| 游戏事件 | 是否默认启用 | 默认指令 ID |
| --- | --- | --- |
| `ChampionKill` | 是 | `command_one` |
| `Death` | 是 | `command_two` |
| `Assist` | 是 | `command_zero` |
| `MultiKill` | 是 | `command_three` |
| `FirstBlood` | 是 | `command_three` |
| `MinionsSpawning` | 否 | `command_zero` |
| `FirstBrick` | 是 | `command_one` |
| `DragonKill` | 是 | `command_two` |
| `BaronKill` | 是 | `command_three` |
| `HeraldKill` | 是 | `command_one` |
| `TurretKilled` | 是 | `command_one` |
| `InhibKilled` | 是 | `command_two` |
| `Ace` | 是 | `command_four` |
| `Injured` | 否 | `command_zero` |

默认配置来源：

- [shared/types/lol.ts](/D:/ycy-lol-link/shared/types/lol.ts)
- [server/src/shared/types/lol.ts](/D:/ycy-lol-link/server/src/shared/types/lol.ts)

## 接口传参格式

### WebSocket

当前 WebSocket 发指令格式为：

```json
{
  "type": "sendCommand",
  "userId": "123456",
  "commandId": "command_one"
}
```

### HTTP / MCP

项目内部接口也已经统一要求 `commandId` 为字符串枚举，而不是数字。

示例：

```json
{
  "commandId": "command_two"
}
```

## 与 `WEBSOCKET_API.md` 的关系

[WEBSOCKET_API.md](/D:/ycy-lol-link/docs/WEBSOCKET_API.md) 中的示例使用了 `player_hurt` 这类业务语义化指令值：

```json
{
  "type": "sendCommand",
  "userId": "123456",
  "commandId": "player_hurt"
}
```

但当前项目代码里真正落地的稳定指令 ID 不是这组值，而是：

- `command_zero`
- `command_one`
- `command_two`
- `command_three`
- `command_four`
- `command_five`
- `command_six`

这表示：

1. 当前项目已经完成了“数字指令 -> 英文字符串指令”的迁移。
2. 当前项目还没有完成“通用槽位名 -> 业务语义名”的二次迁移。

如果后续需要和外部平台的标准命令名完全对齐，可以在这一层继续把 `command_zero` 到 `command_six` 替换成类似 `player_hurt`、`player_attack` 的业务语义值。

## 代码位置

当前指令 ID 的核心定义与使用位置如下：

- 常量定义：[shared/types/lol.ts](/D:/ycy-lol-link/shared/types/lol.ts)
- 服务端镜像定义：[server/src/shared/types/lol.ts](/D:/ycy-lol-link/server/src/shared/types/lol.ts)
- 前端发送逻辑：[frontend/src/apis/socketApi.ts](/D:/ycy-lol-link/frontend/src/apis/socketApi.ts)
- 前端配置页面：[frontend/src/pages/controller/LoLEventSettings.vue](/D:/ycy-lol-link/frontend/src/pages/controller/LoLEventSettings.vue)
- WebSocket 校验：[server/src/controllers/ws/WebWS.ts](/D:/ycy-lol-link/server/src/controllers/ws/WebWS.ts)
- HTTP 校验：[server/src/controllers/http/GameApi.ts](/D:/ycy-lol-link/server/src/controllers/http/GameApi.ts)
- MCP 校验：[server/src/controllers/http/McpApi.ts](/D:/ycy-lol-link/server/src/controllers/http/McpApi.ts)
