<script lang="ts" setup>
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';

import { LoLEventTriggerConfig, LoLPlayerInfo } from '../apis/socketApi';
import { useConfirm } from 'primevue/useconfirm';
import ClientInfoDialog from '../components/dialogs/ClientInfoDialog.vue';
import { useWebSocketStore } from '../stores/WebSocketStore';
import LoLEventSettings from './controller/LoLEventSettings.vue';

export interface ControllerPageState {
  showConnectionDialog: boolean;
  showClientInfoDialog: boolean;
  showLiveCompDialog: boolean;
  showClientNameDialog: boolean;
  newClientName: string;
}

const state = reactive<ControllerPageState>({
  showConnectionDialog: false,
  showClientInfoDialog: false,
  showLiveCompDialog: false,
  showClientNameDialog: false,
  newClientName: '',
});

const toast = useToast();
const confirm = useConfirm();

const wsStore = useWebSocketStore();

provide('parentToast', toast);
provide('parentConfirm', confirm);

// 监听 WebSocket 事件并显示 Toast
const setupToastHandlers = () => {
  const wsClient = wsStore.getWebSocketClient();
  if (!wsClient) return;

  wsClient.on('deviceConnected', () => {
    state.showConnectionDialog = false;
    handleClientConnected();
    toast.add({ severity: 'success', summary: '设备连接成功', detail: '已连接到设备', life: 3000 });
  });

  wsClient.on('deviceDisconnected', () => {
    toast.add({ severity: 'warn', summary: '设备已断开', detail: '设备连接已断开', life: 3000 });
  });

  wsClient.on('lolConnected', () => {
    toast.add({ severity: 'success', summary: 'LoL已连接', detail: '英雄联盟客户端已连接', life: 3000 });
  });

  wsClient.on('lolDisconnected', () => {
    toast.add({ severity: 'info', summary: 'LoL已断开', detail: '英雄联盟客户端已断开', life: 3000 });
  });

  wsClient.on('gameStarted', (playerName: string) => {
    toast.add({ severity: 'success', summary: '游戏开始', detail: `玩家: ${playerName}`, life: 3000 });
  });

  wsClient.on('gameEnded', () => {
    toast.add({ severity: 'info', summary: '游戏结束', life: 3000 });
  });

  wsClient.on('remoteNotification', (notification) => {
    if (notification.ignoreId && wsStore.isNotificationIgnored(notification.ignoreId)) {
      return;
    }

    toast.add({
      severity: (notification.severity as unknown as 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast' | undefined) || 'info',
      summary: notification.title || '站点通知',
      detail: {
        type: 'custom',
        ...notification,
      },
      life: notification.sticky ? undefined : 5000,
    });
  });
};

const formatGameTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const orderedPlayers = computed<LoLPlayerInfo[]>(() => wsStore.gameInfo?.players.filter(p => p.team === 'ORDER') || []);
const chaosPlayers = computed<LoLPlayerInfo[]>(() => wsStore.gameInfo?.players.filter(p => p.team === 'CHAOS') || []);

const handleClientConnected = () => {
  if (wsStore.clientId) {
    const clientInfo = wsStore.getClientInfo(wsStore.clientId);
    if (!clientInfo) {
      state.newClientName = new Date().toLocaleString() + ' 连接的设备';
      state.showClientNameDialog = true;
    } else {
      wsStore.updateClientConnectTime(wsStore.clientId);
    }
  }
};

const handleSaveClientConnect = async (clientName: string) => {
  wsStore.addClient(wsStore.clientId, clientName);
};

const showConnectionDialog = async () => {
  if (!wsStore.clientId) {
    try {
      await wsStore.getClientConnectInfo();
    } catch (error: any) {
      toast.add({ severity: 'error', summary: '获取客户端ID失败', detail: error.message });
      return;
    }
  }
  state.showConnectionDialog = true;
};

const handleStartLoL = async () => {
  if (!wsStore.deviceConnected) {
    toast.add({ severity: 'warn', summary: '未连接到设备', detail: '请先连接到设备', life: 5000 });
    return;
  }

  try {
    await wsStore.startLoL();
    toast.add({ severity: 'success', summary: 'LoL联动已启动', detail: '开始监听游戏事件', life: 3000 });
  } catch (error: any) {
    console.error('Cannot start LoL:', error);
    toast.add({ severity: 'error', summary: '启动LoL联动失败', detail: error.message });
  }
};

const handleStopLoL = async () => {
  try {
    await wsStore.stopLoL();
    toast.add({ severity: 'info', summary: 'LoL联动已停止', life: 3000 });
  } catch (error: any) {
    console.error('Cannot stop LoL:', error);
    toast.add({ severity: 'error', summary: '停止LoL联动失败', detail: error.message });
  }
};

const handleUpdateEventTriggers = async (triggers: LoLEventTriggerConfig[]) => {
  try {
    await wsStore.updateEventTriggers(triggers);
  } catch (error: any) {
    console.error('Cannot update event triggers:', error);
    toast.add({ severity: 'error', summary: '更新事件配置失败', detail: error.message });
  }
};

const handleSendCommand = async (commandId: number) => {
  if (!wsStore.deviceConnected) {
    toast.add({ severity: 'warn', summary: '未连接到设备', detail: '请先连接到设备', life: 5000 });
    return;
  }

  try {
    await wsStore.sendCommand(commandId);
    toast.add({ severity: 'success', summary: '指令已发送', detail: `已发送指令 ${commandId}`, life: 2000 });
  } catch (error: any) {
    console.error('Cannot send command:', error);
    toast.add({ severity: 'error', summary: '发送指令失败', detail: error.message });
  }
};

const handleYcyIMConnected = () => {
  state.showConnectionDialog = false;
  toast.add({ severity: 'success', summary: '连接成功', detail: '已通过役次元IM连接到设备', life: 3000 });

  if (wsStore.clientId) {
    wsStore.bindClient();
  }
};

onMounted(async () => {
  try {
    await wsStore.initialize();
    setupToastHandlers();
  } catch (error: any) {
    console.error('Failed to initialize:', error);
    toast.add({ severity: 'error', summary: '初始化失败', detail: error.message });
  }
});
</script>

<template>
  <div class="w-full page-container">
    <Toast>
      <template #container="{ message, closeCallback }">
        <CustomToastContent :message="message" :close-callback="closeCallback" />
      </template>
    </Toast>
    <ConfirmDialog></ConfirmDialog>

    <Card class="controller-panel w-full">
      <template #header>
        <div>
          <Toolbar class="controller-toolbar">
            <template #start>
              <Button icon="pi pi-link" class="mr-2" severity="secondary" label="连接设备"
                v-if="wsStore.clientStatus !== 'connected'" @click="showConnectionDialog()"></Button>
              <Button v-else icon="pi pi-info-circle" class="mr-4" severity="secondary" label="连接信息"
                @click="state.showClientInfoDialog = true"></Button>
              <span class="text-red-600 block flex items-center gap-1 mr-2" v-if="wsStore.clientStatus === 'init'">
                <i class="pi pi-circle-off"></i>
                <span>未连接</span>
              </span>
              <span class="text-green-600 block flex items-center gap-1 mr-2"
                v-else-if="wsStore.clientStatus === 'connected'">
                <i class="pi pi-circle-on"></i>
                <span>已连接</span>
              </span>
              <span class="text-yellow-600 block flex items-center gap-1 mr-2" v-else>
                <i class="pi pi-spin pi-spinner"></i>
                <span>等待连接</span>
              </span>
            </template>
            <template #end>
              <Button icon="pi pi-file-edit" class="mr-2" severity="secondary" label="查看日志"
                @click="$router.push('/logs')"></Button>
              <Button icon="pi pi-play" class="mr-2" severity="success" label="启动LoL联动" v-if="!wsStore.lolStarted"
                @click="handleStartLoL()"></Button>
              <Button icon="pi pi-stop" class="mr-2" severity="danger" label="停止联动" v-else
                @click="handleStopLoL()"></Button>
            </template>
          </Toolbar>
        </div>
      </template>

      <template #content>
        <LoLEventSettings
          :event-triggers="wsStore.eventTriggers"
          :lol-connected="wsStore.lolConnected"
          :in-game="wsStore.inGame"
          :player-name="wsStore.playerName"
          @update:event-triggers="handleUpdateEventTriggers"
          @send-command="handleSendCommand"
        />

        <div class="mt-5" v-if="wsStore.gameInfo">
          <Card>
            <template #title>对局信息</template>
            <template #content>
              <div class="flex flex-wrap gap-4 lol-game-meta">
                <div class="info-item">
                  <span class="label">玩家</span>
                  <span class="value">{{ wsStore.gameInfo.playerName }}（{{ wsStore.gameInfo.playerTeam === 'ORDER' ? '蓝' : '红' }}方）</span>
                </div>
                <div class="info-item">
                  <span class="label">地图</span>
                  <span class="value">{{ wsStore.gameInfo.gameData.mapName }} / {{ wsStore.gameInfo.gameData.mapTerrain }}</span>
                </div>
                <div class="info-item">
                  <span class="label">模式</span>
                  <span class="value">{{ wsStore.gameInfo.gameData.gameMode }}</span>
                </div>
                <div class="info-item">
                  <span class="label">时间</span>
                  <span class="value">{{ formatGameTime(wsStore.gameInfo.gameData.gameTime) }}</span>
                </div>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div class="team-column">
                  <h4 class="team-title text-blue-500">蓝色方</h4>
                  <div class="player-row" v-for="p in orderedPlayers" :key="p.riotId" :class="{ 'is-self': p.riotIdGameName === wsStore.gameInfo?.playerName || p.summonerName === wsStore.gameInfo?.playerName }">
                    <div class="player-name">{{ p.riotIdGameName || p.summonerName }}</div>
                    <div class="player-champ">{{ p.championName }}</div>
                    <div class="player-kda">{{ p.scores.kills }}/{{ p.scores.deaths }}/{{ p.scores.assists }}</div>
                    <div class="player-cs">CS {{ p.scores.creepScore }}</div>
                  </div>
                </div>
                <div class="team-column">
                  <h4 class="team-title text-red-500">红色方</h4>
                  <div class="player-row" v-for="p in chaosPlayers" :key="p.riotId" :class="{ 'is-self': p.riotIdGameName === wsStore.gameInfo?.playerName || p.summonerName === wsStore.gameInfo?.playerName }">
                    <div class="player-name">{{ p.riotIdGameName || p.summonerName }}</div>
                    <div class="player-champ">{{ p.championName }}</div>
                    <div class="player-kda">{{ p.scores.kills }}/{{ p.scores.deaths }}/{{ p.scores.assists }}</div>
                    <div class="player-cs">CS {{ p.scores.creepScore }}</div>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </template>
    </Card>

    <ConnectToClientDialog v-model:visible="state.showConnectionDialog"
      :client-id="wsStore.clientId"
      @ycyim-connected="handleYcyIMConnected" />
    <ClientInfoDialog v-model:visible="state.showClientInfoDialog" :client-id="wsStore.clientId"
      :controller-url="wsStore.apiBaseHttpUrl" />
    <GetLiveCompDialog v-model:visible="state.showLiveCompDialog" :client-id="wsStore.clientId" />
    <PromptDialog v-model:visible="state.showClientNameDialog" title="保存客户端" message="将此设备保存到本地，以便于下次连接。"
      input-label="客户端备注名" :default-value="state.newClientName" :allow-empty="false"
      @confirm="handleSaveClientConnect" />
  </div>
</template>

<style lang="scss">
$container-max-widths: (
  md: 768px,
  lg: 960px,
  xl: 1100px,
);

body {
  background: #eff0f0;
}

@media (prefers-color-scheme: dark) {
  body {
    background: #000;
  }
}

.page-container {
  margin-top: 2rem;
  margin-bottom: 6rem;
  margin-left: auto;
  margin-right: auto;
  padding: 0 1rem;
  width: 100%;
}

@media (min-width: 768px) {
  .page-container {
    max-width: map-get($container-max-widths, lg);
  }
}

@media (min-width: 1024px) {
  .page-container {
    max-width: map-get($container-max-widths, xl);
  }
}

.controller-panel {
  background: #fcfcfc;
  border-radius: 0.8rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .input-small {
    height: 32px;
    --p-inputtext-padding-y: 0.25rem;
  }

  .input-text-center input {
    text-align: center;
  }
}

.lol-game-meta .info-item {
  min-width: 160px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lol-game-meta .label {
  font-size: 12px;
  color: #6b7280;
}

.lol-game-meta .value {
  font-weight: 600;
}

.team-column {
  background: #f9fafb;
  border-radius: 8px;
  padding: 10px;
  border: 1px solid #e5e7eb;
}

.team-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.player-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 0.8fr 0.7fr;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid #e5e7eb;
  margin-bottom: 6px;
}

.player-row.is-self {
  border-color: #6366f1;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.25);
}

.player-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-champ {
  color: #374151;
}

.player-kda {
  font-variant-numeric: tabular-nums;
}

.player-cs {
  font-size: 13px;
  color: #6b7280;
}

.controller-toolbar {
  --p-toolbar-border-radius: 0;
  border: none !important;
  border-bottom: 1px solid var(--p-content-border-color) !important;
}

@media (prefers-color-scheme: dark) {
  .controller-panel {
    background: #121212;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  }
}
</style>
