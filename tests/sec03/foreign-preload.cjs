const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("sec03Probe", {
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
});
