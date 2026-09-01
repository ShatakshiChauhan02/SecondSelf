const {
  app,
  BrowserWindow,
  globalShortcut,
  Tray,
  Menu,
  ipcMain,
  desktopCapturer,
  screen,
  shell,
  session
} = require("electron");

const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn, execSync } = require("child_process");

let mainWindow = null;
let tray = null;
let backendProcess = null;
let desktopServer = null;

let isQuitting = false;
let computerControlAuthorized = false;

const BACKEND_PORT = 8000;
const FRONTEND_PORT = 5173;
const DESKTOP_PORT = 8765;


/* ============================================================
   SINGLE INSTANCE
   ============================================================ */

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showPopup();
  });
}


/* ============================================================
   BACKEND
   ============================================================ */

function getBackendPaths() {
  const rootDir = path.resolve(__dirname, "..");
  const backendDir = path.join(rootDir, "backend");

  const pythonExec =
    process.platform === "win32"
      ? path.join(backendDir, "venv", "Scripts", "python.exe")
      : path.join(backendDir, "venv", "bin", "python");

  return {
    backendDir,
    pythonExec
  };
}


function startBackend() {
  const {
    backendDir,
    pythonExec
  } = getBackendPaths();

  if (!fs.existsSync(backendDir)) {
    console.warn(
      "[SecondSelf] Backend folder not found:",
      backendDir
    );
    return;
  }

  let executable = pythonExec;

  if (!fs.existsSync(pythonExec)) {
    console.warn(
      "[SecondSelf] Virtual environment Python not found. Using system Python."
    );

    executable = "python";
  }

  try {
    backendProcess = spawn(
      executable,
      [
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        String(BACKEND_PORT)
      ],
      {
        cwd: backendDir,

        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          PYTHONPATH: backendDir
        },

        windowsHide: true
      }
    );

    backendProcess.stdout.on(
      "data",
      data => {
        console.log(
          `[FastAPI] ${data.toString().trim()}`
        );
      }
    );

    backendProcess.stderr.on(
      "data",
      data => {
        console.error(
          `[FastAPI] ${data.toString().trim()}`
        );
      }
    );

    backendProcess.on(
      "error",
      error => {
        console.error(
          "[SecondSelf] Backend spawn error:",
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

        backendProcess = null;
      }
    );

  } catch (error) {
    console.error(
      "[SecondSelf] Could not start backend:",
      error
    );
  }
}


function stopBackend() {
  if (!backendProcess) {
    return;
  }

  try {
    if (process.platform === "win32") {
      execSync(
        `taskkill /pid ${backendProcess.pid} /T /F`,
        {
          stdio: "ignore"
        }
      );
    } else {
      backendProcess.kill("SIGTERM");
    }
  } catch {
    // Backend already stopped.
  }

  backendProcess = null;
}


/* ============================================================
   POPUP WINDOW
   ============================================================ */

