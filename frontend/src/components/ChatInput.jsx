import React, { useState } from 'react';
import { Send, Mic, Loader2 } from 'lucide-react';

export default function ChatInput({ onSendMessage, isThinking }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || isThinking) return;
    onSendMessage(text);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <div className={`chat-input-wrapper ${isThinking ? 'disabled' : ''}`}>
        <textarea
          className="chat-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isThinking ? "Thinking..." : "Type a task for your twin..."}
          rows={1}
          disabled={isThinking}
        />

        <div className="input-action-buttons">
          <button
            type="button"
            className="input-btn mic-btn"
            title="Voice input (Visual Placeholder)"
            onClick={() => alert('Voice input is a visual placeholder for future phases.')}
            disabled={isThinking}
          >
            <Mic size={18} />
          </button>

          <button
            type="submit"
            className={`input-btn send-btn ${text.trim() && !isThinking ? 'active' : ''}`}
            disabled={!text.trim() || isThinking}
            title="Send Task to Twin"
          >
            {isThinking ? (
              <Loader2 size={18} className="spin-icon" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
