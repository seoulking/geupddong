import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app'; // Import directly
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth'; // Import directly
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where } from 'firebase/firestore'; // Import directly
import { Shield, Zap, MapPin, Activity, RotateCcw, User, Navigation, MousePointer2, Sparkles, Eye, Clock, Crosshair, Maximize } from 'lucide-react';

/**
 * --- [배포 가이드] ---
 * 실제 Vercel/Netlify 등에 배포하실 때는 아래 FIREBASE CONFIG 부분을
 * 별도의 'firebase.js' 파일로 분리하는 것이 보안 및 관리에 좋습니다.
 * 현재는 이 창에서 바로 실행해 보실 수 있도록 한 파일에 합쳐두었습니다.
 */

// --- FIREBASE CONFIGURATION ---
// Firebase 설정을 다양한 방법으로 가져오기 시도
let firebaseConfig = {};

// 1. 전역 변수에서 가져오기 (index.html에서 설정)
if (typeof window !== 'undefined' && window.__FIREBASE_CONFIG__ && Object.keys(window.__FIREBASE_CONFIG__).length > 0) {
  firebaseConfig = window.__FIREBASE_CONFIG__;
}

// 2. 환경 변수에서 가져오기 (Vite 환경 변수)
if ((!firebaseConfig.apiKey || Object.keys(firebaseConfig).length === 0) && import.meta.env.VITE_FIREBASE_API_KEY) {
  firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'geupddong-fc00c',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
}

// 3. 이전 방식의 전역 변수에서 가져오기
if (!firebaseConfig.apiKey || Object.keys(firebaseConfig).length === 0) {
  try {
    const oldConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
    if (oldConfig) {
      firebaseConfig = typeof oldConfig === 'string' ? JSON.parse(oldConfig) : oldConfig;
    }
  } catch (e) {
    console.warn('Firebase config parsing failed:', e);
  }
}

