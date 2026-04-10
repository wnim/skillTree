import { VIEWPORT_KEY } from '../data/defaultData';

export function loadViewport() {
  try {
    const raw = localStorage.getItem(VIEWPORT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveViewport(viewport) {
  localStorage.setItem(VIEWPORT_KEY, JSON.stringify(viewport));
}
