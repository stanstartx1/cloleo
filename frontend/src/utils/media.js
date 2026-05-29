import { API_BASE } from '../config/api';
export const toAbsoluteMediaUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_BASE;
  if (!base) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};
