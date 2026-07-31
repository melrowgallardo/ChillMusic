import axios from 'axios';

const getBaseUrl = () => {
  // 1. Check all standard Vite/Vercel environment variable names for API URL
  const envUrl = import.meta.env.VITE_API_URL ||
                 import.meta.env.VITE_API_BASE_URL ||
                 import.meta.env.VITE_BACKEND_URL ||
                 import.meta.env.VITE_SERVER_URL;
  if (envUrl) {
    return envUrl;
  }

  // 2. Check Capacitor Native / Android WebView
  const isCapacitorNative = typeof window !== 'undefined' && (window.Capacitor || window.location.protocol === 'capacitor:' || Boolean(window.AndroidBridge));
  const isAndroidWebView = typeof window !== 'undefined' && window.navigator && window.navigator.userAgent && window.navigator.userAgent.includes('Android');
  const isLocalBrowser = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && !isCapacitorNative && !isAndroidWebView;
  
  if (isLocalBrowser) {
    return 'http://127.0.0.1:8000/api';
  }

  // 3. In Vercel / Production web browser (HTTPS) without env var set, default to relative '/api'
  // to avoid browser Mixed Content security blocks (HTTP requests from HTTPS pages)
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return '/api';
  }

  const host = typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' ? window.location.hostname : '192.168.1.7';
  return `http://${host}:8000/api`;
};

export const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto Refresh Token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token: new_refresh } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', new_refresh);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
