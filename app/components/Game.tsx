// src/components/Game.tsx
import React, { useState, useEffect, useCallback } from 'react';
import ThreeScene from './ThreeScene';

interface OverlayProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const Overlay: React.FC<OverlayProps> = ({ children, style }) => (
  <div style={{ ...overlayStyles, ...style }}>
    {children}
  </div>
);

interface StartScreenProps {
  onStart: () => void;
}
const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => (
  <Overlay>
    <h2 style={titleStyles}>Typing Nebula</h2>
    <button style={buttonStyles} onClick={() => {
      new Audio('/start.wav').play().catch(() => {}); // Add start sound
      onStart();
    }}>
      Launch Mission
    </button>
  </Overlay>
);

interface ScoreBoardProps {
  score: number;
  combo: number;
}
const ScoreBoard: React.FC<ScoreBoardProps> = ({ score, combo }) => (
  <div style={scoreBoardStyles}>
    <p style={scoreTextStyles}>Score: {score}</p>
    <p style={comboTextStyles}>Combo: x{combo.toFixed(1)}</p>
  </div>
);

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
}
const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, onRestart }) => (
  <Overlay style={gameOverOverlayStyles}>
    <h2 style={titleStyles}>Mission Failed</h2>
    <p style={scoreTextStyles}>Final Score: {score}</p>
    <button style={buttonStyles} onClick={() => {
      new Audio('/restart.wav').play().catch(() => {}); // Add restart sound
      onRestart();
    }}>
      Retry Mission
    </button>
  </Overlay>
);

const Game: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [combo, setCombo] = useState(1);

  const startGame = () => {
    setScore(0);
    setHealth(100);
    setCombo(1);
    setGameOver(false);
    setGameStarted(true);
  };

  const restartGame = () => {
    setGameStarted(false);
    setTimeout(() => startGame(), 100);
  };

  const onGameOver = useCallback(() => {
    setGameOver(true);
  }, []);

  // Simulate combo updates for demo purposes
  useEffect(() => {
    if (gameStarted && !gameOver) {
      const interval = setInterval(() => {
        setCombo((prev) => Math.min(3, prev + 0.1));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [gameStarted, gameOver]);

  return (
    <div style={gameContainerStyles}>
      <ThreeScene
        gameStarted={gameStarted}
        onScoreChange={setScore}
        onHealthChange={setHealth}
        health={health}
        onGameOver={onGameOver}
      />
      {!gameStarted && !gameOver && <StartScreen onStart={startGame} />}
      {gameStarted && !gameOver && <ScoreBoard score={score} combo={combo} />}
      {gameOver && <GameOverScreen score={score} onRestart={restartGame} />}
    </div>
  );
};

const gameContainerStyles: React.CSSProperties = {
  position: 'relative',
  width: '100vw',
  height: '100vh',
  background: '#000428', // Match ThreeScene background
  overflow: 'hidden',
};

const overlayStyles: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'linear-gradient(135deg, rgba(30, 20, 60, 0.9), rgba(0, 20, 40, 0.9))',
  padding: '40px',
  borderRadius: '15px',
  color: '#fff',
  textAlign: 'center',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
  animation: 'fadeIn 0.5s ease-in-out',
  zIndex: 10,
};

const gameOverOverlayStyles: React.CSSProperties = {
  ...overlayStyles,
  animation: 'shake 0.5s ease-in-out, fadeIn 0.5s ease-in-out',
};

const titleStyles: React.CSSProperties = {
  fontSize: '3rem',
  fontFamily: "'Orbitron', sans-serif", // Use a sci-fi font
  textShadow: '0 0 10px #00ffcc, 0 0 20px #00ffcc',
  marginBottom: '20px',
};

const buttonStyles: React.CSSProperties = {
  padding: '15px 30px',
  fontSize: '1.2rem',
  fontFamily: "'Orbitron', sans-serif",
  color: '#fff',
  background: 'linear-gradient(45deg, #00ffcc, #00ccff)',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  boxShadow: '0 5px 15px rgba(0, 255, 204, 0.5)',
  transition: 'transform 0.2s, box-shadow 0.2s',
};

const scoreBoardStyles: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '20px',
  color: '#fff',
  background: 'rgba(0, 0, 0, 0.7)',
  padding: '15px',
  borderRadius: '10px',
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
  zIndex: 10,
  animation: 'slideIn 0.3s ease-out',
};

const scoreTextStyles: React.CSSProperties = {
  fontSize: '1.5rem',
  fontFamily: "'Orbitron', sans-serif",
  textShadow: '0 0 5px #00ffcc',
  margin: '5px 0',
};

const comboTextStyles: React.CSSProperties = {
  fontSize: '1.2rem',
  fontFamily: "'Orbitron', sans-serif",
  color: '#ffcc00',
  textShadow: '0 0 5px #ffcc00',
  margin: '5px 0',
};

// Add these keyframes to your CSS or a <style> tag in your index.html
const keyframes = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideIn {
    from { transform: translateY(-50px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes shake {
    0% { transform: translate(-50%, -50%) translateX(0); }
    25% { transform: translate(-50%, -50%) translateX(-10px); }
    50% { transform: translate(-50%, -50%) translateX(10px); }
    75% { transform: translate(-50%, -50%) translateX(-5px); }
    100% { transform: translate(-50%, -50%) translateX(0); }
  }
`;

// Inject keyframes into the document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = keyframes;
  document.head.appendChild(styleSheet);
}

export default Game;