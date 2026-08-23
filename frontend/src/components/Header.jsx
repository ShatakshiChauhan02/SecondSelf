import React, { useState, useEffect, useCallback } from 'react';
import { Bot, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function Header() {
  const [online, setOnline] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET' });
      if (response.ok) {
        setOnline(true);
      } else {
        setOnline(false);
      }
    } catch {
      setOnline(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon-wrapper">
          <Bot size={22} className="brand-bot-icon" />
        </div>
        <div className="brand-titles">
          <h1 className="header-title">SecondSelf</h1>
          <span className="header-subtitle">Windows AI Digital Twin</span>
        </div>
      </div>

      <div className="header-controls">
        <div className={`twin-status-pill ${online ? 'online' : 'offline'}`}>
          <span className="status-indicator-dot"></span>
          <span className="status-label">
            {checking ? 'Checking Status...' : online ? 'Twin Online' : 'Offline'}
          </span>
        </div>
        <button 
          className="header-refresh-btn"
          onClick={checkHealth}
          title="Refresh Backend Status"
        >
          <RefreshCw size={14} className={checking ? 'spin-icon' : ''} />
        </button>
      </div>
    </header>
  );
}
