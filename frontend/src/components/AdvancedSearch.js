/**
 * AdvancedSearch - Advanced search component with Elasticsearch
 * Features: autocomplete, filters, highlighting, sorting
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Filter, ChevronDown, Sparkles } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';

const API = API_URL;

const AdvancedSearch = ({ token, onSearchResults }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState({
    category_id: null,
    tags: [],
    author_id: null,
    sort_by: 'relevance'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadCategories();
  }, [token]);

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API}/forum/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length >= 2) {
      try {
        const response = await axios.get(`${API}/forum/search/autocomplete`, {
          params: { query: value },
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuggestions(response.data.suggestions || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/forum/search`,
        {
          query: searchQuery,
          category_id: filters.category_id,
          tags: filters.tags,
          author_id: filters.author_id,
          sort_by: filters.sort_by
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (onSearchResults) {
        onSearchResults(response.data);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch(suggestion);
  };

  const clearFilters = () => {
    setFilters({
      category_id: null,
      tags: [],
      author_id: null,
      sort_by: 'relevance'
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Rechercher dans le forum..."
            className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-4 py-2 hover:bg-slate-100 cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-slate-700">{suggestion}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-purple-600 transition-colors"
      >
        <Filter className="w-4 h-4" />
        Filtres
        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
      </button>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700">Catégorie</label>
            <select
              value={filters.category_id || ''}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value || null })}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700">Trier par</label>
            <select
              value={filters.sort_by}
              onChange={(e) => setFilters({ ...filters, sort_by: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
            >
              <option value="relevance">Pertinence</option>
              <option value="recent">Plus récent</option>
              <option value="popular">Plus populaire</option>
              <option value="views">Plus vus</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="text-sm text-slate-600 hover:text-purple-600"
          >
            Effacer les filtres
          </button>
        </div>
      )}

      {/* Search Button */}
      <button
        onClick={() => handleSearch()}
        disabled={loading || !query.trim()}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Recherche...
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            Rechercher
          </>
        )}
      </button>
    </div>
  );
};

export default AdvancedSearch;
