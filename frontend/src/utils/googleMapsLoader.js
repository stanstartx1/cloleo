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

    if (loaderPromise) {
      return loaderPromise;
    }

    loaderPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-google-maps-loader="1"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.google.maps));
        existing.addEventListener('error', () => reject(new Error('Google Maps script failed to load')));
        return;
      }

      const script = document.createElement('script');
      const libs = Array.isArray(libraries) ? libraries.join(',') : String(libraries || 'places');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libs}`;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-google-maps-loader', '1');

      script.onload = () => resolve(window.google.maps);
      script.onerror = () => reject(new Error('Google Maps script failed to load'));

      document.head.appendChild(script);
    });

    return loaderPromise;
  };
})();
