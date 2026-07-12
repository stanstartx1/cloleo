import React, { useEffect, useState } from 'react';
import { API_BASE, API_URL } from '../config/api';

const DEFAULT_SETTINGS = {
  enabled: false,
  background_type: 'color',
  background_color: '',
  background_images: [],
  layout_type: 'single',
};

const AuthPageBackground = ({ children, className = '', ...props }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    fetch(`${API_URL}/auth-page-settings`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data && setSettings({ ...DEFAULT_SETTINGS, ...data }))
      .catch(() => {});
  }, []);

  const images = (settings.background_images || [])
    .filter(Boolean)
    .map((image) => image.startsWith('/') ? `${API_BASE}${image}` : image);
  const showImages = settings.enabled && settings.background_type === 'image' && images.length > 0;
  const splitImages = showImages && settings.layout_type === 'split' && images.length > 1;
  const colorStyle = settings.enabled && settings.background_type === 'color' && settings.background_color
    ? { backgroundColor: settings.background_color, backgroundImage: 'none' }
    : undefined;

  return (
    <div
      className={`relative min-h-screen overflow-hidden ${settings.enabled ? '' : 'bg-gradient-to-br from-orange-50 via-amber-50 to-white'} ${className}`}
      style={colorStyle}
      {...props}
    >
      {showImages && (
        <div className="absolute inset-0" aria-hidden="true">
          {splitImages ? (
            <div className="flex h-full"><img src={images[0]} alt="" className="h-full w-1/2 object-cover" /><img src={images[1]} alt="" className="h-full w-1/2 object-cover" /></div>
          ) : <img src={images[0]} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-slate-950/20" />
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default AuthPageBackground;
