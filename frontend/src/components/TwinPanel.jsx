import React from 'react';
import SecondSelfOrb from './Orb/SecondSelfOrb';
import MemoryCard from './Memory/MemoryCard';
import AgentActivity from './Agent/AgentActivity';
import TaskProgressCard from './Agent/TaskProgressCard';

export default function TwinPanel({
  lastActivity,
  memoryCount,
  memories,
  onOpenModal,
  isThinking,
  currentTask,
  onCancelTask
}) {
  const getOrbState = () => {
    if (isThinking) return 'thinking';
    if (lastActivity === 'analyzing' || lastActivity === 'thinking') return 'working';
    if (lastActivity === 'completed') return 'success';
    if (lastActivity === 'error') return 'error';
    return 'idle';
  };

  return (
    <aside className="twin-panel-container">
      <div className="twin-hero-profile">
        <div className="twin-orb-wrapper">
          <SecondSelfOrb size="medium" state={getOrbState()} />
        </div>
        <div className="twin-identity">
          <h2 className="twin-name">SecondSelf Twin</h2>
          <span className="twin-subtitle">Windows AI Digital Twin</span>
        </div>
      </div>

      <div className="twin-sidebar-cards">
        <TaskProgressCard
          task={currentTask}
          onCancelTask={onCancelTask}
          isThinking={isThinking}
        />

        <AgentActivity
          lastActivity={lastActivity}
          currentTask={currentTask}
        />

        <MemoryCard
          memoryCount={memoryCount}
          memories={memories}
          onOpenModal={onOpenModal}
        />
      </div>
    </aside>
  );
}
