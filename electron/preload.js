const {
  contextBridge,
  ipcRenderer
} = require("electron");


contextBridge.exposeInMainWorld(
  "secondselfDesktop",
  {

    // ========================================================
    // STATUS
    // ========================================================

    isElectron: true,


    // ========================================================
    // WINDOW CONTROLS
    // ========================================================

    toggleCompact: (isCompact) =>
      ipcRenderer.send(
        "desktop-set-compact",
        isCompact
      ),


    minimizeWindow: () =>
      ipcRenderer.send(
        "desktop-minimize"
      ),


    closeToTray: () =>
      ipcRenderer.send(
        "desktop-close-to-tray"
      ),


    quitApp: () =>
      ipcRenderer.send(
        "desktop-quit"
      ),


    showPopup: () =>
      ipcRenderer.send(
        "desktop-show-popup"
      ),


    hidePopup: () =>
      ipcRenderer.send(
        "desktop-hide-popup"
      ),


    // ========================================================
    // BROWSER
    // ========================================================

    openBrowser: (url) =>
      ipcRenderer.invoke(
        "open-browser",
        url
      ),


    // ========================================================
    // WINDOWS PAINT
    // ========================================================

    openPaint: () =>
      ipcRenderer.invoke(
        "open-paint"
      ),


    // ========================================================
    // SCREEN CAPTURE
    // ========================================================

    captureScreen: () =>
      ipcRenderer.invoke(
        "desktop-capture-screen"
      ),


    // ========================================================
    // GLOBAL HOTKEY
    // ========================================================

    onHotkeyTriggered: (callback) => {

      const handler = () =>
        callback();


      ipcRenderer.on(
        "desktop-hotkey-triggered",
        handler
      );


      // Return cleanup function
      return () => {

        ipcRenderer.removeListener(
          "desktop-hotkey-triggered",
          handler
        );

      };

    }

  }
);