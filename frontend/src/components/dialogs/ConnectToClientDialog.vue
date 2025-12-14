<script lang="ts" setup>
import { reactive } from 'vue';
import { webApi } from '../../apis/webApi';

defineOptions({
  name: 'ConnectToClientDialog',
});

const props = defineProps<{
  clientId?: string;
}>();

const visible = defineModel<boolean>('visible');

const emit = defineEmits<{
  (name: 'ycyimConnected'): void;
}>();

const state = reactive({
  ycyimUid: '',
  ycyimToken: '',
  ycyimConnecting: false,
  ycyimError: '',
});

const handleYcyIMConnect = async () => {
  if (!state.ycyimUid || !state.ycyimToken) {
    state.ycyimError = '请输入uid和token';
    return;
  }

  if (!props.clientId) {
    state.ycyimError = '客户端ID未初始化';
    return;
  }

  state.ycyimConnecting = true;
  state.ycyimError = '';

  try {
    const res = await webApi.connectViaYcyIM({
      clientId: props.clientId,
      uid: state.ycyimUid,
      token: state.ycyimToken,
    });

    if (res && res.status === 1) {
      emit('ycyimConnected');
      visible.value = false;
    } else {
      state.ycyimError = res?.message || '连接失败';
    }
  } catch (error: any) {
    state.ycyimError = error.message || '连接失败';
  } finally {
    state.ycyimConnecting = false;
  }
};
</script>

<template>
  <Dialog v-model:visible="visible" modal header="连接设备" class="mx-4 w-full md:w-[30rem]">
    <div class="w-full flex flex-col items-top gap-4">
      <Message severity="info" class="m-1">
        <p>通过役次元APP连接到设备。</p>
        <p>请在役次元APP中启动游戏后，将uid和token填入下方。</p>
      </Message>
      <div class="flex flex-col gap-2">
        <label class="font-semibold">用户ID (uid)</label>
        <InputText v-model="state.ycyimUid" placeholder="请输入uid" />
      </div>
      <div class="flex flex-col gap-2">
        <label class="font-semibold">认证Token</label>
        <InputText v-model="state.ycyimToken" placeholder="请输入token" type="password" />
      </div>
      <Message v-if="state.ycyimError" severity="error" class="m-1">
        {{ state.ycyimError }}
      </Message>
      <div class="flex gap-2">
        <Button
          :label="state.ycyimConnecting ? '连接中...' : '连接'"
          :icon="state.ycyimConnecting ? 'pi pi-spinner pi-spin' : 'pi pi-link'"
          :disabled="state.ycyimConnecting"
          class="flex-1"
          @click="handleYcyIMConnect"
        />
      </div>
    </div>
  </Dialog>
</template>

<style scoped></style>
