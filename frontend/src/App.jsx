import React, {
  useEffect,
  useRef,
  useState
} from "react";

import "./App.css";


const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const DESKTOP =
  "http://127.0.0.1:8765";

const HISTORY_KEY =
  "secondself_chat_history_v5";

const TWIN_IMAGE =
  "/twin.png";


/* ============================================================
   HELPERS
   ============================================================ */

function makeId() {
  return (
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .substring(2)
  );
}


function currentTime() {
  return new Date().toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


/* ============================================================
   CALCULATOR
   ============================================================ */

function calculateExpression(
  expression
) {

  const text =
    String(expression)
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/\s+/g, "");


  if (
    !text ||
    !/^[0-9+\-*/%.^()]+$/.test(
      text
    )
  ) {
    return null;
  }


  let position = 0;


  function parseExpression() {

    let value =
      parseTerm();


    while (
      text[position] === "+" ||
      text[position] === "-"
    ) {

      const operator =
        text[position++];

      const right =
        parseTerm();


      if (
        operator === "+"
      ) {
        value += right;
      } else {
        value -= right;
      }
    }


    return value;
  }


  function parseTerm() {

    let value =
      parsePower();


    while (
      text[position] === "*" ||
      text[position] === "/" ||
      text[position] === "%"
    ) {

      const operator =
        text[position++];

      const right =
        parsePower();


      if (
        operator === "*"
      ) {
        value *= right;
      }


      if (
        operator === "/"
      ) {

        if (
          right === 0
        ) {
          throw new Error(
            "Cannot divide by zero"
          );
        }

        value /= right;
      }


      if (
        operator === "%"
      ) {

        if (
          right === 0
        ) {
          throw new Error(
            "Cannot divide by zero"
          );
        }

        value %= right;
      }
    }


    return value;
  }


  function parsePower() {

    let value =
      parseUnary();


    if (
      text[position] === "^"
    ) {

      position++;

      const right =
        parsePower();

      value =
        Math.pow(
          value,
          right
        );
    }


    return value;
  }


  function parseUnary() {

    if (
      text[position] === "+"
    ) {

      position++;

      return parseUnary();
    }


    if (
      text[position] === "-"
    ) {

      position++;

      return -parseUnary();
    }


    return parsePrimary();
  }


  function parsePrimary() {

    if (
      text[position] === "("
    ) {

      position++;

      const value =
        parseExpression();


      if (
        text[position] !== ")"
      ) {
        throw new Error(
          "Missing bracket"
        );
      }


      position++;

      return value;
    }


    const match =
      text
        .slice(position)
        .match(
          /^(?:\d+(?:\.\d*)?|\.\d+)/
        );


    if (!match) {
      throw new Error(
        "Invalid expression"
      );
    }


    position +=
      match[0].length;


    return Number(
      match[0]
    );
  }


  try {

    const result =
      parseExpression();


    if (
      position !==
        text.length ||
      !Number.isFinite(
        result
      )
    ) {
      return null;
    }


    return Number(
      result.toFixed(12)
    );

  } catch {

    return null;
  }
}


/* ============================================================
   TWIN
   ============================================================ */

function Twin({
  size = "normal"
}) {

  const [
    failed,
    setFailed
  ] = useState(false);


  if (failed) {

    return (
      <div
        className={
          `twin-fallback ${size}`
        }
      >

        <div className="fallback-head">

          <span />
          <span />

          <i />

        </div>

        <div className="fallback-body" />

      </div>
    );
  }


  return (
    <img
      src={TWIN_IMAGE}
      alt="SecondSelf"
      className={
        `twin-image ${size}`
      }
      draggable="false"
      onError={() =>
        setFailed(true)
      }
    />
  );
}


/* ============================================================
   MESSAGE
   ============================================================ */

