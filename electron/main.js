const {
  app,
  BrowserWindow,
  globalShortcut,
  Tray,
  Menu,
  ipcMain,
  desktopCapturer,
  screen
} = require("electron");

const path = require("path");
const fs = require("fs");
const { spawn, execSync } = require("child_process");

let popupWindow = null;
let tray = null;
let backendProcess = null;

const PORT_BACKEND = 8000;
const PORT_FRONTEND = 5173;


// ============================================================
// BACKEND PATH
// ============================================================

function getBackendPaths() {

  const isPackaged =
    app.isPackaged ||
    __dirname.includes("app.asar");

  if (isPackaged) {

    const backendDir =
      path.join(
        process.resourcesPath,
        "backend"
      );

    const pythonExec =
      process.platform === "win32"
        ? path.join(
            backendDir,
            "venv",
            "Scripts",
            "python.exe"
          )
        : path.join(
            backendDir,
            "venv",
            "bin",
            "python"
          );

    return {
      backendDir,
      pythonExec,
      isPackaged
    };
  }

  const rootDir =
    path.resolve(
      __dirname,
      ".."
    );

  const backendDir =
    path.join(
      rootDir,
      "backend"
    );

  const pythonExec =
    process.platform === "win32"
      ? path.join(
          backendDir,
          "venv",
          "Scripts",
          "python.exe"
        )
      : path.join(
          backendDir,
          "venv",
          "bin",
          "python"
        );

  return {
    backendDir,
    pythonExec,
    isPackaged
  };
}


// ============================================================
// START BACKEND
// ============================================================

function startBackend() {

  const {
    backendDir,
    pythonExec,
    isPackaged
  } =
    getBackendPaths();

  console.log(
    `[SecondSelf] ${
      isPackaged
        ? "Packaged"
        : "Development"
    } mode`
  );

  console.log(
    `[SecondSelf] Backend: ${backendDir}`
  );

  console.log(
    `[SecondSelf] Python: ${pythonExec}`
  );

  let executable =
    pythonExec;

  if (
    !fs.existsSync(
      pythonExec
    )
  ) {

    console.warn(
      "[SecondSelf] Virtual environment Python not found. Using system Python."
    );

    executable =
      "python";
  }

  const userData =
    app.getPath(
      "userData"
    );

  const dataDir =
    path.join(
      userData,
      "data"
    );

  if (
    !fs.existsSync(
      dataDir
    )
  ) {

    fs.mkdirSync(
      dataDir,
      {
        recursive: true
      }
    );
  }

  try {

    backendProcess =
      spawn(
        executable,
        [
          "-m",
          "uvicorn",
          "app.main:app",
          "--host",
          "127.0.0.1",
          "--port",
          String(
            PORT_BACKEND
          )
        ],
        {
          cwd:
            backendDir,

          env: {
            ...process.env,

            PYTHONUNBUFFERED:
              "1",

            PYTHONPATH:
              backendDir,

            SECONDSELF_DATA_DIR:
              dataDir
          },

          windowsHide:
            true
        }
      );

    backendProcess.stdout.on(
      "data",
      data => {

        console.log(
          `[FastAPI] ${data
            .toString()
            .trim()}`
        );

      }
    );

    backendProcess.stderr.on(
      "data",
      data => {

        console.error(
          `[FastAPI] ${data
            .toString()
            .trim()}`
        );

      }
    );

    backendProcess.on(
      "error",
      error => {

        console.error(
          "[SecondSelf] Backend error:",
          error
        );

      }
    );

    backendProcess.on(
      "close",
      code => {

        console.log(
          `[SecondSelf] Backend exited with code ${code}`
        );

      }
    );

  } catch (error) {

    console.error(
      "[SecondSelf] Could not start backend:",
      error
    );

  }
}


// ============================================================
// STOP BACKEND
// ============================================================

function stopBackend() {

  if (
    !backendProcess
  ) {
    return;
  }

  try {

    if (
      process.platform === "win32"
    ) {

      execSync(
        `taskkill /pid ${backendProcess.pid} /T /F`
      );

    } else {

      backendProcess.kill(
        "SIGTERM"
      );

    }

  } catch {

    // Already stopped.

  }

  backendProcess =
    null;
}


// ============================================================
// FRONTEND URL
// ============================================================

