// src/components/Tamagotchi.tsx
import React from "react";
import "./Tamagotchi.css";

// Import sprites from assets folder
import cryingSprite from '../assets/tamagotchi-crying.png';
import defaultSprite from '../assets/tamagotchi-default.png';
import eatingSprite from '../assets/tamagotchi-eating.png';
import happySprite from '../assets/tamagotchi-happy.png';
import sadSprite from '../assets/tamagotchi-sad.png';

interface TamagotchiProps {
  health: number;
  happiness: number;
  pocketMoney: number;
  pocketMoneyPercentage: number;
  totalPocketMoney: number;
}

const StatBar: React.FC<{
  label: string;
  value: number;
  ariaLabel?: string;
  fillClass?: string;
  showAmount?: boolean;
  amount?: number;
  totalAmount?: number;
}> = ({ label, value, ariaLabel, fillClass = "", showAmount = false, amount, totalAmount }) => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="stat-row" aria-label={ariaLabel ?? label}>
      <div className="stat-header">
        <div className="stat-label">
          {label}
        </div>
        <div className="stat-percentage">{pct}%</div>
      </div>
      <div className="stat-track">
        <div
          className={`stat-fill ${fillClass}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        />
      </div>
      {showAmount && amount !== undefined && totalAmount !== undefined && (
        <div className="stat-amount-display">
          €{amount.toFixed(2)} z €{totalAmount.toFixed(2)}
        </div>
      )}
    </div>
  );
};

const Tamagotchi: React.FC<TamagotchiProps> = ({ 
  health, 
  happiness, 
  pocketMoney,
  pocketMoneyPercentage,
  totalPocketMoney 
}) => {
  // Determine which sprite to show based on health and happiness
  const getSpriteImage = () => {
    if (health < 30 || happiness < 30) {
      return { src: cryingSprite, frames: 4 }; // Very low stats - crying
    } else if (health < 50 || happiness < 50) {
      return { src: sadSprite, frames: 13 }; // Low stats - sad
    } else if (health > 80 && happiness > 80) {
      return { src: happySprite, frames: 4 }; // High stats - happy
    } else if (pocketMoneyPercentage < 30) {
      return { src: eatingSprite, frames: 16 }; // Low pocket money - eating/spending
    } else {
      return { src: defaultSprite, frames: 10 }; // Normal - default
    }
  };

  const spriteData = getSpriteImage();
  
  // Determine the CSS class based on frame count
  const getFrameClass = (frames: number) => {
    if (frames === 4) return 'frames-4';
    if (frames === 13) return 'frames-13';
    if (frames === 16) return 'frames-16';
    return ''; // default is 10 frames
  };

  return (
    <div className="card tamagotchi-card">
      <div className="tamagotchi-top">
        <div className="tamagotchi-avatar">
          <img 
            src={spriteData.src} 
            alt="Tamagotchi sprite" 
            className={`tamagotchi-sprite ${getFrameClass(spriteData.frames)}`}
          />
        </div>
        <div className="tamagotchi-title">Tamagotchi</div>
      </div>

      <div className="tamagotchi-stats">
        <StatBar 
          label="Zdravie / HP" 
          value={health} 
          fillClass="fill-green" 
        />
        <StatBar 
          label="Šťastie" 
          value={happiness} 
          fillClass="fill-red" 
        />
        <StatBar 
          label="Vreckové" 
          value={pocketMoneyPercentage} 
          fillClass="fill-blue"
          showAmount={true}
          amount={pocketMoney}
          totalAmount={totalPocketMoney}
        />
      </div>

      {pocketMoneyPercentage < 20 && (
        <div className="tamagotchi-warning">
          <p className="warning-text">⚠️ Málo peňazí!</p>
        </div>
      )}
    </div>
  );
};

export default Tamagotchi;