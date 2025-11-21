import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app'; // Import directly
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth'; // Import directly
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'; // Import directly
import { Shield, Zap, MapPin, Activity, RotateCcw, User, Navigation, MousePointer2, Brain, Sparkles, Eye, Clock, Crosshair, Maximize } from 'lucide-react';

/**
 * --- [배포 가이드] ---
 * 실제 Vercel/Netlify 등에 배포하실 때는 아래 FIREBASE CONFIG 부분을
 * 별도의 'firebase.js' 파일로 분리하는 것이 보안 및 관리에 좋습니다.
 * 현재는 이 창에서 바로 실행해 보실 수 있도록 한 파일에 합쳐두었습니다.
 */

// --- FIREBASE CONFIGURATION ---
// 주의: 실제 배포 시 API 키는 환경 변수(.env)로 관리하는 것이 안전합니다.
// 이 코드를 그대로 사용하려면 Firebase Console에서 값을 복사해서 채워넣으세요.
let firebaseConfig = {};
try {
  firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
} catch (e) {
  console.warn('Firebase config parsing failed:', e);
}

// Firebase 설정이 비어있을 때 기본값 제공 (개발용)
if (!firebaseConfig.apiKey || Object.keys(firebaseConfig).length === 0) {
  console.warn('Firebase config가 설정되지 않았습니다. Firebase 기능은 비활성화됩니다.');
  firebaseConfig = {
    apiKey: "dummy-key",
    authDomain: "dummy.firebaseapp.com",
    projectId: "dummy-project",
    storageBucket: "dummy.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:dummy"
  };
}

// 만약 로컬에서 개발하신다면 위 줄 대신 아래와 같이 직접 키를 입력하세요:
/*
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
*/

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error('Firebase 초기화 실패:', e);
}
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- GEMINI CONFIGURATION ---
const GEMINI_API_KEY = ""; // 여기에 Google AI Studio에서 발급받은 키를 입력하세요. (빈 문자열이면 작동 안 함)
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

// --- Game Constants ---
const TILE_SIZE = 40;
const PLAYER_SPEED = 3;
const SPRINT_MULTIPLIER = 1.7;
const MAX_URGENCY = 100;
const BASE_URGENCY_RATE = 0.18; 
const MAX_STAMINA = 100;
const BASE_VISION_RADIUS = 120;
const MAX_VISION_RADIUS = 450;  

// Map Types: 0:Road, 1:Wall, 2:Start, 3:Goal, 4:Risk, 5:Door
const RAW_MAP_TEMPLATE = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 4, 4, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 4, 1, 0, 0, 0, 0, 0, 0, 4, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 5, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 4, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 4, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 0, 0, 0, 0, 0, 1, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 2, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 5, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 4, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 4, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 5, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 1, 1, 1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const MAP_WIDTH_TILES = RAW_MAP_TEMPLATE[0].length;
const MAP_HEIGHT_TILES = RAW_MAP_TEMPLATE.length;
const CENTER_X = (MAP_WIDTH_TILES * TILE_SIZE) / 2 - (TILE_SIZE / 2);
const CENTER_Y = (MAP_HEIGHT_TILES * TILE_SIZE) / 2;

// --- Helpers ---
const checkCollision = (x, y, map) => {
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor(y / TILE_SIZE);
  if (tileY < 0 || tileY >= map.length || tileX < 0 || tileX >= map[0].length) return 1;
  return map[tileY][tileX];
};

const generateLevel = () => {
    const newMap = JSON.parse(JSON.stringify(RAW_MAP_TEMPLATE));
    const candidates = [{r: 1, c: 1}, {r: 1, c: 28}, {r: 18, c: 1}, {r: 18, c: 28}];
    const goal = candidates[Math.floor(Math.random() * candidates.length)];
    newMap[goal.r][goal.c] = 3; 
    return { map: newMap, goalPos: { x: goal.c * TILE_SIZE, y: goal.r * TILE_SIZE } };
};

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) return "API 키 미설정: 멘탈 케어 기능을 사용할 수 없습니다.";
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    if (!response.ok) throw new Error(`API Error`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "AI 응답 실패";
  } catch (error) {
    return "AI 연결 오류";
  }
}

