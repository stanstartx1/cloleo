import React, { useState, useEffect } from 'react';
import { MessageSquare, TrendingUp, Clock, Eye, ThumbsUp, MessageCircle, Search, Filter, Loader2, Plus, Calendar } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

/**
 * EnhancedForumSection - Enhanced forum section with recent posts
 * @param {Object} props - Component props
 */
const EnhancedForumSection = ({ token, userType }) => {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    fetchForumData();
  }, [token]);

  const fetchForumData = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await axios.get(`${API}/forum/recent`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // setPosts(response.data.posts || []);
      // setCategories(response.data.categories || []);

      // Mock data for now
      const mockPosts = [
        {
          id: 1,
          title: 'Comment optimiser la logistique B2B ?',
          content: 'Je cherche des conseils pour améliorer mes délais de livraison...',
          author: 'LogisticsPro',
          avatar: 'LP',
          category: 'Logistique',
          views: 234,
          likes: 45,
          comments: 12,
          createdAt: '2h',
          trending: true
        },
        {
          id: 2,
          title: 'Meilleures pratiques pour la gestion des stocks',
          content: 'Partagez vos expériences sur la gestion efficace des stocks...',
          author: 'InventoryMaster',
          avatar: 'IM',
          category: 'Gestion',
          views: 189,
          likes: 38,
          comments: 8,
          createdAt: '5h',
          trending: true
        },
        {
          id: 3,
          title: 'Nouvelles réglementations import/export',
          content: 'Mise à jour sur les nouvelles réglementations douanières...',
          author: 'TradeExpert',
          avatar: 'TE',
          category: 'Réglementation',
          views: 567,
          likes: 89,
          comments: 23,
          createdAt: '1j',
          trending: false
        },
        {
          id: 4,
          title: 'Partenariats stratégiques entre entreprises',
          content: 'Je recherche des partenaires pour développer mon activité...',
          author: 'BusinessBuilder',
          avatar: 'BB',
          category: 'Partenariat',
          views: 123,
          likes: 22,
          comments: 5,
          createdAt: '2j',
          trending: false
        },
        {
          id: 5,
          title: 'Automatisation des processus de vente',
          content: 'Quels outils utilisez-vous pour automatiser vos ventes ?',
          author: 'TechSavvy',
          avatar: 'TS',
          category: 'Technologie',
          views: 345,
          likes: 67,
          comments: 15,
          createdAt: '3j',
          trending: true
        },
      ];

      const mockCategories = ['all', 'Logistique', 'Gestion', 'Réglementation', 'Partenariat', 'Technologie', 'Marketing'];
      setPosts(mockPosts);
      setCategories(mockCategories);
    } catch (error) {
      console.error('Error fetching forum data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'popular') return b.views - a.views;
    if (sortBy === 'trending') return b.likes - a.likes;
    return 0;
  });

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-amber-400" />
          Forum Entreprises
        </h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Nouveau post
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans le forum..."
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  selectedCategory === category
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {category === 'all' ? 'Tous' : category}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="recent">Plus récents</option>
            <option value="popular">Plus populaires</option>
            <option value="trending">Tendances</option>
          </select>
        </div>
      </div>

      {/* Trending Posts */}
      {sortBy === 'trending' && filteredPosts.filter(p => p.trending).length > 0 && (
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Posts en tendance
          </h3>
          <div className="space-y-3">
            {filteredPosts.filter(p => p.trending).slice(0, 3).map((post) => (
              <div key={post.id} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center text-white font-bold">
                  {post.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{post.title}</p>
                  <p className="text-xs text-slate-400">{post.author} • {post.createdAt}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-purple-400">
                  <ThumbsUp className="w-4 h-4" />
                  {post.likes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">Aucun post trouvé</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl hover:border-amber-500/30 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {post.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {post.trending && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Tendance
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                          {post.category}
                        </span>
                      </div>
                      <h4 className="font-semibold text-white text-lg mb-2">{post.title}</h4>
                      <p className="text-slate-400 text-sm line-clamp-2">{post.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {post.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {post.comments}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Calendar className="w-4 h-4" />
                      {post.createdAt}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Forum Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">1,234</p>
          <p className="text-xs text-slate-400">Posts</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">5,678</p>
          <p className="text-xs text-slate-400">Membres</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">892</p>
          <p className="text-xs text-slate-400">Réponses</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">45</p>
          <p className="text-xs text-slate-400">En ligne</p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedForumSection;
