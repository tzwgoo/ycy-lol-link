<script lang="ts" setup>
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import { useWebSocketStore } from '../stores/WebSocketStore';
import { useLogStore, type LogEntry } from '../stores/LogStore';

defineOptions({
  name: 'LogsPage',
});

const state = reactive({
  filterLevel: 'all' as 'all' | 'info' | 'warn' | 'error' | 'debug',
  searchQuery: '',
  autoScroll: true,
});

const toast = useToast();
const wsStore = useWebSocketStore();
const logStore = useLogStore();
const logsContainer = ref<HTMLElement | null>(null);

const levelOptions = [
  { label: '全部', value: 'all' },
  { label: '信息', value: 'info' },
  { label: '警告', value: 'warn' },
  { label: '错误', value: 'error' },
  { label: '调试', value: 'debug' },
];

const filteredLogs = computed(() => {
  let filtered = logStore.logs;

  // 按级别过滤
  if (state.filterLevel !== 'all') {
    filtered = filtered.filter(log => log.level === state.filterLevel);
  }

  // 按搜索关键词过滤
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(log =>
      log.message.toLowerCase().includes(query) ||
      log.source?.toLowerCase().includes(query)
    );
  }

  return filtered;
});

// 监听日志变化，自动滚动
watch(() => logStore.logs.length, () => {
  if (state.autoScroll) {
    nextTick(() => {
      scrollToBottom();
    });
  }
});

const scrollToBottom = () => {
  if (logsContainer.value) {
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
  }
};

const clearLogs = () => {
  logStore.clearLogs();
  toast.add({ severity: 'info', summary: '日志已清空', life: 2000 });
};

