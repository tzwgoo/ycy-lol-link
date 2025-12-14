import { defineStore } from 'pinia';
import { SocketApi } from '../apis/socketApi';
import type { LoLEventTriggerConfig, LoLGameEventType, GameStatus, LoLLiveGameInfo } from '../../../shared/types/index.js';
import { ServerInfoResData, webApi } from '../apis/webApi';
import { handleApiResponse } from '../utils/response';
import { useLogStore } from './LogStore';

export interface ClientInfo {
  id: string;
  name: string;
  lastConnectTime: number;
}

export interface WebSocketState {
  connected: boolean;
  clientId: string;
  clientStatus: 'init' | 'waiting' | 'connected';
  deviceConnected: boolean;
  lolConnected: boolean;
  inGame: boolean;
  lolStarted: boolean;
  playerName: string;
  eventTriggers: LoLEventTriggerConfig[];
  gameInfo: LoLLiveGameInfo | null;
  apiBaseHttpUrl: string;
  // Consolidated from ClientsStore
  clientList: ClientInfo[];
  // Consolidated from RemoteNotificationStore
  ignoredNotificationIds: string[];
}

// 私有变量，不需要响应式
let wsClient: SocketApi | null = null;
let serverInfo: ServerInfoResData | null = null;

export const useWebSocketStore = defineStore('websocket', {
  state: (): WebSocketState => ({
    connected: false,
    clientId: '',
    clientStatus: 'init',
    deviceConnected: false,
    lolConnected: false,
    inGame: false,
    lolStarted: false,
    playerName: '',
    eventTriggers: [],
    gameInfo: null,
    apiBaseHttpUrl: '',
    clientList: [],
    ignoredNotificationIds: [],
  }),

  actions: {
    async initialize() {
      if (wsClient) {
        return; // 已经初始化
      }

      try {
        // 获取服务器信息
        const serverInfoRes = await webApi.getServerInfo();
        handleApiResponse(serverInfoRes);
        serverInfo = serverInfoRes!;
        this.apiBaseHttpUrl = serverInfo.server.apiBaseHttpUrl;

        // 初始化 WebSocket
        wsClient = new SocketApi(serverInfo.server.wsUrl);
        this.setupWebSocketHandlers();
        wsClient.connect();
      } catch (error: any) {
        console.error('Failed to initialize WebSocket:', error);
        throw error;
      }
    },

    setupWebSocketHandlers() {
      if (!wsClient) return;

      const logStore = useLogStore();

      wsClient.on('open', () => {
        console.log('WebSocket connected');
        this.connected = true;
        logStore.addLog('info', 'WebSocket 连接已建立', 'WebSocket');

        // 如果已有 clientId，自动绑定
        if (this.clientId) {
          this.bindClient();
        }
      });

      wsClient.on('deviceConnected', () => {
        console.log('Device connected');
        this.deviceConnected = true;
        this.clientStatus = 'connected';
        logStore.addLog('info', '设备已连接', 'Device');
      });

      wsClient.on('deviceDisconnected', () => {
        console.log('Device disconnected');
        this.deviceConnected = false;
        this.clientStatus = 'waiting';
        this.lolConnected = false;
        this.inGame = false;
        this.lolStarted = false;
        this.playerName = '';
        this.gameInfo = null;
        logStore.addLog('warn', '设备已断开', 'Device');
      });

      wsClient.on('lolConnected', () => {
        this.lolConnected = true;
        logStore.addLog('info', 'LoL 客户端已连接', 'LoL');
      });

      wsClient.on('lolDisconnected', () => {
        this.lolConnected = false;
        this.inGame = false;
        this.playerName = '';
        this.gameInfo = null;
        logStore.addLog('warn', 'LoL 客户端已断开', 'LoL');
      });

      wsClient.on('gameStarted', (playerName: string) => {
        this.inGame = true;
        this.playerName = playerName;
        if (this.gameInfo) {
          this.gameInfo.playerName = playerName;
        }
        logStore.addLog('info', `游戏开始 - 玩家: ${playerName}`, 'LoL');
      });

      wsClient.on('gameEnded', () => {
        this.inGame = false;
        this.playerName = '';
        this.gameInfo = null;
        logStore.addLog('info', '游戏结束', 'LoL');
      });

      wsClient.on('eventTriggersUpdated', (config: LoLEventTriggerConfig[]) => {
        this.eventTriggers = config;
      });

      wsClient.on('eventTriggered', (eventType: LoLGameEventType, commandId: number) => {
        logStore.addLog('info', `事件触发: ${eventType} -> 指令 ${commandId}`, 'Event');
      });

      wsClient.on('statusUpdated', (status: GameStatus) => {
        this.deviceConnected = status.deviceConnected;
        this.lolConnected = status.lolConnected;
        this.inGame = status.inGame;
        this.playerName = status.playerName || '';

        if (!status.inGame) {
          this.gameInfo = null;
        }

        if (status.deviceConnected) {
          this.clientStatus = 'connected';
        }

        logStore.addLog('debug', `状态更新: 设备=${status.deviceConnected}, LoL=${status.lolConnected}, 游戏中=${status.inGame}`, 'Status');
      });

      wsClient.on('gameInfoUpdated', (info: LoLLiveGameInfo) => {
        this.inGame = true;
        this.playerName = info.playerName;
        this.gameInfo = info;
        logStore.addLog('debug', `对局信息更新: ${info.playerName} (${info.playerTeam})`, 'Game');
      });

      // 监听指令请求和响应
      wsClient.on('commandRequest', (_action: string, data: any) => {
        // 记录实际发送的请求数据
        const { requestId, ...cleanData } = data;
        const dataStr = JSON.stringify(cleanData, null, 2);
        logStore.addLog('info', `→ 发送请求\n${dataStr}`, 'WebSocket');
      });

      wsClient.on('commandResponse', (_action: string, message: any) => {
        // 记录实际收到的响应数据
        const dataStr = JSON.stringify(message, null, 2);
        const status = message.data?.status === 1 ? '✓' : '✗';
        const level = message.data?.status === 1 ? 'info' : 'warn';
        logStore.addLog(level, `← 收到响应 ${status}\n${dataStr}`, 'WebSocket');
      });

      // 监听 SDK 日志（设备指令的实际调用）
      wsClient.on('sdkLog', (logData: any) => {
        const { type, data } = logData;
        const dataStr = JSON.stringify(data, null, 2);
        if (type === 'request') {
          logStore.addLog('info', `📤 SDK 请求\n${dataStr}`, 'SDK');
        } else {
          // 判断是否成功：
          // 1. 腾讯 IM SDK 返回值：code === 0 表示成功
          // 2. 错误对象：有 success 字段且为 false
          const isSuccess = data.code === 0 || (data.success !== false && !data.error);
          const level = isSuccess ? 'info' : 'error';
          const icon = isSuccess ? '📥' : '❌';
          logStore.addLog(level, `${icon} SDK 响应\n${dataStr}`, 'SDK');
        }
      });
    },

    async getClientConnectInfo() {
      try {
        const res = await webApi.getClientConnectInfo();
        handleApiResponse(res);
        this.clientId = res!.clientId;
        return res!.clientId;
      } catch (error: any) {
        console.error('Cannot get client id:', error);
        throw error;
      }
    },

    async bindClient() {
      if (!this.clientId) return;
      if (!wsClient?.isConnected) return;

      try {
        this.clientStatus = 'waiting';
        const res = await wsClient.bindClient(this.clientId);
        handleApiResponse(res);
      } catch (error: any) {
        console.error('Cannot bind client:', error);
        throw error;
      }
    },

    async startLoL() {
      if (!wsClient) throw new Error('WebSocket not initialized');

      const res = await wsClient.startLoL();
      handleApiResponse(res);
      this.lolStarted = true;
      return res;
    },

    async stopLoL() {
      if (!wsClient) throw new Error('WebSocket not initialized');

      const res = await wsClient.stopLoL();
      handleApiResponse(res);
      this.lolStarted = false;
      return res;
    },

    async updateEventTriggers(triggers: LoLEventTriggerConfig[]) {
      if (!wsClient) throw new Error('WebSocket not initialized');

      this.eventTriggers = triggers;
      const res = await wsClient.updateEventTriggers(triggers);
      handleApiResponse(res);
      return res;
    },

    async sendCommand(commandId: number) {
      if (!wsClient) throw new Error('WebSocket not initialized');

      const res = await wsClient.sendCommand(commandId);
      handleApiResponse(res);
      return res;
    },

    getWebSocketClient() {
      return wsClient;
    },

    // Consolidated from ClientsStore
    addClient(id: string, name: string) {
      this.clientList.push({ id, name, lastConnectTime: Date.now() });
    },
    getClientInfo(id: string) {
      return this.clientList.find(c => c.id === id);
    },
    updateClientName(id: string, name: string) {
      const client = this.clientList.find(c => c.id === id);
      if (client) {
        client.name = name;
      }
    },
    updateClientConnectTime(id: string) {
      const client = this.clientList.find(c => c.id === id);
      if (client) {
        client.lastConnectTime = Date.now();
      }
    },

    // Consolidated from RemoteNotificationStore
    isNotificationIgnored(id: string) {
      return this.ignoredNotificationIds.includes(id);
    },
    ignoreNotification(id: string) {
      if (!this.ignoredNotificationIds.includes(id)) {
        this.ignoredNotificationIds.push(id);
      }
    },
  },

  persist: {
    key: 'CGH_WebSocket',
    pick: ['clientList', 'ignoredNotificationIds'],
  },
});
