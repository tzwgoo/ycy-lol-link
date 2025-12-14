const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getVersion: () => process.env.npm_package_version,
  getPlatform: () => process.platform,
  
  // 应用控制
  quit: () => ipcRenderer.invoke('quit'),
  minimize: () => ipcRenderer.invoke('minimize'),
  maximize: () => ipcRenderer.invoke('maximize'),
  
  // 开发者工具
  openDevTools: () => ipcRenderer.invoke('openDevTools'),
  
  // 事件监听
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
});