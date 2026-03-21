import React, { useState, useEffect } from 'react';
import { SPRITE_CONFIG, type SpriteAnimState, type SpritesheetConfig } from '../utils/spriteConfig';

interface SpriteAnimatorProps {
  imageUrl: string | null | undefined;
  animState: SpriteAnimState;
  displayHeight: number; // px
  style?: React.CSSProperties;
  configOverride?: SpritesheetConfig | null;
}

const SpriteAnimator: React.FC<SpriteAnimatorProps> = ({ imageUrl, animState, displayHeight, style, configOverride }) => {
  const [frameIdx, setFrameIdx] = useState(0);

  const config = configOverride ?? (imageUrl ? SPRITE_CONFIG[imageUrl] : undefined);

  useEffect(() => {
    if (!config) return;
    setFrameIdx(0);

    const anim = config.animations[animState] ?? config.animations['idle'];
    if (anim.frames <= 1) return;

    const fps = anim.fps ?? 8;
    const id = setInterval(() => {
      setFrameIdx(f => {
        const next = f + 1;
        if (anim.freeze && next >= anim.frames) return anim.frames - 1;
        return next % anim.frames;
      });
    }, 1000 / fps);

    return () => clearInterval(id);
  }, [animState, config]);

  // Fallback: image statique si pas de config spritesheet
  if (!config || !imageUrl) {
    if (!imageUrl) return null;
    return (
      <img
        src={imageUrl}
        alt=""
        style={{ height: displayHeight, width: 'auto', ...style }}
      />
    );
  }

  const anim = config.animations[animState] ?? config.animations['idle'];
  const col = (anim.startFrame ?? 0) + frameIdx;
  const row = anim.row;

  const scale = displayHeight / config.frameH;
  const displayWidth = config.frameW * scale;
  const bgW = config.cols * config.frameW * scale;
  const bgH = config.rows * config.frameH * scale;
  const bgX = -col * config.frameW * scale;
  const bgY = -row * config.frameH * scale;

  return (
    <div
      style={{
        width: displayWidth,
        height: displayHeight,
        backgroundImage: `url(${config.sheet})`,
        backgroundSize: `${bgW}px ${bgH}px`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        flexShrink: 0,
        ...style,
      }}
    />
  );
};

export default SpriteAnimator;
