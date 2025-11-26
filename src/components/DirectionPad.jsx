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
      catchDistance: 150
    });

    managerRef.current = manager;

    manager.on('move', (evt, data) => {
      if (inputRef.current && data.vector) {
        const force = Math.min(data.force, 1.0);
        inputRef.current.joyX = data.vector.x * force;
        inputRef.current.joyY = -data.vector.y * force;
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
    };
  }, [inputRef]);

  return (
    <div 
      ref={zoneRef}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '60%',  // 화면 왼쪽 60%
        height: '100%',
        touchAction: 'none',
        zIndex: 10
      }}
    />
  );
};

export default DirectionPad;
