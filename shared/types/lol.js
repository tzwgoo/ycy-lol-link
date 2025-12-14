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
/**
 * 默认事件触发配置
 */
export const DEFAULT_EVENT_TRIGGERS = [
    { eventType: LoLGameEventType.ChampionKill, enabled: true, commandId: 1 },
    { eventType: LoLGameEventType.Death, enabled: true, commandId: 2 },
    { eventType: LoLGameEventType.Assist, enabled: true, commandId: 0 },
    { eventType: LoLGameEventType.MultiKill, enabled: true, commandId: 3 },
    { eventType: LoLGameEventType.FirstBlood, enabled: true, commandId: 3 },
    { eventType: LoLGameEventType.MinionsSpawning, enabled: false, commandId: 0 },
    { eventType: LoLGameEventType.FirstBrick, enabled: true, commandId: 1 },
    { eventType: LoLGameEventType.DragonKill, enabled: true, commandId: 2 },
    { eventType: LoLGameEventType.BaronKill, enabled: true, commandId: 3 },
    { eventType: LoLGameEventType.HeraldKill, enabled: true, commandId: 1 },
    { eventType: LoLGameEventType.TurretKilled, enabled: true, commandId: 1 },
    { eventType: LoLGameEventType.InhibKilled, enabled: true, commandId: 2 },
    { eventType: LoLGameEventType.Ace, enabled: true, commandId: 4 },
    { eventType: LoLGameEventType.Injured, enabled: false, commandId: 0 },
];
/**
 * 默认英雄联盟配置
 */
export const DEFAULT_LOL_CONFIG = {
    enabled: false,
    pollInterval: 1000,
    eventTriggers: DEFAULT_EVENT_TRIGGERS,
};
