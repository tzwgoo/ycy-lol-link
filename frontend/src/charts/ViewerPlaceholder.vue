<template>
  <div class="viewer-placeholder">
    <div class="viewer-placeholder__card">
      <h1>Viewer Placeholder</h1>
      <p>图表路由尚未配置，当前入口已恢复为可构建状态。</p>
    </div>
  </div>
</template>

<style scoped>
.viewer-placeholder {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(180deg, #0f172a, #111827);
}

.viewer-placeholder__card {
  width: min(520px, 100%);
  padding: 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  color: #111827;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.viewer-placeholder__card h1 {
  margin: 0 0 12px;
  font-size: 24px;
}

.viewer-placeholder__card p {
  margin: 0;
  line-height: 1.6;
}
</style>
