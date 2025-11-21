import { TILE_SIZE } from './constants';

export const checkCollision = (x, y, map) => {
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor(y / TILE_SIZE);
  if (tileY < 0 || tileY >= map.length || tileX < 0 || tileX >= map[0].length) return 1;
  return map[tileY][tileX];
};

export const toggleFullScreen = () => {
  if (typeof document === 'undefined') return;
  const docEl = document.documentElement;
  const isFull =
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement;
  if (isFull) return;
  const request =
    docEl.requestFullscreen ||
    docEl.webkitRequestFullscreen ||
    docEl.msRequestFullscreen;
  if (request) {
    try {
      const result = request.call(docEl);
      if (result && typeof result.catch === 'function') {
        result.catch(err => console.warn('Fullscreen request failed:', err));
      }
    } catch (err) {
      console.warn('Fullscreen request threw:', err);
    }
  }
};

