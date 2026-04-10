import { useState, useCallback } from 'react';
import { GIST_CONFIG_KEY } from '../data/defaultData';

function loadConfig() {
  try {
    const saved = localStorage.getItem(GIST_CONFIG_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore corrupted storage
  }
  return null;
}

export function useGistConfig() {
  const [config, setConfigState] = useState(loadConfig);

  const setConfig = useCallback((newConfig) => {
    localStorage.setItem(GIST_CONFIG_KEY, JSON.stringify(newConfig));
    setConfigState(newConfig);
  }, []);

  const clearConfig = useCallback(() => {
    localStorage.removeItem(GIST_CONFIG_KEY);
    setConfigState(null);
  }, []);

  return { config, setConfig, clearConfig };
}
