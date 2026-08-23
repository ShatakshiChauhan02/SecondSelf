import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Server, CheckCircle2, XCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function HealthStatus() {
  const [status, setStatus] = useState('checking'); // 'connected' | 'disconnected' | 'checking'
  const [data, setData] = useState(null);
  const [latency, setLatency] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    const startTime = performance.now();
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));

      if (response.ok) {
        const json = await response.json();
        setData(json);
        setStatus('connected');
      } else {
        setStatus('disconnected');
        setData(null);
      }
    } catch (err) {
      console.warn('Backend connection failed:', err);
      setStatus('disconnected');
      setData(null);
      setLatency(null);
    } finally {
      setLastChecked(new Date().toLocaleTimeString());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <section className="status-card">
      <div className="status-header">
        <div className="status-title">
          <Server size={20} className="text-secondary" />
          <h2>Backend Connection</h2>
        </div>
        <div className={`status-badge ${status === 'connected' ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          <span>{status === 'connected' ? 'Connected' : status === 'checking' ? 'Checking...' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="status-details">
        <div className="detail-item">
          <div className="detail-label">Endpoint URL</div>
          <div className="detail-value">{API_BASE_URL}/api/health</div>
        </div>

        <div className="detail-item">
          <div className="detail-label">Status Response</div>
          <div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {status === 'connected' ? (
              <>
                <CheckCircle2 size={16} color="#10b981" />
                <span>{data?.status || 'ok'} ({data?.project || 'SecondSelf'})</span>
              </>
            ) : (
              <>
                <XCircle size={16} color="#ef4444" />
                <span>Unreachable</span>
              </>
            )}
          </div>
        </div>

        <div className="detail-item">
          <div className="detail-label">Latency / Last Check</div>
          <div className="detail-value">
            {latency !== null ? `${latency} ms` : '--'} {lastChecked ? `(${lastChecked})` : ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={checkHealth}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: '500',
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Status</span>
        </button>
      </div>
    </section>
  );
}
