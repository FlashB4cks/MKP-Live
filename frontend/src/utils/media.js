export function getMediaUrl(url) {
  if (!url) return null;
  const str = String(url).trim();
  if (
    str.startsWith('http://') ||
    str.startsWith('https://') ||
    str.startsWith('data:') ||
    str.startsWith('blob:')
  ) {
    return str;
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    const base = envUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');
    return `${base}${str.startsWith('/') ? '' : '/'}${str}`;
  }

  // If running in development with Vite on :5173, point to backend port :8000
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173') {
      return `http://${window.location.hostname || '127.0.0.1'}:8000${str.startsWith('/') ? '' : '/'}${str}`;
    }
  }

  return str;
}
