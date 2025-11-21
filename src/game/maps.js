import { TILE_SIZE } from './constants';

// Map Types: 0:Road, 1:Wall, 2:Start, 3:Goal, 4:Risk, 5:Door
export const BASE_MAP_TEMPLATE = [
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

export const RAW_MAP_TEMPLATE = BASE_MAP_TEMPLATE;

// 맵 유틸리티 함수들
export function expandMap(baseTemplate, padding = 10) {
  const baseHeight = baseTemplate.length;
  const baseWidth = baseTemplate[0].length;
  const newHeight = baseHeight + padding * 2;
  const newWidth = baseWidth + padding * 2;

  const newMap = Array.from({ length: newHeight }, (_, r) =>
    Array.from({ length: newWidth }, (_, c) => (r === 0 || c === 0 || r === newHeight - 1 || c === newWidth - 1 ? 1 : 0))
  );

  for (let r = 0; r < baseHeight; r++) {
    for (let c = 0; c < baseWidth; c++) {
      newMap[r + padding][c + padding] = baseTemplate[r][c];
    }
  }

  carveGateConnections(newMap, padding, baseHeight, baseWidth);

  for (let r = 1; r < newHeight - 1; r++) {
    for (let c = 1; c < newWidth - 1; c++) {
      const insideBase =
        r >= padding && r < padding + baseHeight && c >= padding && c < padding + baseWidth;
      if (insideBase || newMap[r][c] !== 0) continue;

      const rand = Math.random();
      if (rand < 0.06) {
        newMap[r][c] = 1;
      } else if (rand < 0.09) {
        newMap[r][c] = 4;
      }
    }
  }

  const corridorSpacing = 6;
  for (let r = padding; r < newHeight - padding; r += corridorSpacing) {
    for (let c = 1; c < newWidth - 1; c++) {
      if (![1, 2, 3, 5].includes(newMap[r][c])) {
        newMap[r][c] = 0;
      }
    }
  }
  for (let c = padding; c < newWidth - padding; c += corridorSpacing) {
    for (let r = 1; r < newHeight - 1; r++) {
      if (![1, 2, 3, 5].includes(newMap[r][c])) {
        newMap[r][c] = 0;
      }
    }
  }

  return newMap;
}

function carveGateConnections(map, padding, baseHeight, baseWidth) {
  const gateCols = [
    padding + Math.floor(baseWidth / 2) - 2,
    padding + Math.floor(baseWidth / 2) + 2,
  ];
  const gateRows = [
    padding + Math.floor(baseHeight / 2) - 2,
    padding + Math.floor(baseHeight / 2) + 2,
  ];

  const openCells = (cells) => {
    cells.forEach(({ r, c }) => {
      if (r > 0 && r < map.length && c > 0 && c < map[0].length) {
        map[r][c] = 0;
      }
    });
  };

  gateCols.forEach((col) => {
    openCells([
      { r: padding, c: col },
      { r: padding, c: col - 1 },
      { r: padding, c: col + 1 },
      { r: padding - 1, c: col },
      { r: padding + baseHeight - 1, c: col },
      { r: padding + baseHeight - 1, c: col - 1 },
      { r: padding + baseHeight - 1, c: col + 1 },
      { r: padding + baseHeight, c: col },
    ]);
  });

  gateRows.forEach((row) => {
    openCells([
      { r: row, c: padding },
      { r: row - 1, c: padding },
      { r: row + 1, c: padding },
      { r: row, c: padding - 1 },
      { r: row, c: padding + baseWidth - 1 },
      { r: row - 1, c: padding + baseWidth - 1 },
      { r: row + 1, c: padding + baseWidth - 1 },
      { r: row, c: padding + baseWidth },
    ]);
  });
}

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

export const MAP_WIDTH_TILES = RAW_MAP_TEMPLATE[0].length;
export const MAP_HEIGHT_TILES = RAW_MAP_TEMPLATE.length;
export const CENTER_X = (MAP_WIDTH_TILES * TILE_SIZE) / 2 - (TILE_SIZE / 2);
export const CENTER_Y = (MAP_HEIGHT_TILES * TILE_SIZE) / 2;

export const generateLevel = () => {
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
    const distanceScale = Math.min(MAP_HEIGHT_TILES, MAP_WIDTH_TILES);
    const excludeRadius = Math.max(10, Math.floor(distanceScale / 4)); // 중앙 광장 넓히기
    const edgeMargin = Math.max(4, Math.floor(distanceScale / 8)); // 가장자리 여유
    const minStartDistance = Math.max(12, Math.floor(distanceScale / 3)); // 시작 지점과 최소 거리
    const minGoalSpacing = Math.max(12, Math.floor(distanceScale / 5)); // 화장실 간 거리
    
    // 목표 위치 후보 (가장자리 위주, 중앙 부근 제외)
    const allCandidates = [];
    
    // 가장자리 좁히기 (모서리 + 가장자리)
    for (let r = 1; r < MAP_HEIGHT_TILES - 1; r++) {
      for (let c = 1; c < MAP_WIDTH_TILES - 1; c++) {
        // 중앙 부근 제외
        const distFromCenter = Math.sqrt(Math.pow(r - centerR, 2) + Math.pow(c - centerC, 2));
        if (distFromCenter < excludeRadius) continue;
        
        const distFromStart = Math.sqrt(Math.pow(r - startPos.r, 2) + Math.pow(c - startPos.c, 2));
        if (distFromStart < minStartDistance) continue;

        // 가장자리 영역에 가까울수록 우선
        const isEdge = r <= edgeMargin || r >= MAP_HEIGHT_TILES - edgeMargin - 1 || c <= edgeMargin || c >= MAP_WIDTH_TILES - edgeMargin - 1;
        
        if (isEdge && newMap[r] && newMap[r][c] === 0) {
          // 시작 위치가 아닌 곳만
          if (r !== startPos.r || c !== startPos.c) {
            allCandidates.push({r, c});
          }
        }
      }
    }
    
    // 화장실 개수 결정 (3~5개)
    const numBathrooms = 3 + Math.floor(Math.random() * 3); // 3, 4, 또는 5개
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
        return dist < minGoalSpacing; // 최소 거리 확보
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

