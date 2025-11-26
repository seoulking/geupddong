import React, { useState, useEffect, useRef, useCallback } from 'react';
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { Shield, Zap, MapPin, Activity, RotateCcw, User, Navigation, MousePointer2, Sparkles, Eye, Clock, Crosshair, Maximize } from 'lucide-react';
import packageInfo from '../../package.json';

import { auth, db } from '../lib/firebase';
import { callGemini } from '../lib/gemini';
import { 
  TILE_SIZE, PLAYER_SPEED, SPRINT_MULTIPLIER, MAX_URGENCY, 
  BASE_URGENCY_RATE_PER_SECOND, MAX_STAMINA, BASE_VISION_RADIUS, MAX_VISION_RADIUS 
} from '../game/constants';
import { 
  RAW_MAP_TEMPLATE, MAP_WIDTH_TILES, MAP_HEIGHT_TILES, CENTER_X, CENTER_Y, 
  generateLevel 
} from '../game/maps';
import { checkCollision, toggleFullScreen } from '../game/utils';
import DirectionPad from '../components/DirectionPad';

const APP_VERSION = packageInfo?.version || 'dev';

function Game() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState('intro'); 
  const [stats, setStats] = useState({ urgency: 0, stamina: MAX_STAMINA });
  const [controlsUsed, setControlsUsed] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentGameDuration, setCurrentGameDuration] = useState(null); 
  const [currentMapData, setCurrentMapData] = useState(RAW_MAP_TEMPLATE);
  const [goalPosition, setGoalPosition] = useState({x:0, y:0});
  const [goalPositions, setGoalPositions] = useState([]); 
  const [orientation, setOrientation] = useState('landscape');
  const [isPC, setIsPC] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [aiMessage, setAiMessage] = useState(null);

  const urgencyPercent = Math.max(0, Math.min(100, stats.urgency));
  const urgencyDisplay = Math.round(urgencyPercent);
  const urgencyColor = urgencyPercent >= 80 ? '#ef4444' : urgencyPercent >= 50 ? '#f59e0b' : '#22c55e';

  const canvasRef = useRef(null);
  const containerRef = useRef(null); 
  const requestRef = useRef();
  const playerRef = useRef({ x: CENTER_X, y: CENTER_Y, vx: 0, vy: 0 });
  const inputRef = useRef({ 
    joyX: 0, 
    joyY: 0, 
    keys: {}, 
    sprint: false, 
    hold: false, 
    map: false,
    direction: { up: false, down: false, left: false, right: false } 
  });
  const gameTimeRef = useRef(0);
  const mapRevealTimerRef = useRef(0);
  const aiMessageTimerRef = useRef(0);
  const visionRadiusRef = useRef(BASE_VISION_RADIUS);
  const controlsCountRef = useRef({
    'Physical_Control(Hold)': 0,
    'Tech_Control(Map)': 0,
    'Sprint(Run)': 0,
    'Sprint_Time': 0,
    'Hold_Time': 0,
    'Map_Time': 0
  });
  const controlTimersRef = useRef({
    sprintStart: null,
    holdStart: null,
    mapStart: null,
    lastUpdateTime: null
  });
  const gameStatsRef = useRef({
    maxUrgency: 0,
    minStamina: MAX_STAMINA,
    riskZoneCount: 0, 
    totalDistance: 0, 
    lastPosition: { x: CENTER_X, y: CENTER_Y },
    mapUses: 0, 
    sprintActivations: 0, 
    holdActivations: 0, 
    avgUrgency: 0,
    urgencySamples: [], 
    avgSpeed: 0,
    speedSamples: []
  }); 

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };
    
    if (auth) {
      console.log('🔐 Firebase 인증 시작...');
      if (typeof window !== 'undefined' && window.__initial_auth_token) {
          signInWithCustomToken(auth, window.__initial_auth_token)
            .then((userCredential) => {
              console.log('✅ 커스텀 토큰 인증 완료:', userCredential.user.uid);
            })
            .catch((error) => {
              console.error('❌ 커스텀 토큰 인증 실패:', error);
            });
      } else {
          signInAnonymously(auth)
            .then((userCredential) => {
              console.log('✅ 익명 인증 완료:', userCredential.user.uid);
            })
            .catch((error) => {
              console.error('❌ 익명 인증 실패:', error);
            });
      }
      
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setUser(user);
        }
      });
      setIsPC(!('ontouchstart' in window));
      window.addEventListener('resize', checkOrientation);
      checkOrientation();

      if (containerRef.current) containerRef.current.focus();
      
      return () => {
        unsubscribe();
        window.removeEventListener('resize', checkOrientation);
        cancelAnimationFrame(requestRef.current);
      };
    } else {
      setIsPC(!('ontouchstart' in window));
      window.addEventListener('resize', checkOrientation);
      checkOrientation();

      if (containerRef.current) containerRef.current.focus();
      
      return () => {
        window.removeEventListener('resize', checkOrientation);
        cancelAnimationFrame(requestRef.current);
      };
    }
  }, []);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code) inputRef.current.keys[e.code] = true;
      if (e.key) inputRef.current.keys[e.key.toLowerCase()] = true;
      if (e.code === 'KeyJ' || e.key?.toLowerCase() === 'j') inputRef.current.sprint = true; 
      if (e.code === 'KeyK' || e.key?.toLowerCase() === 'k') inputRef.current.hold = true; 
      if (e.code === 'KeyL' || e.key?.toLowerCase() === 'l') inputRef.current.map = true; 
    };
    const handleKeyUp = (e) => {
      if (e.code) inputRef.current.keys[e.code] = false;
      if (e.key) inputRef.current.keys[e.key.toLowerCase()] = false;
      if (e.code === 'KeyJ' || e.key?.toLowerCase() === 'j') inputRef.current.sprint = false; 
      if (e.code === 'KeyK' || e.key?.toLowerCase() === 'k') inputRef.current.hold = false; 
      if (e.code === 'KeyL' || e.key?.toLowerCase() === 'l') inputRef.current.map = false; 
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const updateGame = useCallback(() => {
    if (gameState !== 'playing') return;
    const player = playerRef.current;
    const input = inputRef.current;
    
    const now = performance.now();
    const deltaTime = controlTimersRef.current.lastUpdateTime 
      ? now - controlTimersRef.current.lastUpdateTime 
      : 16.6; 
    controlTimersRef.current.lastUpdateTime = now;
    
    let dx = 0;
    let dy = 0;
    
    // 조이스틱 입력 우선
    if (input.joyX !== 0 || input.joyY !== 0) {
        dx = input.joyX;
        dy = input.joyY;
    } else {
        if (input.direction.up) dy -= 1;
        if (input.direction.down) dy += 1;
        if (input.direction.left) dx -= 1;
        if (input.direction.right) dx += 1;
        
        if (input.keys['KeyW'] || input.keys['w'] || input.keys['ArrowUp']) dy -= 1;
        if (input.keys['KeyS'] || input.keys['s'] || input.keys['ArrowDown']) dy += 1;
        if (input.keys['KeyA'] || input.keys['a'] || input.keys['ArrowLeft']) dx -= 1;
        if (input.keys['KeyD'] || input.keys['d'] || input.keys['ArrowRight']) dx += 1;

        const len = Math.sqrt(dx*dx + dy*dy);
        if (len > 1) { 
          dx /= len; 
          dy /= len; 
        }
    }

    let speed = PLAYER_SPEED;
    let urgencyMultiplier = 1.0; 
    let targetVision = BASE_VISION_RADIUS; 
    const isInputMoving = dx !== 0 || dy !== 0;
    const isSprinting = input.sprint && stats.stamina > 0;
    const isHolding = input.hold && stats.stamina > 5;

    if (isSprinting) {
      speed *= SPRINT_MULTIPLIER;
      setStats(prev => ({ ...prev, stamina: Math.max(0, prev.stamina - 0.8) })); 
      urgencyMultiplier = 2.5;
      
      if (!controlTimersRef.current.sprintStart) {
        controlTimersRef.current.sprintStart = now;
        gameStatsRef.current.sprintActivations++; 
      }
      
      controlsCountRef.current['Sprint_Time'] += deltaTime;
      
      if (!controlsUsed['Sprint(Run)']) {
        setControlsUsed(prev => ({...prev, 'Sprint(Run)': 1}));
      }
    } else {
      if (controlTimersRef.current.sprintStart) {
        controlTimersRef.current.sprintStart = null;
      }
      setStats(prev => ({ ...prev, stamina: Math.min(MAX_STAMINA, prev.stamina + 0.15) })); 
    }

    if (isHolding && !isSprinting) {
        speed *= 0.2; 
        urgencyMultiplier = 0.4; 
        targetVision = MAX_VISION_RADIUS; 
        setStats(prev => ({ ...prev, stamina: prev.stamina - 0.4 })); 
        
        if (!controlTimersRef.current.holdStart) {
          controlTimersRef.current.holdStart = now;
          gameStatsRef.current.holdActivations++; 
        }
        
        controlsCountRef.current['Hold_Time'] += deltaTime;
        
        if (!controlsUsed['Physical_Control(Hold)']) {
          setControlsUsed(prev => ({...prev, 'Physical_Control(Hold)': 1}));
        }
    } else {
      if (controlTimersRef.current.holdStart) {
        controlTimersRef.current.holdStart = null;
      }
    }

    visionRadiusRef.current += (targetVision - visionRadiusRef.current) * 0.1;

    if (input.map) {
        setShowMap(true);
        speed = 0; 
        // 맵 버튼을 누르면 HOLD 효과처럼 시야 확대
        targetVision = MAX_VISION_RADIUS;
        
        if (!controlTimersRef.current.mapStart) {
          controlTimersRef.current.mapStart = now;
          gameStatsRef.current.mapUses++; 
        }
        
        controlsCountRef.current['Map_Time'] += deltaTime;
        
        if (!controlsUsed['Tech_Control(Map)']) {
          setControlsUsed(prev => ({...prev, 'Tech_Control(Map)': 1}));
        }
        mapRevealTimerRef.current = 60; 
    } else {
        if (mapRevealTimerRef.current > 0) mapRevealTimerRef.current--;
        else setShowMap(false);
    }

    if (aiMessageTimerRef.current > 0) {
        aiMessageTimerRef.current--;
        if (aiMessageTimerRef.current <= 0) setAiMessage(null);
    }

    const currentTile = checkCollision(player.x + TILE_SIZE/2, player.y + TILE_SIZE/2, currentMapData);
    
    if (currentTile === 4) { 
      speed *= 0.3; 
      urgencyMultiplier *= 1.5;
      gameStatsRef.current.riskZoneCount++;
    }

    if (!isInputMoving) {
      player.vx = 0;
      player.vy = 0;
    } else {
      player.vx = dx * speed;
      player.vy = dy * speed;
      if (!isSprinting) {
        if (isHolding) {
          urgencyMultiplier = Math.max(urgencyMultiplier, 1.3); 
        } else {
          urgencyMultiplier = Math.max(urgencyMultiplier, 1.6); 
        }
      }
    }

    const nextX = player.x + player.vx;
    const nextY = player.y + player.vy;
    const hitbox = 10; 

    if (checkCollision(nextX + hitbox, player.y + hitbox, currentMapData) !== 1 && 
        checkCollision(nextX + hitbox, player.y + TILE_SIZE - hitbox, currentMapData) !== 1 &&
        checkCollision(nextX + TILE_SIZE - hitbox, player.y + hitbox, currentMapData) !== 1 &&
        checkCollision(nextX + TILE_SIZE - hitbox, player.y + TILE_SIZE - hitbox, currentMapData) !== 1) {
      player.x = nextX;
    }
    if (checkCollision(player.x + hitbox, nextY + hitbox, currentMapData) !== 1 &&
        checkCollision(player.x + hitbox, nextY + TILE_SIZE - hitbox, currentMapData) !== 1 &&
        checkCollision(player.x + TILE_SIZE - hitbox, nextY + hitbox, currentMapData) !== 1 &&
        checkCollision(player.x + TILE_SIZE - hitbox, nextY + TILE_SIZE - hitbox, currentMapData) !== 1) {
      player.y = nextY;
    }

    const distanceMoved = Math.sqrt(
      Math.pow(player.x - gameStatsRef.current.lastPosition.x, 2) + 
      Math.pow(player.y - gameStatsRef.current.lastPosition.y, 2)
    );
    gameStatsRef.current.totalDistance += distanceMoved;
    gameStatsRef.current.lastPosition = { x: player.x, y: player.y };
    
    const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
    if (Math.random() < 0.06) { 
      gameStatsRef.current.speedSamples.push(currentSpeed);
    }

    const deltaTimeSeconds = deltaTime / 1000;
    const urgencyIncrease = BASE_URGENCY_RATE_PER_SECOND * urgencyMultiplier * deltaTimeSeconds;
    const newUrgency = Math.max(0, Math.min(MAX_URGENCY, stats.urgency + urgencyIncrease));
    
    gameStatsRef.current.maxUrgency = Math.max(gameStatsRef.current.maxUrgency, newUrgency);
    gameStatsRef.current.minStamina = Math.min(gameStatsRef.current.minStamina, stats.stamina);
    
    if (Math.random() < 0.06) { 
      gameStatsRef.current.urgencySamples.push(newUrgency);
    }
    
    if (currentTile === 3) {
      setStats(prev => ({ ...prev, urgency: newUrgency }));
      endGame(true, newUrgency);
      return;
    }

    if (newUrgency >= MAX_URGENCY) {
      setStats(prev => ({ ...prev, urgency: MAX_URGENCY }));
      endGame(false, MAX_URGENCY);
      return;
    }

    setStats(prev => ({ ...prev, urgency: newUrgency }));
    gameTimeRef.current += deltaTime;
  }, [gameState, stats.stamina, controlsUsed, stats.urgency, currentMapData]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const player = playerRef.current;
    
    let zoom = isPC ? 1 : 0.5; // 모바일 기본 줌: 50%
    if (inputRef.current.map) {
        zoom = isPC ? 0.6 : 0.3; // 모바일 맵 모드 줌: 30% 
    }
    
    const cameraX = canvas.width / 2 / zoom - player.x - TILE_SIZE/2;
    const cameraY = canvas.height / 2 / zoom - player.y - TILE_SIZE/2;

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(cameraX, cameraY);

    currentMapData.forEach((row, y) => {
      row.forEach((tile, x) => {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (tile === 1) { 
          ctx.fillStyle = '#444'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#222'; ctx.fillRect(px, py + TILE_SIZE - 8, TILE_SIZE, 8);
        } else if (tile === 3) {
          // 맵 모드일 때는 항상 화장실 표시, 아니면 거리 기반
          const dist = Math.sqrt(Math.pow(player.x - px, 2) + Math.pow(player.y - py, 2));
          if (showMap || dist < 120) {
              ctx.fillStyle = '#4ade80'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('WC', px + 20, py + 25);
          } else {
              ctx.fillStyle = '#333'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
        } else if (tile === 4) {
          ctx.fillStyle = '#7f1d1d'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#fbbf24'; ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⚠️', px + 20, py + 30);
        } else if (tile === 5) {
          ctx.fillStyle = '#facc15'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = '#333'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      });
    });

    ctx.shadowBlur = 10; ctx.shadowColor = '#000';
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath(); ctx.arc(player.x + TILE_SIZE/2, player.y + TILE_SIZE/2, 14, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    
    if (stats.urgency > 50) {
        ctx.fillStyle = `rgba(239, 68, 68, ${(stats.urgency - 50) / 50})`;
        ctx.beginPath(); ctx.arc(player.x + TILE_SIZE/2, player.y + TILE_SIZE/2, 14, 0, Math.PI * 2); ctx.fill();
    }

    if (aiMessage) {
        ctx.font = 'bold 14px sans-serif';
        const textMetrics = ctx.measureText(aiMessage);
        const bx = player.x + TILE_SIZE/2 - (textMetrics.width + 20)/2;
        const by = player.y - 40;
        ctx.fillStyle = 'white'; ctx.roundRect(bx, by, textMetrics.width + 20, 30, 10); ctx.fill();
        ctx.fillStyle = '#2563eb'; ctx.textAlign = 'center'; ctx.fillText(aiMessage, player.x + TILE_SIZE/2, by + 20);
    }
    ctx.restore();

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const visionR = visionRadiusRef.current;
    const gradient = ctx.createRadialGradient(centerX, centerY, visionR * 0.6, centerX, centerY, visionR);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)'); 
    gradient.addColorStop(0.9, 'rgba(0, 0, 0, 0.98)'); 
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)'); 
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath(); ctx.rect(0, 0, canvas.width, canvas.height); ctx.arc(centerX, centerY, visionR, 0, Math.PI * 2, true); ctx.fillStyle = 'black'; ctx.fill();

    requestRef.current = requestAnimationFrame(drawGame);
  }, [gameState, stats.urgency, showMap, aiMessage, currentMapData, goalPosition, goalPositions, isPC]);

  useEffect(() => {
    if (gameState === 'playing') {
      const interval = setInterval(updateGame, 16);
      requestRef.current = requestAnimationFrame(drawGame);
      return () => { clearInterval(interval); cancelAnimationFrame(requestRef.current); };
    }
  }, [gameState, updateGame, drawGame]);

  const startGame = () => {
    toggleFullScreen();
    const { map, goalPos, goalPositions } = generateLevel();
    setCurrentMapData(map);
    setGoalPosition(goalPos);
    setGoalPositions(goalPositions || [goalPos]);
    playerRef.current = { x: CENTER_X, y: CENTER_Y, vx: 0, vy: 0 };
    setStats({ urgency: 0, stamina: MAX_STAMINA });
    setControlsUsed({});
    controlsCountRef.current = {
      'Physical_Control(Hold)': 0,
      'Tech_Control(Map)': 0,
      'Sprint(Run)': 0,
      'Sprint_Time': 0,
      'Hold_Time': 0,
      'Map_Time': 0
    };
    controlTimersRef.current = {
      sprintStart: null,
      holdStart: null,
      mapStart: null,
      lastUpdateTime: null
    };
    gameTimeRef.current = 0;
    setCurrentGameDuration(null); 
    setGameState('playing');
    setAiMessage(null);
    visionRadiusRef.current = BASE_VISION_RADIUS;
    
    gameStatsRef.current = {
      maxUrgency: 0,
      minStamina: MAX_STAMINA,
      riskZoneCount: 0,
      totalDistance: 0,
      lastPosition: { x: CENTER_X, y: CENTER_Y },
      mapUses: 0,
      sprintActivations: 0,
      holdActivations: 0,
      avgUrgency: 0,
      urgencySamples: [],
      avgSpeed: 0,
      speedSamples: []
    };
    
    if(containerRef.current) containerRef.current.focus();
  };

  const endGame = async (success, finalUrgency = null) => {
    setGameState(success ? 'success' : 'fail');
    
    const urgencyToSave = finalUrgency !== null ? finalUrgency : stats.urgency;
    const duration = gameTimeRef.current;
    
    if (success) {
      setCurrentGameDuration(Math.round(duration));
    } else {
      setCurrentGameDuration(null);
    }
    
    const gameStats = gameStatsRef.current;
    const avgUrgency = gameStats.urgencySamples.length > 0
      ? gameStats.urgencySamples.reduce((a, b) => a + b, 0) / gameStats.urgencySamples.length
      : urgencyToSave;
    const avgSpeed = gameStats.speedSamples.length > 0
      ? gameStats.speedSamples.reduce((a, b) => a + b, 0) / gameStats.speedSamples.length
      : 0;
    
    const gameResult = {
      uid: user?.uid || 'anonymous',
      success,
      duration: Math.round(duration),
      timestamp: serverTimestamp(),
      date: new Date().toISOString(),
      
      urgency: Math.round(urgencyToSave * 10) / 10,
      maxUrgency: Math.round(gameStats.maxUrgency * 10) / 10,
      avgUrgency: Math.round(avgUrgency * 10) / 10,
      finalStamina: Math.round(stats.stamina * 10) / 10,
      minStamina: Math.round(gameStats.minStamina * 10) / 10,
      
      controls: controlsUsed, 
      controlsCount: {
        physical: Math.round(controlsCountRef.current['Hold_Time'] / 100) / 10, 
        tech: Math.round(controlsCountRef.current['Map_Time'] / 100) / 10, 
        sprint: Math.round(controlsCountRef.current['Sprint_Time'] / 100) / 10 
      },
      controlsActivations: {
        physical: gameStats.holdActivations, 
        tech: gameStats.mapUses, 
        sprint: gameStats.sprintActivations 
      },
      
      totalDistance: Math.round(gameStats.totalDistance), 
      avgSpeed: Math.round(avgSpeed * 10) / 10, 
      riskZonePasses: gameStats.riskZoneCount, 
      finalPosition: { 
        x: Math.round(playerRef.current.x),
        y: Math.round(playerRef.current.y)
      },
      
      numBathrooms: goalPositions.length, 
      goalPosition: { 
        x: goalPosition.x,
        y: goalPosition.y
      },
      
      platform: isPC ? 'desktop' : 'mobile',
      orientation: orientation
    };
    
    if (!db) {
      console.error('❌ Firestore DB가 초기화되지 않았습니다.');
      alert('데이터베이스 연결 실패. 콘솔을 확인하세요.');
      return;
    }
    
    let currentUser = user;
    if (!currentUser && auth) {
      try {
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
        setUser(currentUser);
        gameResult.uid = currentUser.uid;
      } catch (authError) {
        gameResult.uid = 'anonymous_' + Date.now();
      }
    } else if (currentUser) {
      gameResult.uid = currentUser.uid;
    } else {
      gameResult.uid = 'anonymous_' + Date.now();
    }
    
    try {
      await addDoc(collection(db, 'game_results'), gameResult);
    } catch (e) {
      console.error('❌ Firestore 저장 실패:', e);
      if (e.code === 'permission-denied') {
        alert('데이터 저장 권한 오류. Firestore 보안 규칙을 확인하세요.');
      } else {
        alert(`데이터 저장 실패: ${e.message}`);
      }
    }
    
    fetchLeaderboard();
  };

  const fetchLeaderboard = useCallback(async () => {
    if (!db) return;
    
    try {
      const q = query(
        collection(db, 'game_results'),
        where('success', '==', true),
        orderBy('duration', 'asc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const leaderboardData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        leaderboardData.push({
          id: doc.id,
          duration: data.duration || 0,
          controlsCount: data.controlsCount || {},
          timestamp: data.timestamp?.toDate?.() || (data.date ? new Date(data.date) : new Date())
        });
      });
      
      setLeaderboard(leaderboardData);
    } catch (e) {
      console.error('리더보드 조회 실패:', e);
    }
  }, []);

  useEffect(() => {
    if ((gameState === 'success' || gameState === 'fail') && db) {
      fetchLeaderboard();
    }
  }, [gameState, fetchLeaderboard]);

  useEffect(() => {
    const resetDirections = () => {
      const dir = inputRef.current.direction;
      if (dir.up || dir.down || dir.left || dir.right) {
        inputRef.current.direction = { up: false, down: false, left: false, right: false };
      }
    };
    const handleVisibility = () => {
      if (document.hidden) resetDirections();
    };
    window.addEventListener('blur', resetDirections);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', resetDirections);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const bindControlPointer = useCallback((controlKey) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      inputRef.current[controlKey] = true;
    },
    onPointerUp: (e) => {
      e.preventDefault();
      inputRef.current[controlKey] = false;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    },
    onPointerCancel: () => {
      inputRef.current[controlKey] = false;
    },
    onPointerLeave: (e) => {
      if (e.pointerType === 'mouse' && e.buttons === 0) {
        inputRef.current[controlKey] = false;
      }
    }
  }), []);

  if (orientation === 'portrait') {
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center p-8 text-center z-50">
        <RotateCcw size={48} className="mb-4 animate-spin-slow" />
        <h2 className="text-2xl font-bold mb-4">가로 모드로 돌려주세요</h2>
        <p className="text-gray-400 mb-8">원활한 플레이를 위해 가로 모드가 필요합니다.</p>
        <button onClick={toggleFullScreen} className="px-6 py-3 bg-blue-600 rounded-lg font-bold flex items-center gap-2">
            <Maximize size={20} />전체 화면 켜기
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed bg-gray-900 select-none overflow-hidden touch-none font-sans text-white outline-none" 
         style={{ width: '100vw', height: '100dvh', top: 0, left: 0 }} tabIndex={0}>
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="block w-full h-full" />
      
      {gameState === 'playing' && (
        <>
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none">
             <div className="w-1/2 space-y-1">
                <div className="flex items-center gap-2 text-red-500 font-bold"><Activity size={20}/><span>URGENCY ({urgencyDisplay}%)</span></div>
                <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full transition-none" style={{width: `${urgencyDisplay}%`, backgroundColor: urgencyColor}}/>
                </div>
             </div>
             <div className="w-1/3 flex flex-col items-end">
                <div className="flex items-center gap-1 text-yellow-400"><Zap size={16}/><span>STAMINA</span></div>
                <div className="w-32 h-2 bg-gray-800 rounded-full"><div className="h-full bg-yellow-400" style={{width: `${stats.stamina}%`}}/></div>
             </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 w-full flex items-end justify-between z-20 pointer-events-auto pb-safe"
               style={{ 
                 paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)',
                 paddingLeft: 'max(env(safe-area-inset-left, 0px), 1rem)',
                 paddingRight: 'max(env(safe-area-inset-right, 0px), 1rem)',
                 gap: isPC ? '2rem' : '1rem'
               }}>
             
             {/* Dynamic Joystick Zone: 오른쪽 버튼 영역을 제외한 전체 화면 */}
             <DirectionPad inputRef={inputRef} isPC={isPC} buttonAreaRef={null} />
             
             {/* 우측: RUN, HOLD(가장 크게), MAP 버튼 그룹 (오른쪽 끝 정렬) */}
             <div className="flex-1 flex justify-end gap-3 items-end z-50" style={{ gap: isPC ? '1rem' : '0.75rem' }}>
                 <div className="flex flex-col items-center" style={{ marginBottom: isPC ? '0.5rem' : '0.25rem' }}>
                  <button 
                    data-control-button
                    className={`rounded-full border-4 flex flex-col items-center justify-center ${inputRef.current.sprint ? 'bg-blue-600' : 'bg-blue-600/80'}`}
                     style={{ width: isPC ? '5rem' : '4.5rem', height: isPC ? '5rem' : '4.5rem', touchAction: 'none' }}
                     {...bindControlPointer('sprint')}>
                     <Navigation size={isPC ? 28 : 24} /><span className={`${isPC ? 'text-xs' : 'text-[10px]'} font-bold`}>RUN</span>
                  </button>
                  {isPC && <span className="text-xs text-gray-500 mt-1">J</span>}
                </div>
                <div className="flex flex-col items-center" style={{ marginBottom: isPC ? '0' : '0.5rem' }}>
                  <button 
                    data-control-button
                    className={`rounded-full border-2 flex flex-col items-center justify-center backdrop-blur-md ${inputRef.current.hold ? 'bg-green-600 ring-4 ring-green-400/30' : 'bg-green-500/20 border-green-400'}`}
                     style={{ width: isPC ? '7rem' : '6rem', height: isPC ? '7rem' : '6rem', touchAction: 'none' }}
                     {...bindControlPointer('hold')}>
                     <Eye size={isPC ? 32 : 28} /><span className={`${isPC ? 'text-sm' : 'text-xs'} font-bold`}>HOLD</span>
                  </button>
                  {isPC && <span className="text-xs text-gray-500 mt-1">K</span>}
                </div>
                <div className="flex flex-col items-center" style={{ marginTop: isPC ? '-0.5rem' : '-0.5rem' }}>
                  <button 
                    data-control-button
                    className={`rounded-full border-2 flex flex-col items-center justify-center ${inputRef.current.map ? 'bg-purple-600' : 'bg-purple-500/20'}`}
                     style={{ width: isPC ? '4.5rem' : '4rem', height: isPC ? '4.5rem' : '4rem', touchAction: 'none' }}
                     {...bindControlPointer('map')}>
                     <Crosshair size={isPC ? 22 : 20} /><span className={`${isPC ? 'text-xs' : 'text-[10px]'} font-bold`}>MAP</span>
                  </button>
                  {isPC && <span className="text-xs text-gray-500 mt-1">L</span>}
                </div>
             </div>
          </div>
        </>
      )}
      
      {gameState !== 'playing' && (
         <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-4 z-30 overflow-y-auto">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600 mb-4 italic mt-8">URGENCY PROTOCOL</h1>
            
            {gameState === 'intro' ? (
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl max-w-md w-full space-y-4">
                    <div className="text-center text-[10px] uppercase tracking-[0.3em] text-gray-500">
                      BUILD v{APP_VERSION}
                    </div>
                    <div className="space-y-2 text-xs bg-black/40 p-3 rounded text-gray-300">
                        <div className="flex justify-between"><span className="text-blue-400 font-bold">RUN (J)</span> <span>달리기 - 속도 증가, 위급도 증가</span></div>
                        <div className="flex justify-between"><span className="text-green-400 font-bold">HOLD (K)</span> <span>필수. 위급도 억제 & 시야 확보</span></div>
                        <div className="flex justify-between"><span className="text-purple-400 font-bold">MAP (L)</span> <span>어둠 속 화장실 탐지.</span></div>
                    </div>
                    <button onClick={startGame} className="w-full py-4 bg-red-700 hover:bg-red-600 font-bold text-lg rounded flex items-center justify-center gap-2">
                        <Maximize size={18} />
                        <span>전체 화면으로 시작 (START)</span>
                    </button>
                    <p className="text-[10px] text-gray-600 text-center">시작 시 자동으로 전체 화면으로 전환됩니다.</p>
                </div>
            ) : (
                <div className="text-center max-w-4xl w-full px-4">
                    <div className="text-6xl mb-4">{gameState === 'success' ? '🚽' : '☠️'}</div>
                    <h2 className={`text-3xl font-bold mb-2 ${gameState==='success'?'text-green-500':'text-red-500'}`}>
                        {gameState==='success' ? 'CONTROL SUCCESS' : 'CONTAINMENT BREACH'}
                    </h2>
                    
                    <div className={`${isPC ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-3'} w-full max-w-4xl`}>
                        <div className="bg-gray-800 p-3 rounded">
                            <div className={`${isPC ? 'grid grid-cols-2 gap-3' : 'flex justify-between'}`}>
                                <div className="text-center">
                                    <p className="text-[10px] text-gray-500 mb-1">TIME</p>
                                    <p className={`${isPC ? 'text-xl' : 'text-lg'} font-mono`}>{(gameTimeRef.current/1000).toFixed(1)}s</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-gray-500 mb-1">URGENCY</p>
                                    <p className={`${isPC ? 'text-xl' : 'text-lg'} font-mono`}>{stats.urgency.toFixed(1)}%</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-800 p-3 rounded">
                            <p className={`${isPC ? 'text-sm' : 'text-xs'} text-gray-400 mb-2 font-bold text-center`}>통제 사용</p>
                            <div className={`${isPC ? 'grid grid-cols-3 gap-2' : 'flex justify-around'} text-xs`}>
                                <div className="text-center">
                                    <div className="text-green-400 mb-0.5">참기</div>
                                    <div className="font-mono text-[10px]">{(Math.round(controlsCountRef.current['Hold_Time'] / 100) / 10).toFixed(1)}s</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-purple-400 mb-0.5">지도</div>
                                    <div className="font-mono text-[10px]">{(Math.round(controlsCountRef.current['Map_Time'] / 100) / 10).toFixed(1)}s</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-blue-400 mb-0.5">달리기</div>
                                    <div className="font-mono text-[10px]">{(Math.round(controlsCountRef.current['Sprint_Time'] / 100) / 10).toFixed(1)}s</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {leaderboard.length > 0 && (
                        <div className={`${isPC ? 'mb-6' : 'mb-3'} text-left bg-gray-800 p-3 rounded w-full max-w-4xl`}>
                            <p className={`${isPC ? 'text-sm' : 'text-xs'} text-yellow-400 mb-2 font-bold flex items-center gap-1 justify-center`}>
                                <Zap size={isPC ? 16 : 12} />리더보드 TOP {Math.min(leaderboard.length, 5)}
                            </p>
                            <div className={`${isPC ? 'space-y-2 max-h-64' : 'space-y-1 max-h-32'} overflow-y-auto`}>
                                {leaderboard.slice(0, isPC ? 10 : 5).map((entry, index) => {
                                    const isCurrentGame = currentGameDuration !== null && entry.duration === currentGameDuration;
                                    return (
                                    <div key={entry.id} className={`${isPC ? 'p-2' : 'p-1.5'} rounded ${
                                        isCurrentGame 
                                          ? 'bg-blue-900/50 border-2 border-blue-400 ring-2 ring-blue-500' 
                                          : index === 0 
                                            ? 'bg-yellow-900/30 border border-yellow-500' 
                                            : 'bg-gray-700/50'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`${isPC ? 'text-sm' : 'text-xs'} font-bold ${
                                                    isCurrentGame 
                                                      ? 'text-blue-400' 
                                                      : index === 0 
                                                        ? 'text-yellow-400' 
                                                        : 'text-gray-400'
                                                }`}>
                                                    {isCurrentGame 
                                                      ? '⭐' 
                                                      : index === 0 
                                                        ? '🥇' 
                                                        : index === 1 
                                                          ? '🥈' 
                                                          : index === 2 
                                                            ? '🥉' 
                                                            : `#${index + 1}`}
                                                </span>
                                                <span className={`${isPC ? 'text-sm' : 'text-mono'} font-mono ${
                                                    isCurrentGame ? 'text-blue-300 font-bold' : ''
                                                }`}>{(entry.duration / 1000).toFixed(1)}초</span>
                                            </div>
                                        </div>
                                     </div>
                                    );
                                })}
                             </div>
                        </div>
                    )}

                    <button onClick={startGame} className={`${isPC ? 'px-8 py-3 text-lg' : 'px-6 py-2 text-sm'} bg-white text-black font-bold rounded hover:bg-gray-200`}>RETRY</button>
                </div>
            )}
         </div>
      )}
    </div>
  );
}

export default Game;
