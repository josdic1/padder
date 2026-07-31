import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("f1pad", {
  getNote: () => ipcRenderer.invoke("note:get"),
  setNote: (value: string) => ipcRenderer.invoke("note:set", value),

  getPinned: () => ipcRenderer.invoke("pin:get"),
  setPinned: (pinned: boolean) => ipcRenderer.invoke("pin:set", pinned),

  createTear: (body: string) => ipcRenderer.invoke("tear:create", body),

  renameTear: (id: string, title: string) =>
    ipcRenderer.invoke("tear:rename", id, title),

  downloadTear: (id: string) => ipcRenderer.invoke("tear:download", id),

  getTearMatches: (currentText: string) =>
    ipcRenderer.invoke("tear:matches", currentText),
});