function createWindow() {
  if (
    mainWindow &&
    !mainWindow.isDestroyed()
  ) {
    showPopup();
    return;
  }

  console.log(
    "[SecondSelf] Creating popup..."
  );

  const display =
    screen.getPrimaryDisplay();

  const {
    width
  } = display.workAreaSize;

  const popupWidth = 620;
  const popupHeight = 760;

  const x =
    Math.round(
      (width - popupWidth) / 2
    );

  mainWindow =
    new BrowserWindow({
      width: popupWidth,
      height: popupHeight,

      minWidth: 520,
      minHeight: 580,

      x,
      y: 20,

      frame: false,

      transparent: true,

      backgroundColor:
        "#00000000",

      hasShadow: false,

      resizable: true,

      movable: true,

      minimizable: true,

      maximizable: false,

      fullscreen: false,

      fullscreenable: false,

      /*
       * IMPORTANT:
       * Other apps such as Notepad,
       * Calculator and Paint are allowed
       * to appear above SecondSelf.
       */
      alwaysOnTop: false,

      /*
       * Do not show a normal taskbar
       * button. Tray keeps the application alive.
       */
      skipTaskbar: true,

      focusable: true,

      webPreferences: {
        preload: path.join(
          __dirname,
          "preload.js"
        ),

        nodeIntegration: false,

        contextIsolation: true,

        sandbox: false
      }
    });

  mainWindow.setMenuBarVisibility(false);


  /* ==========================================================
     LOAD FRONTEND
     ========================================================== */

  const isPackaged =
    app.isPackaged ||
    __dirname.includes("app.asar");

  if (!isPackaged) {

    const url =
      `http://127.0.0.1:${FRONTEND_PORT}`;

    console.log(
      `[SecondSelf] Loading frontend: ${url}`
    );

    mainWindow.loadURL(url);

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

    mainWindow.loadFile(
      indexPath
    );
  }


  /* ==========================================================
     DEBUG
     ========================================================== */

  mainWindow.webContents.on(
    "did-fail-load",
    (
      event,
      errorCode,
      errorDescription,
      validatedURL
    ) => {
      console.error(
        "[SecondSelf] Frontend failed:",
        errorCode,
        errorDescription,
        validatedURL
      );
    }
  );


  mainWindow.webContents.on(
    "console-message",
    (
      event,
      level,
      message,
      line,
      sourceId
    ) => {
      console.log(
        `[Renderer] ${message}`
      );
    }
  );


  mainWindow.webContents.on(
    "render-process-gone",
    (
      event,
      details
    ) => {
      console.error(
        "[SecondSelf] Renderer crashed:",
        details
      );
    }
  );


  mainWindow.once(
    "ready-to-show",
    () => {
      showPopup();
    }
  );


  mainWindow.webContents.on(
    "did-finish-load",
    () => {
      console.log(
        "[SecondSelf] Frontend loaded."
      );

      showPopup();
    }
  );


  /* ==========================================================
     CLOSE = HIDE
     ========================================================== */

  mainWindow.on(
    "close",
    event => {

      if (!isQuitting) {

        event.preventDefault();

        mainWindow.hide();

        console.log(
          "[SecondSelf] Popup hidden. App continues running."
        );
      }
    }
  );


  mainWindow.on(
    "closed",
    () => {
      mainWindow = null;
    }
  );
}


function showPopup() {
  if (
    !mainWindow ||
    mainWindow.isDestroyed()
  ) {
    createWindow();
    return;
  }

  if (
    mainWindow.isMinimized()
  ) {
    mainWindow.restore();
  }

  mainWindow.show();

  mainWindow.focus();

  /*
   * moveTop() moves this existing
   * SecondSelf window above other windows
   * when the shortcut is pressed.
   */
  mainWindow.moveTop();
}


function hidePopup() {
  if (
    mainWindow &&
    !mainWindow.isDestroyed()
  ) {
    mainWindow.hide();
  }
}


/* ============================================================
   TRAY
   ============================================================ */

function createTray() {

  let iconPath =
    path.join(
      __dirname,
      "..",
      "frontend",
      "public",
      "favicon.ico"
    );

  if (
    !fs.existsSync(iconPath)
  ) {
    console.warn(
      "[SecondSelf] favicon.ico not found. Tray will be unavailable."
    );

    return;
  }

  try {
    tray =
      new Tray(iconPath);
  } catch (error) {
    console.error(
      "[SecondSelf] Tray creation failed:",
      error
    );

    return;
  }


  const menu =
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
          "Open SecondSelf",
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
          "Quit SecondSelf",
        click:
          () => {

            isQuitting =
              true;

            stopBackend();

            app.quit();
          }
      }
    ]);


  tray.setToolTip(
    "SecondSelf — Digital Twin"
  );

  tray.setContextMenu(
    menu
  );

  tray.on(
    "double-click",
    showPopup
  );
}


/* ============================================================
   GLOBAL SHORTCUT
   ============================================================ */

function registerGlobalShortcut() {

  const shortcut =
    "CommandOrControl+Shift+Space";

  globalShortcut.unregister(
    shortcut
  );

  const registered =
    globalShortcut.register(
      shortcut,
      () => {

        console.log(
          "[SecondSelf] Ctrl+Shift+Space pressed."
        );

        /*
         * Restore THE SAME popup.
         */
        showPopup();
      }
    );


  if (!registered) {

    console.error(
      "[SecondSelf] Ctrl+Shift+Space could not be registered."
    );

  } else {

    console.log(
      "[SecondSelf] Ctrl+Shift+Space registered."
    );
  }
}