function Message({
  message
}) {

  const isUser =
    message.role === "user";


  return (
    <div
      className={
        `message-row ${
          isUser
            ? "message-user"
            : "message-assistant"
        }`
      }
    >

      {!isUser && (
        <div className="message-avatar">

          <Twin
            size="mini"
          />

        </div>
      )}


      <div className="message-content">

        <div className="message-meta">

          {isUser
            ? `YOU  ${message.time}`
            : `SECONDSELF  ${message.time}`}

        </div>


        <div
          className={
            `message-bubble ${
              isUser
                ? "user-bubble"
                : "assistant-bubble"
            }`
          }
        >

          {message.text}

        </div>


        {message.toolCalls?.length > 0 && (

          <div className="tool-status">

            <span>⚡</span>

            <span>
              {message.toolCalls
                .map(
                  tool =>
                    tool.name ||
                    tool.tool ||
                    tool.action ||
                    "tool"
                )
                .join(", ")}
            </span>

            <span className="tool-success">
              ✓
            </span>

          </div>

        )}

      </div>

    </div>
  );
}


/* ============================================================
   SETTINGS
   ============================================================ */

function Settings({
  computerEnabled,
  computerLoading,
  onComputerToggle,
  onClose
}) {

  return (
    <div className="modal-overlay">

      <div className="settings-modal">

        <div className="modal-header">

          <div>

            <strong>
              Settings
            </strong>

            <span>
              SecondSelf controls
            </span>

          </div>


          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        {/* COMPUTER CONTROL */}

        <section className="setting-section">

          <div className="setting-title">
            Computer Control
          </div>

          <p className="setting-description">
            Allow SecondSelf to perform
            approved desktop actions such
            as opening Paint and drawing.
          </p>


          <div
            className={
              `permission-card ${
                computerEnabled
                  ? "permission-enabled"
                  : "permission-disabled"
              }`
            }
          >

            <div>

              <strong>
                {computerEnabled
                  ? "Computer Control enabled"
                  : "Computer Control disabled"}
              </strong>

              <p>
                {computerEnabled
                  ? "Desktop actions are authorized."
                  : "Enable this before using desktop control."}
              </p>

            </div>


            <button
              type="button"
              className={
                `toggle ${
                  computerEnabled
                    ? "active"
                    : ""
                }`
              }
              onClick={
                onComputerToggle
              }
              disabled={
                computerLoading
              }
            >

              <span />

            </button>

          </div>


          <div className="permission-note">

            {computerEnabled
              ? "✓ Computer Control is currently enabled."
              : "Computer Control is currently disabled. Enable it before asking SecondSelf to control desktop applications."}

          </div>

        </section>


        {/* VOICE */}

        <section className="setting-section">

          <div className="setting-title">
            Voice Assistance
          </div>

          <p className="setting-description">

            Press the microphone button.
            SecondSelf will ask for
            microphone access the first time.
            Speak continuously and your words
            will appear in the chat box.
            Press the microphone again to stop,
            then press Enter to send.

          </p>

        </section>


        {/* BACKGROUND */}

        <section className="setting-section">

          <div className="setting-title">
            Background Mode
          </div>

          <p className="setting-description">

            Closing or minimizing the popup
            does not quit SecondSelf.
            The application stays alive in
            the background.

          </p>


          <div className="background-status">

            <span />

            SecondSelf is running

          </div>

        </section>


        {/* SHORTCUT */}

        <section className="setting-section">

          <div className="setting-title">
            Global Shortcut
          </div>


          <div className="shortcut">

            <kbd>CTRL</kbd>

            <span>+</span>

            <kbd>SHIFT</kbd>

            <span>+</span>

            <kbd>SPACE</kbd>

          </div>


          <p className="setting-description">

            Press Ctrl + Shift + Space
            anywhere in Windows to restore
            this same SecondSelf popup.

          </p>

        </section>

      </div>

    </div>
  );
}


/* ============================================================
   MAIN APP
   ============================================================ */

