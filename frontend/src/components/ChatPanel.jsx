import React, { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import SecondSelfOrb from './Orb/SecondSelfOrb';
import { Search, FileText, Calculator, Monitor, Sparkles } from 'lucide-react';

const QUICK_PROMPTS = [
  {
    icon: <Search size={13} className="text-purple" />,
    label: "Search Google for AI agent frameworks",
    query: "Search Google for AI agent frameworks"
  },
  {
    icon: <FileText size={13} className="text-purple" />,
    label: "Open Notepad and type Hello",
    query: "Open Notepad and type Hello from SecondSelf"
  },
  {
    icon: <Calculator size={13} className="text-purple" />,
    label: "Calculate 25 × 17 in Calculator",
    query: "Open Calculator and calculate 25 * 17"
  },
  {
    icon: <Monitor size={13} className="text-purple" />,
    label: "Analyze visible screen context",
    query: "Analyze the current visible desktop screen and explain what is open."
  }
];

export default function ChatPanel({
  messages,
  onSendMessage,
  isThinking,
  onOpenVoice,
  onAnalyzeScreen
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  return (
    <main className="chat-panel-glass-container">
      <div className="chat-messages-viewport" ref={scrollRef}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Quick Action Suggestion Chips (User Friendly Starter Cards) */}
        {messages.length <= 2 && !isThinking && (
          <div className="quick-prompts-section">
            <div className="quick-prompts-header">
              <Sparkles size={13} className="text-purple" />
              <span>Suggested Computer Tasks</span>
            </div>
            <div className="quick-prompts-grid">
              {QUICK_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  className="quick-prompt-chip"
                  onClick={() => onSendMessage(item.query)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isThinking && (
          <div className="chat-message-row twin-message-row thinking-row">
            <div className="message-orb-col">
              <SecondSelfOrb size="small" state="thinking" />
            </div>
            <div className="message-content-col">
              <div className="message-meta-info">
                <span className="message-sender-name">SecondSelf</span>
                <span className="message-timestamp">Thinking...</span>
              </div>
              <div className="message-bubble-box twin-bubble-box thinking-bubble">
                <span className="pulse-typing-dot" />
                <span className="pulse-typing-dot" />
                <span className="pulse-typing-dot" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-wrapper">
        <ChatInput
          onSendMessage={onSendMessage}
          isThinking={isThinking}
          onOpenVoice={onOpenVoice}
          onAnalyzeScreen={onAnalyzeScreen}
        />
      </div>
    </main>
  );
}
