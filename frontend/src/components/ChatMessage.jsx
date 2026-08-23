import React from 'react';
import { Bot, User, Globe, Camera, Monitor, Keyboard, MousePointer, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ChatMessage({ message }) {
  const isTwin = message.sender === 'twin';
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;

  const renderToolBadge = (toolCall, idx) => {
    const name = toolCall.name;
    const args = toolCall.arguments || {};
    const success = toolCall.success !== false;
    let icon = <Globe size={13} className="text-cyan" />;
    let label = `Executing ${name}...`;

    if (name === 'browser_search') {
      label = `Searching Google: "${args.query || ''}"`;
    } else if (name === 'browser_open') {
      label = `Opening URL: ${args.url || ''}`;
    } else if (name === 'browser_read') {
      label = `Reading webpage content`;
    } else if (name === 'browser_screenshot') {
      icon = <Camera size={13} className="text-cyan" />;
      label = `Capturing page screenshot`;
    } else if (name === 'browser_current_url') {
      label = `Inspecting active page URL`;
    } else if (name === 'computer_open_app') {
      icon = <Monitor size={13} className="text-cyan" />;
      label = `Opening App: ${args.app || ''}`;
    } else if (name === 'computer_type') {
      icon = <Keyboard size={13} className="text-cyan" />;
      label = `Typing: "${args.text || ''}"`;
    } else if (name === 'computer_click') {
      icon = <MousePointer size={13} className="text-cyan" />;
      label = `Clicking at (${args.x}, ${args.y})`;
    } else if (name === 'computer_move_mouse') {
      icon = <MousePointer size={13} className="text-cyan" />;
      label = `Moving Mouse to (${args.x}, ${args.y})`;
    } else if (name === 'computer_press_key') {
      icon = <Keyboard size={13} className="text-cyan" />;
      label = `Pressing Key: '${args.key || ''}'`;
    } else if (name === 'computer_hotkey') {
      icon = <Keyboard size={13} className="text-cyan" />;
      label = `Shortcut: ${(args.keys || []).join('+')}`;
    } else if (name === 'computer_screenshot') {
      icon = <Camera size={13} className="text-cyan" />;
      label = `Capturing Desktop Screenshot`;
    }

    return (
      <div key={idx} className={`tool-execution-badge ${success ? '' : 'badge-failed'}`}>
        <div className="tool-badge-info">
          {icon}
          <span>{label}</span>
        </div>
        <div className={`tool-badge-status ${success ? 'success' : 'failed'}`}>
          {success ? (
            <>
              <CheckCircle2 size={12} color="#10b981" />
              <span>Complete</span>
            </>
          ) : (
            <>
              <AlertTriangle size={12} color="#ef4444" />
              <span>Failed</span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`message-row ${isTwin ? 'twin-row' : 'user-row'}`}>
      <div className="message-avatar-col">
        {isTwin ? (
          <div className="avatar-icon twin-avatar-icon">
            <Bot size={16} />
          </div>
        ) : (
          <div className="avatar-icon user-avatar-icon">
            <User size={16} />
          </div>
        )}
      </div>

      <div className="message-bubble-wrapper">
        <div className="message-meta">
          <span className="sender-name">{isTwin ? 'SecondSelf Twin' : 'You'}</span>
          <span className="timestamp">{message.timestamp}</span>
        </div>

        {hasToolCalls && (
          <div className="message-tools-container">
            {message.toolCalls.map((tc, idx) => renderToolBadge(tc, idx))}
          </div>
        )}

        <div className={`message-bubble ${isTwin ? 'twin-bubble' : 'user-bubble'}`}>
          <p>{message.text}</p>
        </div>
      </div>
    </div>
  );
}
