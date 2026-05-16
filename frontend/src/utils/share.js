export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
};

export const shareOrCopy = async ({ title = '', text = '', url = '' }) => {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { shared: true, copied: false };
    } catch (e) {
      if (e?.name === 'AbortError') return { shared: false, copied: false, aborted: true };
    }
  }

  const copied = await copyToClipboard(url);
  return { shared: false, copied };
};
