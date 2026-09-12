export function getMediaUrl(url) {
  if (!url) return null;
  let str = String(url).trim();
  if (!str || str === 'null' || str === 'undefined') return null;

  // 1. Data URLs and local Blobs can be returned as-is
  if (str.startsWith('data:') || str.startsWith('blob:')) {
    return str;
  }

  // 2. If running on HTTPS, automatically upgrade http:// to https:// to prevent Mixed Content blocking
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (str.startsWith('http://')) {
      str = str.replace(/^http:\/\//i, 'https://');
    }
  }

  // 3. Clean up internal container hosts (e.g. 0.0.0.0:10000 or localhost:10000) when running in production
  const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  if (isProd && (str.includes(':10000') || str.includes('127.0.0.1') || str.includes('0.0.0.0') || str.includes('localhost'))) {
    const mediaIdx = str.indexOf('/media/');
    if (mediaIdx !== -1) {
      str = str.substring(mediaIdx);
    }
  }

  // 4. If it's already an absolute URL (https://)
  if (str.startsWith('https://') || str.startsWith('http://')) {
    return str;
  }

  // 5. Build full URL using VITE_API_URL or environment base
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    const base = envUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');
    return `${base}${str.startsWith('/') ? '' : '/'}${str}`;
  }

  // 6. If running in local development with Vite on :5173, point to backend port :8000
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return `http://${window.location.hostname || '127.0.0.1'}:8000${str.startsWith('/') ? '' : '/'}${str}`;
  }

  return str;
}

