import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE, API_URL } from '../config/api';

const SiteLogo = ({ imageClassName = 'h-20', className = '' }) => {
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/logo-settings`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.logo_url) return;
        setLogoUrl(data.logo_url.startsWith('/') ? `${API_BASE}${data.logo_url}` : data.logo_url);
      })
      .catch(() => {});
  }, []);

  return (
    <Link to="/" className={`inline-flex items-center ${className}`} aria-label="Accueil Cloléo">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Cloléo"
          className={`${imageClassName} w-auto object-contain`}
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <span className="text-2xl font-black tracking-tight">
          <span className="text-orange-500">Clo</span><span className="text-amber-500">léo</span>
        </span>
      )}
    </Link>
  );
};

export default SiteLogo;
