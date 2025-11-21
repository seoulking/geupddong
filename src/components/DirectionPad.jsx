import React, { useEffect, useRef } from 'react';
import nipplejs from 'nipplejs';

const DirectionPad = ({ inputRef, isPC }) => {
  const managerRef = useRef(null);
  const zoneRef = useRef(null);

  useEffect(() => {
    if (!zoneRef.current) return;

    // PC가 아닐 때(모바일/태블릿)만 조이스틱 활성화
    // 또는 PC에서도 테스트를 위해 활성화할 수 있음
    const options = {
      zone: zoneRef.current,
      mode: 'dynamic', // 터치한 곳에 조이스틱 생성 (Unity 스타일)
      position: { left: '50%', top: '50%' },
      color: 'white',
      size: 100,
      restOpacity: 0.1, // 평소엔 거의 안 보임
      threshold: 0.1, // 데드존
      multitouch: true
    };

    // 기존 매니저가 있다면 제거
    if (managerRef.current) {
      managerRef.current.destroy();
    }

    // nipple.js 인스턴스 생성
    const manager = nipplejs.create(options);
    managerRef.current = manager;

    // 이벤트 바인딩
    manager.on('move', (evt, data) => {
      if (inputRef.current && data.vector) {
        // nipple.js는 vector.x, vector.y를 제공 (단위 벡터 아님, 거리 포함될 수 있음)
        // 하지만 data.vector는 정규화된 값이 아닐 수 있으므로 force를 고려해야 함
        // data.angle.radian, data.force 등을 사용 가능
        
        // 가장 확실한 건 data.vector (정규화된 방향) * data.force (크기)
        // data.instance.frontPosition 등으로 직접 계산도 가능하지만,
        // data.vector가 {x, y} 단위 벡터를 줍니다.
        
        // data.force는 기본 0~2 정도의 값. 1.0으로 클램핑
        const force = Math.min(data.force, 1.0);
        
        inputRef.current.joyX = data.vector.x * force;
        inputRef.current.joyY = -data.vector.y * force; // Y축 반전 주의 (nipple.js는 위가 양수일 수 있음, 확인 필요)
        // nipple.js: up is +y in screen coords? No, usually screen y is down.
        // nipple.js 'up' angle gives vector y positive.
        // Canvas coordinates: y increases downwards. 
        // So 'up' on joystick should decrease y in game.
        // If nipple.js vector.y is positive for up, we need to invert it for canvas (up is negative).
        // Let's verify: data.vector is {x, y} unit vector. Angle 90deg (up) -> x=0, y=1.
        // We want dy = -1. So joyY = -vector.y
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
      }
    };
  }, [inputRef]);

  return (
    <div 
      ref={zoneRef}
      className="absolute inset-0 z-10 touch-none"
      style={{ 
        // 개발 모드나 PC에서는 영역을 시각적으로 보여줄 수도 있음 (디버깅용)
        // backgroundColor: 'rgba(255, 0, 0, 0.1)' 
      }}
    >
      {/* PC 사용자를 위한 안내 문구 (모바일에서는 터치하면 사라지거나 가려짐) */}
      {isPC && (
        <div className="absolute bottom-8 left-8 text-gray-500 text-xs font-mono pointer-events-none select-none">
           Click & Drag to Move<br/>(Dynamic Joystick)
        </div>
      )}
    </div>
  );
};

export default DirectionPad;
