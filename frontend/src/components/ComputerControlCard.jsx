import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function ComputerControlCard() {
  const [status, setStatus] = useState({
    enabled: false,
    screen_width: 1920,
    screen_height: 1080,
    last_action: 'Disabled'
  });
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/computer/status`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch computer status:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const toggleControl = async (enable) => {
    setLoading(true);
    try {
      const endpoint = enable ? '/api/computer/enable' : '/api/computer/disable';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to toggle computer control:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sidebar-card computer-status-card">
      <div className="card-header">
        <Monitor size={15} className="card-header-icon" />
        <span className="card-header-title">COMPUTER CONTROL</span>
      </div>

      <div className="activity-status-row">
        <span className={`activity-indicator-dot ${status.enabled ? 'online' : 'offline-dot'}`}></span>
        <span className="activity-main-text">
          {status.enabled ? 'Control Enabled' : 'Control Disabled'}
        </span>
      </div>

      <div className="computer-action-row">
        <span className="action-label">Last Action:</span>
        <span className="action-value">{status.last_action}</span>
      </div>

      <div style={{ marginTop: '0.25rem' }}>
        {status.enabled ? (
          <button
            className="computer-toggle-btn disable-btn"
            onClick={() => toggleControl(false)}
            disabled={loading}
          >
            <ShieldAlert size={14} />
            <span>Disable Control</span>
          </button>
        ) : (
          <button
            className="computer-toggle-btn enable-btn"
            onClick={() => toggleControl(true)}
            disabled={loading}
          >
            <ShieldCheck size={14} />
            <span>Enable Computer Control</span>
          </button>
        )}
      </div>
    </div>
  );
}