function App() {

  /* ==========================================================
     CHAT HISTORY
     ========================================================== */

  const [
    messages,
    setMessages
  ] = useState(() => {

    try {

      const saved =
        localStorage.getItem(
          HISTORY_KEY
        );


      if (saved) {

        const parsed =
          JSON.parse(
            saved
          );


        if (
          Array.isArray(parsed) &&
          parsed.length > 0
        ) {

          return parsed;
        }
      }

    } catch {
      // Ignore bad saved history.
    }


    return [
      {
        id:
          makeId(),

        role:
          "assistant",

        text:
          "Good morning. I'm SecondSelf. What would you like me to handle?",

        time:
          currentTime()
      }
    ];
  });


  const [
    input,
    setInput
  ] = useState("");


  const [
    thinking,
    setThinking
  ] = useState(false);


  const [
    backendOnline,
    setBackendOnline
  ] = useState(false);


  const [
    computerEnabled,
    setComputerEnabled
  ] = useState(false);


  const [
    computerLoading,
    setComputerLoading
  ] = useState(false);


  const [
    settingsOpen,
    setSettingsOpen
  ] = useState(false);


  const [
    listening,
    setListening
  ] = useState(false);


  const [
    memoryCount,
    setMemoryCount
  ] = useState(0);


  const [
    statusText,
    setStatusText
  ] = useState("READY");


  const inputRef =
    useRef(null);

  const messagesEndRef =
    useRef(null);

  const recognitionRef =
    useRef(null);

  const listeningRef =
    useRef(false);

  const microphoneStreamRef =
    useRef(null);

  const finalTranscriptRef =
    useRef("");


  /* ==========================================================
     SAVE LOCAL CHAT HISTORY
     ========================================================== */

  useEffect(() => {

    try {

      localStorage.setItem(
        HISTORY_KEY,

        JSON.stringify(
          messages.slice(-150)
        )
      );

    } catch {
      // Ignore storage failure.
    }

  }, [
    messages
  ]);


  /* ==========================================================
     BACKEND HEALTH
     ========================================================== */

  useEffect(() => {

    checkBackend();

    const interval =
      setInterval(
        checkBackend,
        5000
      );


    return () =>
      clearInterval(
        interval
      );

  }, []);


  async function checkBackend() {

    try {

      const response =
        await fetch(
          `${API}/api/health`
        );


      setBackendOnline(
        response.ok
      );

    } catch {

      setBackendOnline(
        false
      );
    }
  }


  /* ==========================================================
     MEMORY
     ========================================================== */

  useEffect(() => {

    loadMemory();

  }, []);


  async function loadMemory() {

    try {

      const response =
        await fetch(
          `${API}/api/memory`
        );


      if (!response.ok) {
        return;
      }


      const data =
        await response.json();


      setMemoryCount(
        Number(
          data.count || 0
        )
      );

    } catch {
      // Local history still works.
    }
  }


  /* ==========================================================
     COMPUTER STATUS
     ========================================================== */

  useEffect(() => {

    loadComputerStatus();

    const interval =
      setInterval(
        loadComputerStatus,
        3000
      );


    return () =>
      clearInterval(
        interval
      );

  }, []);


  async function loadComputerStatus() {

    try {

      const response =
        await fetch(
          `${API}/api/computer/status`
        );


      if (!response.ok) {
        return;
      }


      const data =
        await response.json();


      const enabled =
        Boolean(
          data.enabled
        );


      setComputerEnabled(
        enabled
      );


      syncDesktopControl(
        enabled
      );

    } catch {
      // Backend can be starting.
    }
  }


  async function syncDesktopControl(
    enabled
  ) {

    try {

      await fetch(
        `${DESKTOP}/desktop/computer-control`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              enabled
            })
        }
      );

    } catch {
      // Browser-only mode.
    }
  }


  /* ==========================================================
     SCROLL
     ========================================================== */

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior:
        "smooth"
    });

  }, [
    messages,
    thinking
  ]);


  /* ==========================================================
     COMPUTER CONTROL TOGGLE
     ========================================================== */

  async function toggleComputer() {

    if (
      computerLoading
    ) {
      return;
    }


    setComputerLoading(
      true
    );


    const endpoint =
      computerEnabled
        ? "/api/computer/disable"
        : "/api/computer/enable";


    try {

      const response =
        await fetch(
          `${API}${endpoint}`,
          {
            method:
              "POST"
          }
        );


      if (!response.ok) {

        throw new Error(
          "Could not change Computer Control."
        );
      }


      const data =
        await response.json();


      const enabled =
        Boolean(
          data.enabled
        );


      setComputerEnabled(
        enabled
      );


      await syncDesktopControl(
        enabled
      );

    } catch (error) {

      alert(
        error.message
      );

    } finally {

      setComputerLoading(
        false
      );
    }
  }


  /* ==========================================================
     MICROPHONE PERMISSION
     ========================================================== */

  async function requestMicrophone() {

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {

      throw new Error(
        "Microphone access is not available."
      );
    }


    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio:
          true
      });


    microphoneStreamRef.current =
      stream;


    return stream;
  }


  /* ==========================================================
     VOICE ASSISTANCE
     ========================================================== */

  async function toggleVoice() {

    /* --------------------------------------------------------
       STOP
       -------------------------------------------------------- */

    if (
      listeningRef.current
    ) {

      listeningRef.current =
        false;


      try {

        recognitionRef.current?.stop();

      } catch {
        // Already stopped.
      }


      if (
        microphoneStreamRef.current
      ) {

        microphoneStreamRef.current
          .getTracks()
          .forEach(
            track =>
              track.stop()
          );


        microphoneStreamRef.current =
          null;
      }


      setListening(
        false
      );


      setStatusText(
        input.trim()
          ? "VOICE CAPTURED — PRESS ENTER"
          : "READY"
      );


      return;
    }


    /* --------------------------------------------------------
       CHECK SPEECH API
       -------------------------------------------------------- */

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

      alert(
        "Speech recognition is not available in this Electron build."
      );

      return;
    }


    /* --------------------------------------------------------
       ASK FOR MIC ACCESS
       -------------------------------------------------------- */

    try {

      await requestMicrophone();

    } catch {

      alert(
        "Please allow microphone access for SecondSelf and try again."
      );

      return;
    }


    /* --------------------------------------------------------
       RECOGNITION
       -------------------------------------------------------- */

    const recognition =
      new SpeechRecognition();


    recognition.lang =
      "en-IN";


    /*
     * IMPORTANT:
     * Continuous listening.
     */
    recognition.continuous =
      true;


    recognition.interimResults =
      true;


    recognition.maxAlternatives =
      1;


    finalTranscriptRef.current =
      input.trim()
        ? `${input.trim()} `
        : "";


    recognition.onstart =
      () => {

        listeningRef.current =
          true;


        setListening(
          true
        );


        setStatusText(
          "LISTENING — SPEAK NOW..."
        );
      };


    recognition.onresult =
      event => {

        let interim =
          "";


        for (
          let i =
            event.resultIndex;

          i <
            event.results.length;

          i++
        ) {

          const result =
            event.results[i];


          const transcript =
            result[0]
              .transcript;


          if (
            result.isFinal
          ) {

            finalTranscriptRef.current +=
              transcript +
              " ";

          } else {

            interim +=
              transcript;
          }
        }


        const combined =
          (
            finalTranscriptRef.current +
            interim
          ).trim();


        if (combined) {

          setInput(
            combined
          );


          setStatusText(
            "LISTENING — KEEP SPEAKING..."
          );
        }
      };


    recognition.onerror =
      event => {

        console.log(
          "Speech error:",
          event.error
        );


        if (
          event.error ===
            "not-allowed" ||
          event.error ===
            "service-not-allowed"
        ) {

          listeningRef.current =
            false;


          setListening(
            false
          );


          setStatusText(
            "MICROPHONE DENIED"
          );


          alert(
            "Microphone permission was denied."
          );


          return;
        }


        if (
          event.error ===
            "no-speech"
        ) {

          setStatusText(
            "LISTENING — PLEASE SPEAK..."
          );


          return;
        }
      };


    recognition.onend =
      () => {

        /*
         * Chromium may automatically stop
         * recognition. Restart while the
         * user still wants voice mode.
         */
        if (
          listeningRef.current
        ) {

          setTimeout(
            () => {

              if (
                !listeningRef.current
              ) {
                return;
              }


              try {

                recognition.start();

              } catch {
                // Already running.
              }

            },
            250
          );


          return;
        }


        setListening(
          false
        );


        recognitionRef.current =
          null;


        setStatusText(
          input.trim()
            ? "VOICE CAPTURED — PRESS ENTER"
            : "READY"
        );


        if (
          microphoneStreamRef.current
        ) {

          microphoneStreamRef.current
            .getTracks()
            .forEach(
              track =>
                track.stop()
            );


          microphoneStreamRef.current =
            null;
        }
      };


    recognitionRef.current =
      recognition;


    listeningRef.current =
      true;


    try {

      recognition.start();

    } catch {

      listeningRef.current =
        false;


      recognitionRef.current =
        null;


      setListening(
        false
      );


      alert(
        "Could not start voice recognition."
      );
    }
  }


  /* ==========================================================
     BROWSER SEARCH
     ========================================================== */

  function extractSearch(
    text
  ) {

    const patterns = [

      /open (?:the )?browser and search (?:for )?(.+)/i,

      /open browser and google (.+)/i,

      /search (?:the )?web for (.+)/i,

      /search google for (.+)/i,

      /^google (.+)/i

    ];


    for (
      const pattern of patterns
    ) {

      const match =
        text.match(
          pattern
        );


      if (match) {

        return match[1]
          .trim();
      }
    }


    return null;
  }


  async function browserSearch(
    query
  ) {

    const clean =
      String(
        query || ""
      ).trim();


    try {

      const response =
        await fetch(
          `${DESKTOP}/desktop/open-browser`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                query:
                  clean
              })
          }
        );


      if (
        response.ok
      ) {
        return true;
      }

    } catch {
      // Use browser fallback.
    }


    const url =
      clean
        ? `https://www.google.com/search?q=${encodeURIComponent(clean)}`
        : "https://www.google.com";


    window.open(
      url,
      "_blank"
    );


    return true;
  }


  /* ==========================================================
     PAINT
     ========================================================== */

  function getPaintShape(
    text
  ) {

    const lower =
      text.toLowerCase();


    if (
      /\bcircle\b/.test(
        lower
      )
    ) {
      return "circle";
    }


    if (
      /\brectangle\b|\bsquare\b/.test(
        lower
      )
    ) {
      return "rectangle";
    }


    if (
      /\bline\b/.test(
        lower
      )
    ) {
      return "line";
    }


    return null;
  }


  async function paintDraw(
    shape
  ) {

    try {

      const response =
        await fetch(
          `${DESKTOP}/desktop/paint-draw`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                shape
              })
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          data.error ||
          "Paint drawing failed."
        );
      }


      return true;

    } catch (error) {

      setMessages(
        previous => [
          ...previous,

          {
            id:
              makeId(),

            role:
              "assistant",

            text:
              `I couldn't draw the ${shape}. Please make sure Computer Control is enabled in Settings.`,

            time:
              currentTime()
          }
        ]
      );


      return false;
    }
  }


  /* ==========================================================
     CONTEXT MEMORY
     ========================================================== */

  function buildConversationContext() {

    return messages
      .slice(-30)
      .map(
        message =>
          `${message.role}: ${message.text}`
      )
      .join("\n");
  }


  function resolveContinuation(
    text
  ) {

    const lower =
      text
        .trim()
        .toLowerCase();


    const continuationWords = [
      "do it",
      "do it now",
      "continue",
      "continue it",
      "same",
      "same thing",
      "as before",
      "as above",
      "that",
      "this",
      "go ahead",
      "proceed",
      "open it",
      "search it",
      "yes",
      "okay",
      "ok"
    ];


    if (
      !continuationWords.includes(
        lower
      )
    ) {
      return text.trim();
    }


    const previousUsers =
      messages.filter(
        message =>
          message.role ===
          "user"
      );


    const previous =
      previousUsers[
        previousUsers.length - 1
      ];


    if (!previous) {
      return text.trim();
    }


    return `
Continue the user's previous request.

Previous user request:
${previous.text}

Latest user instruction:
${text.trim()}

Use the previous conversation context.
Do not say the message was cut off.
Do not ask the user to repeat the previous request.
Complete the task.
`.trim();
  }


  /* ==========================================================
     SEND MESSAGE
     ========================================================== */

  async function sendMessage() {

    const clean =
      input.trim();


    if (
      !clean ||
      thinking
    ) {
      return;
    }


    const userMessage = {

      id:
        makeId(),

      role:
        "user",

      text:
        clean,

      time:
        currentTime()
    };


    const conversation =
      [
        ...messages,
        userMessage
      ];


    setMessages(
      conversation
    );


    setInput("");


    /* ========================================================
       BROWSER SEARCH
       ======================================================== */

    const searchQuery =
      extractSearch(
        clean
      );


    if (
      searchQuery
    ) {

      setStatusText(
        "OPENING BROWSER..."
      );


      const success =
        await browserSearch(
          searchQuery
        );


      setMessages(
        previous => [
          ...previous,

          {
            id:
              makeId(),

            role:
              "assistant",

            text:
              success
                ? `I've opened the browser and searched for "${searchQuery}".`
                : "I couldn't open the browser.",

            time:
              currentTime(),

            toolCalls:
              success
                ? [
                    {
                      name:
                        "browser_search"
                    }
                  ]
                : []
          }
        ]
      );


      setStatusText(
        "READY"
      );


      return;
    }


    /* ========================================================
       PAINT
       ======================================================== */

    const paintShape =
      getPaintShape(
        clean
      );


    const mentionsPaint =
      /\bpaint\b|\bmspaint\b/i.test(
        clean
      );


    if (
      mentionsPaint &&
      paintShape
    ) {

      if (
        !computerEnabled
      ) {

        setMessages(
          previous => [
            ...previous,

            {
              id:
                makeId(),

              role:
                "assistant",

              text:
                "Computer Control is disabled. Please enable it in Settings first.",

              time:
                currentTime()
            }
          ]
        );


        setSettingsOpen(
          true
        );


        setStatusText(
          "READY"
        );


        return;
      }


      setThinking(
        true
      );


      setStatusText(
        "DRAWING..."
      );


      const success =
        await paintDraw(
          paintShape
        );


      if (
        success
      ) {

        setMessages(
          previous => [
            ...previous,

            {
              id:
                makeId(),

              role:
                "assistant",

              text:
                `I've opened Paint and drawn a ${paintShape}.`,

              time:
                currentTime(),

              toolCalls: [
                {
                  name:
                    "paint_draw"
                }
              ]
            }
          ]
        );
      }


      setThinking(
        false
      );


      setStatusText(
        "READY"
      );


      return;
    }


    /* ========================================================
       CALCULATOR
       ======================================================== */

    const calculation =
      clean
        .replace(
          /^(calculate|calculator|what is|solve)\s+/i,
          ""
        )
        .trim();


    if (
      /^[0-9\s+\-*/%.^()×÷−]+$/.test(
        calculation
      )
    ) {

      const result =
        calculateExpression(
          calculation
        );


      if (
        result !== null
      ) {

        setMessages(
          previous => [
            ...previous,

            {
              id:
                makeId(),

              role:
                "assistant",

              text:
                `The answer is ${result}.`,

              time:
                currentTime(),

              toolCalls: [
                {
                  name:
                    "calculator"
                }
              ]
            }
          ]
        );


        setStatusText(
          "READY"
        );


        return;
      }
    }


    /* ========================================================
       BACKEND
       ======================================================== */

    setThinking(
      true
    );


    setStatusText(
      "THINKING..."
    );


    try {

      const history =
        conversation
          .slice(-60)
          .map(
            message => ({
              role:
                message.role,

              content:
                message.text
            })
          );


      const contextualMessage =
        resolveContinuation(
          clean
        );


      const response =
        await fetch(
          `${API}/api/agent/chat`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                message:
                  contextualMessage,

                history
              })
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          data.detail ||
          "SecondSelf could not complete the request."
        );
      }


      let reply =
        data.response ||
        "Task completed.";


      /*
       * If backend sends the old
       * "message may be cut off" response,
       * retry with explicit context.
       */
      if (
        /message.*cut off|previous chat|please clarify|repeat the request/i.test(
          reply
        )
      ) {

        const retryResponse =
          await fetch(
            `${API}/api/agent/chat`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  message:
                    `
Use the conversation history below.

Do not claim that the message is cut off.
Do not ask the user to repeat information that already exists.
Answer the latest request using the available context.

Conversation:
${buildConversationContext()}

Latest request:
${clean}
`.trim(),

                  history
                })
            }
          );


        if (
          retryResponse.ok
        ) {

          const retryData =
            await retryResponse.json();


          if (
            retryData.response
          ) {

            reply =
              retryData.response;
          }
        }
      }


      setMessages(
        previous => [
          ...previous,

          {
            id:
              makeId(),

            role:
              "assistant",

            text:
              reply,

            time:
              currentTime(),

            toolCalls:
              data.tool_calls ||
              []
          }
        ]
      );


      setStatusText(
        "READY"
      );


      loadMemory();

    } catch (error) {

      setMessages(
        previous => [
          ...previous,

          {
            id:
              makeId(),

            role:
              "assistant",

            text:
              error.message ||
              "I couldn't connect to SecondSelf.",

            time:
              currentTime()
          }
        ]
      );


      setStatusText(
        "ERROR"
      );

    } finally {

      setThinking(
        false
      );


      setTimeout(
        () => {
          inputRef.current?.focus();
        },
        100
      );
    }
  }


  /* ==========================================================
     CLEANUP
     ========================================================== */

  useEffect(() => {

    return () => {

      listeningRef.current =
        false;


      try {

        recognitionRef.current?.stop();

      } catch {
        // Already stopped.
      }


      if (
        microphoneStreamRef.current
      ) {

        microphoneStreamRef.current
          .getTracks()
          .forEach(
            track =>
              track.stop()
          );
      }

    };

  }, []);


  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div className="secondself-app">

      <div className="top-notch">

        <div className="notch-camera" />

      </div>


      <main className="twin-popup">

        {/* HEADER */}

        <header className="popup-header">

          <div className="brand">

            <div className="brand-avatar">

              <Twin
                size="avatar"
              />

            </div>


            <div>

              <div className="brand-name">
                SECONDSELF
              </div>

              <div className="brand-subtitle">
                YOUR DIGITAL TWIN
              </div>

            </div>

          </div>


          <div className="header-controls">

            <span
              className={
                `online-dot ${
                  backendOnline
                    ? "online"
                    : ""
                }`
              }
            />


            <button
              type="button"
              className={
                `header-icon ${
                  listening
                    ? "voice-active"
                    : ""
                }`
              }
              title="Voice Assistance"
              onClick={
                toggleVoice
              }
            >
              🎙
            </button>


            <button
              type="button"
              className="header-icon"
              title="Settings"
              onClick={() =>
                setSettingsOpen(
                  true
                )
              }
            >
              ⚙
            </button>


            <button
              type="button"
              className="window-control"
              title="Minimize"
              onClick={() =>
                window
                  .secondselfDesktop
                  ?.minimizeWindow?.()
              }
            >
              —
            </button>


            <button
              type="button"
              className="window-control close"
              title="Close to tray"
              onClick={() =>
                window
                  .secondselfDesktop
                  ?.closeToTray?.()
              }
            >
              ×
            </button>

          </div>

        </header>


        {/* STATUS */}

        <div className="status-bar">

          <span>

            <span
              className={
                `status-light ${
                  backendOnline
                    ? "online"
                    : ""
                }`
              }
            />

            {statusText}

          </span>


          <span>

            MEMORY{" "}

            {memoryCount > 0 ||
            messages.length > 1
              ? "ACTIVE"
              : "READY"}

          </span>

        </div>


        {/* CHAT */}

        <section className="chat-area">

          <div className="messages">

            {messages.map(
              message => (
                <Message
                  key={
                    message.id
                  }
                  message={
                    message
                  }
                />
              )
            )}


            {thinking && (

              <div className="message-row message-assistant">

                <div className="message-avatar">

                  <Twin
                    size="mini"
                  />

                </div>


                <div className="message-content">

                  <div className="message-meta">
                    SECONDSELF&nbsp;&nbsp;
                    {currentTime()}
                  </div>


                  <div className="message-bubble assistant-bubble typing">

                    <span />
                    <span />
                    <span />

                  </div>

                </div>

              </div>
            )}


            <div
              ref={
                messagesEndRef
              }
            />

          </div>

        </section>


        {/* QUICK ACTIONS */}

        <div className="quick-actions">

          <button
            type="button"
            className="quick-action"
            onClick={() => {

              const query =
                window.prompt(
                  "What would you like to search?"
                );


              if (query) {

                browserSearch(
                  query
                );
              }

            }}
          >

            <span className="quick-icon">
              ⌕
            </span>

            <span className="quick-label">
              Search the web
            </span>

            <span className="quick-arrow">
              ↗
            </span>

          </button>


          <button
            type="button"
            className="quick-action"
            onClick={() =>
              browserSearch("")
            }
          >

            <span className="quick-icon">
              ◉
            </span>

            <span className="quick-label">
              Open browser
            </span>

            <span className="quick-arrow">
              ↗
            </span>

          </button>


          <button
            type="button"
            className="quick-action"
            onClick={() => {

              if (
                !computerEnabled
              ) {

                setSettingsOpen(
                  true
                );

                return;
              }


              paintDraw(
                "circle"
              );

            }}
          >

            <span className="quick-icon">
              ✎
            </span>

            <span className="quick-label">
              Open Paint / Draw
            </span>

            <span className="quick-arrow">
              ↗
            </span>

          </button>

        </div>


        {/* INPUT */}

        <div className="input-section">

          <div className="input-box">

            <button
              type="button"
              className={
                `voice-button ${
                  listening
                    ? "active"
                    : ""
                }`
              }
              title={
                listening
                  ? "Stop listening"
                  : "Start voice assistance"
              }
              onClick={
                toggleVoice
              }
            >

              {listening
                ? "●"
                : "🎙"}

            </button>


            <textarea
              ref={
                inputRef
              }
              value={
                input
              }
              onChange={
                event =>
                  setInput(
                    event.target.value
                  )
              }
              onKeyDown={
                event => {

                  if (
                    event.key ===
                      "Enter" &&
                    !event.shiftKey
                  ) {

                    event.preventDefault();

                    sendMessage();
                  }

                }
              }
              placeholder={
                listening
                  ? "Listening... speak now"
                  : "Message your Twin..."
              }
              rows="1"
              disabled={
                thinking
              }
            />


            <button
              type="button"
              className="send-button"
              disabled={
                thinking ||
                !input.trim()
              }
              onClick={
                sendMessage
              }
            >
              ↑
            </button>

          </div>


          <div className="input-bottom">

            <span className="enter-hint">

              {listening
                ? "MIC ACTIVE — CLICK MIC TO STOP"
                : "ENTER TO SEND"}

            </span>


            <button
              type="button"
              className="computer-link"
              onClick={() =>
                setSettingsOpen(
                  true
                )
              }
            >

              <span
                className={
                  `control-dot ${
                    computerEnabled
                      ? "active"
                      : ""
                  }`
                }
              />

              COMPUTER CONTROL

              <span>
                ⚙
              </span>

            </button>

          </div>

        </div>


        {/* CHARACTER */}

        <div className="floating-twin">

          <Twin
            size="large"
          />

        </div>

      </main>


      {settingsOpen && (

        <Settings
          computerEnabled={
            computerEnabled
          }

          computerLoading={
            computerLoading
          }

          onComputerToggle={
            toggleComputer
          }

          onClose={() =>
            setSettingsOpen(
              false
            )
          }
        />

      )}

    </div>
  );
}


/* ============================================================
   IMPORTANT — DEFAULT EXPORT
   ============================================================ */

export default App;