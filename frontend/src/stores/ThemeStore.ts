import { defineStore } from 'pinia';

export type ThemeMode = 'light' | 'dark';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: 'dark' as ThemeMode,
  }),
  actions: {
    setTheme(mode: ThemeMode) {
      this.mode = mode;
      this.applyTheme();
    },
    toggleTheme() {
      this.mode = this.mode === 'light' ? 'dark' : 'light';
      this.applyTheme();
    },
    applyTheme() {
      const root = document.documentElement;
      if (this.mode === 'dark') {
        root.classList.add('p-dark');
      } else {
        root.classList.remove('p-dark');
      }
    },
    initTheme() {
      // 如果没有保存的偏好，检测系统偏好
      if (!this.mode) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.mode = prefersDark ? 'dark' : 'light';
      }
      this.applyTheme();
    },
  },
  persist: true,
});
