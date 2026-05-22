export const loadGoogleMaps = (() => {
  let loaderPromise = null;

  return (apiKey, libraries = ['places']) => {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Window is not available'));
    }

    if (window.google?.maps) {
      return Promise.resolve(window.google.maps);
    }

    if (!apiKey) {
      return Promise.reject(new Error('Missing Google Maps API key'));
    }

    if (loaderPromise) return loaderPromise;

    loaderPromise = new Promise((resolve, reject) => {
      const resolveIfReady = () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
          return true;
        }
        return false;
      };

      if (resolveIfReady()) return;

      const anyMapsScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (anyMapsScript) {
        const startedAt = Date.now();
        const interval = setInterval(() => {
          if (resolveIfReady()) {
            clearInterval(interval);
            return;
          }
          if (Date.now() - startedAt > 12000) {
            clearInterval(interval);
            reject(new Error('Google Maps API unavailable after script load wait'));
          }
        }, 200);

        anyMapsScript.addEventListener('error', () => {
          clearInterval(interval);
          reject(new Error('Existing Google Maps script failed'));
        });
        return;
      }

      const script = document.createElement('script');
      const libs = Array.isArray(libraries) ? libraries.join(',') : String(libraries || 'places');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libs}`;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-google-maps-loader', '1');

      script.onload = () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps loaded but window.google.maps is missing'));
        }
      };
      script.onerror = () => reject(new Error('Google Maps script failed to load'));

      document.head.appendChild(script);
    });

    return loaderPromise;
  };
})();
