/**
 * 英雄联盟 Live Client Data API 类型定义
 * 共享类型 - 前后端通用
 */
/**
 * 游戏事件类型
 */
export var LoLGameEventType;
(function (LoLGameEventType) {
  /** 游戏开始*/
  LoLGameEventType["GameStart"] = "GameStart";
  /** 兵线刷新 */
  LoLGameEventType["MinionsSpawning"] = "MinionsSpawning";
  /** 游戏结束 */
  LoLGameEventType["GameEnd"] = "GameEnd";
  /** 击杀英雄 */
  LoLGameEventType["ChampionKill"] = "ChampionKill";
  /** 被击杀 */
  LoLGameEventType["Death"] = "Death";
  /** 助攻 */
  LoLGameEventType["Assist"] = "Assist";
  /** 多杀 (双杀、三杀等) */
  LoLGameEventType["MultiKill"] = "MultiKill";
  /** 第一滴血 */
  LoLGameEventType["FirstBlood"] = "FirstBlood";
  /** 首拆（第一座塔） */
  LoLGameEventType["FirstBrick"] = "FirstBrick";
  /** 击杀小龙 */
  LoLGameEventType["DragonKill"] = "DragonKill";
  /** 击杀大龙 */
  LoLGameEventType["BaronKill"] = "BaronKill";
  /** 击杀峡谷先锋 */
  LoLGameEventType["HeraldKill"] = "HeraldKill";
  /** 推塔 */
  LoLGameEventType["TurretKilled"] = "TurretKilled";
  /** 拆除水晶 */
  LoLGameEventType["InhibKilled"] = "InhibKilled";
  /** 团灭（ACE） */
  LoLGameEventType["Ace"] = "Ace";
  /** 受伤（血量下降） */
  LoLGameEventType["Injured"] = "Injured";
})(LoLGameEventType || (LoLGameEventType = {}));

/**
 * 事件名称映射
 */
export const LoLEventNames = {
  [LoLGameEventType.GameStart]: '游戏开始',
  [LoLGameEventType.MinionsSpawning]: '兵线刷新',
  [LoLGameEventType.GameEnd]: '游戏结束',
  [LoLGameEventType.ChampionKill]: '击杀英雄',
  [LoLGameEventType.Death]: '死亡',
  [LoLGameEventType.Assist]: '助攻',
  [LoLGameEventType.MultiKill]: '多杀',
  [LoLGameEventType.FirstBlood]: '一血',
  [LoLGameEventType.FirstBrick]: '首拆',
  [LoLGameEventType.DragonKill]: '击杀小龙',
  [LoLGameEventType.BaronKill]: '击杀大龙',
  [LoLGameEventType.HeraldKill]: '击杀峡谷先锋',
  [LoLGameEventType.TurretKilled]: '摧毁防御塔',
  [LoLGameEventType.InhibKilled]: '摧毁水晶',
  [LoLGameEventType.Ace]: '团灭',
  [LoLGameEventType.Injured]: '受伤（掉血）',
};
export const LOL_COMMAND_IDS = [
  'command_zero',
  'command_one',
  'command_two',
  'command_three',
  'command_four',
  'command_five',
  'command_six',
];
export const LoLCommandLabels = {
  command_zero: '指令零',
  command_one: '指令一',
  command_two: '指令二',
  command_three: '指令三',
  command_four: '指令四',
  command_five: '指令五',
  command_six: '指令六',
};
/**
 * 默认事件触发配置
 */
export const DEFAULT_EVENT_TRIGGERS = [
  {eventType: LoLGameEventType.ChampionKill, enabled: true, commandId: 'command_one'},
  {eventType: LoLGameEventType.Death, enabled: true, commandId: 'command_two'},
  {eventType: LoLGameEventType.Assist, enabled: true, commandId: 'command_zero'},
  {eventType: LoLGameEventType.MultiKill, enabled: true, commandId: 'command_three'},
  {eventType: LoLGameEventType.FirstBlood, enabled: true, commandId: 'command_three'},
  {eventType: LoLGameEventType.MinionsSpawning, enabled: false, commandId: 'command_zero'},
  {eventType: LoLGameEventType.FirstBrick, enabled: true, commandId: 'command_one'},
  {eventType: LoLGameEventType.DragonKill, enabled: true, commandId: 'command_two'},
  {eventType: LoLGameEventType.BaronKill, enabled: true, commandId: 'command_three'},
  {eventType: LoLGameEventType.HeraldKill, enabled: true, commandId: 'command_one'},
  {eventType: LoLGameEventType.TurretKilled, enabled: true, commandId: 'command_one'},
  {eventType: LoLGameEventType.InhibKilled, enabled: true, commandId: 'command_two'},
  {eventType: LoLGameEventType.Ace, enabled: true, commandId: 'command_four'},
  {eventType: LoLGameEventType.Injured, enabled: false, commandId: 'command_zero'},
];
/**
 * 默认英雄联盟配置
 */
export const DEFAULT_LOL_CONFIG = {
  enabled: false,
  pollInterval: 1000,
  eventTriggers: DEFAULT_EVENT_TRIGGERS,
};
