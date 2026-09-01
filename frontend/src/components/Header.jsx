import React from 'react';
import SecondSelfOrb from './Orb/SecondSelfOrb';
import { Settings, Mic, Monitor, Minimize, Minimize2, X } from 'lucide-react';

export default function Header({
  onToggleCompact,
  onAnalyzeScreen,
  onOpenSettings,
  onOpenVoice,
  isThinking,
  lastActivity
}) {
  const isDesktop = typeof window !== 'undefined' && window.secondselfDesktop?.isElectron;

  const handleMinimize = () => {
    if (window.secondselfDesktop?.minimizeWindow) {
      window.secondselfDesktop.minimizeWindow();
    }
  };

  const handleClose = () => {
    if (window.secondselfDesktop?.closeToTray) {
      window.secondselfDesktop.closeToTray();
    }
  };

  const getOrbState = () => {
    if (isThinking) return 'thinking';
    if (lastActivity === 'analyzing' || lastActivity === 'thinking') return 'working';
    if (lastActivity === 'completed') return 'success';
    if (lastActivity === 'error') return 'error';
    return 'idle';
  };

  const getStatusPill = () => {
    if (isThinking) {
      return { text: 'Thinking...', class: 'status-working' };
    }
    if (lastActivity === 'analyzing') {
      return { text: 'Observing...', class: 'status-working' };
    }
    if (lastActivity === 'error') {
      return { text: 'Action Paused', class: 'status-error' };
    }
    return { text: 'Ready', class: 'status-ready' };
  };

  const statusInfo = getStatusPill();

  return (
    <header className="app-header drag-handle">
      <div className="header-brand no-drag">
        <div className="brand-orb-container">
          <SecondSelfOrb size="small" state={getOrbState()} />
        </div>
        <div className="brand-text">
          <h1 className="brand-title">SecondSelf</h1>
        </div>
        <div className={`status-pill ${statusInfo.class}`}>
          <span className="status-dot"></span>
          <span className="status-label">{statusInfo.text}</span>
        </div>
      </div>

      <div className="header-actions no-drag">
        {onAnalyzeScreen && (
          <button
            className="header-icon-btn"
            onClick={onAnalyzeScreen}
            title="Screen Awareness — Analyze Desktop"
          >
            <Monitor size={15} />
          </button>
        )}

        {onOpenVoice && (
          <button
            className="header-icon-btn"
            onClick={onOpenVoice}
            title="Voice Interaction"
          >
            <Mic size={15} />
          </button>
        )}

        {onOpenSettings && (
          <button
            className="header-icon-btn"
            onClick={onOpenSettings}
            title="Settings & Preferences"
          >
            <Settings size={15} />
          </button>
        )}

        {isDesktop && (
          <>
            <div className="header-divider" />
            <button
              className="header-icon-btn"
              onClick={onToggleCompact}
              title="Compact Orb Overlay Mode (Ctrl+Shift+Space)"
            >
              <Minimize size={14} />
            </button>
            <button
              className="header-icon-btn"
              onClick={handleMinimize}
              title="Minimize to Windows Taskbar"
            >
              <Minimize2 size={14} />
            </button>
            <button
              className="header-icon-btn close-btn"
              onClick={handleClose}
              title="Close to Windows System Tray"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