function SuddenPoopSimulator() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState('intro'); 
  const [stats, setStats] = useState({ urgency: 0, stamina: MAX_STAMINA });
  const [controlsUsed, setControlsUsed] = useState({});
  const [currentMapData, setCurrentMapData] = useState(RAW_MAP_TEMPLATE);
  const [goalPosition, setGoalPosition] = useState({x:0, y:0});
  const [orientation, setOrientation] = useState('landscape');
  const [isPC, setIsPC] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [aiMessage, setAiMessage] = useState(null); 
  const [mentalCooldown, setMentalCooldown] = useState(0);

  const canvasRef = useRef(null);
  const containerRef = useRef(null); 
  const requestRef = useRef();
  const playerRef = useRef({ x: CENTER_X, y: CENTER_Y, vx: 0, vy: 0 });
  const inputRef = useRef({ joyX: 0, joyY: 0, keys: {}, sprint: false, hold: false, map: false, mental: false });
  const gameTimeRef = useRef(0);
  const mapRevealTimerRef = useRef(0);
  const aiMessageTimerRef = useRef(0);
  const visionRadiusRef = useRef(BASE_VISION_RADIUS); 

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };
    
    // Local environment auth check
    if (auth) {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          // Use custom token if available (Preview Environment)
          signInWithCustomToken(auth, __initial_auth_token).catch(console.error);
      } else {
          // Fallback to anonymous (Production/Dev)
          signInAnonymously(auth).catch(console.error);
      }
      
      const unsubscribe = onAuthStateChanged(auth, setUser);
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
      if (e.code === 'KeyK' || e.key?.toLowerCase() === 'k') inputRef.current.sprint = true;
      if (e.code === 'KeyJ' || e.key?.toLowerCase() === 'j') inputRef.current.hold = true;
      if (e.code === 'KeyL' || e.key?.toLowerCase() === 'l') inputRef.current.map = true;
      if (e.code === 'KeyH' || e.key?.toLowerCase() === 'h') inputRef.current.mental = true;
    };
    const handleKeyUp = (e) => {
      if (e.code) inputRef.current.keys[e.code] = false;
      if (e.key) inputRef.current.keys[e.key.toLowerCase()] = false;
      if (e.code === 'KeyK' || e.key?.toLowerCase() === 'k') inputRef.current.sprint = false;
      if (e.code === 'KeyJ' || e.key?.toLowerCase() === 'j') inputRef.current.hold = false;
      if (e.code === 'KeyL' || e.key?.toLowerCase() === 'l') inputRef.current.map = false;
      if (e.code === 'KeyH' || e.key?.toLowerCase() === 'h') inputRef.current.mental = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const triggerMentalControl = async () => {
    if (mentalCooldown > 0) return;
    setMentalCooldown(300); 
    setControlsUsed(prev => ({...prev, 'Mental_Control(AI)': 1}));
    setAiMessage("AI: 정신력 강화 중...");
    aiMessageTimerRef.current = 180; 
    setStats(prev => ({ ...prev, urgency: Math.max(0, prev.urgency - 15) })); 

    const prompt = `상황: '김급해'는 지금 화장실이 매우 급합니다 (${Math.floor(stats.urgency)}%). 임무: 아주 다급하고 웃긴 격려 한마디. 형식: 한국어 1문장 반말.`;
    const text = await callGemini(prompt);
    if (text) { setAiMessage(text); aiMessageTimerRef.current = 180; }
  };

  const updateGame = useCallback(() => {
    if (gameState !== 'playing') return;
    const player = playerRef.current;
    const input = inputRef.current;
    
    let dx = input.joyX;
    let dy = input.joyY;

    if (input.keys['KeyW'] || input.keys['w'] || input.keys['ArrowUp']) dy -= 1;
    if (input.keys['KeyS'] || input.keys['s'] || input.keys['ArrowDown']) dy += 1;
    if (input.keys['KeyA'] || input.keys['a'] || input.keys['ArrowLeft']) dx -= 1;
    if (input.keys['KeyD'] || input.keys['d'] || input.keys['ArrowRight']) dx += 1;

    const len = Math.sqrt(dx*dx + dy*dy);
    if (len > 1) { dx /= len; dy /= len; }

    let speed = PLAYER_SPEED;
    let urgencyMultiplier = 1.0; 
    let targetVision = BASE_VISION_RADIUS; 

    if (input.sprint && stats.stamina > 0) {
      speed *= SPRINT_MULTIPLIER;
      setStats(prev => ({ ...prev, stamina: Math.max(0, prev.stamina - 0.8) })); 
      urgencyMultiplier = 2.5; 
    } else {
      setStats(prev => ({ ...prev, stamina: Math.min(MAX_STAMINA, prev.stamina + 0.15) })); 
    }

    if (input.hold && stats.stamina > 5) {
        speed *= 0.2; 
        urgencyMultiplier = -0.5; 
        targetVision = MAX_VISION_RADIUS; 
        setStats(prev => ({ ...prev, stamina: prev.stamina - 0.4 })); 
        if (!controlsUsed['Physical_Control(Hold)']) setControlsUsed(prev => ({...prev, 'Physical_Control(Hold)': 1}));
    }

    visionRadiusRef.current += (targetVision - visionRadiusRef.current) * 0.1;

    if (input.map) {
        setShowMap(true);
        speed = 0; 
        if (!controlsUsed['Tech_Control(Map)']) setControlsUsed(prev => ({...prev, 'Tech_Control(Map)': 1}));
        mapRevealTimerRef.current = 60; 
    } else {
        if (mapRevealTimerRef.current > 0) mapRevealTimerRef.current--;
        else setShowMap(false);
    }

    if (input.mental) { triggerMentalControl(); input.mental = false; }
    if (mentalCooldown > 0) setMentalCooldown(prev => prev - 1);
    if (aiMessageTimerRef.current > 0) {
        aiMessageTimerRef.current--;
        if (aiMessageTimerRef.current <= 0) setAiMessage(null);
    }

    const currentTile = checkCollision(player.x + TILE_SIZE/2, player.y + TILE_SIZE/2, currentMapData);
    if (currentTile === 4) { speed *= 0.3; urgencyMultiplier *= 1.5; }

    player.vx = dx * speed;
    player.vy = dy * speed;

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

    // 위급도 계산 (먼저 계산하여 정확한 값 확인)
    const newUrgency = Math.max(0, stats.urgency + (BASE_URGENCY_RATE * urgencyMultiplier));
    
    // 화장실 도달 체크는 먼저 (성공 조건이 우선)
    if (currentTile === 3) {
      setStats(prev => ({ ...prev, urgency: newUrgency }));
      endGame(true, newUrgency);
      return;
    }

    // 위급도가 정확히 100 이상이 되면 게임 종료 (실패)
    // 주의: >= 가 아닌 == 로 체크하면 정확히 100일 때만 끝남
    if (newUrgency >= MAX_URGENCY) {
      setStats(prev => ({ ...prev, urgency: MAX_URGENCY }));
      endGame(false, MAX_URGENCY);
      return;
    }

    // 위급도 업데이트 (정상 진행)
    setStats(prev => ({ ...prev, urgency: newUrgency }));
    gameTimeRef.current += 16.6;
  }, [gameState, stats.stamina, controlsUsed, mentalCooldown, stats.urgency, currentMapData]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const player = playerRef.current;
    const cx = canvas.width / 2 - player.x - TILE_SIZE/2;
    const cy = canvas.height / 2 - player.y - TILE_SIZE/2;

    ctx.save();
    ctx.translate(cx, cy);

    currentMapData.forEach((row, y) => {
      row.forEach((tile, x) => {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (tile === 1) { 
          ctx.fillStyle = '#444'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#222'; ctx.fillRect(px, py + TILE_SIZE - 8, TILE_SIZE, 8);
        } else if (tile === 3) {
          const dist = Math.sqrt(Math.pow(player.x - px, 2) + Math.pow(player.y - py, 2));
          if (dist < 120) {
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
        if (tile === 2) {
            ctx.fillStyle = '#ffffff22'; ctx.font = '10px sans-serif'; ctx.fillText('S', px + 15, py + 25);
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

    if (showMap) {
        const goalScreenX = centerX + (goalPosition.x - player.x);
        const goalScreenY = centerY + (goalPosition.y - player.y);
        ctx.save();
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(goalScreenX + TILE_SIZE/2, goalScreenY + TILE_SIZE/2, 30, 0, Math.PI * 2); ctx.stroke();
        const pulse = (Date.now() % 1000) / 1000;
        ctx.beginPath(); ctx.arc(goalScreenX + TILE_SIZE/2, goalScreenY + TILE_SIZE/2, 30 + pulse * 20, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239, 68, 68, ${1 - pulse})`; ctx.stroke();
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 14px font-mono'; ctx.textAlign = 'center'; ctx.fillText('TARGET (WC)', goalScreenX + TILE_SIZE/2, goalScreenY - 10);
        ctx.restore();
    }
    requestRef.current = requestAnimationFrame(drawGame);
  }, [gameState, stats.urgency, showMap, aiMessage, currentMapData, goalPosition]);

  useEffect(() => {
    if (gameState === 'playing') {
      const interval = setInterval(updateGame, 16);
      requestRef.current = requestAnimationFrame(drawGame);
      return () => { clearInterval(interval); cancelAnimationFrame(requestRef.current); };
    }
  }, [gameState, updateGame, drawGame]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    }
  };

  const startGame = () => {
    toggleFullScreen();
    const { map, goalPos } = generateLevel();
    setCurrentMapData(map);
    setGoalPosition(goalPos);
    playerRef.current = { x: CENTER_X, y: CENTER_Y, vx: 0, vy: 0 };
    setStats({ urgency: 0, stamina: MAX_STAMINA });
    setControlsUsed({});
    gameTimeRef.current = 0;
    setGameState('playing');
    setAiMessage(null);
    setMentalCooldown(0);
    visionRadiusRef.current = BASE_VISION_RADIUS; 
    if(containerRef.current) containerRef.current.focus();
  };

  const endGame = async (success, finalUrgency = null) => {
    setGameState(success ? 'success' : 'fail');
    
    // endGame 호출 시 최신 위급도 값을 사용
    const urgencyToSave = finalUrgency !== null ? finalUrgency : stats.urgency;
    
    if (!user || !db) return;
    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'simulation_results'), {
            uid: user.uid,
            success,
            duration: gameTimeRef.current,
            urgency: urgencyToSave,
            controls: controlsUsed,
            date: serverTimestamp()
        });
    } catch (e) { 
      console.error('Firestore 저장 실패:', e); 
    }
  };

  const Joystick = () => {
      const stickRef = useRef(null);
      const handleTouch = (e) => {
        e.preventDefault();
        const touch = e.targetTouches[0];
        const rect = e.target.getBoundingClientRect();
        const cx = rect.width / 2; const cy = rect.height / 2;
        let x = touch.clientX - rect.left - cx; let y = touch.clientY - rect.top - cy;
        const dist = Math.sqrt(x*x + y*y);
        if (dist > 40) { x = (x/dist)*40; y = (y/dist)*40; }
        inputRef.current.joyX = x/40; inputRef.current.joyY = y/40;
        if (stickRef.current) stickRef.current.style.transform = `translate(${x}px, ${y}px)`;
      };
      const resetStick = () => {
        inputRef.current.joyX = 0; inputRef.current.joyY = 0;
        if (stickRef.current) stickRef.current.style.transform = `translate(0px, 0px)`;
      };
      return (
        <div className="w-32 h-32 rounded-full bg-white/10 border-2 border-white/30 backdrop-blur-sm flex items-center justify-center relative touch-none"
             onTouchStart={handleTouch} onTouchMove={handleTouch} onTouchEnd={resetStick}>
          <div ref={stickRef} className="w-12 h-12 rounded-full bg-blue-500/80 shadow-lg pointer-events-none transition-transform duration-75" />
          {isPC && <div className="absolute -bottom-8 text-xs text-gray-400 font-mono">WASD</div>}
        </div>
      );
  };

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
                <div className="flex items-center gap-2 text-red-500 font-bold"><Activity size={20}/><span>URGENCY ({stats.urgency.toFixed(0)}%)</span></div>
                <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden"><div className="h-full transition-all duration-200" style={{width: `${stats.urgency}%`, backgroundColor: stats.urgency>80?'#ef4444':'#22c55e'}}/></div>
             </div>
             <div className="w-1/3 flex flex-col items-end">
                <div className="flex items-center gap-1 text-yellow-400"><Zap size={16}/><span>STAMINA</span></div>
                <div className="w-32 h-2 bg-gray-800 rounded-full"><div className="h-full bg-yellow-400" style={{width: `${stats.stamina}%`}}/></div>
             </div>
          </div>

          <div className="absolute bottom-6 px-12 w-full flex justify-between items-end z-20 pointer-events-auto">
             <Joystick />
             <div className="flex gap-6 items-end">
                <div className="flex flex-col items-center">
                   <button className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center backdrop-blur-md ${mentalCooldown > 0 ? 'bg-gray-500/50' : 'bg-pink-600 border-pink-400'}`}
                      onTouchStart={()=>inputRef.current.mental=true} onMouseDown={()=>inputRef.current.mental=true}>
                      <Brain size={20} className="animate-pulse" /><span className="text-[9px] font-bold">MENTAL</span>
                   </button>
                   {isPC && <span className="text-xs text-gray-500">H</span>}
                </div>
                <div className="flex flex-col items-center">
                   <button className={`w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center backdrop-blur-md ${inputRef.current.hold ? 'bg-green-600 ring-4 ring-green-400/30' : 'bg-green-500/20 border-green-400'}`}
                      onTouchStart={()=>{inputRef.current.hold=true}} onTouchEnd={()=>{inputRef.current.hold=false}}
                      onMouseDown={()=>{inputRef.current.hold=true}} onMouseUp={()=>{inputRef.current.hold=false}}>
                      <Eye size={24} /><span className="text-[10px] font-bold">HOLD</span>
                   </button>
                   {isPC && <span className="text-xs text-gray-500">J</span>}
                </div>
                <div className="flex flex-col items-center pb-2">
                   <button className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center ${inputRef.current.sprint ? 'bg-blue-600' : 'bg-blue-600/80'}`}
                      onTouchStart={()=>{inputRef.current.sprint=true}} onTouchEnd={()=>{inputRef.current.sprint=false}}
                      onMouseDown={()=>{inputRef.current.sprint=true}} onMouseUp={()=>{inputRef.current.sprint=false}}>
                      <Navigation size={32} /><span className="text-xs font-bold">RUN</span>
                   </button>
                   {isPC && <span className="text-xs text-gray-500">K</span>}
                </div>
                <div className="flex flex-col items-center self-start -mt-6">
                   <button className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center ${inputRef.current.map ? 'bg-purple-600' : 'bg-purple-500/20'}`}
                      onTouchStart={()=>{inputRef.current.map=true}} onTouchEnd={()=>{inputRef.current.map=false}}
                      onMouseDown={()=>{inputRef.current.map=true}} onMouseUp={()=>{inputRef.current.map=false}}>
                      <Crosshair size={20} /><span className="text-[9px] font-bold">MAP</span>
                   </button>
                   {isPC && <span className="text-xs text-gray-500">L</span>}
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
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-bold text-red-500">HARDCORE MODE</h2>
                        <p className="text-sm text-gray-400">통제 없이 생존 불가능. 화장실 위치 매번 변경.</p>
                    </div>
                    <div className="space-y-2 text-xs bg-black/40 p-3 rounded text-gray-300">
                        <div className="flex justify-between"><span className="text-green-400 font-bold">HOLD (J)</span> <span>필수. 위급도 억제 & 시야 확보</span></div>
                        <div className="flex justify-between"><span className="text-pink-400 font-bold">MENTAL (H)</span> <span>AI가 위급도 대폭 감소 (쿨타임 5초)</span></div>
                        <div className="flex justify-between"><span className="text-purple-400 font-bold">MAP (L)</span> <span>필수. 어둠 속 화장실 AR 탐지</span></div>
                    </div>
                    <button onClick={startGame} className="w-full py-4 bg-red-700 hover:bg-red-600 font-bold text-lg rounded flex items-center justify-center gap-2">
                        <Maximize size={18} />
                        <span>전체 화면으로 시작 (START)</span>
                    </button>
                    <p className="text-[10px] text-gray-600 text-center">시작 시 자동으로 전체 화면으로 전환됩니다.</p>
                </div>
            ) : (
                <div className="text-center">
                    <div className="text-6xl mb-4">{gameState === 'success' ? '🚽' : '☠️'}</div>
                    <h2 className={`text-3xl font-bold mb-2 ${gameState==='success'?'text-green-500':'text-red-500'}`}>
                        {gameState==='success' ? 'CONTROL SUCCESS' : 'CONTAINMENT BREACH'}
                    </h2>
                    <div className="grid grid-cols-2 gap-4 mb-6 text-left bg-gray-800 p-4 rounded">
                        <div><p className="text-[10px] text-gray-500">TIME</p><p className="text-xl font-mono">{(gameTimeRef.current/1000).toFixed(1)}s</p></div>
                        <div><p className="text-[10px] text-gray-500">URGENCY</p><p className="text-xl font-mono">{stats.urgency.toFixed(1)}%</p></div>
                    </div>
                    <button onClick={startGame} className="px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-200">RETRY</button>
                </div>
            )}
         </div>
      )}
    </div>
  );
}

export default SuddenPoopSimulator;