/* ============================================================
   DESKTOP BRIDGE
   ============================================================ */

function startDesktopBridge() {

  desktopServer =
    http.createServer(
      async (
        request,
        response
      ) => {

        response.setHeader(
          "Access-Control-Allow-Origin",
          "*"
        );

        response.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, OPTIONS"
        );

        response.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type"
        );


        if (
          request.method ===
          "OPTIONS"
        ) {
          response.writeHead(204);
          response.end();
          return;
        }


        /* ======================================================
           COMPUTER CONTROL
           ====================================================== */

        if (
          request.url ===
          "/desktop/computer-control"
        ) {

          let body = "";

          request.on(
            "data",
            chunk => {
              body +=
                chunk.toString();
            }
          );

          request.on(
            "end",
            () => {

              try {

                const data =
                  JSON.parse(
                    body || "{}"
                  );

                computerControlAuthorized =
                  Boolean(
                    data.enabled
                  );

                response.writeHead(
                  200,
                  {
                    "Content-Type":
                      "application/json"
                  }
                );

                response.end(
                  JSON.stringify({
                    success:
                      true,

                    enabled:
                      computerControlAuthorized
                  })
                );

              } catch (error) {

                response.writeHead(
                  400,
                  {
                    "Content-Type":
                      "application/json"
                  }
                );

                response.end(
                  JSON.stringify({
                    success:
                      false,

                    error:
                      error.message
                  })
                );
              }
            }
          );

          return;
        }


        /* ======================================================
           BROWSER
           ====================================================== */

        if (
          request.url ===
          "/desktop/open-browser"
        ) {

          let body = "";

          request.on(
            "data",
            chunk => {
              body +=
                chunk.toString();
            }
          );

          request.on(
            "end",
            async () => {

              try {

                const data =
                  JSON.parse(
                    body || "{}"
                  );

                const query =
                  String(
                    data.query ||
                    ""
                  ).trim();


                const url =
                  query
                    ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
                    : "https://www.google.com";


                await shell.openExternal(
                  url
                );


                response.writeHead(
                  200,
                  {
                    "Content-Type":
                      "application/json"
                  }
                );

                response.end(
                  JSON.stringify({
                    success:
                      true,

                    url
                  })
                );

              } catch (error) {

                response.writeHead(
                  500,
                  {
                    "Content-Type":
                      "application/json"
                  }
                );

                response.end(
                  JSON.stringify({
                    success:
                      false,

                    error:
                      error.message
                  })
                );
              }
            }
          );

          return;
        }


        /* ======================================================
           PAINT
           ====================================================== */

        if (
          request.url ===
          "/desktop/paint-draw"
        ) {

          let body = "";

          request.on(
            "data",
            chunk => {
              body +=
                chunk.toString();
            }
          );

          request.on(
            "end",
            async () => {

              try {

                if (
                  !computerControlAuthorized
                ) {

                  response.writeHead(
                    403,
                    {
                      "Content-Type":
                        "application/json"
                    }
                  );

                  response.end(
                    JSON.stringify({
                      success:
                        false,

                      error:
                        "Computer Control is disabled."
                    })
                  );

                  return;
                }


                const data =
                  JSON.parse(
                    body || "{}"
                  );


                const shape =
                  String(
                    data.shape ||
                    "circle"
                  ).toLowerCase();


                const allowed = [
                  "circle",
                  "rectangle",
                  "line"
                ];


                if (
                  !allowed.includes(
                    shape
                  )
                ) {

                  throw new Error(
                    "Unsupported drawing shape."
                  );
                }


                const scriptPath =
                  path.join(
                    app.getPath(
                      "userData"
                    ),
                    "secondself-paint.ps1"
                  );


                const script = `
$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class MouseControl
{
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT
    {
        public int X;
        public int Y;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool GetClientRect(IntPtr hWnd, out RECT rect);

    [DllImport("user32.dll")]
    public static extern bool ClientToScreen(IntPtr hWnd, ref POINT point);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(
        uint flags,
        uint dx,
        uint dy,
        uint data,
        UIntPtr extraInfo
    );

    public const uint LEFTDOWN = 0x0002;
    public const uint LEFTUP = 0x0004;
}
"@

$paint = Get-Process mspaint -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } |
    Select-Object -Last 1

if (-not $paint)
{
    Start-Process mspaint.exe
}

for ($i = 0; $i -lt 50; $i++)
{
    Start-Sleep -Milliseconds 200

    $paint =
        Get-Process mspaint -ErrorAction SilentlyContinue |
        Where-Object {
            $_.MainWindowHandle -ne 0
        } |
        Select-Object -Last 1

    if ($paint)
    {
        break
    }
}

if (-not $paint)
{
    throw "Microsoft Paint was not found."
}

$hwnd =
    $paint.MainWindowHandle

[MouseControl]::ShowWindow(
    $hwnd,
    3
)

Start-Sleep -Milliseconds 800

[MouseControl]::SetForegroundWindow(
    $hwnd
)

Start-Sleep -Milliseconds 500

$rect =
    New-Object MouseControl+RECT

[MouseControl]::GetClientRect(
    $hwnd,
    [ref]$rect
)

$point =
    New-Object MouseControl+POINT

$point.X = 0
$point.Y = 0

[MouseControl]::ClientToScreen(
    $hwnd,
    [ref]$point
)

$width =
    $rect.Right - $rect.Left

$height =
    $rect.Bottom - $rect.Top

$canvasTop = 170

if ($height -lt 500)
{
    $canvasTop = 130
}

$canvasBottom =
    $height - 25

$canvasHeight =
    $canvasBottom - $canvasTop

$centerX =
    [int](
        $point.X +
        ($width / 2)
    )

$centerY =
    [int](
        $point.Y +
        $canvasTop +
        ($canvasHeight * 0.45)
    )

function MoveMouse($x, $y)
{
    [MouseControl]::SetCursorPos(
        [int]$x,
        [int]$y
    )

    Start-Sleep -Milliseconds 8
}

function MouseDown()
{
    [MouseControl]::mouse_event(
        [MouseControl]::LEFTDOWN,
        0,
        0,
        0,
        [UIntPtr]::Zero
    )
}

function MouseUp()
{
    [MouseControl]::mouse_event(
        [MouseControl]::LEFTUP,
        0,
        0,
        0,
        [UIntPtr]::Zero
    )
}

$shape = "${shape}"

if ($shape -eq "circle")
{
    $radius = 120
    $steps = 150

    $startX =
        $centerX + $radius

    MoveMouse $startX $centerY

    MouseDown

    for ($i = 0; $i -le $steps; $i++)
    {
        $angle =
            (2 * [Math]::PI * $i) /
            $steps

        $x =
            $centerX +
            ($radius * [Math]::Cos($angle))

        $y =
            $centerY +
            ($radius * [Math]::Sin($angle))

        MoveMouse $x $y
    }

    MouseUp
}

elseif ($shape -eq "rectangle")
{
    $halfWidth = 150
    $halfHeight = 100

    $left =
        $centerX - $halfWidth

    $right =
        $centerX + $halfWidth

    $top =
        $centerY - $halfHeight

    $bottom =
        $centerY + $halfHeight

    MoveMouse $left $top

    MouseDown

    MoveMouse $right $top
    MoveMouse $right $bottom
    MoveMouse $left $bottom
    MoveMouse $left $top

    MouseUp
}

elseif ($shape -eq "line")
{
    MoveMouse (
        $centerX - 180
    ) $centerY

    MouseDown

    MoveMouse (
        $centerX + 180
    ) $centerY

    MouseUp
}
`;


                fs.writeFileSync(
                  scriptPath,
                  script,
                  "utf8"
                );


                const child =
                  spawn(
                    "powershell.exe",
                    [
                      "-NoProfile",
                      "-ExecutionPolicy",
                      "Bypass",
                      "-File",
                      scriptPath
                    ],
                    {
                      windowsHide:
                        true
                    }
                  );


                let stderr = "";


                child.stderr.on(
                  "data",
                  data => {
                    stderr +=
                      data.toString();
                  }
                );


                child.on(
                  "error",
                  error => {

                    response.writeHead(
                      500,
                      {
                        "Content-Type":
                          "application/json"
                      }
                    );

                    response.end(
                      JSON.stringify({
                        success:
                          false,

                        error:
                          error.message
                      })
                    );
                  }
                );


                child.on(
                  "close",
                  code => {

                    if (
                      code === 0
                    ) {

                      response.writeHead(
                        200,
                        {
                          "Content-Type":
                            "application/json"
                        }
                      );

                      response.end(
                        JSON.stringify({
                          success:
                            true,

                          shape
                        })
                      );

                    } else {

                      response.writeHead(
                        500,
                        {
                          "Content-Type":
                            "application/json"
                        }
                      );

                      response.end(
                        JSON.stringify({
                          success:
                            false,

                          error:
                            stderr ||
                            `Paint script failed with code ${code}.`
                        })
                      );
                    }
                  }
                );

              } catch (error) {

                response.writeHead(
                  500,
                  {
                    "Content-Type":
                      "application/json"
                  }
                );

                response.end(
                  JSON.stringify({
                    success:
                      false,

                    error:
                      error.message
                  })
                );
              }
            }
          );

          return;
        }


        response.writeHead(
          404,
          {
            "Content-Type":
              "application/json"
          }
        );

        response.end(
          JSON.stringify({
            error:
              "Not found"
          })
        );
      }
    );


  desktopServer.listen(
    DESKTOP_PORT,
    "127.0.0.1",
    () => {
      console.log(
        `[SecondSelf] Desktop bridge running on port ${DESKTOP_PORT}`
      );
    }
  );


  desktopServer.on(
    "error",
    error => {
      console.error(
        "[SecondSelf] Desktop bridge error:",
        error
      );
    }
  );
}


