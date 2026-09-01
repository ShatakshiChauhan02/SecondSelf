import React from 'react';
import { Play, Square, CheckCircle, AlertOctagon } from 'lucide-react';

export default function TaskProgressCard({ task, onCancelTask, isThinking }) {
  if (!task && !isThinking) return null;

  const goalText = task?.user_goal || "Executing task...";
  const status = task?.status || (isThinking ? "ACTING" : "IDLE");
  const progressPercent = status === "COMPLETED" ? 100 : (status === "CANCELLED" ? 0 : 75);

  return (
    <div className="task-progress-glass-card">
      <div className="task-progress-header">
        <span className="task-goal-title" title={goalText}>{goalText}</span>
        <span className="task-status-badge">{status}</span>
      </div>

      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="task-progress-footer">
        <span className="progress-percentage-text">{progressPercent}% Completed</span>

        {isThinking && onCancelTask && (
          <button
            className="stop-task-btn"
            onClick={onCancelTask}
            title="Cancel Task Execution"
          >
            <Square size={11} fill="currentColor" />
            <span>Stop Task</span>
          </button>
        )}
      </div>
    </div>
  );
}
