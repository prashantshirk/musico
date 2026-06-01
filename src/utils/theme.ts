export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'musico-theme';

export function getInitialTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}