function getFrontendURL() {

  const isPackaged =
    app.isPackaged ||
    __dirname.includes("app.asar");

  if (
    !isPackaged
  ) {

    return (
      `http://127.0.0.1:${PORT_FRONTEND}/?view=popup`
    );

  }

  return null;
}


// ============================================================
// CREATE SECONDSELF POPUP
// ============================================================

function createPopupWindow() {

  if (
    popupWindow
  ) {

    popupWindow.show();

    popupWindow.focus();

    return;

  }

  const display =
    screen.getPrimaryDisplay();

  const {
    width
  } =
    display.workAreaSize;


  // ----------------------------------------------------------
  // POPUP DIMENSIONS
  // ----------------------------------------------------------

  const popupWidth =
    620;

  const popupHeight =
    760;


  // ----------------------------------------------------------
  // TOP CENTRE
  // ----------------------------------------------------------

  const popupX =
    Math.round(
      (width - popupWidth) / 2
    );

  const popupY =
    0;


  // ----------------------------------------------------------
  // ELECTRON WINDOW
  // ----------------------------------------------------------

  popupWindow =
    new BrowserWindow({

      x:
        popupX,

      y:
        popupY,

      width:
        popupWidth,

      height:
        popupHeight,

      minWidth:
        520,

      minHeight:
        600,

      maxWidth:
        720,

      maxHeight:
        850,

      frame:
        false,

      transparent:
        true,

      backgroundColor:
        "#00000000",

      hasShadow:
        false,

      resizable:
        true,

      movable:
        true,

      minimizable:
        true,

      maximizable:
        false,

      fullscreen:
        false,

      fullscreenable:
        false,

      skipTaskbar:
        true,

      // IMPORTANT:
      // DO NOT use alwaysOnTop.
      //
      // This allows Notepad, Calculator,
      // Chrome, VS Code, etc. to appear
      // ABOVE SecondSelf.

      alwaysOnTop:
        false,

      focusable:
        true,

      webPreferences: {

        preload:
          path.join(
            __dirname,
            "preload.js"
          ),

        nodeIntegration:
          false,

        contextIsolation:
          true,

        sandbox:
          false

      }

    });


  // ----------------------------------------------------------
  // NO alwaysOnTop
  // ----------------------------------------------------------
  //
  // DO NOT ADD:
  //
  // popupWindow.setAlwaysOnTop(true)
  //
  // DO NOT ADD:
  //
  // popupWindow.moveTop()
  //
  // ----------------------------------------------------------


  popupWindow.setMenuBarVisibility(
    false
  );

  popupWindow.setAutoHideMenuBar(
    true
  );


  // ==========================================================
  // LOAD FRONTEND
  // ==========================================================

  const devURL =
    getFrontendURL();

  if (
    devURL
  ) {

    console.log(
      `[SecondSelf] Loading popup: ${devURL}`
    );

    popupWindow.loadURL(
      devURL
    );

  } else {

    const indexPath =
      path.join(
        __dirname,
        "..",
        "frontend",
        "dist",
        "index.html"
      );

    console.log(
      `[SecondSelf] Loading packaged frontend: ${indexPath}`
    );

    popupWindow.loadFile(
      indexPath,
      {
        query: {
          view:
            "popup"
        }
      }
    );

  }


  // ==========================================================
  // RENDERER ERROR
  // ==========================================================

  popupWindow.webContents.on(
    "did-fail-load",
    (
      event,
      errorCode,
      errorDescription,
      validatedURL
    ) => {

      console.error(
        `[SecondSelf Renderer] Failed to load: ${errorCode}`
      );

      console.error(
        errorDescription
      );

      console.error(
        validatedURL
      );

    }
  );


  // ==========================================================
  // RENDERER CONSOLE
  // ==========================================================

  popupWindow.webContents.on(
    "console-message",
    (
      event,
      level,
      message,
      line,
      sourceId
    ) => {

      console.log(
        `[SecondSelf Renderer] ${message}`
      );

    }
  );


  // ==========================================================
  // SHOW
  // ==========================================================

  popupWindow.once(
    "ready-to-show",
    () => {

      if (
        popupWindow
      ) {

        popupWindow.show();

        popupWindow.focus();

      }

    }
  );


  // ==========================================================
  // CLOSED
  // ==========================================================

  popupWindow.on(
    "closed",
    () => {

      popupWindow =
        null;

    }
  );

}


// ============================================================
// SHOW POPUP
// ============================================================

