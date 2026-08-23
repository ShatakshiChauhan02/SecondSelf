import React from 'react';

export default function TwinAvatar() {
  return (
    <div className="avatar-wrapper">
      <div className="avatar-ambient-glow"></div>
      <div className="avatar-container">
        <div className="avatar-outer-ring"></div>
        <div className="avatar-orbit-ring">
          <div className="orbit-node"></div>
        </div>
        <div className="avatar-inner-ring"></div>
        <div className="avatar-core-sphere">
          <div className="core-sparkle"></div>
        </div>
      </div>
    </div>
  );
}
