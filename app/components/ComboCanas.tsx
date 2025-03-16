import React, { useEffect, useState } from 'react';

interface ComboCanvasProps {
  combo: number;
  level: number;
  health: number;
  gameOver: boolean;
}

const ComboCanvas: React.FC<ComboCanvasProps> = ({ combo, level, health, gameOver }) => {
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [showCombo, setShowCombo] = useState(false);
  const [prevLevel, setPrevLevel] = useState(level);

  useEffect(() => {
    if (combo >= 5 && combo % 5 === 0) {
      setMessage(`🔥 Combo x${combo}! 🔥`);
      setShowCombo(true);
      setTimeout(() => setShowCombo(false), 1500);
    }
  }, [combo]);

  useEffect(() => {
    if (level !== prevLevel) {
      setPrevLevel(level);
      setMessage(`⚠️ WARNING - Enemies Ahead - Level ${level} ⚠️`);
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    }
  }, [level, prevLevel]);

  useEffect(() => {
    if (health <= 20 && health > 0) {
      setMessage('🚨 WARNING - Critical Shield Integrity 🚨');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    }
  }, [health]);

  useEffect(() => {
    if (gameOver) {
      setMessage('💥 MISSION FAILED 💥');
      setShowMessage(true);
    }
  }, [gameOver]);

  return (
    <div style={canvasStyles}>
      {showMessage && (
        <div style={{ ...messageStyles, animation: 'flashIn 0.8s' }}>{message}</div>
      )}
      {showCombo && (
        <div style={{ ...comboStyles, animation: 'zoomBounce 0.5s' }}>{message}</div>
      )}
    </div>
  );
};

const canvasStyles: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 15,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'column',
};

const messageStyles: React.CSSProperties = {
  fontSize: '3rem',
  fontFamily: "'Orbitron', sans-serif",
  color: '#ff0044',
  textShadow: '0 0 20px #ff0044',
  textAlign: 'center',
};

const comboStyles: React.CSSProperties = {
  fontSize: '2.8rem',
  fontFamily: "'Orbitron', sans-serif",
  color: '#ffcc00',
  textShadow: '0 0 20px #ffcc00',
  textAlign: 'center',
};

const keyframes = `
@keyframes flashIn {
  0% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes zoomBounce {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.5); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}`;

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = keyframes;
  document.head.appendChild(styleEl);
}

export default ComboCanvas;
