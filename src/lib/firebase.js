import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
let firebaseConfig = {};

// 1. 전역 변수에서 가져오기 (index.html에서 설정된 경우)
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

// 4. Firebase 설정이 여전히 비어있을 때 기본 설정 사용 (Dev/Demo용)
if (!firebaseConfig.apiKey || Object.keys(firebaseConfig).length === 0 || firebaseConfig.apiKey === 'dummy-key') {
  firebaseConfig = {
    apiKey: "AIzaSyDZ1PFzJMcjzaCN6RPxC58elsfNVVIhtjU",
    authDomain: "geupddong-fc00c.firebaseapp.com",
    projectId: "geupddong-fc00c",
    storageBucket: "geupddong-fc00c.firebasestorage.app",
    messagingSenderId: "357858980688",
    appId: "1:357858980688:web:3ebe0f383b629031e97255",
    measurementId: "G-7L81FW0FH2"
  };
  console.log('✅ Firebase 설정이 적용되었습니다. (Default)', firebaseConfig.projectId);
}

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log('✅ Firebase 초기화 성공');
} catch (e) {
  console.error('❌ Firebase 초기화 실패:', e);
  db = null;
  auth = null;
}

export { app, auth, db };