function showPopup() {

  if (
    !popupWindow
  ) {

    createPopupWindow();

    return;

  }

  if (
    popupWindow.isMinimized()
  ) {

    popupWindow.restore();

  }

  popupWindow.show();

  popupWindow.focus();

}


// ============================================================
// HIDE POPUP
// ============================================================

function hidePopup() {

  if (
    popupWindow
  ) {

    popupWindow.hide();

  }

}


// ============================================================
// TRAY
// ============================================================

function createTray() {

  const isPackaged =
    app.isPackaged ||
    __dirname.includes("app.asar");

  let iconPath =
    path.join(
      __dirname,
      "..",
      "frontend",
      "public",
      "favicon.ico"
    );

  if (
    isPackaged ||
    !fs.existsSync(
      iconPath
    )
  ) {

    iconPath =
      path.join(
        __dirname,
        "..",
        "frontend",
        "dist",
        "favicon.ico"
      );

  }

  if (
    !fs.existsSync(
      iconPath
    )
  ) {

    console.warn(
      "[SecondSelf] No tray icon found."
    );

    return;

  }

  try {

    tray =
      new Tray(
        iconPath
      );

  } catch (error) {

    console.error(
      "[SecondSelf] Tray creation failed:",
      error
    );

    return;

  }


  const contextMenu =
    Menu.buildFromTemplate([

      {
        label:
          "SecondSelf",

        enabled:
          false

      },

      {
        type:
          "separator"
      },

      {
        label:
          "Show SecondSelf",

        click:
          showPopup
      },

      {
        label:
          "Hide SecondSelf",

        click:
          hidePopup
      },

      {
        type:
          "separator"
      },

      {
        label:
          "Quit",

        click: () => {

          stopBackend();

          app.quit();

        }

      }

    ]);


  tray.setToolTip(
    "SecondSelf — Digital Twin"
  );

  tray.setContextMenu(
    contextMenu
  );

  tray.on(
    "double-click",
    showPopup
  );

}


// ============================================================
// GLOBAL HOTKEY
// CTRL + SHIFT + SPACE
// ============================================================

function registerGlobalHotkey() {

  const registered =
    globalShortcut.register(
      "CommandOrControl+Shift+Space",
      () => {

        showPopup();

      }
    );

  if (
    !registered
  ) {

    console.warn(
      "[SecondSelf] Hotkey registration failed."
    );

  } else {

    console.log(
      "[SecondSelf] Ctrl + Shift + Space registered."
    );

  }

}


// ============================================================
// IPC
// ============================================================

ipcMain.on(
  "desktop-minimize",
  () => {

    if (
      popupWindow
    ) {

      popupWindow.minimize();

    }

  }
);


ipcMain.on(
  "desktop-close-to-tray",
  () => {

    hidePopup();

  }
);


ipcMain.on(
  "desktop-show-popup",
  () => {

    showPopup();

  }
);


ipcMain.on(
  "desktop-hide-popup",
  () => {

    hidePopup();

  }
);


ipcMain.on(
  "desktop-quit",
  () => {

    stopBackend();

    app.quit();

  }
);


// ============================================================
// SCREEN CAPTURE
// ============================================================

ipcMain.handle(
  "desktop-capture-screen",
  async () => {

    try {

      const sources =
        await desktopCapturer.getSources({

          types: [
            "screen"
          ],

          thumbnailSize: {
            width:
              1920,

            height:
              1080
          }

        });

      if (
        sources.length > 0
      ) {

        return (
          sources[0]
            .thumbnail
            .toDataURL()
        );

      }

    } catch (error) {

      console.error(
        "[SecondSelf] Screen capture error:",
        error
      );

    }

    return null;

  }
);


// ============================================================
// APP READY
// ============================================================

app.whenReady().then(
  () => {

    console.log(
      "[SecondSelf] Electron ready."
    );

    startBackend();

    // ONLY THE POPUP.
    // NO FULLSCREEN WINDOW.
    createPopupWindow();

    createTray();

    registerGlobalHotkey();


    app.on(
      "activate",
      () => {

        showPopup();

      }
    );

  }
);


// ============================================================
// QUIT
// ============================================================

app.on(
  "will-quit",
  () => {

    globalShortcut.unregisterAll();

    stopBackend();

  }
);


app.on(
  "window-all-closed",
  () => {

    if (
      process.platform !== "darwin"
    ) {

      stopBackend();

      app.quit();

    }

  }
);