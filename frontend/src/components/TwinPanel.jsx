import React from 'react';
import TwinAvatar from './TwinAvatar';
import MemoryStatus from './MemoryStatus';
import BrowserStatus from './BrowserStatus';
import ComputerControlCard from './ComputerControlCard';
import ActivityPanel from './ActivityPanel';

export default function TwinPanel({ lastActivity, memoryCount, onOpenModal }) {
  return (
    <aside className="twin-panel-container">
      <div className="twin-profile-section">
        <TwinAvatar />
        <div className="twin-identity">
          <h2 className="twin-name">SecondSelf Twin</h2>
          <div className="twin-ready-pill">
            <span className="ready-dot"></span>
            <span>Ready to help</span>
          </div>
        </div>
      </div>

      <div className="twin-sidebar-cards">
        <MemoryStatus memoryCount={memoryCount} onOpenModal={onOpenModal} />
        <BrowserStatus />
        <ComputerControlCard />
        <ActivityPanel lastActivity={lastActivity} />
      </div>
    </aside>
  );
}
