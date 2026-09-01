import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, ShieldAlert, X, Cpu, Database, Info, Sliders } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function SettingsPanel({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('computer');
  const [computerStatus, setComputerStatus] = useState({ enabled: false, last_action: 'Disabled' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch(`${API_BASE_URL}/api/computer/status`)
        .then(res => res.json())
        .then(data => setComputerStatus(data))
        .catch(err => console.warn('Failed to fetch computer status:', err));
    }
  }, [isOpen]);

  const toggleComputerControl = async (enable) => {
    setLoading(true);
    try {
      const endpoint = enable ? '/api/computer/enable' : '/api/computer/disable';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setComputerStatus(data);
      }
    } catch (err) {
      console.error('Failed to toggle computer control:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay-backdrop">
      <div className="settings-modal-card">
        <div className="settings-header">
          <div className="settings-header-title">
            <Settings size={16} className="text-purple" />
            <h2>Settings</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="settings-layout-body">
          <div className="settings-sidebar-nav">
            <button
              className={`settings-nav-item ${activeTab === 'computer' ? 'active' : ''}`}
              onClick={() => setActiveTab('computer')}
            >
              <ShieldCheck size={14} />
              <span>Computer Control</span>
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'provider' ? 'active' : ''}`}
              onClick={() => setActiveTab('provider')}
            >
              <Cpu size={14} />
              <span>AI Provider</span>
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              <Info size={14} />
              <span>About SecondSelf</span>
            </button>
          </div>

          <div className="settings-tab-content">
            {activeTab === 'computer' && (
              <div className="tab-pane">
                <h3>Windows Computer Control</h3>
                <p className="tab-desc">
                  Allow SecondSelf to execute mouse clicks, type text, and open Windows applications on your behalf.
                </p>

                <div className="settings-card-item">
                  <div className="setting-info-row">
                    <span className="setting-label font-semibold">Status:</span>
                    <span className={`setting-status-badge ${computerStatus.enabled ? 'enabled' : 'disabled'}`}>
                      {computerStatus.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div className="setting-toggle-row">
                    {computerStatus.enabled ? (
                      <button
                        className="settings-btn disable-btn"
                        onClick={() => toggleComputerControl(false)}
                        disabled={loading}
                      >
                        <ShieldAlert size={14} />
                        <span>Disable Computer Control</span>
                      </button>
                    ) : (
                      <button
                        className="settings-btn enable-btn"
                        onClick={() => toggleComputerControl(true)}
                        disabled={loading}
                      >
                        <ShieldCheck size={14} />
                        <span>Enable Computer Control</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'provider' && (
              <div className="tab-pane">
                <h3>LLM Engine & Provider</h3>
                <p className="tab-desc">
                  SecondSelf automatically routes prompts to Gemini Flash with fallback to local Ollama.
                </p>
                <div className="provider-status-card">
                  <div className="provider-item">
                    <span className="provider-name">Primary Provider:</span>
                    <span className="provider-val">Google Gemini (2.5 Flash Lite)</span>
                  </div>
                  <div className="provider-item">
                    <span className="provider-name">Local Fallback:</span>
                    <span className="provider-val">Ollama (Llama3.2)</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="tab-pane">
                <h3>SecondSelf Twin</h3>
                <p className="tab-desc">
                  Version 0.7.0 — Windows AI Digital Twin Prototype
                </p>
                <p className="tab-desc">
                  Observe → Think → Act → Verify Loop active.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
