import React from 'react';
import { Sparkles, Brain, ChevronRight } from 'lucide-react';

export default function MemoryCard({ memoryCount, memories = [], onOpenModal }) {
  const latestMemory = memories.length > 0 ? memories[memories.length - 1] : null;

  return (
    <div className="sidebar-glass-card memory-preview-card" onClick={onOpenModal}>
      <div className="card-title-row">
        <Sparkles size={14} className="card-title-icon text-purple" />
        <span className="card-title-text">MEMORY</span>
        <span className="card-count-badge">{memoryCount}</span>
        <ChevronRight size={14} className="card-arrow-icon" />
      </div>

      <div className="memory-card-body">
        {latestMemory ? (
          <>
            <p className="memory-item-content">"{latestMemory.content}"</p>
            <span className="memory-item-meta">{latestMemory.category || 'preference'} • Saved</span>
          </>
        ) : (
          <p className="memory-empty-text">No saved profile memories yet.</p>
        )}
      </div>
    </div>
  );
}
