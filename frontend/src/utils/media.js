export const toAbsoluteMediaUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
  if (!base) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};
