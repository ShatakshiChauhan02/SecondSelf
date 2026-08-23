import React, { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { MessageSquare, Bot } from 'lucide-react';

export default function ChatPanel({ messages, onSendMessage, isThinking }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  return (
    <main className="chat-panel-container">
      <div className="chat-panel-header">
        <MessageSquare size={16} className="text-secondary" />
        <h2>CONVERSATION</h2>
      </div>

      <div className="chat-messages-scroll" ref={scrollRef}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isThinking && (
          <div className="message-row twin-row thinking-row">
            <div className="message-avatar-col">
              <div className="avatar-icon twin-avatar-icon">
                <Bot size={16} />
              </div>
            </div>
            <div className="message-bubble-wrapper">
              <div className="message-meta">
                <span className="sender-name">SecondSelf Twin</span>
                <span className="timestamp">Thinking...</span>
              </div>
              <div className="message-bubble twin-bubble thinking-bubble">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-container">
        <ChatInput onSendMessage={onSendMessage} isThinking={isThinking} />
      </div>
    </main>
  );
}
