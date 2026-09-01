import React from 'react';
import { Activity, CheckCircle2, AlertCircle, Loader2, Sparkles, Eye, Terminal, Layers } from 'lucide-react';

export default function AgentActivity({ lastActivity, currentTask }) {
  const getStepIcon = (stepName) => {
    switch (stepName.toUpperCase()) {
      case 'PLANNING':
        return <Layers size={13} className="text-purple" />;
      case 'OBSERVING':
        return <Eye size={13} className="text-purple" />;
      case 'ACTING':
        return <Terminal size={13} className="text-purple" />;
      case 'VERIFYING':
        return <Sparkles size={13} className="text-purple" />;
      case 'COMPLETED':
        return <CheckCircle2 size={13} color="#A78BFA" />;
      default:
        return <Activity size={13} className="text-purple" />;
    }
  };

  const steps = [
    { key: 'PLANNING', label: 'Planning task' },
    { key: 'OBSERVING', label: 'Analyzing screen state' },
    { key: 'ACTING', label: 'Executing tool actions' },
    { key: 'VERIFYING', label: 'Verifying result' },
  ];

  const getStepStatus = (stepKey) => {
    if (lastActivity === 'completed') return 'done';
    if (lastActivity === 'error') return 'failed';
    if (lastActivity === 'analyzing' && stepKey === 'OBSERVING') return 'active';
    if (lastActivity === 'thinking' && (stepKey === 'PLANNING' || stepKey === 'ACTING')) return 'active';
    return 'pending';
  };

  return (
    <div className="sidebar-glass-card activity-timeline-card">
      <div className="card-title-row">
        <Activity size={14} className="card-title-icon" />
        <span className="card-title-text">AGENT ACTIVITY</span>
      </div>

      <div className="activity-timeline-list">
        {steps.map((step) => {
          const status = getStepStatus(step.key);
          return (
            <div key={step.key} className={`timeline-item item-status-${status}`}>
              <div className="timeline-indicator">
                {status === 'active' ? (
                  <Loader2 size={13} className="animate-spin text-purple-bright" />
                ) : status === 'done' ? (
                  <CheckCircle2 size={13} color="#A78BFA" />
                ) : status === 'failed' ? (
                  <AlertCircle size={13} color="#F87171" />
                ) : (
                  <span className="timeline-dot-pending" />
                )}
              </div>
              <span className="timeline-label">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
