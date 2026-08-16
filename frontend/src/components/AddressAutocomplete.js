import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, X, Home, Building, Map } from 'lucide-react';
import { addressAutocomplete } from '../utils/osmServices';

const AddressAutocomplete = ({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Rechercher une adresse...',
  countryCodes = ['ci'],
  className = '',
  disabled = false,
  autoFocus = false
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);
  const cacheRef = useRef(new Map()); // Simple cache for recent searches
  const countryCodesRef = useRef(countryCodes); // Stable ref for country codes
  
  // Update country codes ref when prop changes and clear cache
  useEffect(() => {
    countryCodesRef.current = countryCodes;
    // Clear cache when country codes change to avoid stale results
    cacheRef.current.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCodes]);

  // Update local state when prop value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Handle input change with debounce
  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange?.(newValue);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Don't search for very short queries
    if (newValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    // Debounce search (250ms for better responsiveness)
    debounceRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange, searchAddresses]);

  // Search addresses using OSM autocomplete with cache
  const searchAddresses = useCallback(async (searchQuery) => {
    if (searchQuery.length < 2) return;
    
    const currentCountryCodes = countryCodesRef.current;
    
    // Check cache first
    const cacheKey = `${searchQuery.toLowerCase()}_${currentCountryCodes.join(',')}`;
    if (cacheRef.current.has(cacheKey)) {
      setSuggestions(cacheRef.current.get(cacheKey));
      setShowSuggestions(true);
      setSelectedIndex(-1);
      return;
    }
    
    setLoading(true);
    try {
      const results = await addressAutocomplete(searchQuery, currentCountryCodes, 8);
      setSuggestions(results);
      setShowSuggestions(true);
      setSelectedIndex(-1);
      
      // Cache results (limit cache size to 50 entries)
      if (cacheRef.current.size > 50) {
        const firstKey = cacheRef.current.keys().next().value;
        cacheRef.current.delete(firstKey);
      }
      cacheRef.current.set(cacheKey, results);
    } catch (error) {
      console.error('Address autocomplete error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    setQuery(suggestion.formatted_address);
    onChange?.(suggestion.formatted_address);
    onSelect?.(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Clear input
  const handleClear = () => {
    setQuery('');
    onChange?.('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get icon based on location type
  const getLocationIcon = (type) => {
    switch (type) {
      case 'address':
        return <Home className="w-4 h-4" />;
      case 'street':
        return <MapPin className="w-4 h-4" />;
      case 'neighborhood':
        return <Building className="w-4 h-4" />;
      case 'city':
        return <Map className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
        
        {loading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          </div>
        )}
        
        {query && !loading && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex
                  ? 'bg-blue-50 text-blue-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-gray-400 flex-shrink-0">
                  {getLocationIcon(suggestion.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {suggestion.formatted_address}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {suggestion.display_name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
                      {suggestion.type}
                    </span>
                    {suggestion.confidence > 0.7 && (
                      <span className="text-xs text-green-600">✓ Haute correspondance</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-gray-500">
          Aucune adresse trouvée
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;