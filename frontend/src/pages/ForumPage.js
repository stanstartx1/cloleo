import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  MessageSquare, Plus, Search, Hash, Bell, Settings, 
  Users, Clock, Eye, Pin, Lock, ChevronRight, 
  Edit, Trash2, Reply, Smile, Send, 
  LayoutDashboard, Home, X, Filter, Upload, Mic, Square, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import MediaImg from '../components/MediaImg';

import { API_URL } from '../config/api';
const API = API_URL;

const ForumPage = () => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const { categoryId, topicId } = useParams();
  
  const [activeView, setActiveView] = useState('categories'); // categories, topic, search
  const [categories, setCategories] = useState([]);
  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [showNewCommentModal, setShowNewCommentModal] = useState(false);
  
  // New topic form
  const [newTopic, setNewTopic] = useState({
    title: '',
    content: '',
    category_id: '',
    tags: []
  });
  
  // New comment form
  const [newComment, setNewComment] = useState({
    content: '',
    parent_id: null,
    media_url: null,
    audio_url: null
  });

  // Media upload state
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);

  // Load categories when modal opens
  useEffect(() => {
    if (showNewTopicModal && categories.length === 0) {
      loadCategories();
    }
  }, [showNewTopicModal, categories.length, loadCategories]);

  // Real-time updates with polling (WebSocket can be added later)
  useEffect(() => {
    if (!currentTopic) return;
    
    // Poll for new comments every 30 seconds for real-time feel
    const interval = setInterval(() => {
      axios.get(`${API}/forum/topics/${currentTopic.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(response => {
        setCurrentTopic(response.data);
        setComments(response.data.comments || []);
      }).catch(error => {
        console.error('Error polling for updates:', error);
      });
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentTopic?.id, token]);

  // Media upload handlers
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload/single`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setNewComment({ ...newComment, media_url: response.data.url });
      toast.success('Image uploadée');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload/single`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setNewComment({ ...newComment, audio_url: response.data.url });
      toast.success('Audio uploadé');
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Erreur lors de l\'upload de l\'audio');
    } finally {
      setUploadingMedia(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

        setUploadingMedia(true);
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('duration', recordingTime);

        try {
          const response = await axios.post(`${API}/upload/single`, formData, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
          });
          setNewComment({ ...newComment, audio_url: response.data.url });
          toast.success('Enregistrement uploadé');
        } catch (error) {
          console.error('Error uploading recording:', error);
          toast.error('Erreur lors de l\'upload de l\'enregistrement');
        } finally {
          setUploadingMedia(false);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      setAudioRecorder(recorder);
      setAudioChunks(chunks);
      recorder.start();
      setRecordingAudio(true);
      setRecordingTime(0);

      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Impossible d\'accéder au microphone');
    }
  };

  const stopRecording = () => {
    if (audioRecorder) {
      audioRecorder.stop();
      setRecordingAudio(false);
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const loadCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/forum/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
      setActiveView('categories');
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadCategory = useCallback(async (id) => {
    try {
      const response = await axios.get(`${API}/forum/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTopics(response.data.topics || []);
      setActiveView('topics');
    } catch (error) {
      console.error('Error loading category:', error);
      toast.error('Erreur lors du chargement de la catégorie');
    }
  }, [token]);

  const loadTopic = useCallback(async (id) => {
    try {
      const response = await axios.get(`${API}/forum/topics/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentTopic(response.data);
      setComments(response.data.comments || []);
      setActiveView('topic');
    } catch (error) {
      console.error('Error loading topic:', error);
      toast.error('Erreur lors du chargement du sujet');
    }
  }, [token]);

  // Load categories when modal opens
  useEffect(() => {
    if (showNewTopicModal && categories.length === 0) {
      loadCategories();
    }
  }, [showNewTopicModal, categories.length, loadCategories]);

  // Real-time updates with polling (WebSocket can be added later)
  useEffect(() => {
    if (!currentTopic) return;
    
    // Poll for new comments every 30 seconds for real-time feel
    const interval = setInterval(() => {
      axios.get(`${API}/forum/topics/${currentTopic.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(response => {
        setCurrentTopic(response.data);
        setComments(response.data.comments || []);
      }).catch(error => {
        console.error('Error polling for updates:', error);
      });
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentTopic?.id, token]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/connexion');
      return;
    }
    if (topicId) {
      loadTopic(topicId);
    } else if (categoryId) {
      loadCategory(categoryId);
    } else {
      loadCategories();
    }
  }, [isAuthenticated, categoryId, topicId, loadCategories, loadCategory, loadTopic, navigate]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await axios.post(`${API}/forum/search`, {
        query: searchQuery
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(response.data.results || []);
      setActiveView('search');
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Erreur lors de la recherche');
    }
  };

  const handleCreateTopic = async () => {
    try {
      const response = await axios.post(`${API}/forum/topics`, newTopic, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Sujet créé avec succès');
      setShowNewTopicModal(false);
      setNewTopic({ title: '', content: '', category_id: '', tags: [] });
      // Reload the category or topics to show the new topic
      if (newTopic.category_id) {
        loadCategory(newTopic.category_id);
      } else {
        loadCategories();
      }
    } catch (error) {
      console.error('Error creating topic:', error);
      toast.error('Erreur lors de la création du sujet');
    }
  };

  const handleCreateComment = async () => {
    if (!currentTopic) return;
    
    try {
      const commentData = {
        content: newComment.content,
        parent_id: newComment.parent_id,
        media_url: newComment.media_url,
        audio_url: newComment.audio_url
      };
      
      const response = await axios.post(
        `${API}/forum/topics/${currentTopic.id}/comments`,
        commentData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Commentaire ajouté');
      setShowNewCommentModal(false);
      setNewComment({ content: '', parent_id: null, media_url: null, audio_url: null });
      loadTopic(currentTopic.id);
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error('Erreur lors de l\'ajout du commentaire');
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce sujet ?')) return;
    
    try {
      await axios.delete(`${API}/forum/topics/${topicId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Sujet supprimé');
      if (categoryId) {
        loadCategory(categoryId);
      } else {
        loadCategories();
      }
    } catch (error) {
      console.error('Error deleting topic:', error);
      toast.error('Erreur lors de la suppression du sujet');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) return;
    
    try {
      await axios.delete(`${API}/forum/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Commentaire supprimé');
      if (currentTopic) {
        loadTopic(currentTopic.id);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Erreur lors de la suppression du commentaire');
    }
  };

  const handleAddReaction = async (commentId, emoji) => {
    try {
      await axios.post(`${API}/forum/comments/${commentId}/reactions`, { emoji }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (currentTopic) {
        loadTopic(currentTopic.id);
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    if (days < 7) return `Il y a ${days} j`;
    return date.toLocaleDateString('fr-FR');
  }, []);

  // Memoize comment rendering for performance
  const CommentItem = React.memo(({ comment, user, formatDate, handleAddReaction, handleDeleteComment, setNewComment, setShowNewCommentModal }) => (
    <div className="border-b border-gray-100 pb-4 last:border-0">
      <div className="flex items-start gap-3">
        {comment.author_avatar ? (
          <MediaImg 
            src={comment.author_avatar} 
            alt={comment.author_name}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {comment.author_name?.[0] || 'U'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{comment.author_name}</span>
            <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          
          {/* Reactions */}
          {comment.reactions && comment.reactions.length > 0 && (
            <div className="flex gap-1 mt-2">
              {comment.reactions.map((reaction, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {reaction.emoji} {reaction.user_name}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewComment({ ...newComment, parent_id: comment.id });
                setShowNewCommentModal(true);
              }}
            >
              <Reply className="w-4 h-4 mr-1" />
              Répondre
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddReaction(comment.id, '👍')}
            >
              👍
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddReaction(comment.id, '❤️')}
            >
              ❤️
            </Button>
            {(comment.author_id === user?.id || user?.role === 'admin') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteComment(comment.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* Nested Comments */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="ml-8 mt-4 space-y-4 border-l-2 border-purple-200 pl-4">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex items-start gap-3">
                  {reply.author_avatar ? (
                    <MediaImg 
                      src={reply.author_avatar} 
                      alt={reply.author_name}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {reply.author_name?.[0] || 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-xs">{reply.author_name}</span>
                      <span className="text-xs text-gray-400">{formatDate(reply.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddReaction(reply.id, '👍')}
                      >
                        👍
                      </Button>
                      {(reply.author_id === user?.id || user?.role === 'admin') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(reply.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  ));

  CommentItem.displayName = 'CommentItem';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-purple-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Home className="w-6 h-6 text-purple-600" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-8 h-8 text-purple-600" />
                Forum Communautaire
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 w-64"
                />
              </div>
              <Button onClick={() => {
                setShowNewTopicModal(true);
                if (categories.length === 0) {
                  loadCategories();
                }
              }} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Sujet
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link to="/forum" className="hover:text-purple-600" onClick={() => { setActiveView('categories'); loadCategories(); }}>
            Forum
          </Link>
          {categoryId && activeView === 'topics' && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="text-purple-600">{categories.find(c => c.id === categoryId)?.name}</span>
            </>
          )}
          {currentTopic && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="text-purple-600 truncate max-w-xs">{currentTopic.title}</span>
            </>
          )}
        </div>

        {/* Categories View */}
        {activeView === 'categories' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card 
                key={category.id}
                className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-300"
                onClick={() => {
                  navigate(`/forum/category/${category.id}`);
                  loadCategory(category.id);
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${category.color || 'bg-purple-100'}`}>
                        {category.icon ? (
                          <span className="text-2xl">{category.icon}</span>
                        ) : (
                          <Hash className="w-6 h-6 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <p className="text-sm text-gray-500">{category.topic_count || 0} sujets</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Topics View */}
        {activeView === 'topics' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Sujets
              </h2>
              <Button variant="outline" onClick={() => { setActiveView('categories'); loadCategories(); }}>
                <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                Retour aux catégories
              </Button>
            </div>
            
            {topics.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun sujet dans cette catégorie</p>
                  <Button 
                    onClick={() => setShowNewTopicModal(true)}
                    className="mt-4 bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer le premier sujet
                  </Button>
                </CardContent>
              </Card>
            ) : (
              topics.map((topic) => (
                <Card 
                  key={topic.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    navigate(`/forum/topic/${topic.id}`);
                    loadTopic(topic.id);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {topic.author_avatar ? (
                          <MediaImg 
                            src={topic.author_avatar} 
                            alt={topic.author_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                            {topic.author_name?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {topic.is_pinned && <Pin className="w-4 h-4 text-purple-600" />}
                          {topic.is_locked && <Lock className="w-4 h-4 text-gray-400" />}
                          <h3 className="font-semibold text-gray-900 truncate">{topic.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{topic.content}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {topic.author_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {topic.comment_count} commentaires
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {topic.view_count} vues
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(topic.updated_at)}
                          </span>
                        </div>
                        {topic.tags && topic.tags.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {topic.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {user?.role === 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTopic(topic.id);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Topic View */}
        {activeView === 'topic' && currentTopic && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => { setActiveView('categories'); loadCategories(); }}>
                <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                Retour au forum
              </Button>
              {user?.role === 'admin' && (
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteTopic(currentTopic.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer le sujet
                </Button>
              )}
            </div>

            {/* Topic Content */}
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  {currentTopic.author_avatar ? (
                    <MediaImg 
                      src={currentTopic.author_avatar} 
                      alt={currentTopic.author_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                      {currentTopic.author_name?.[0] || 'U'}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {currentTopic.is_pinned && <Pin className="w-4 h-4 text-purple-600" />}
                      {currentTopic.is_locked && <Lock className="w-4 h-4 text-gray-400" />}
                      <CardTitle className="text-2xl">{currentTopic.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="font-medium">{currentTopic.author_name}</span>
                      <span>•</span>
                      <span>{formatDate(currentTopic.created_at)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {currentTopic.view_count} vues
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                  {currentTopic.content}
                </div>
                {currentTopic.tags && currentTopic.tags.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    {currentTopic.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Commentaires ({comments.length})</CardTitle>
                  <Button onClick={() => setShowNewCommentModal(true)} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau Commentaire
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucun commentaire pour le moment</p>
                    <p className="text-sm">Soyez le premier à réagir !</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex items-start gap-3">
                        {comment.author_avatar ? (
                          <MediaImg 
                            src={comment.author_avatar} 
                            alt={comment.author_name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {comment.author_name?.[0] || 'U'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.author_name}</span>
                            <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                          
                          {/* Media display */}
                          {comment.media_url && (
                            <div className="mt-2">
                              <MediaImg 
                                src={comment.media_url} 
                                alt="Media"
                                className="max-w-[70%] h-auto rounded-lg"
                              />
                            </div>
                          )}
                          
                          {/* Audio display */}
                          {comment.audio_url && (
                            <div className="mt-2">
                              <audio controls className="w-full">
                                <source src={comment.audio_url} type="audio/webm" />
                                Votre navigateur ne supporte pas l'audio.
                              </audio>
                            </div>
                          )}
                          
                          {/* Reactions */}
                          {comment.reactions && comment.reactions.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {comment.reactions.map((reaction, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {reaction.emoji} {reaction.user_name}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNewComment({ ...newComment, parent_id: comment.id });
                                setShowNewCommentModal(true);
                              }}
                            >
                              <Reply className="w-4 h-4 mr-1" />
                              Répondre
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddReaction(comment.id, '👍')}
                            >
                              👍
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddReaction(comment.id, '❤️')}
                            >
                              ❤️
                            </Button>
                            {(comment.author_id === user?.id || user?.role === 'admin') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                          {/* Nested Comments */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="ml-8 mt-4 space-y-4 border-l-2 border-purple-200 pl-4">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="flex items-start gap-3">
                                  {reply.author_avatar ? (
                                    <MediaImg 
                                      src={reply.author_avatar} 
                                      alt={reply.author_name}
                                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                      {reply.author_name?.[0] || 'U'}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-xs">{reply.author_name}</span>
                                      <span className="text-xs text-gray-400">{formatDate(reply.created_at)}</span>
                                    </div>
                                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                                    
                                    {/* Reply media display */}
                                    {reply.media_url && (
                                      <div className="mt-2">
                                        <MediaImg 
                                          src={reply.media_url} 
                                          alt="Media"
                                          className="max-w-[50%] h-auto rounded-lg"
                                        />
                                      </div>
                                    )}
                                    
                                    {/* Reply audio display */}
                                    {reply.audio_url && (
                                      <div className="mt-2">
                                        <audio controls className="w-full">
                                          <source src={reply.audio_url} type="audio/webm" />
                                        </audio>
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center gap-2 mt-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleAddReaction(reply.id, '👍')}
                                      >
                                        👍
                                      </Button>
                                      {(reply.author_id === user?.id || user?.role === 'admin') && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteComment(reply.id)}
                                          className="text-red-500 hover:text-red-700"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search Results */}
        {activeView === 'search' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Résultats pour "{searchQuery}"
              </h2>
              <Button variant="outline" onClick={() => { setActiveView('categories'); loadCategories(); }}>
                <X className="w-4 h-4 mr-2" />
                Effacer
              </Button>
            </div>
            
            {searchResults.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun résultat trouvé</p>
                </CardContent>
              </Card>
            ) : (
              searchResults.map((topic) => (
                <Card 
                  key={topic.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    navigate(`/forum/topic/${topic.id}`);
                    loadTopic(topic.id);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {topic.author_avatar ? (
                          <MediaImg 
                            src={topic.author_avatar} 
                            alt={topic.author_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                            {topic.author_name?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">{topic.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{topic.content}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {topic.author_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {topic.comment_count} commentaires
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {topic.view_count} vues
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* New Topic Modal */}
      {showNewTopicModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Créer un nouveau sujet</CardTitle>
                <Button variant="ghost" onClick={() => setShowNewTopicModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Catégorie</label>
                <select
                  value={newTopic.category_id}
                  onChange={(e) => setNewTopic({ ...newTopic, category_id: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Titre</label>
                <Input
                  value={newTopic.title}
                  onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                  placeholder="Titre du sujet..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Contenu</label>
                <textarea
                  value={newTopic.content}
                  onChange={(e) => setNewTopic({ ...newTopic, content: e.target.value })}
                  placeholder="Écrivez votre message..."
                  rows={6}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tags (séparés par des virgules)</label>
                <Input
                  value={newTopic.tags.join(', ')}
                  onChange={(e) => setNewTopic({ ...newTopic, tags: e.target.value.split(',').map(t => t.trim()) })}
                  placeholder="tag1, tag2, tag3..."
                />
              </div>
              <Button onClick={handleCreateTopic} className="w-full bg-purple-600 hover:bg-purple-700">
                Créer le sujet
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Comment Modal */}
      {showNewCommentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {newComment.parent_id ? 'Répondre au commentaire' : 'Nouveau commentaire'}
                </CardTitle>
                <Button variant="ghost" onClick={() => setShowNewCommentModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Commentaire</label>
                <textarea
                  value={newComment.content}
                  onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                  placeholder="Écrivez votre commentaire..."
                  rows={4}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              {/* Media Upload */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="forum-image-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('forum-image-upload').click()}
                  disabled={uploadingMedia}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Image
                </Button>
                
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                  id="forum-audio-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('forum-audio-upload').click()}
                  disabled={uploadingMedia}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Audio
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={recordingAudio ? stopRecording : startRecording}
                  disabled={uploadingMedia}
                  className={recordingAudio ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                >
                  {recordingAudio ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Arrêter ({formatRecordingTime(recordingTime)})
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
              
              {/* Preview uploaded media */}
              {newComment.media_url && (
                <div className="relative">
                  <MediaImg 
                    src={newComment.media_url} 
                    alt="Preview"
                    className="max-w-[200px] h-auto rounded-lg"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewComment({ ...newComment, media_url: null })}
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {newComment.audio_url && (
                <div className="relative">
                  <audio controls className="w-full">
                    <source src={newComment.audio_url} type="audio/webm" />
                  </audio>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewComment({ ...newComment, audio_url: null })}
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              <Button onClick={handleCreateComment} className="w-full bg-purple-600 hover:bg-purple-700" disabled={uploadingMedia}>
                {uploadingMedia ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ForumPage;
