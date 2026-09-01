import React, { useState } from 'react';
import { Send, Mic, Monitor, ArrowUp } from 'lucide-react';

export default function ChatInput({ onSendMessage, isThinking, onOpenVoice, onAnalyzeScreen }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = text.strip ? text.strip() : text.trim();
    if (clean && !isThinking) {
      onSendMessage(clean);
      setText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="chat-input-floating-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        className="chat-text-input"
        placeholder="Ask SecondSelf anything..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isThinking}
      />

      <div className="chat-input-actions-row">
        {onOpenVoice && (
          <button
            type="button"
            className="input-action-btn mic-btn"
            onClick={onOpenVoice}
            title="Voice Interaction"
          >
            <Mic size={15} />
          </button>
        )}

        {onAnalyzeScreen && (
          <button
            type="button"
            className="input-action-btn screen-btn"
            onClick={onAnalyzeScreen}
            title="Analyze Desktop Screen"
          >
            <Monitor size={15} />
          </button>
        )}

        <button
          type="submit"
          className={`input-send-btn ${text.trim() && !isThinking ? 'active' : ''}`}
          disabled={!text.trim() || isThinking}
          title="Send message (Enter)"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </form>
  );
}
