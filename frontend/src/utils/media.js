import { API_BASE } from '../config/api';

export const toAbsoluteMediaUrl = (url) => {
  if (!url) return '';
  if (url.includes('195.110.34.168')) {
    return url.replace(/https?:\/\/195\.110\.34\.168/, API_BASE);
  }
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_BASE;
  if (!base) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};
