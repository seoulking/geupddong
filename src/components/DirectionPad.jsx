import React, { useEffect, useRef, useState } from 'react';
import nipplejs from 'nipplejs';

const DirectionPad = ({ inputRef, isPC, buttonAreaRef }) => {
  const managerRef = useRef(null);
  const zoneRef = useRef(null);
  const [buttonArea, setButtonArea] = useState(null);

  // 오른쪽 버튼 영역 감지 (게임이 시작된 후에만)
  useEffect(() => {
    const updateButtonArea = () => {
      // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 감지
      setTimeout(() => {
        const buttons = document.querySelectorAll('[data-control-button]');
        if (buttons.length > 0) {
          let minLeft = Infinity;
          let maxRight = -Infinity;
          let minTop = Infinity;
          let maxBottom = -Infinity;
          
          buttons.forEach(button => {
            const rect = button.getBoundingClientRect();
            minLeft = Math.min(minLeft, rect.left);
            maxRight = Math.max(maxRight, rect.right);
            minTop = Math.min(minTop, rect.top);
            maxBottom = Math.max(maxBottom, rect.bottom);
          });
          
          // 여유 공간 추가 (버튼 주변 20px)
          setButtonArea({
            left: minLeft - 20,
            right: maxRight + 20,
            top: minTop - 20,
            bottom: maxBottom + 20
          });
        }
      }, 100);
    };
    
    updateButtonArea();
    const interval = setInterval(updateButtonArea, 1000); // 1초마다 업데이트
    window.addEventListener('resize', updateButtonArea);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateButtonArea);
    };
  }, []);

  useEffect(() => {
    if (!zoneRef.current) {
      console.warn('Zone ref is null');
      return;
    }

    // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 초기화
    const initTimeout = setTimeout(() => {
      if (!zoneRef.current) return;

      const options = {
        zone: zoneRef.current,
        mode: 'dynamic', // 터치한 곳에 조이스틱 생성 (Unity 스타일)
        position: { left: '50%', top: '50%' },
        color: 'white',
        size: 120,
        restOpacity: 0.2, // 조금 더 보이게
        threshold: 0.1, // 데드존
        multitouch: true,
        catchDistance: 150 // 조이스틱이 손가락을 따라오는 거리
      };

      // 기존 매니저가 있다면 제거
      if (managerRef.current) {
        try {
          managerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying manager:', e);
        }
      }

      try {
        // nipple.js 인스턴스 생성
        const manager = nipplejs.create(options);
        managerRef.current = manager;
        
        // 디버깅: 조이스틱 생성 확인
        console.log('✅ Joystick manager created:', manager);
        console.log('Zone element:', zoneRef.current);
        
        // 이벤트 바인딩
        manager.on('start', (evt, data) => {
          console.log('🎮 Joystick started', { evt, data });
        });

        manager.on('move', (evt, data) => {
          if (inputRef.current && data && data.vector) {
            const force = Math.min(data.force || 1.0, 1.0);
            inputRef.current.joyX = data.vector.x * force;
            inputRef.current.joyY = -data.vector.y * force;
          }
        });

        manager.on('end', () => {
          console.log('🎮 Joystick ended');
          if (inputRef.current) {
            inputRef.current.joyX = 0;
            inputRef.current.joyY = 0;
          }
        });
      } catch (e) {
        console.error('❌ Error creating joystick:', e);
      }
    }, 200);

    return () => {
      clearTimeout(initTimeout);
      if (managerRef.current) {
        try {
          managerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying manager on cleanup:', e);
        }
      }
    };
  }, [inputRef, buttonArea]);

  return (
    <div 
      ref={zoneRef}
      className="absolute inset-0"
      style={{ 
        zIndex: 15, // 버튼(z-50)보다 낮지만 충분히 높게
        touchAction: 'none',
        pointerEvents: 'auto',
        // 오른쪽 버튼 영역 제외 (버튼이 오른쪽에 있으므로)
        ...(buttonArea && typeof window !== 'undefined' ? {
          clipPath: `inset(0 ${window.innerWidth - buttonArea.left + 30}px 0 0)`
        } : {})
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
