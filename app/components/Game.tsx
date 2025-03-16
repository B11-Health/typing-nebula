import React, { useState, useEffect, useCallback, useRef } from 'react';
import ThreeScene from './ThreeScene';

interface OverlayProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const Overlay: React.FC<OverlayProps> = ({ children, style }) => (
  <div style={{ ...overlayStyles, ...style }}>{children}</div>
);

interface StartScreenProps {
  onStart: () => void;
}
const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => (
  <Overlay>
    <h2 style={titleStyles}>Typing Nebula</h2>
    <button
      style={buttonStyles}
      onClick={() => {
        onStart();
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      Launch Mission
    </button>
  </Overlay>
);

interface HUDProps {
  score: number;
  combo: number;
  health: number;
  level: number;
}
const HUD: React.FC<HUDProps> = ({ score, combo, health, level }) => (
  <div style={hudStyles}>
    <div style={scoreBoardStyles}>
      <p style={scoreTextStyles}>Score: {score}</p>
      <p style={comboTextStyles}>Combo: x{combo.toFixed(1)}</p>
      <p style={levelTextStyles}>Level: {level}</p>
    </div>
    <div style={healthBarContainerStyles}>
      <div style={healthBarLabelStyles}>Shield Integrity</div>
      <div style={healthBarOuterStyles}>
        <div
          style={{
            ...healthBarInnerStyles,
            width: `${health}%`,
            background: health > 60 ? '#00ffcc' : health > 30 ? '#ffcc00' : '#ff4444',
            boxShadow: `0 0 10px ${health > 60 ? '#00ffcc' : health > 30 ? '#ffcc00' : '#ff4444'}`,
            transition: 'width 0.3s ease, background 0.3s ease',
          }}
        />
      </div>
      <div style={healthPercentageStyles}>{health}%</div>
    </div>
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
    <button
      style={buttonStyles}
      onClick={() => {
        onRestart();
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
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
  const [resetSignal, setResetSignal] = useState(0);
  const [shakeHud, setShakeHud] = useState(false);
  const [lightspeed, setLightspeed] = useState(false);
  const [level, setLevel] = useState(1);
  const lightspeedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    lightspeedAudioRef.current = new Audio('/spaceship_jet.mp3');
    lightspeedAudioRef.current.volume = 0.5;
  }, []);

  const startGame = () => {
    setScore(0);
    setHealth(100);
    setCombo(1);
    setLevel(1);
    setGameOver(false);
    setGameStarted(true);
    setResetSignal((prev) => prev + 1);
  };

  const restartGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setResetSignal((prev) => prev + 1);
    setTimeout(() => startGame(), 100);
  };

  const onGameOver = useCallback(() => {
    setGameOver(true);
  }, []);

  const onDamage = useCallback(() => {
    setShakeHud(true);
    setTimeout(() => setShakeHud(false), 300);
  }, []);

  const handleScoreChange = useCallback((newScore: number | ((prev: number) => number)) => {
    setScore((prev) => {
      const updatedScore = typeof newScore === 'function' ? newScore(prev) : newScore;
      const newLevel = updatedScore >= 3000 ? 3 : updatedScore >= 2000 ? 2 : 1;
      if (newLevel > level && !lightspeed) {
        setLightspeed(true);
        if (lightspeedAudioRef.current) {
          lightspeedAudioRef.current.currentTime = 0;
          lightspeedAudioRef.current.play();
        }
        setTimeout(() => {
          setLevel(newLevel); // Update level after lightspeed
          setLightspeed(false);
          if (lightspeedAudioRef.current) lightspeedAudioRef.current.pause(); // Stop jet sound
        }, 10000); // 10 seconds
      }
      return updatedScore;
    });
  }, [level, lightspeed]);

  return (
    <div style={gameContainerStyles}>
      <ThreeScene
        gameStarted={gameStarted}
        onScoreChange={handleScoreChange}
        onHealthChange={setHealth}
        health={health}
        onGameOver={onGameOver}
        resetSignal={resetSignal}
        onComboChange={setCombo}
        onDamage={onDamage}
        level={level}
      />
      <img
        src="/spaceshiphud.png"
        alt="Spaceship HUD"
        style={{
          ...spaceshipHudStyles,
          animation: shakeHud
            ? 'shakeHud 0.3s ease-in-out'
            : lightspeed
            ? 'lightspeed 10s ease-in-out'
            : 'none',
        }}
      />
      {lightspeed && <div style={warpOverlayStyles} className="warp-tunnel" />}
      {!gameStarted && !gameOver && <StartScreen onStart={startGame} />}
      {gameStarted && !gameOver && (
        <HUD score={score} combo={combo} health={health} level={level} />
      )}
      {gameOver && <GameOverScreen score={score} onRestart={restartGame} />}
    </div>
  );
};

// Styles (restored to original 10s timing)
const gameContainerStyles: React.CSSProperties = {
  position: 'relative',
  width: '100vw',
  height: '100vh',
  background: '#000428',
  overflow: 'hidden',
  fontFamily: "'Orbitron', sans-serif",
};

const spaceshipHudStyles: React.CSSProperties = {
  position: 'absolute',
  top: 200,
  left: 0,
  width: '100%',
  height: '100%',
  scale: 2,
  objectFit: 'cover',
  zIndex: 5,
  pointerEvents: 'none',
  opacity: 0.9,
};

const warpOverlayStyles: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)',
  animation: 'warpTunnel 10s ease-in-out',
  zIndex: 4,
  pointerEvents: 'none',
};

