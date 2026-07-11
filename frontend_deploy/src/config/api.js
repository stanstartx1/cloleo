const getBackendUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return "http://localhost:8000";
};

const BACKEND_URL = getBackendUrl().replace(/\/$/, "");

export const API_BASE = BACKEND_URL;
export const API_URL = `${BACKEND_URL}/api`;
export const WS_URL = BACKEND_URL.replace('http', 'ws');

export default BACKEND_URL;
