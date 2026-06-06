const MAPBOX_SCRIPT_ID = 'mapbox-gl-js';
const MAPBOX_CSS_ID = 'mapbox-gl-css';
const MAPBOX_VERSION = 'v3.8.0';

// IMPORTANT : Ne jamais mettre le token réel ici
export const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

if (!MAPBOX_ACCESS_TOKEN) {
  console.warn('⚠️ REACT_APP_MAPBOX_ACCESS_TOKEN is missing in .env file');
}

export const loadMapbox = (() => {
  let pending;
  return () => {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Mapbox is only available in the browser'));
    }

    if (window.mapboxgl) {
      window.mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      return Promise.resolve(window.mapboxgl);
    }

    if (pending) return pending;

    pending = new Promise((resolve, reject) => {
      // CSS
      if (!document.getElementById(MAPBOX_CSS_ID)) {
        const link = document.createElement('link');
        link.id = MAPBOX_CSS_ID;
        link.rel = 'stylesheet';
        link.href = `https://api.mapbox.com/mapbox-gl-js/${MAPBOX_VERSION}/mapbox-gl.css`;
        document.head.appendChild(link);
      }

      // Script
      const existingScript = document.getElementById(MAPBOX_SCRIPT_ID);
      const script = existingScript || document.createElement('script');
      script.id = MAPBOX_SCRIPT_ID;
      script.src = `https://api.mapbox.com/mapbox-gl-js/${MAPBOX_VERSION}/mapbox-gl.js`;
      script.async = true;

      script.onload = () => {
        if (!window.mapboxgl) {
          reject(new Error('Mapbox loaded but window.mapboxgl is missing'));
          return;
        }
        window.mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
        resolve(window.mapboxgl);
      };

      script.onerror = () => reject(new Error('Unable to load Mapbox'));

      if (!existingScript) {
        document.head.appendChild(script);
      }
    });

    return pending;
  };
})();