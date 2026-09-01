import React from 'react';
import SecondSelfOrb from './Orb/SecondSelfOrb';
import { Terminal, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ChatMessage({ message }) {
  const isUser = message.sender === 'user';

  return (
    <div className={`chat-message-row ${isUser ? 'user-message-row' : 'twin-message-row'}`}>
      {!isUser && (
        <div className="message-orb-col">
          <SecondSelfOrb size="small" state={message.status === 'error' ? 'error' : 'idle'} />
        </div>
      )}

      <div className="message-content-col">
        <div className="message-meta-info">
          <span className="message-sender-name">{isUser ? 'You' : 'SecondSelf'}</span>
          <span className="message-timestamp">{message.timestamp}</span>
        </div>

        <div className={`message-bubble-box ${isUser ? 'user-bubble-box' : 'twin-bubble-box'}`}>
          <p className="message-text-body">{message.text}</p>

          {/* Render Tool Executions if present */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="message-tool-calls-container">
              {message.toolCalls.map((tool, idx) => (
                <div key={idx} className="tool-execution-pill">
                  <Terminal size={12} className="tool-icon" />
                  <span className="tool-name">{tool.name || tool.tool}</span>
                  {tool.status === 'success' || tool.result ? (
                    <CheckCircle2 size={12} className="tool-status-icon text-success" />
                  ) : (
                    <AlertTriangle size={12} className="tool-status-icon text-warning" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