// 4. Firebase 설정이 여전히 비어있을 때 기본 설정 사용 (호스팅에서도 작동)
if (!firebaseConfig.apiKey || Object.keys(firebaseConfig).length === 0 || firebaseConfig.apiKey === 'dummy-key') {
  // Firebase 프로젝트 설정 (geupddong-fc00c)
  // 주의: API 키는 클라이언트에서 노출되어도 안전하지만, Firestore 보안 규칙은 반드시 설정하세요
  firebaseConfig = {
    apiKey: "AIzaSyDZ1PFzJMcjzaCN6RPxC58elsfNVVIhtjU",
    authDomain: "geupddong-fc00c.firebaseapp.com",
    projectId: "geupddong-fc00c",
    storageBucket: "geupddong-fc00c.firebasestorage.app",
    messagingSenderId: "357858980688",
    appId: "1:357858980688:web:3ebe0f383b629031e97255",
    measurementId: "G-7L81FW0FH2"
  };
  console.log('✅ Firebase 설정이 적용되었습니다. 프로젝트:', firebaseConfig.projectId);
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
  console.log('✅ Firebase 초기화 성공:', { 
    projectId: firebaseConfig.projectId, 
    db: !!db, 
    auth: !!auth 
  });
} catch (e) {
  console.error('❌ Firebase 초기화 실패:', e);
  db = null;
  auth = null;
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
// 30초에 100%가 되도록: 초당 약 3.33% 증가 (60fps 기준 프레임당 약 0.055% = 0.0333/60*100)
const BASE_URGENCY_RATE_PER_SECOND = 100 / 30; // 초당 3.33% 증가 
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

// 여러 맵 템플릿 생성 (기존 맵을 변형한 버전들)
const MAP_VARIANTS = [
  // 원본 맵
  RAW_MAP_TEMPLATE,
  // 변형 1: 일부 벽 제거/이동
  JSON.parse(JSON.stringify(RAW_MAP_TEMPLATE)).map((row, r) => 
    row.map((tile, c) => {
      if (r > 5 && r < 13 && c > 10 && c < 20 && tile === 1 && Math.random() > 0.7) {
        return 0; // 일부 벽을 길로 변경
      }
      return tile;
    })
  ),
  // 변형 2: 위험 지역 재배치
  JSON.parse(JSON.stringify(RAW_MAP_TEMPLATE)).map((row, r) => 
    row.map((tile, c) => {
      if (tile === 4) {
        // 위험 지역을 랜덤하게 재배치
        return Math.random() > 0.5 ? 4 : 0;
      }
      return tile;
    })
  ),
  // 변형 3: 벽 패턴 변경
  JSON.parse(JSON.stringify(RAW_MAP_TEMPLATE)).map((row, r) => 
    row.map((tile, c) => {
      if (tile === 1 && r > 3 && r < 16 && c > 3 && c < 27) {
        // 일부 벽을 조건부로 변경
        if ((r + c) % 7 === 0 && Math.random() > 0.6) {
          return 0;
        }
      }
      return tile;
    })
  ),
];

const generateLevel = () => {
    // 랜덤 맵 템플릿 선택
    const template = MAP_VARIANTS[Math.floor(Math.random() * MAP_VARIANTS.length)];
    const newMap = JSON.parse(JSON.stringify(template));
    
    // 시작 지점은 고정 (2로 표시된 곳)
    const startPositions = [];
    for (let r = 0; r < newMap.length; r++) {
      for (let c = 0; c < newMap[r].length; c++) {
        if (newMap[r][c] === 2) {
          startPositions.push({r, c});
        }
      }
    }
    
    // 시작 지점이 없으면 중앙으로 설정
    const startPos = startPositions.length > 0 
      ? startPositions[0] 
      : {r: Math.floor(MAP_HEIGHT_TILES / 2), c: Math.floor(MAP_WIDTH_TILES / 2)};
    
    // 중앙 영역 제외 (중앙에서 너무 가까운 곳 제외)
    const centerR = Math.floor(MAP_HEIGHT_TILES / 2);
    const centerC = Math.floor(MAP_WIDTH_TILES / 2);
    const excludeRadius = 6; // 중앙에서 6타일 반경 제외
    
    // 목표 위치 후보 (가장자리 위주, 중앙 부근 제외)
    const allCandidates = [];
    
    // 가장자리 좁히기 (모서리 + 가장자리)
    for (let r = 1; r < MAP_HEIGHT_TILES - 1; r++) {
      for (let c = 1; c < MAP_WIDTH_TILES - 1; c++) {
        // 중앙 부근 제외
        const distFromCenter = Math.sqrt(Math.pow(r - centerR, 2) + Math.pow(c - centerC, 2));
        if (distFromCenter < excludeRadius) continue;
        
        // 가장자리 3줄 이내 또는 모서리
        const isEdge = r <= 3 || r >= MAP_HEIGHT_TILES - 4 || c <= 3 || c >= MAP_WIDTH_TILES - 4;
        
        if (isEdge && newMap[r] && newMap[r][c] !== 1) {
          // 시작 위치가 아닌 곳만
          if (r !== startPos.r || c !== startPos.c) {
            allCandidates.push({r, c});
          }
        }
      }
    }
    
    // 화장실 개수 결정 (2~4개)
    const numBathrooms = 2 + Math.floor(Math.random() * 3); // 2, 3, 또는 4개
    const selectedCandidates = [];
    const shuffled = [...allCandidates].sort(() => Math.random() - 0.5);
    
    for (const candidate of shuffled) {
      if (selectedCandidates.length >= numBathrooms) break;
      
      // 선택된 화장실과 최소 거리 확보 (너무 가까이 모이지 않도록)
      const tooClose = selectedCandidates.some(selected => {
        const dist = Math.sqrt(
          Math.pow(candidate.r - selected.r, 2) + 
          Math.pow(candidate.c - selected.c, 2)
        );
        return dist < 8; // 최소 8타일 거리
      });
      
      if (!tooClose) {
        selectedCandidates.push(candidate);
        newMap[candidate.r][candidate.c] = 3; // 화장실 표시
      }
    }
    
    // 화장실 위치 배열 생성
    const goalPositions = selectedCandidates.map(pos => ({
      x: pos.c * TILE_SIZE,
      y: pos.r * TILE_SIZE
    }));
    
    // 기본 목표 위치는 첫 번째 화장실 (호환성 유지)
    const goalPos = goalPositions[0] || {x: 0, y: 0};
    
    return { 
      map: newMap, 
      goalPos,
      goalPositions // 모든 화장실 위치
    };
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
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentMapData, setCurrentMapData] = useState(RAW_MAP_TEMPLATE);
  const [goalPosition, setGoalPosition] = useState({x:0, y:0});
  const [goalPositions, setGoalPositions] = useState([]); // 모든 화장실 위치
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
    direction: { up: false, down: false, left: false, right: false } // 방향 버튼 상태
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
    riskZoneCount: 0, // 위험 지역 통과 횟수
    totalDistance: 0, // 총 이동 거리
    lastPosition: { x: CENTER_X, y: CENTER_Y },
    mapUses: 0, // 지도 사용 횟수
    sprintActivations: 0, // 달리기 활성화 횟수
    holdActivations: 0, // 참기 활성화 횟수
    avgUrgency: 0,
    urgencySamples: [], // 위급도 샘플 (초당 1회)
    avgSpeed: 0,
    speedSamples: []
  }); 

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };
    
    // Local environment auth check
    if (auth) {
      console.log('🔐 Firebase 인증 시작...');
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          // Use custom token if available (Preview Environment)
          signInWithCustomToken(auth, __initial_auth_token)
            .then((userCredential) => {
              console.log('✅ 커스텀 토큰 인증 완료:', userCredential.user.uid);
            })
            .catch((error) => {
              console.error('❌ 커스텀 토큰 인증 실패:', error);
            });
      } else {
          // Fallback to anonymous (Production/Dev)
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
          console.log('✅ 사용자 인증 상태 변경:', user.uid);
        } else {
          console.warn('⚠️ 사용자 인증 상태: 로그아웃됨');
        }
        setUser(user);
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
      if (e.code === 'KeyJ' || e.key?.toLowerCase() === 'j') inputRef.current.sprint = true; // 달리기: J
      if (e.code === 'KeyK' || e.key?.toLowerCase() === 'k') inputRef.current.hold = true; // 홀드: K
      if (e.code === 'KeyL' || e.key?.toLowerCase() === 'l') inputRef.current.map = true; // 맵: L
    };
    const handleKeyUp = (e) => {
      if (e.code) inputRef.current.keys[e.code] = false;
      if (e.key) inputRef.current.keys[e.key.toLowerCase()] = false;
      if (e.code === 'KeyJ' || e.key?.toLowerCase() === 'j') inputRef.current.sprint = false; // 달리기: J
      if (e.code === 'KeyK' || e.key?.toLowerCase() === 'k') inputRef.current.hold = false; // 홀드: K
      if (e.code === 'KeyL' || e.key?.toLowerCase() === 'l') inputRef.current.map = false; // 맵: L
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
    
    // 실제 시간 측정 (0.1초 단위 정확도)
    const now = performance.now();
    const deltaTime = controlTimersRef.current.lastUpdateTime 
      ? now - controlTimersRef.current.lastUpdateTime 
      : 16.6; // 첫 프레임
    controlTimersRef.current.lastUpdateTime = now;
    
    // 방향 버튼 상태로부터 이동 방향 계산
    let dx = 0;
    let dy = 0;
    
    // 방향 버튼 상태 (십자가 버튼)
    if (input.direction.up) dy -= 1;
    if (input.direction.down) dy += 1;
    if (input.direction.left) dx -= 1;
    if (input.direction.right) dx += 1;
    
    // 키보드 입력도 지원
    if (input.keys['KeyW'] || input.keys['w'] || input.keys['ArrowUp']) dy -= 1;
    if (input.keys['KeyS'] || input.keys['s'] || input.keys['ArrowDown']) dy += 1;
    if (input.keys['KeyA'] || input.keys['a'] || input.keys['ArrowLeft']) dx -= 1;
    if (input.keys['KeyD'] || input.keys['d'] || input.keys['ArrowRight']) dx += 1;

    // 정규화 (대각선 이동 시 속도 보정)
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len > 1) { 
      dx /= len; 
      dy /= len; 
    }

    let speed = PLAYER_SPEED;
    let urgencyMultiplier = 1.0; 
    let targetVision = BASE_VISION_RADIUS; 
    const isInputMoving = dx !== 0 || dy !== 0;
    const isSprinting = input.sprint && stats.stamina > 0;
    const isHolding = input.hold && stats.stamina > 5;

    // Sprint 시간 측정 (실제 시간)
    if (isSprinting) {
      speed *= SPRINT_MULTIPLIER;
      setStats(prev => ({ ...prev, stamina: Math.max(0, prev.stamina - 0.8) })); 
      urgencyMultiplier = 2.5;
      
      // Sprint 시작 시간 기록
      if (!controlTimersRef.current.sprintStart) {
        controlTimersRef.current.sprintStart = now;
        gameStatsRef.current.sprintActivations++; // Sprint 활성화 횟수
      }
      
      // 실제 경과 시간 추가 (0.1초 단위로 반올림)
      controlsCountRef.current['Sprint_Time'] += deltaTime;
      
      if (!controlsUsed['Sprint(Run)']) {
        setControlsUsed(prev => ({...prev, 'Sprint(Run)': 1}));
      }
    } else {
      // Sprint 종료 시 마지막 시간 정리
      if (controlTimersRef.current.sprintStart) {
        controlTimersRef.current.sprintStart = null;
      }
      setStats(prev => ({ ...prev, stamina: Math.min(MAX_STAMINA, prev.stamina + 0.15) })); 
    }

    // Hold 시간 측정 (실제 시간)
    if (isHolding && !isSprinting) {
        speed *= 0.2; 
        urgencyMultiplier = 0.4; // 정지 + Hold: 가장 느림
        targetVision = MAX_VISION_RADIUS; 
        setStats(prev => ({ ...prev, stamina: prev.stamina - 0.4 })); 
        
        // Hold 시작 시간 기록
        if (!controlTimersRef.current.holdStart) {
          controlTimersRef.current.holdStart = now;
          gameStatsRef.current.holdActivations++; // Hold 활성화 횟수
        }
        
        // 실제 경과 시간 추가 (0.1초 단위로 반올림)
        controlsCountRef.current['Hold_Time'] += deltaTime;
        
        if (!controlsUsed['Physical_Control(Hold)']) {
          setControlsUsed(prev => ({...prev, 'Physical_Control(Hold)': 1}));
        }
    } else {
      // Hold 종료 시 마지막 시간 정리
      if (controlTimersRef.current.holdStart) {
        controlTimersRef.current.holdStart = null;
      }
    }

    visionRadiusRef.current += (targetVision - visionRadiusRef.current) * 0.1;

    // Map 시간 측정 (실제 시간)
    if (input.map) {
        setShowMap(true);
        speed = 0; 
        
        // Map 시작 시간 기록
        if (!controlTimersRef.current.mapStart) {
          controlTimersRef.current.mapStart = now;
          gameStatsRef.current.mapUses++; // Map 사용 횟수
        }
        
        // 실제 경과 시간 추가 (0.1초 단위로 반올림)
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
    
    // 위험 지역 통과 추적
    if (currentTile === 4) { 
      speed *= 0.3; 
      urgencyMultiplier *= 1.5;
      gameStatsRef.current.riskZoneCount++;
    }

    // 이동 방향이 없으면 완전히 멈춤
    if (!isInputMoving) {
      player.vx = 0;
      player.vy = 0;
    } else {
      player.vx = dx * speed;
      player.vy = dy * speed;
      // 움직임 단계별 위급도 증가 조정 (Hold > Idle > Hold+Move > Move > Sprint)
      if (!isSprinting) {
        if (isHolding) {
          urgencyMultiplier = Math.max(urgencyMultiplier, 1.3); // 움직이며 Hold
        } else {
          urgencyMultiplier = Math.max(urgencyMultiplier, 1.6); // 일반 이동
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

    // 이동 거리 계산
    const distanceMoved = Math.sqrt(
      Math.pow(player.x - gameStatsRef.current.lastPosition.x, 2) + 
      Math.pow(player.y - gameStatsRef.current.lastPosition.y, 2)
    );
    gameStatsRef.current.totalDistance += distanceMoved;
    gameStatsRef.current.lastPosition = { x: player.x, y: player.y };
    
    // 속도 샘플링 (초당 1회)
    const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
    if (Math.random() < 0.06) { // 약 60fps 기준 초당 1회
      gameStatsRef.current.speedSamples.push(currentSpeed);
    }

    // 위급도 계산 (deltaTime을 초 단위로 변환하여 시간에 비례하게 증가)
    // deltaTime은 밀리초 단위이므로 1000으로 나눠서 초 단위로 변환
    const deltaTimeSeconds = deltaTime / 1000;
    const urgencyIncrease = BASE_URGENCY_RATE_PER_SECOND * urgencyMultiplier * deltaTimeSeconds;
    const newUrgency = Math.max(0, Math.min(MAX_URGENCY, stats.urgency + urgencyIncrease));
    
    // 게임 통계 업데이트
    gameStatsRef.current.maxUrgency = Math.max(gameStatsRef.current.maxUrgency, newUrgency);
    gameStatsRef.current.minStamina = Math.min(gameStatsRef.current.minStamina, stats.stamina);
    
    // 위급도 샘플링 (초당 1회)
    if (Math.random() < 0.06) { // 약 60fps 기준 초당 1회
      gameStatsRef.current.urgencySamples.push(newUrgency);
    }
    
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
    // 게임 시간도 실제 시간으로 측정
    gameTimeRef.current += deltaTime;
  }, [gameState, stats.stamina, controlsUsed, stats.urgency, currentMapData]);

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
        // Start tile (tile === 2) - 표시 없음
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

    if (showMap && goalPositions && goalPositions.length > 0) {
        // 모든 화장실 위치 표시
        goalPositions.forEach((goalPos, index) => {
            const goalScreenX = centerX + (goalPos.x - player.x);
            const goalScreenY = centerY + (goalPos.y - player.y);
            ctx.save();
            ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(goalScreenX + TILE_SIZE/2, goalScreenY + TILE_SIZE/2, 30, 0, Math.PI * 2); ctx.stroke();
            const pulse = (Date.now() % 1000) / 1000;
            ctx.beginPath(); ctx.arc(goalScreenX + TILE_SIZE/2, goalScreenY + TILE_SIZE/2, 30 + pulse * 20, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(239, 68, 68, ${1 - pulse})`; ctx.stroke();
            const label = goalPositions.length > 1 ? `WC #${index + 1}` : 'TARGET (WC)';
            ctx.fillStyle = '#ef4444'; ctx.font = 'bold 14px font-mono'; ctx.textAlign = 'center'; 
            ctx.fillText(label, goalScreenX + TILE_SIZE/2, goalScreenY - 10);
            ctx.restore();
        });
    }
    requestRef.current = requestAnimationFrame(drawGame);
  }, [gameState, stats.urgency, showMap, aiMessage, currentMapData, goalPosition, goalPositions]);

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
    const { map, goalPos, goalPositions } = generateLevel();
    setCurrentMapData(map);
    setGoalPosition(goalPos);
    setGoalPositions(goalPositions || [goalPos]); // 모든 화장실 위치 저장
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
    setGameState('playing');
    setAiMessage(null);
    visionRadiusRef.current = BASE_VISION_RADIUS;
    
    // 게임 통계 초기화
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
    
    // endGame 호출 시 최신 위급도 값을 사용
    const urgencyToSave = finalUrgency !== null ? finalUrgency : stats.urgency;
    const duration = gameTimeRef.current;
    
    // 게임 통계 계산
    const gameStats = gameStatsRef.current;
    const avgUrgency = gameStats.urgencySamples.length > 0
      ? gameStats.urgencySamples.reduce((a, b) => a + b, 0) / gameStats.urgencySamples.length
      : urgencyToSave;
    const avgSpeed = gameStats.speedSamples.length > 0
      ? gameStats.speedSamples.reduce((a, b) => a + b, 0) / gameStats.speedSamples.length
      : 0;
    
    // 게임 결과 데이터 준비 (최대한 상세하게)
    const gameResult = {
      // 기본 정보
      uid: user?.uid || 'anonymous',
      success,
      duration: Math.round(duration),
      timestamp: serverTimestamp(),
      date: new Date().toISOString(),
      
      // 게임 상태
      urgency: Math.round(urgencyToSave * 10) / 10,
      maxUrgency: Math.round(gameStats.maxUrgency * 10) / 10,
      avgUrgency: Math.round(avgUrgency * 10) / 10,
      finalStamina: Math.round(stats.stamina * 10) / 10,
      minStamina: Math.round(gameStats.minStamina * 10) / 10,
      
      // 통제 사용 통계
      controls: controlsUsed, // 사용한 통제 목록
      controlsCount: {
        physical: Math.round(controlsCountRef.current['Hold_Time'] / 100) / 10, // 0.1초 단위
        tech: Math.round(controlsCountRef.current['Map_Time'] / 100) / 10, // 0.1초 단위
        sprint: Math.round(controlsCountRef.current['Sprint_Time'] / 100) / 10 // 0.1초 단위
      },
      controlsActivations: {
        physical: gameStats.holdActivations, // Hold 활성화 횟수
        tech: gameStats.mapUses, // Map 사용 횟수
        sprint: gameStats.sprintActivations // Sprint 활성화 횟수
      },
      
      // 게임 플레이 통계
      totalDistance: Math.round(gameStats.totalDistance), // 총 이동 거리 (픽셀)
      avgSpeed: Math.round(avgSpeed * 10) / 10, // 평균 속도
      riskZonePasses: gameStats.riskZoneCount, // 위험 지역 통과 횟수
      finalPosition: { // 최종 위치
        x: Math.round(playerRef.current.x),
        y: Math.round(playerRef.current.y)
      },
      
      // 맵 정보
      numBathrooms: goalPositions.length, // 화장실 개수
      goalPosition: { // 목표 위치
        x: goalPosition.x,
        y: goalPosition.y
      },
      
      // 메타데이터
      platform: isPC ? 'desktop' : 'mobile',
      orientation: orientation
    };
    
    // Firestore에 저장
    console.log('🔄 게임 결과 저장 시도:', { 
      db: !!db, 
      user: !!user, 
      uid: user?.uid,
      success,
      duration: `${(duration / 1000).toFixed(1)}초`
    });
    
    if (!db) {
      console.error('❌ Firestore DB가 초기화되지 않았습니다.');
      alert('데이터베이스 연결 실패. 콘솔을 확인하세요.');
      return;
    }
    
    // 사용자 인증이 안 되어 있으면 익명 인증 시도
    let currentUser = user;
    if (!currentUser && auth) {
      console.warn('⚠️ 사용자 인증이 완료되지 않았습니다. 익명 인증 시도 중...');
      try {
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
        setUser(currentUser);
        gameResult.uid = currentUser.uid;
        console.log('✅ 익명 인증 완료:', currentUser.uid);
      } catch (authError) {
        console.error('❌ 익명 인증 실패:', authError);
        console.error('인증 오류 상세:', {
          code: authError.code,
          message: authError.message
        });
        // 인증 실패해도 저장은 시도 (보안 규칙에서 허용)
        gameResult.uid = 'anonymous_' + Date.now();
      }
    } else if (currentUser) {
      gameResult.uid = currentUser.uid;
    } else {
      // 인증이 완전히 실패한 경우 고유 ID 생성
      gameResult.uid = 'anonymous_' + Date.now();
    }
    
    try {
      console.log('📝 저장할 데이터:', gameResult);
      const docRef = await addDoc(collection(db, 'game_results'), gameResult);
      console.log('✅ 게임 결과 저장 완료!');
      console.log('📄 문서 ID:', docRef.id);
      console.log('📊 저장된 데이터 요약:', {
        success,
        duration: `${(duration / 1000).toFixed(1)}초`,
        urgency: `${urgencyToSave.toFixed(1)}%`,
        uid: gameResult.uid
      });
    } catch (e) {
      console.error('❌ Firestore 저장 실패:', e);
      console.error('에러 상세:', {
        code: e.code,
        message: e.message,
        stack: e.stack
      });
      
      if (e.code === 'permission-denied') {
        console.error('⚠️ 권한 오류: Firestore 보안 규칙을 확인하세요.');
        console.error('현재 사용자:', currentUser?.uid || 'anonymous');
        alert('데이터 저장 권한 오류. Firestore 보안 규칙을 확인하세요.');
      } else {
        alert(`데이터 저장 실패: ${e.message}`);
      }
    }
    
    // 게임 종료 시 리더보드 업데이트 (성공/실패 모두)
    fetchLeaderboard();
  };

  // 리더보드 조회 함수
  const fetchLeaderboard = useCallback(async () => {
    if (!db) return;
    
    try {
      // success가 true인 경우만 조회하고 duration으로 정렬
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
      // 인덱스가 없는 경우 에러가 발생할 수 있으므로, 에러 처리 추가
      if (e.code === 'failed-precondition') {
        console.warn('Firestore 인덱스가 필요합니다. Firebase Console에서 인덱스를 생성하세요.');
      }
    }
  }, [db]);

  // 게임 종료 시 리더보드 조회
  useEffect(() => {
    if ((gameState === 'success' || gameState === 'fail') && db) {
      fetchLeaderboard();
    }
  }, [gameState, db, fetchLeaderboard]);

  // 게임보이 스타일 십자가 방향키
  const DirectionPad = () => {
      const buttonSize = isPC ? '3rem' : '2.5rem';
      const containerSize = isPC ? '10rem' : '8rem';
      
      const handleDirection = (dir, isActive) => {
        // 방향 버튼 상태를 업데이트 (버튼을 누를 때만 true)
        if (dir === 'up') {
          inputRef.current.direction.up = isActive;
        } else if (dir === 'down') {
          inputRef.current.direction.down = isActive;
        } else if (dir === 'left') {
          inputRef.current.direction.left = isActive;
        } else if (dir === 'right') {
          inputRef.current.direction.right = isActive;
        }
      };
      
      return (
        <div 
          className="relative touch-none select-none"
          style={{ 
            width: containerSize,
            height: containerSize,
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            userSelect: 'none'
          }}
        >
          {/* 중앙 기준으로 십자가 배치 */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* 위 버튼 */}
            <button
              className="absolute bg-gray-700/80 hover:bg-gray-600/80 active:bg-gray-800 border-2 border-gray-500 rounded-t-lg flex items-center justify-center transition-all"
              style={{
                width: buttonSize,
                height: buttonSize,
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                touchAction: 'none'
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleDirection('up', true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleDirection('up', false);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleDirection('up', true);
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                handleDirection('up', false);
              }}
              onMouseLeave={(e) => {
                if (e.buttons === 1) {
                  handleDirection('up', false);
                }
              }}
            >
              <span className={`${isPC ? 'text-2xl' : 'text-xl'} font-bold`}>↑</span>
            </button>
            
            {/* 아래 버튼 */}
            <button
              className="absolute bg-gray-700/80 hover:bg-gray-600/80 active:bg-gray-800 border-2 border-gray-500 rounded-b-lg flex items-center justify-center transition-all"
              style={{
                width: buttonSize,
                height: buttonSize,
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                touchAction: 'none'
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleDirection('down', true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleDirection('down', false);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleDirection('down', true);
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                handleDirection('down', false);
              }}
              onMouseLeave={(e) => {
                if (e.buttons === 1) {
                  handleDirection('down', false);
                }
              }}
            >
              <span className={`${isPC ? 'text-2xl' : 'text-xl'} font-bold`}>↓</span>
            </button>
            
            {/* 왼쪽 버튼 */}
            <button
              className="absolute bg-gray-700/80 hover:bg-gray-600/80 active:bg-gray-800 border-2 border-gray-500 rounded-l-lg flex items-center justify-center transition-all"
              style={{
                width: buttonSize,
                height: buttonSize,
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                touchAction: 'none'
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleDirection('left', true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleDirection('left', false);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleDirection('left', true);
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                handleDirection('left', false);
              }}
              onMouseLeave={(e) => {
                if (e.buttons === 1) {
                  handleDirection('left', false);
                }
              }}
            >
              <span className={`${isPC ? 'text-2xl' : 'text-xl'} font-bold`}>←</span>
            </button>
            
            {/* 오른쪽 버튼 */}
            <button
              className="absolute bg-gray-700/80 hover:bg-gray-600/80 active:bg-gray-800 border-2 border-gray-500 rounded-r-lg flex items-center justify-center transition-all"
              style={{
                width: buttonSize,
                height: buttonSize,
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                touchAction: 'none'
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleDirection('right', true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleDirection('right', false);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleDirection('right', true);
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                handleDirection('right', false);
              }}
              onMouseLeave={(e) => {
                if (e.buttons === 1) {
                  handleDirection('right', false);
                }
              }}
            >
              <span className={`${isPC ? 'text-2xl' : 'text-xl'} font-bold`}>→</span>
            </button>
          </div>
          
          {isPC && <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 font-mono">WASD</div>}
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
             {/* 왼쪽: 십자가 방향키 */}
             <div className="flex-shrink-0" style={{ marginBottom: isPC ? '1.5rem' : '1rem' }}>
               <DirectionPad />
             </div>
             
             {/* 오른쪽: RUN, HOLD(가장 크게), MAP 버튼 그룹 */}
             <div className="flex gap-3 items-end" style={{ gap: isPC ? '1rem' : '0.75rem' }}>
                {/* RUN 버튼 */}
                <div className="flex flex-col items-center" style={{ marginBottom: isPC ? '0.5rem' : '0.25rem' }}>
                  <button className={`rounded-full border-4 flex flex-col items-center justify-center ${inputRef.current.sprint ? 'bg-blue-600' : 'bg-blue-600/80'}`}
                     style={{ width: isPC ? '5rem' : '4.5rem', height: isPC ? '5rem' : '4.5rem' }}
                     onTouchStart={()=>{inputRef.current.sprint=true}} onTouchEnd={()=>{inputRef.current.sprint=false}}
                     onMouseDown={()=>{inputRef.current.sprint=true}} onMouseUp={()=>{inputRef.current.sprint=false}}>
                     <Navigation size={isPC ? 28 : 24} /><span className={`${isPC ? 'text-xs' : 'text-[10px]'} font-bold`}>RUN</span>
                  </button>
                  {isPC && <span className="text-xs text-gray-500 mt-1">J</span>}
                </div>
                {/* HOLD 버튼 (가장 크게) */}
                <div className="flex flex-col items-center" style={{ marginBottom: isPC ? '0' : '0.5rem' }}>
                  <button className={`rounded-full border-2 flex flex-col items-center justify-center backdrop-blur-md ${inputRef.current.hold ? 'bg-green-600 ring-4 ring-green-400/30' : 'bg-green-500/20 border-green-400'}`}
                     style={{ width: isPC ? '7rem' : '6rem', height: isPC ? '7rem' : '6rem' }}
                     onTouchStart={()=>{inputRef.current.hold=true}} onTouchEnd={()=>{inputRef.current.hold=false}}
                     onMouseDown={()=>{inputRef.current.hold=true}} onMouseUp={()=>{inputRef.current.hold=false}}>
                     <Eye size={isPC ? 32 : 28} /><span className={`${isPC ? 'text-sm' : 'text-xs'} font-bold`}>HOLD</span>
                  </button>
                  {isPC && <span className="text-xs text-gray-500 mt-1">K</span>}
                </div>
                {/* MAP 버튼 */}
                <div className="flex flex-col items-center" style={{ marginTop: isPC ? '-0.5rem' : '-0.5rem' }}>
                  <button className={`rounded-full border-2 flex flex-col items-center justify-center ${inputRef.current.map ? 'bg-purple-600' : 'bg-purple-500/20'}`}
                     style={{ width: isPC ? '4.5rem' : '4rem', height: isPC ? '4.5rem' : '4rem' }}
                     onTouchStart={()=>{inputRef.current.map=true}} onTouchEnd={()=>{inputRef.current.map=false}}
                     onMouseDown={()=>{inputRef.current.map=true}} onMouseUp={()=>{inputRef.current.map=false}}>
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
                    
                    {/* 모바일 최적화: 가로 화면에 맞게 컴팩트하게 배치 */}
                    <div className={`${isPC ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-3'} w-full max-w-4xl`}>
                        {/* 게임 결과 통계 - 좌측 상단 */}
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

                        {/* 통제 사용 통계 - 우측 상단 */}
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

                    {/* 리더보드 (성공/실패 모두 표시) - 하단에 컴팩트하게 */}
                    {leaderboard.length > 0 && (
                        <div className={`${isPC ? 'mb-6' : 'mb-3'} text-left bg-gray-800 p-3 rounded w-full max-w-4xl`}>
                            <p className={`${isPC ? 'text-sm' : 'text-xs'} text-yellow-400 mb-2 font-bold flex items-center gap-1 justify-center`}>
                                <Zap size={isPC ? 16 : 12} />리더보드 TOP {Math.min(leaderboard.length, 5)}
                            </p>
                            <div className={`${isPC ? 'space-y-2 max-h-64' : 'space-y-1 max-h-32'} overflow-y-auto`}>
                                {leaderboard.slice(0, isPC ? 10 : 5).map((entry, index) => (
                                    <div key={entry.id} className={`${isPC ? 'p-2' : 'p-1.5'} rounded ${index === 0 ? 'bg-yellow-900/30 border border-yellow-500' : 'bg-gray-700/50'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`${isPC ? 'text-sm' : 'text-xs'} font-bold ${index === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                                </span>
                                                <span className={`${isPC ? 'text-sm' : 'text-xs'} font-mono`}>{(entry.duration / 1000).toFixed(1)}초</span>
                                            </div>
                                            {!isPC && (
                                                <div className="flex gap-2 text-[10px] text-gray-400">
                                                    {entry.controlsCount.physical > 0 && <span className="text-green-400">참기</span>}
                                                    {entry.controlsCount.tech > 0 && <span className="text-purple-400">지도</span>}
                                                    {entry.controlsCount.sprint > 0 && <span className="text-blue-400">달리기</span>}
                                                </div>
                                            )}
                                            {isPC && (
                                                <div className="flex gap-3 text-xs text-gray-400">
                                                    {entry.controlsCount.physical > 0 && (
                                                        <span className="text-green-400 font-mono">{entry.controlsCount.physical.toFixed(1)}s</span>
                                                    )}
                                                    {entry.controlsCount.tech > 0 && (
                                                        <span className="text-purple-400 font-mono">{entry.controlsCount.tech.toFixed(1)}s</span>
                                                    )}
                                                    {entry.controlsCount.sprint > 0 && (
                                                        <span className="text-blue-400 font-mono">{entry.controlsCount.sprint.toFixed(1)}s</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {isPC && entry.controlsCount && (entry.controlsCount.physical > 0 || entry.controlsCount.tech > 0 || entry.controlsCount.sprint > 0) && (
                                            <div className="text-xs text-gray-400 space-y-0.5 ml-6 mt-1">
                                                {entry.controlsCount.physical > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-green-400">참기</span>
                                                        <span className="font-mono">{entry.controlsCount.physical.toFixed(1)}초</span>
                                                    </div>
                                                )}
                                                {entry.controlsCount.tech > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-purple-400">지도</span>
                                                        <span className="font-mono">{entry.controlsCount.tech.toFixed(1)}초</span>
                                                    </div>
                                                )}
                                                {entry.controlsCount.sprint > 0 && (
                                                    <div className="flex justify-between">
                                                        <span className="text-blue-400">달리기</span>
                                                        <span className="font-mono">{entry.controlsCount.sprint.toFixed(1)}초</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
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

export default SuddenPoopSimulator;