const exportLogs = () => {
  const logsText = logStore.logs.map(log => {
    const time = formatTime(log.timestamp);
    const source = log.source ? `[${log.source}]` : '';
    return `${time} [${log.level.toUpperCase()}] ${source} ${log.message}`;
  }).join('\n');

  const blob = new Blob([logsText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  a.click();
  URL.revokeObjectURL(url);

  toast.add({ severity: 'success', summary: '日志已导出', life: 2000 });
};

const logStats = computed(() => {
  const stats = {
    info: 0,
    warn: 0,
    error: 0,
    debug: 0,
  };

  logStore.logs.forEach(log => {
    stats[log.level]++;
  });

  return stats;
});

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
};

const getLevelClass = (level: LogEntry['level']) => {
  switch (level) {
    case 'info':
      return 'log-info';
    case 'warn':
      return 'log-warn';
    case 'error':
      return 'log-error';
    case 'debug':
      return 'log-debug';
    default:
      return '';
  }
};

const getLevelIcon = (level: LogEntry['level']) => {
  switch (level) {
    case 'info':
      return 'pi pi-info-circle';
    case 'warn':
      return 'pi pi-exclamation-triangle';
    case 'error':
      return 'pi pi-times-circle';
    case 'debug':
      return 'pi pi-code';
    default:
      return 'pi pi-circle';
  }
};

onMounted(async () => {
  // 使用全局 WebSocket Store
  if (!wsStore.connected) {
    try {
      await wsStore.initialize();
    } catch (error: any) {
      console.error('Failed to initialize WebSocket:', error);
      toast.add({ severity: 'error', summary: '初始化失败', detail: error.message });
    }
  }

  // 添加欢迎日志
  logStore.addLog('info', '日志系统已启动', 'System');

  // 显示当前连接状态
  if (wsStore.connected) {
    logStore.addLog('info', 'WebSocket 已连接', 'System');
  }
  if (wsStore.deviceConnected) {
    logStore.addLog('info', '设备已连接', 'System');
  }
  if (wsStore.lolConnected) {
    logStore.addLog('info', 'LoL 客户端已连接', 'System');
  }
});
</script>

<template>
  <div class="w-full page-container">
    <Toast />

    <Card class="logs-panel w-full">
      <template #header>
        <div>
          <Toolbar class="logs-toolbar">
            <template #start>
              <Button
                icon="pi pi-arrow-left"
                severity="secondary"
                label="返回"
                class="mr-4"
                @click="$router.push('/')"
              />
              <h2 class="font-bold text-xl mr-4">系统日志</h2>
              <SelectButton
                v-model="state.filterLevel"
                :options="levelOptions"
                optionLabel="label"
                optionValue="value"
                class="mr-2"
              />
            </template>
            <template #end>
              <div class="flex items-center gap-2">
                <Checkbox
                  v-model="state.autoScroll"
                  :binary="true"
                  inputId="autoScroll"
                />
                <label for="autoScroll" class="mr-2">自动滚动</label>
                <Button
                  icon="pi pi-download"
                  severity="secondary"
                  label="导出"
                  class="mr-2"
                  @click="exportLogs"
                />
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  label="清空"
                  @click="clearLogs"
                />
              </div>
            </template>
          </Toolbar>
        </div>
      </template>

      <template #content>
        <div class="mb-4">
          <InputGroup>
            <InputGroupAddon>
              <i class="pi pi-search"></i>
            </InputGroupAddon>
            <InputText
              v-model="state.searchQuery"
              placeholder="搜索日志..."
              class="w-full"
            />
          </InputGroup>
        </div>

        <div class="logs-container" ref="logsContainer">
          <div
            v-for="log in filteredLogs"
            :key="log.id"
            class="log-entry"
            :class="getLevelClass(log.level)"
          >
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <i :class="getLevelIcon(log.level)" class="log-icon"></i>
            <span v-if="log.source" class="log-source">[{{ log.source }}]</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div v-if="filteredLogs.length === 0" class="no-logs">
            <i class="pi pi-inbox text-4xl text-gray-400 mb-2"></i>
            <p class="text-gray-500">暂无日志</p>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between text-sm">
          <div class="text-gray-500">
            <p>共 {{ logStore.logs.length }} 条日志 (显示 {{ filteredLogs.length }} 条)</p>
          </div>
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1">
              <i class="pi pi-info-circle text-green-600"></i>
              <span class="text-gray-600">{{ logStats.info }}</span>
            </span>
            <span class="flex items-center gap-1">
              <i class="pi pi-exclamation-triangle text-yellow-600"></i>
              <span class="text-gray-600">{{ logStats.warn }}</span>
            </span>
            <span class="flex items-center gap-1">
              <i class="pi pi-times-circle text-red-600"></i>
              <span class="text-gray-600">{{ logStats.error }}</span>
            </span>
            <span class="flex items-center gap-1">
              <i class="pi pi-code text-gray-500"></i>
              <span class="text-gray-600">{{ logStats.debug }}</span>
            </span>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<style lang="scss" scoped>
$container-max-widths: (
  md: 768px,
  lg: 960px,
  xl: 1100px,
);

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

.logs-panel {
  background: #fcfcfc;
  border-radius: 0.8rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.logs-toolbar {
  --p-toolbar-border-radius: 0;
  border: none !important;
  border-bottom: 1px solid var(--p-content-border-color) !important;
}

.logs-container {
  background: #1e1e1e;
  border-radius: 0.5rem;
  padding: 1rem;
  height: 600px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
}

.log-time {
  color: #858585;
  flex-shrink: 0;
  min-width: 90px;
}

.log-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.log-source {
  color: #569cd6;
  flex-shrink: 0;
  font-weight: 600;
}

.log-message {
  color: #d4d4d4;
  word-break: break-word;
}

.log-info {
  .log-icon {
    color: #4ec9b0;
  }
}

.log-warn {
  .log-icon {
    color: #dcdcaa;
  }
  .log-message {
    color: #dcdcaa;
  }
}

.log-error {
  .log-icon {
    color: #f48771;
  }
  .log-message {
    color: #f48771;
  }
}

.log-debug {
  .log-icon {
    color: #858585;
  }
  .log-message {
    color: #858585;
  }
}

.no-logs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #858585;
}

@media (prefers-color-scheme: dark) {
  .logs-panel {
    background: #121212;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  }
}
</style>
