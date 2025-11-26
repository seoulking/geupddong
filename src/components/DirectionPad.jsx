import React, { useEffect, useRef } from 'react';
import nipplejs from 'nipplejs';

const DirectionPad = ({ inputRef, isPC }) => {
  const zoneRef = useRef(null);
  const managerRef = useRef(null);

  useEffect(() => {
    // zone이 없으면 리턴
    if (!zoneRef.current) return;

    // 기존 매니저가 있으면 제거
    if (managerRef.current) {
      managerRef.current.destroy();
      managerRef.current = null;
    }

    // nipple.js 생성 - 가장 기본적인 설정
    const manager = nipplejs.create({
      zone: zoneRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'white',
      size: 120
    });

    managerRef.current = manager;

    // move 이벤트
    manager.on('move', (evt, data) => {
      if (inputRef.current && data.vector) {
        const force = Math.min(data.force, 1.0);
        inputRef.current.joyX = data.vector.x * force;
        inputRef.current.joyY = -data.vector.y * force; // Y축 반전
      }
    });

    // end 이벤트
    manager.on('end', () => {
      if (inputRef.current) {
        inputRef.current.joyX = 0;
        inputRef.current.joyY = 0;
      }
    });

    // 클린업
    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, [inputRef]);

  const size = isPC ? '10rem' : '7rem';

  return (
    <div 
      ref={zoneRef}
      style={{ 
        width: size,
        height: size,
        position: 'relative',
        touchAction: 'none',
        pointerEvents: 'auto',
        zIndex: 100,
        // 배경을 추가해서 터치 영역이 확실히 잡히도록
        backgroundColor: 'rgba(50, 50, 50, 0.3)',
        borderRadius: '50%',
        border: '2px solid rgba(100, 100, 100, 0.5)'
      }}
    />
  );
};

export default DirectionPad;