/* ============================================================
   IPC
   ============================================================ */

ipcMain.on(
  "desktop-minimize",
  () => {

    if (
      mainWindow &&
      !mainWindow.isDestroyed()
    ) {
      mainWindow.minimize();
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

    isQuitting = true;

    stopBackend();

    app.quit();
  }
);


/* ============================================================
   BROWSER IPC
   ============================================================ */

ipcMain.handle(
  "open-browser",
  async (
    event,
    query
  ) => {

    const clean =
      String(
        query || ""
      ).trim();


    const url =
      clean
        ? `https://www.google.com/search?q=${encodeURIComponent(clean)}`
        : "https://www.google.com";


    await shell.openExternal(
      url
    );


    return {
      success:
        true,

      url
    };
  }
);


/* ============================================================
   APP READY
   ============================================================ */

app.whenReady().then(
  () => {

    console.log(
      "[SecondSelf] Electron ready."
    );


    /*
     * Allow microphone permission.
     */
    session.defaultSession
      .setPermissionRequestHandler(
        (
          webContents,
          permission,
          callback
        ) => {

          if (
            permission === "media"
          ) {
            callback(true);
          } else {
            callback(false);
          }
        }
      );


    session.defaultSession
      .setPermissionCheckHandler(
        (
          webContents,
          permission
        ) => {

          if (
            permission === "media"
          ) {
            return true;
          }

          return false;
        }
      );


    startBackend();

    startDesktopBridge();

    createWindow();

    createTray();

    registerGlobalShortcut();


    app.on(
      "activate",
      () => {
        showPopup();
      }
    );
  }
);


/* ============================================================
   KEEP APPLICATION RUNNING
   ============================================================ */

app.on(
  "window-all-closed",
  () => {

    /*
     * VERY IMPORTANT:
     * Do NOT call app.quit().
     *
     * SecondSelf continues running
     * in the background.
     */

    console.log(
      "[SecondSelf] Window closed/hidden. Continuing in background."
    );
  }
);


/* ============================================================
   QUIT
   ============================================================ */

app.on(
  "will-quit",
  () => {

    isQuitting = true;

    globalShortcut.unregisterAll();

    stopBackend();

    if (desktopServer) {

      try {
        desktopServer.close();
      } catch {
        // Already closed.
      }

      desktopServer = null;
    }
  }
);