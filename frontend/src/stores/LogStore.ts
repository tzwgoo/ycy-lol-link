import { defineStore } from 'pinia';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

export const useLogStore = defineStore('logs', {
  state: () => ({
    logs: [] as LogEntry[],
    maxLogs: 500,
  }),

  actions: {
    addLog(level: LogEntry['level'], message: string, source?: string) {
      const log: LogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        level,
        message,
        source,
      };

      this.logs.push(log);

      // 限制日志数量
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
    },

    clearLogs() {
      this.logs = [];
    },
  },
});
