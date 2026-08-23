import React from 'react';
import { Database, ShieldCheck } from 'lucide-react';

export default function MemoryStatus({ memoryCount, onOpenModal }) {
  return (
    <div className="sidebar-card memory-status-card">
      <div className="card-header">
        <Database size={15} className="card-header-icon" />
        <span className="card-header-title">PERSONAL MEMORY</span>
      </div>

      <div className="memory-count-display">
        <span className="memory-count-number">{memoryCount}</span>
        <span className="memory-count-label">stored memories</span>
      </div>

      <div className="memory-privacy-notice">
        <ShieldCheck size={12} className="text-emerald" />
        <span>Memory stored locally</span>
      </div>

      <button className="manage-memories-btn" onClick={onOpenModal}>
        Manage Memories
      </button>
    </div>
  );
}
