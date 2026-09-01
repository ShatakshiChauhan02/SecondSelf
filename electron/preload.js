const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('secondselfDesktop', {
  isElectron: true,
  toggleCompact: (isCompact) => ipcRenderer.send('desktop-set-compact', isCompact),
  minimizeWindow: () => ipcRenderer.send('desktop-minimize'),
  closeToTray: () => ipcRenderer.send('desktop-close-to-tray'),
  quitApp: () => ipcRenderer.send('desktop-quit'),
  captureScreen: () => ipcRenderer.invoke('desktop-capture-screen'),
  onHotkeyTriggered: (callback) => {
    ipcRenderer.on('desktop-hotkey-triggered', () => callback());
  }
});
