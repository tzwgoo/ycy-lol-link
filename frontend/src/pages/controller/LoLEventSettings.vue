<script lang="ts" setup>
import { LoLGameEventType, LoLEventNames, LoLEventTriggerConfig } from '../../apis/socketApi';

defineOptions({
  name: 'LoLEventSettings',
});

const props = defineProps<{
  eventTriggers: LoLEventTriggerConfig[];
  lolConnected: boolean;
  inGame: boolean;
  playerName: string;
}>();

const emit = defineEmits<{
  (e: 'update:eventTriggers', triggers: LoLEventTriggerConfig[]): void;
  (e: 'sendCommand', commandId: number): void;
}>();

// 指令选项
const commandOptions = [
  { label: '指令 0', value: 0 },
  { label: '指令 1', value: 1 },
  { label: '指令 2', value: 2 },
  { label: '指令 3', value: 3 },
  { label: '指令 4', value: 4 },
  { label: '指令 5', value: 5 },
  { label: '指令 6', value: 6 },
];

// 更新单个事件配置
const updateTrigger = (eventType: LoLGameEventType, field: 'enabled' | 'commandId', value: boolean | number) => {
  const newTriggers = props.eventTriggers.map(trigger => {
    if (trigger.eventType === eventType) {
      return { ...trigger, [field]: value };
    }
    return trigger;
  });
  emit('update:eventTriggers', newTriggers);
};

// 手动触发指令
const manualSendCommand = (commandId: number) => {
  emit('sendCommand', commandId);
};
</script>

<template>
  <div class="lol-event-settings">
    <!-- 连接状态 -->
    <div class="flex flex-col justify-between gap-2 mb-4 items-start md:flex-row md:items-center">
      <h2 class="font-bold text-xl">英雄联盟事件配置</h2>
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-1" :class="lolConnected ? 'text-green-600' : 'text-gray-400'">
          <i :class="lolConnected ? 'pi pi-circle-on' : 'pi pi-circle-off'"></i>
          <span>{{ lolConnected ? 'LoL已连接' : 'LoL未连接' }}</span>
        </span>
        <span class="flex items-center gap-1" :class="inGame ? 'text-green-600' : 'text-gray-400'">
          <i :class="inGame ? 'pi pi-play' : 'pi pi-pause'"></i>
          <span>{{ inGame ? '游戏中' : '未在游戏中' }}</span>
        </span>
      </div>
    </div>

    <!-- 当前玩家信息 -->
    <div v-if="playerName" class="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg flex items-center gap-2">
      <i class="pi pi-user text-blue-600 dark:text-blue-300"></i>
      <span class="text-blue-800 dark:text-blue-200">当前玩家: <strong>{{ playerName }}</strong></span>
    </div>

    <!-- 事件配置列表 -->
    <div class="event-list">
      <DataTable :value="eventTriggers" class="p-datatable-sm" stripedRows>
        <Column field="eventType" header="游戏事件" style="width: 200px">
          <template #body="{ data }">
            <span class="font-medium">{{ LoLEventNames[data.eventType as LoLGameEventType] }}</span>
          </template>
        </Column>
        <Column field="enabled" header="启用" style="width: 80px">
          <template #body="{ data }">
            <Checkbox
              :modelValue="data.enabled"
              @update:modelValue="(val: boolean) => updateTrigger(data.eventType, 'enabled', val)"
              :binary="true"
            />
          </template>
        </Column>
        <Column field="commandId" header="触发指令" style="width: 150px">
          <template #body="{ data }">
            <Dropdown
              :modelValue="data.commandId"
              @update:modelValue="(val: number) => updateTrigger(data.eventType, 'commandId', val)"
              :options="commandOptions"
              optionLabel="label"
              optionValue="value"
              :disabled="!data.enabled"
              class="w-full"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- 手动发送指令区域 -->
    <div class="mt-6">
      <h3 class="font-bold text-lg mb-3">手动发送指令</h3>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="cmd in commandOptions"
          :key="cmd.value"
          :label="cmd.label"
          severity="secondary"
          size="small"
          @click="manualSendCommand(cmd.value)"
        />
      </div>
    </div>

    <!-- 说明 -->
    <div class="mt-6 text-sm text-gray-500">
      <h4 class="font-semibold mb-2">说明</h4>
      <ul class="list-disc list-inside space-y-1">
        <li>启用对应事件后，当游戏中发生该事件时会自动发送配置的指令</li>
        <li>需要先启动英雄联盟游戏客户端，并进入游戏后才能检测到游戏事件</li>
        <li>可以通过手动发送指令测试设备是否正常工作</li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.lol-event-settings {
  padding: 1rem;
}

.event-list {
  background: var(--p-surface-ground);
  border-radius: 0.5rem;
  overflow: hidden;
}
</style>
