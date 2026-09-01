import React from 'react';
import './SecondSelfOrb.css';

export default function SecondSelfOrb({ size = 'medium', state = 'idle', className = '' }) {
  return (
    <div className={`secondself-orb-root orb-size-${size} orb-state-${state} ${className}`}>
      {/* Soft Ambient Halo */}
      <div className="orb-halo-layer" />

      {/* Layer 1: Translucent Outer Rotating Ring */}
      <div className="orb-ring-outer" />

      {/* Layer 2: Middle Orbiting Pulsing Ring */}
      <div className="orb-ring-middle">
        <div className="orb-particle-node" />
        <div className="orb-particle-node-opposite" />
      </div>

      {/* Layer 3: Inner Translucent Refraction Shell */}
      <div className="orb-shell-inner" />

      {/* Core Sphere with Radial Gradient & Inner Sparkle */}
      <div className="orb-core-sphere">
        <div className="orb-core-glimmer" />
        <div className="orb-core-bloom" />
      </div>
    </div>
  );
}
