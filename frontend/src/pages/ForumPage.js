import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  MessageSquare, Plus, Search, Hash, Bell, Settings, 
  Users, Clock, Eye, Pin, Lock, ChevronRight, 
  Edit, Trash2, Reply, Smile, 
  LayoutDashboard, Home, X, Filter, Image, FileText, Mic, Store, Send, BadgeCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import MediaImg from '../components/MediaImg';
import { forumWebSocket } from '../services/forumWebSocket';
import { MentionParser, MentionRenderer } from '../components/MentionParser';
import ThreadedComment from '../components/ThreadedComment';
import MarkdownEditor from '../components/MarkdownEditor';
import AdvancedSearch from '../components/AdvancedSearch';
import NotificationBell from '../components/NotificationBell';

import { API_URL } from '../config/api';
const API = API_URL;

const AuthorAvatar = ({ author, size = 'md' }) => {
  const dimensions = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  if (author?.author_avatar || author?.avatar) {
    return <MediaImg src={author.author_avatar || author.avatar} alt={author.author_name || author.name || 'Membre'} className={`${dimensions} rounded-full object-cover flex-shrink-0`} />;
  }
  return <div className={`${dimensions} rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0`}>
    {(author?.author_name || author?.name || 'U')[0]}
  </div>;
};

const ForumPage = () => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, isVendor, isEnterprise, isCustomer, isDropshipper, isDriver } = useAuth();
  const { categoryId, topicId } = useParams();

  // Redirect customers, revendeurs, and drivers away from forum
  useEffect(() => {
    if (isAuthenticated && (isCustomer || isDropshipper || isDriver)) {
      toast.error('Accès non autorisé');
      navigate('/');
      return;
    }
  }, [isAuthenticated, isCustomer, isDropshipper, isDriver, navigate]);
  
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
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  
  // New topic form
  const [newTopic, setNewTopic] = useState({
    title: '',
    content: ''
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
  
  // File input refs
  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const audioInputRef = useRef(null);

  // WebSocket state
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState([]);

  // Connect to WebSocket when viewing a topic
  useEffect(() => {
    if (!currentTopic?.id || !token || !user?.id) return;

    // Disconnect from previous connection
    forumWebSocket.disconnect();

    // Connect to new topic
    forumWebSocket.connect(currentTopic.id, token, user.id);

    // Set up event listeners
    forumWebSocket.on('connected', () => {
      setIsWebSocketConnected(true);
      toast.success('Connecté en temps réel');
    });

    forumWebSocket.on('disconnected', () => {
      setIsWebSocketConnected(false);
    });

    forumWebSocket.on('newComment', (data) => {
      // Reload comments when new comment is received
      loadTopic(currentTopic.id);
    });

    forumWebSocket.on('typing', (data) => {
      setTypingUsers(prev => [...new Set([...prev, data.user_id])]);
    });

    forumWebSocket.on('typingStopped', (data) => {
      setTypingUsers(prev => prev.filter(id => id !== data.user_id));
    });

    forumWebSocket.on('userJoined', (data) => {
      toast.success(`${data.user_id} a rejoint le topic`);
    });

    forumWebSocket.on('userLeft', (data) => {
      setOnlineUsers(prev => prev.filter(id => id !== data.user_id));
    });

    forumWebSocket.on('presenceUpdate', (data) => {
      setOnlineUsers(data.online_users || []);
    });

    forumWebSocket.on('notification', (data) => {
      toast(data.notification.message || 'Nouvelle notification');
    });

    return () => {
      forumWebSocket.disconnect();
      setIsWebSocketConnected(false);
    };
  }, [currentTopic?.id, token, user?.id]);

  // Send typing indicator when user is typing a comment
  const handleTyping = useCallback(() => {
    if (currentTopic?.id && isWebSocketConnected) {
      forumWebSocket.sendTyping();
    }
  }, [currentTopic?.id, isWebSocketConnected]);

  // Handle voting on comments
  const handleVoteComment = async (commentId, voteType) => {
    try {
      const response = await axios.post(
        `${API}/forum/comments/${commentId}/vote`,
        { vote_type: voteType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Reload comments to show updated vote counts
      loadTopic(currentTopic.id);
      toast.success('Vote enregistré');
    } catch (error) {
      console.error('Error voting on comment:', error);
      toast.error('Erreur lors du vote');
    }
  };

  // Handle marking best answer
  const handleMarkBestAnswer = async (commentId) => {
    try {
      await axios.post(
        `${API}/forum/topics/${currentTopic.id}/best-answer`,
        { comment_id: commentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      loadTopic(currentTopic.id);
      toast.success('Meilleure réponse marquée');
    } catch (error) {
      console.error('Error marking best answer:', error);
      toast.error('Erreur lors du marquage');
    }
  };

  // Handle nested reply
  const handleReplyComment = async (parentId, content) => {
    try {
      const commentData = {
        content,
        parent_id: parentId,
        topic_id: currentTopic.id
      };

      const response = await axios.post(
        `${API}/forum/topics/${currentTopic.id}/comments`,
        commentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Réponse ajoutée');
      loadTopic(currentTopic.id);
    } catch (error) {
      console.error('Error creating reply:', error);
      toast.error('Erreur lors de l\'ajout de la réponse');
    }
  };

  // Real-time updates with polling (WebSocket can be added later)
  useEffect(() => {
    if (!currentTopic?.id) return;
    
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

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Media upload handlers (forum-specific)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentTopic) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API}/forum/topics/${currentTopic.id}/upload-image`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );

      setNewComment({ ...newComment, media_url: response.data.media_url });
      toast.success('Image téléchargée avec succès');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors du téléchargement de l\'image');
    } finally {
      setUploadingMedia(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentTopic) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API}/forum/topics/${currentTopic.id}/upload-document`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );

      setNewComment({ ...newComment, media_url: response.data.media_url });
      toast.success('Document téléchargé avec succès');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors du téléchargement du document');
    } finally {
      setUploadingMedia(false);
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentTopic) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API}/forum/topics/${currentTopic.id}/upload-audio`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );

      setNewComment({ ...newComment, audio_url: response.data.audio_url });
      toast.success('Audio téléchargé avec succès');
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Erreur lors du téléchargement de l\'audio');
    } finally {
      setUploadingMedia(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
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

  const loadCategory = async (id) => {
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
  };

  const loadMentionableUsers = async () => {
    try {
      // TODO: Replace with actual API call to get users who can be mentioned
      // const response = await axios.get(`${API}/users`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // setMentionedUsers(response.data);

      // Mock data for now
      const mockUsers = [
        { id: 1, name: 'Jean Dupont', username: 'jeandupont', avatar: null },
        { id: 2, name: 'Marie Curie', username: 'mariecurie', avatar: null },
        { id: 3, name: 'Admin', username: 'admin', avatar: null },
      ];
      setMentionedUsers(mockUsers);
    } catch (error) {
      console.error('Error loading mentionable users:', error);
    }
  };

  useEffect(() => {
    loadMentionableUsers();
  }, [token]);

  const loadTopic = async (id) => {
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
  };

  // Real-time updates with polling (WebSocket can be added later)
  useEffect(() => {
    if (!currentTopic?.id) return;
    
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
    
    // Simple initial load without complex dependencies
    const initializeForum = async () => {
      setLoading(true);
      try {
        if (topicId) {
          const response = await axios.get(`${API}/forum/topics/${topicId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCurrentTopic(response.data);
          setComments(response.data.comments || []);
          setActiveView('topic');
        } else if (categoryId) {
          const response = await axios.get(`${API}/forum/categories/${categoryId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setTopics(response.data.topics || []);
          setActiveView('topics');
        } else {
          const response = await axios.get(`${API}/forum/categories`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCategories(response.data);
          setActiveView('categories');
        }
      } catch (error) {
        console.error('Error initializing forum:', error);
        toast.error('Erreur lors du chargement du forum');
      } finally {
        setLoading(false);
      }
    };
    
    initializeForum();
  }, [isAuthenticated, categoryId, topicId, token, navigate]);

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
    // Validation
    if (!newTopic.title.trim()) {
      toast.error('Veuillez entrer un titre');
      return;
    }
    if (!newTopic.content.trim()) {
      toast.error('Veuillez entrer un contenu');
      return;
    }
    
    try {
      // Determine default category based on user role
      let defaultCategoryId = 'cat-general'; // default
      if (isVendor) {
        defaultCategoryId = 'cat-vendor-general';
      } else if (isEnterprise) {
        defaultCategoryId = 'cat-enterprise-general';
      }
      
      const topicData = {
        ...newTopic,
        category_id: defaultCategoryId
      };
      
      const response = await axios.post(`${API}/forum/topics`, topicData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Sujet créé avec succès');
      setShowNewTopicModal(false);
      setNewTopic({ title: '', content: '' });
      // Reload the category or topics to show the new topic
      const catResponse = await axios.get(`${API}/forum/categories/${defaultCategoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTopics(catResponse.data.topics || []);
      setActiveView('topics');
    } catch (error) {
      console.error('Error creating topic:', error);
      const errorMessage = error.response?.data?.detail || 'Erreur lors de la création du sujet';
      toast.error(errorMessage);
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
        axios.get(`${API}/forum/categories`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(response => {
          setCategories(response.data);
          setActiveView('categories');
        }).catch(error => {
          console.error('Error loading categories:', error);
        });
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

  const handleDirectChat = useCallback(async (author) => {
    const recipientId = author?.id || author?.author_id;
    if (!recipientId || recipientId === user?.id) return;
    try {
      const response = await axios.post(`${API}/conversations/direct/${recipientId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/mes-messages?conversation=${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Impossible de démarrer la discussion');
    }
  }, [navigate, token, user?.id]);

  const handleViewShop = useCallback((author) => {
    const authorId = author?.id || author?.author_id;
    if (!authorId) return;
    navigate(author?.role === 'enterprise' ? `/enterprise/shop/${authorId}` : `/vendeur-boutique/${authorId}`);
  }, [navigate]);

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
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            <MentionRenderer
              content={comment.content}
              onMentionClick={(username) => {
                console.log('Clicked mention:', username);
                // TODO: Navigate to user profile
              }}
            />
          </p>
          
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
                {isVendor ? 'Forum Vendeurs' : isEnterprise ? 'Forum Entreprises' : 'Forum Communautaire'}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationBell token={token} user={user} />
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
              <Button onClick={() => setShowNewTopicModal(true)} className="bg-purple-600 hover:bg-purple-700">
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
          <Link to="/forum" className="hover:text-purple-600" onClick={() => { 
            setActiveView('categories');
            axios.get(`${API}/forum/categories`, {
              headers: { Authorization: `Bearer ${token}` }
            }).then(response => {
              setCategories(response.data);
            }).catch(error => {
              console.error('Error loading categories:', error);
            });
          }}>
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
              <Button variant="outline" onClick={() => { 
                setActiveView('categories');
                // Load categories directly without useEffect dependency
                axios.get(`${API}/forum/categories`, {
                  headers: { Authorization: `Bearer ${token}` }
                }).then(response => {
                  setCategories(response.data);
                }).catch(error => {
                  console.error('Error loading categories:', error);
                });
              }}>
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
                      <AuthorAvatar author={topic} />
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
                            {topic.author_profile?.is_verified && <BadgeCheck className="w-3 h-3 text-emerald-600" />}
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
                        {topic.author_id !== user?.id && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); handleViewShop(topic.author_profile || topic); }}>
                              <Store className="w-3.5 h-3.5 mr-1.5" /> Boutique
                            </Button>
                            <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); handleDirectChat(topic.author_profile || topic); }}>
                              <Send className="w-3.5 h-3.5 mr-1.5" /> Écrire
                            </Button>
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
              <Button variant="outline" onClick={() => { 
                setActiveView('categories');
                axios.get(`${API}/forum/categories`, {
                  headers: { Authorization: `Bearer ${token}` }
                }).then(response => {
                  setCategories(response.data);
                }).catch(error => {
                  console.error('Error loading categories:', error);
                });
              }}>
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
                  <AuthorAvatar author={currentTopic} size="lg" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {currentTopic.is_pinned && <Pin className="w-4 h-4 text-purple-600" />}
                      {currentTopic.is_locked && <Lock className="w-4 h-4 text-gray-400" />}
                      <CardTitle className="text-2xl">{currentTopic.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="font-medium flex items-center gap-1">{currentTopic.author_name} {currentTopic.author_profile?.is_verified && <BadgeCheck className="w-4 h-4 text-emerald-600" />}</span>
                      <span>•</span>
                      <span>{formatDate(currentTopic.created_at)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {currentTopic.view_count} vues
                      </span>
                    </div>
                    {currentTopic.author_id !== user?.id && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button variant="outline" size="sm" onClick={() => handleViewShop(currentTopic.author_profile || currentTopic)}>
                          <Store className="w-4 h-4 mr-2" /> Voir la boutique
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDirectChat(currentTopic.author_profile || currentTopic)}>
                          <Send className="w-4 h-4 mr-2" /> Message direct
                        </Button>
                      </div>
                    )}
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
                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-purple-400 bg-purple-500/10 px-3 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span>
                      {typingUsers.length === 1 ? 'Quelqu\'un écrit...' : `${typingUsers.length} personnes écrivent...`}
                    </span>
                  </div>
                )}

                {/* Online users indicator */}
                {onlineUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>{onlineUsers.length} en ligne</span>
                  </div>
                )}

                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucun commentaire pour le moment</p>
                    <p className="text-sm">Soyez le premier à réagir !</p>
                  </div>
                ) : (
                  comments
                    .filter(comment => !comment.parent_id) // Only show top-level comments
                    .map((comment) => (
                      <ThreadedComment
                        key={comment.id}
                        comment={comment}
                        onReply={handleReplyComment}
                        onVote={handleVoteComment}
                        onMarkBestAnswer={handleMarkBestAnswer}
                        isBestAnswer={currentTopic?.best_answer_id === comment.id}
                        isTopicAuthor={currentTopic?.author_id === user?.id}
                        currentUserId={user?.id}
                        onContactAuthor={handleDirectChat}
                        onViewShop={handleViewShop}
                        children={comments.filter(c => c.parent_id === comment.id)}
                      />
                    ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search Results */}
        {activeView === 'search' && (
          <div className="space-y-4">
            <AdvancedSearch 
              token={token}
              onSearchResults={(results) => {
                setSearchResults(results.results || []);
                setSearchTotalPages(results.total_pages || 1);
                setSearchPage(results.page || 1);
              }}
            />
            
            {searchResults.length > 0 && (
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Résultats pour "{searchQuery}"
                </h2>
                <Button variant="outline" onClick={() => { 
                  setActiveView('categories');
                  axios.get(`${API}/forum/categories`, {
                    headers: { Authorization: `Bearer ${token}` }
                  }).then(response => {
                    setCategories(response.data);
                  }).catch(error => {
                    console.error('Error loading categories:', error);
                  });
                }}>
                  <X className="w-4 h-4 mr-2" />
                  Effacer
                </Button>
              </div>
            )}
            
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
                        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                          {topic.title}
                          {topic.score && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              {Math.round(topic.score * 100)}% pertinence
                            </span>
                          )}
                        </h3>
                        {topic.highlights && topic.highlights.content ? (
                          <p 
                            className="text-sm text-gray-600 line-clamp-2 mb-2"
                            dangerouslySetInnerHTML={{ __html: topic.highlights.content[0] }}
                          />
                        ) : (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{topic.content}</p>
                        )}
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
            
            {/* Pagination */}
            {searchTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  disabled={searchPage === 1}
                  onClick={() => {
                    // TODO: Implement pagination with AdvancedSearch
                  }}
                >
                  Précédent
                </Button>
                <span className="text-sm text-slate-600">
                  Page {searchPage} sur {searchTotalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={searchPage === searchTotalPages}
                  onClick={() => {
                    // TODO: Implement pagination with AdvancedSearch
                  }}
                >
                  Suivant
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Topic Modal */}
      {showNewTopicModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Créer un nouveau sujet</CardTitle>
                <Button variant="ghost" onClick={() => setShowNewTopicModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Titre *</label>
                <Input
                  value={newTopic.title}
                  onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                  placeholder="Titre du sujet..."
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Contenu *</label>
                <MarkdownEditor
                  value={newTopic.content}
                  onChange={(value) => setNewTopic({ ...newTopic, content: value })}
                  placeholder="Écrivez votre message en Markdown..."
                  rows={6}
                  showPreview={false}
                />
              </div>
              <Button onClick={handleCreateTopic} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                Créer le sujet
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Comment Modal */}
      {showNewCommentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">
                  {newComment.parent_id ? 'Répondre au commentaire' : 'Nouveau commentaire'}
                </CardTitle>
                <Button variant="ghost" onClick={() => setShowNewCommentModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Commentaire</label>
                <MarkdownEditor
                  value={newComment.content}
                  onChange={(value) => {
                    setNewComment({ ...newComment, content: value });
                    handleTyping();
                  }}
                  placeholder="Écrivez votre commentaire en Markdown... Utilisez @ pour mentionner quelqu'un"
                  rows={4}
                  enableMentions={true}
                  mentionedUsers={mentionedUsers}
                  onMention={(user) => {
                    console.log('Mentioned user:', user);
                    // TODO: Send notification to mentioned user
                  }}
                />
              </div>
              
              {/* Media Upload */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="forum-image-upload"
                  ref={imageInputRef}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  <Image className="w-4 h-4 mr-2" />
                  Image
                </Button>
                
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  id="forum-document-upload"
                  ref={documentInputRef}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => documentInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Document
                </Button>
                
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                  id="forum-audio-upload"
                  ref={audioInputRef}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Audio
                </Button>
              </div>
              
              {/* Preview uploaded media */}
              {newComment.media_url && (
                <div className="relative p-2 bg-slate-700 rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewComment({ ...newComment, media_url: null })}
                    className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <MediaImg 
                    src={newComment.media_url} 
                    alt="Preview"
                    className="max-w-[200px] h-auto rounded-lg"
                  />
                </div>
              )}

              {newComment.audio_url && (
                <div className="relative p-2 bg-slate-700 rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewComment({ ...newComment, audio_url: null })}
                    className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <audio controls src={newComment.audio_url} className="w-full" />
                </div>
              )}

              <Button onClick={handleCreateComment} className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={uploadingMedia}>
                {uploadingMedia ? 'Envoi en cours...' : 'Publier le commentaire'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ForumPage;
