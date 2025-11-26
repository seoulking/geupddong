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
        // force를 0.3~1.0 사이로 정규화 (너무 약한 입력 무시)
        const force = Math.min(Math.max(data.force, 0.3), 1.0);
        // 방향만 추출하고 force 적용
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
        width: '50%',  // 화면 왼쪽 50%만 (버튼과 겹치지 않게)
        height: '100%',
        touchAction: 'none',
        zIndex: 10,
        pointerEvents: 'auto'
      }}
    />
  );
};

export default DirectionPad;
