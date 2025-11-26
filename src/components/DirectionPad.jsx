import React, { useEffect, useRef } from 'react';
import nipplejs from 'nipplejs';

const DirectionPad = ({ inputRef, isPC }) => {
  const zoneRef = useRef(null);
  const managerRef = useRef(null);

  useEffect(() => {
    if (!zoneRef.current) return;

    // nipple.js 생성
    const manager = nipplejs.create({
      zone: zoneRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'white',
      size: isPC ? 150 : 120
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
  }, [inputRef, isPC]);

  const size = isPC ? '10rem' : '8rem';

  return (
    <div 
      ref={zoneRef}
      className="rounded-full bg-gray-800/50 border-2 border-gray-600"
      style={{ 
        width: size,
        height: size,
        touchAction: 'none'
      }}
    />
  );
};

export default DirectionPad;
