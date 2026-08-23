import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Globe2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function BrowserStatus() {
  const [status, setStatus] = useState({
    running: false,
    current_url: 'about:blank',
    last_action: 'Idle'
  });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/browser/status`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch browser status:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return (
    <div className="sidebar-card browser-status-card">
      <div className="card-header">
        <Globe size={15} className="card-header-icon" />
        <span className="card-header-title">BROWSER</span>
      </div>

      <div className="activity-status-row">
        <span className={`activity-indicator-dot ${status.running ? 'online' : 'idle-dot'}`}></span>
        <span className="activity-main-text">
          {status.running ? 'Browser Active' : 'Ready (Chromium)'}
        </span>
      </div>

      <div className="browser-url-row">
        <Globe2 size={12} className="text-muted" />
        <span className="browser-url-text" title={status.current_url}>
          {status.current_url.length > 28 ? status.current_url.substring(0, 28) + '...' : status.current_url}
        </span>
      </div>

      <div className="browser-action-row">
        <span className="action-label">Last Action:</span>
        <span className="action-value">{status.last_action}</span>
      </div>
    </div>
  );
}
