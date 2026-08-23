import React from 'react';
import { Activity, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ActivityPanel({ lastActivity }) {
  const getActivityDetails = () => {
    switch (lastActivity) {
      case 'analyzing':
        return { label: 'UNDERSTANDING', desc: 'Understanding request', icon: <Loader2 size={14} className="animate-spin text-cyan" /> };
      case 'thinking':
        return { label: 'EXECUTING', desc: 'Reasoning & selecting tools', icon: <Loader2 size={14} className="animate-spin text-cyan" /> };
      case 'completed':
        return { label: 'COMPLETED', desc: 'Task completed', icon: <CheckCircle2 size={14} color="#10b981" /> };
      case 'error':
        return { label: 'FAILED', desc: 'Action paused or failed', icon: <AlertCircle size={14} color="#ef4444" /> };
      default:
        return { label: 'SYSTEM IDLE', desc: 'Awaiting instructions', icon: null };
    }
  };

  const details = getActivityDetails();

  return (
    <div className="sidebar-card activity-card">
      <div className="card-header">
        <Activity size={15} className="card-header-icon" />
        <span className="card-header-title">LIVE ACTIVITY</span>
      </div>

      <div className="activity-status-row">
        {details.icon || <span className="activity-indicator-dot idle-dot"></span>}
        <span className="activity-main-text">{details.label}</span>
      </div>

      <div className="activity-description">
        {details.desc}
      </div>
    </div>
  );
}