const overlayStyles: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'linear-gradient(135deg, rgba(30, 20, 60, 0.95), rgba(0, 20, 40, 0.95))',
  padding: '50px',
  borderRadius: '20px',
  color: '#fff',
  textAlign: 'center',
  boxShadow: '0 15px 40px rgba(0, 0, 0, 0.6), inset 0 0 10px rgba(0, 255, 204, 0.2)',
  animation: 'fadeIn 0.5s ease-in-out',
  zIndex: 10,
  border: '1px solid rgba(0, 255, 204, 0.3)',
};

const gameOverOverlayStyles: React.CSSProperties = {
  ...overlayStyles,
  animation: 'shake 0.5s ease-in-out, fadeIn 0.5s ease-in-out',
};

const titleStyles: React.CSSProperties = {
  fontSize: '3.5rem',
  textShadow: '0 0 15px #00ffcc, 0 0 30px #00ccff',
  marginBottom: '30px',
  letterSpacing: '2px',
};

const buttonStyles: React.CSSProperties = {
  padding: '15px 40px',
  fontSize: '1.3rem',
  color: '#fff',
  background: 'linear-gradient(45deg, #00ffcc, #00ccff)',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  boxShadow: '0 5px 20px rgba(0, 255, 204, 0.6)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const hudStyles: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '20px',
  right: '20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  zIndex: 10,
};

const scoreBoardStyles: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.8)',
  padding: '15px 20px',
  borderRadius: '12px',
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.4), inset 0 0 5px rgba(0, 255, 204, 0.2)',
  animation: 'slideIn 0.3s ease-out',
  border: '1px solid rgba(0, 255, 204, 0.2)',
};

const scoreTextStyles: React.CSSProperties = {
  fontSize: '1.6rem',
  textShadow: '0 0 8px #00ffcc',
  margin: '5px 0',
  color: '#fff',
};

const comboTextStyles: React.CSSProperties = {
  fontSize: '1.3rem',
  color: '#ffcc00',
  textShadow: '0 0 8px #ffcc00',
  margin: '5px 0',
};

const levelTextStyles: React.CSSProperties = {
  fontSize: '1.4rem',
  color: '#00ccff',
  textShadow: '0 0 8px #00ccff',
  margin: '5px 0',
};

const healthBarContainerStyles: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.8)',
  padding: '15px',
  borderRadius: '12px',
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.4), inset 0 0 5px rgba(0, 255, 204, 0.2)',
  animation: 'slideIn 0.3s ease-out',
  border: '1px solid rgba(0, 255, 204, 0.2)',
};

const healthBarLabelStyles: React.CSSProperties = {
  fontSize: '1.2rem',
  color: '#fff',
  textShadow: '0 0 5px #00ffcc',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const healthBarOuterStyles: React.CSSProperties = {
  width: '200px',
  height: '20px',
  background: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
  overflow: 'hidden',
  border: '1px solid rgba(0, 255, 204, 0.3)',
};

const healthBarInnerStyles: React.CSSProperties = {
  height: '100%',
  borderRadius: '8px',
  transition: 'width 0.3s ease',
};

const healthPercentageStyles: React.CSSProperties = {
  fontSize: '1rem',
  color: '#fff',
  textShadow: '0 0 5px #00ffcc',
  marginTop: '5px',
  textAlign: 'center',
};

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
  @keyframes shakeHud {
    0% { transform: translateX(0) rotate(0); }
    20% { transform: translateX(-25px) rotate(-3deg); }
    40% { transform: translateX(20px) rotate(2deg); }
    60% { transform: translateX(-15px) rotate(-2deg); }
    80% { transform: translateX(10px) rotate(1deg); }
    100% { transform: translateX(0) rotate(0); }
  }
  @keyframes lightspeed {
    0% { transform: perspective(1000px) scale(1); filter: blur(0px); opacity: 0.9; }
    20% { transform: perspective(1000px) scale(1.1) translateZ(-300px); filter: blur(3px); opacity: 1; }
    80% { transform: perspective(1000px) scale(1.1) translateZ(-500px); filter: blur(5px); opacity: 0.7; }
    100% { transform: perspective(1000px) scale(1); filter: blur(0px); opacity: 0.9; }
  }
  @keyframes warpTunnel {
    0% {
      background: radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%);
      opacity: 0;
    }
    10% {
      background: radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%);
      opacity: 1;
    }
    90% {
      background: radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%);
      opacity: 1;
    }
    100% {
      background: radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%);
      opacity: 0;
    }
  }
  .warp-tunnel::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%);
    background-size: 300% 2px;
    animation: streak1 10s linear infinite;
  }
  .warp-tunnel::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, rgba(0,255,255,0) 0%, rgba(0,255,255,0.4) 40%, rgba(0,255,255,0) 100%);
    background-size: 400% 1px;
    animation: streak2 10s linear infinite reverse;
  }
  @keyframes streak1 {
    0% { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }
  @keyframes streak2 {
    0% { background-position: 0% 50%; }
    100% { background-position: 400% 50%; }
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = keyframes;
  document.head.appendChild(styleSheet);
}

export default Game;