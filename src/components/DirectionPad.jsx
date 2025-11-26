import React, { useEffect, useRef } from 'react';
import nipplejs from 'nipplejs';

const DirectionPad = ({ inputRef, isPC }) => {
  const zoneRef = useRef(null);
  const managerRef = useRef(null);

  useEffect(() => {
    if (!zoneRef.current) return;

    // nipple.js 생성 - dynamic 모드 (터치한 곳에 조이스틱 생성)
    const manager = nipplejs.create({
      zone: zoneRef.current,
      mode: 'dynamic',
      position: { left: '50%', top: '50%' },
      color: 'white',
      size: 120,
      catchDistance: 150,
      restOpacity: 0.5,
      fadeTime: 100
    });

    managerRef.current = manager;

    manager.on('move', (evt, data) => {
      if (inputRef.current && data.vector) {
        const force = Math.min(data.force, 1.0);
        inputRef.current.joyX = data.vector.x * force;
        inputRef.current.joyY = -data.vector.y * force; // Y축 반전 유지
      }
    });

    manager.on('end', () => {
      if (inputRef.current) {
        inputRef.current.joyX = 0;
        inputRef.current.joyY = 0;
      }
    });

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
      if (inputRef.current) {
        inputRef.current.joyX = 0;
        inputRef.current.joyY = 0;
      }
    };
  }, [inputRef]);

  return (
    <div 
      ref={zoneRef}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '60%',
        height: '100%',
        touchAction: 'none',
        zIndex: 10,
        // 배경을 살짝 추가해서 영역 확인 가능하게
        // backgroundColor: 'rgba(255,255,255,0.05)'
      }}
    />
  );
};

export default DirectionPad;
