const baseUrl = (() => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '');
  }


  if (typeof window === 'undefined') {
    return '';
  }


  if (window.location.protocol === 'file:') {
    return 'http://10.0.2.2:3000';
  }

  if (window.location.hostname.endsWith('github.io')) {
    return 'https://tvk-2lof.onrender.com';
  }


  return window.location.origin;
})();


export const API_BASE_URL = baseUrl;


export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }


  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}


export function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string') {
    return fetch(apiUrl(input), init);
  }
  return fetch(input, init);
}

