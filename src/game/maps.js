import { TILE_SIZE } from './constants';

// Map Types: 0:Road, 1:Wall, 2:Start, 3:Bathroom(화장실), 4:Risk, 5:Door, 6:Destination(목적지)
// 더 크고 복잡한 맵: 55x20 타일
export const BASE_MAP_TEMPLATE = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 4, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 2, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 4, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 5, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 5, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 4, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 5, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 6, 1],
  [1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 6, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 5, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 5, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 5, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1, 0, 1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
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
      if (![1, 2, 3, 5, 6].includes(newMap[r][c])) {
        newMap[r][c] = 0;
      }
    }
  }
  for (let c = padding; c < newWidth - padding; c += corridorSpacing) {
    for (let r = 1; r < newHeight - 1; r++) {
      if (![1, 2, 3, 5, 6].includes(newMap[r][c])) {
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

export const MAP_WIDTH_TILES = RAW_MAP_TEMPLATE[0].length;
export const MAP_HEIGHT_TILES = RAW_MAP_TEMPLATE.length;

// 시작 위치 (왼쪽 시작점 기준)
export const CENTER_X = 2 * TILE_SIZE + TILE_SIZE / 2;
export const CENTER_Y = 2 * TILE_SIZE + TILE_SIZE / 2;

export const generateLevel = () => {
    const newMap = JSON.parse(JSON.stringify(RAW_MAP_TEMPLATE));
    
    // 시작 지점 찾기 (타일 2)
    let startPos = { r: 2, c: 2 };
    const bathroomPositions = [];
    const destinationPositions = [];
    
    for (let r = 0; r < newMap.length; r++) {
      for (let c = 0; c < newMap[r].length; c++) {
        if (newMap[r][c] === 2) {
          startPos = { r, c };
        } else if (newMap[r][c] === 3) {
          bathroomPositions.push({ r, c });
        } else if (newMap[r][c] === 6) {
          destinationPositions.push({ r, c });
        }
      }
    }
    
    // 화장실 위치 배열 (응급도 해소용)
    const bathroomPixelPositions = bathroomPositions.map(pos => ({
      x: pos.c * TILE_SIZE,
      y: pos.r * TILE_SIZE
    }));
    
    // 목적지 위치 배열 (최종 도착지)
    const destinationPixelPositions = destinationPositions.map(pos => ({
      x: pos.c * TILE_SIZE,
      y: pos.r * TILE_SIZE
    }));
    
    // 기본 목표 위치는 첫 번째 목적지
    const goalPos = destinationPixelPositions[0] || { x: 0, y: 0 };
    
    return { 
      map: newMap, 
      goalPos,
      goalPositions: destinationPixelPositions, // 목적지들
      bathroomPositions: bathroomPixelPositions // 화장실들
    };
};
