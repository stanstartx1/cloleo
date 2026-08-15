import MediaImg from '../components/MediaImg';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  MessageCircle, Send, X, Store, ArrowLeft, Search, LogOut,
  Image as ImageIcon, Clock, Check, CheckCheck, ChevronRight, Tag,
  FileText, Mic, Paperclip, Upload, Radio, Play, Pause
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import ChatMessageDeleteButton from '../components/ChatMessageDeleteButton';

import { API_BASE, API_URL, WS_URL } from '../config/api';
const API = API_URL;

// Custom Audio Player Component (WhatsApp-style)
const CustomAudioPlayer = ({ audioUrl, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef(null);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setTotalDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
      <button
        onClick={handlePlayPause}
        className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors flex-shrink-0"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className="flex-1 flex items-center gap-2">
        <input
          type="range"
          min="0"
          max={totalDuration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #9333ea 0%, #9333ea ${(currentTime / (totalDuration || 1)) * 100}%, #e5e7eb ${(currentTime / (totalDuration || 1)) * 100}%, #e5e7eb 100%)`
          }}
        />
        <span className="text-xs text-gray-500 w-12 text-right flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>
    </div>
  );
};


const CustomerChatPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token, isAuthenticated, logout } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const [recordingUsers, setRecordingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = Array.isArray(response.data) ? response.data : (response.data?.conversations || []);
      setConversations(list);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/connexion');
      return;
    }
    fetchConversations();
    // Disabled polling to prevent message flickering
    // const interval = setInterval(fetchConversations, 60000); // 60s
    // return () => clearInterval(interval);
  }, [isAuthenticated, navigate, fetchConversations]);

  // Scroll to top on page load and conversation change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedConversation]);

  const loadMessages = useCallback(async (conversationId, forceReload = false) => {
    try {
      const response = await axios.get(`${API}/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newMessages = response.data.messages || [];
      
      // On force reload, replace all messages
      if (forceReload) {
        setMessages(newMessages);
      } else {
        // Merge messages intelligently - only add new messages, don't replace all
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessagesToAdd = newMessages.filter(m => !existingIds.has(m.id));
          
          // If we have existing messages, only add new ones
          if (prev.length > 0) {
            return [...prev, ...newMessagesToAdd];
          }
          
          // First load, use all messages
          return newMessages;
        });
      }
      
      // Mark as read
      await axios.put(`${API}/conversations/${conversationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
      
      // Update unread count in conversations list
      setConversations(prev => prev.map(c => 
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [token]);

  // HTTP polling for messages (WebSocket disabled due to Apache configuration)
  useEffect(() => {
    if (!selectedConversation) return;

    // Disabled polling to prevent message flickering
    // const pollingInterval = setInterval(() => {
    //   loadMessages(selectedConversation.id);
    // }, 15000); // Reduced from 10s to 15s to reduce flickering
    
    // return () => clearInterval(pollingInterval);
  }, [selectedConversation, loadMessages]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const handleMessageDeleted = useCallback((messageId) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    fetchConversations();
  }, [fetchConversations]);

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation(); // Prevent selecting the conversation when clicking delete
    
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette conversation et tous ses messages ?')) {
      return;
    }

    try {
      await axios.delete(`${API}/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove conversation from list
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      // If the deleted conversation was selected, clear selected conversation and messages
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }

      toast.success('Conversation supprimée');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Erreur lors de la suppression de la conversation');
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    // Stop typing indicator
    await setTypingStatus(false);

    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      text: messageContent,
      created_at: new Date().toISOString(),
      is_read: false,
      status: 'sending'
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await axios.post(`${API}/conversations/${selectedConversation.id}/messages`, {
        content: messageContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(prev => prev.map(m => 
        m.id === optimisticMessage.id ? response.data : m
      ));
      
      // Update last message in conversations
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation.id 
          ? { ...c, last_message: messageContent, last_message_at: new Date().toISOString() }
          : c
      ));
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageContent);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };
  
  // Typing indicator functionality
  const setTypingStatus = async (isTyping: boolean) => {
    if (!selectedConversation || !token) return;
    try {
      await axios.post(
        `${API}/conversations/${selectedConversation.id}/typing`,
        { is_typing },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  };
  
  const handleTyping = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      setTypingStatus(true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTypingStatus(false);
      }, 3000);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      setTypingStatus(false);
    }
  };
  
  // Voice recording indicator functionality
  const setVoiceRecordingStatus = async (isRecording: boolean) => {
    if (!selectedConversation || !token) return;
    try {
      await axios.post(
        `${API}/conversations/${selectedConversation.id}/voice-recording`,
        { is_recording: isRecording },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error setting voice recording status:', error);
    }
  };
  
  // Audio recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        
        setUploadingFile(true);
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('duration', recordingTime);
        
        try {
          console.log('Uploading recorded audio for conversation:', selectedConversation.id);
          const response = await axios.post(
            `${API}/conversations/${selectedConversation.id}/upload-audio`,
            formData,
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
          );
          
          console.log('Recorded audio upload response:', response.data);
          
          if (response.data.message) {
            setMessages(prev => [...prev, response.data.message]);
            scrollToBottom();
          }
        } catch (error) {
          console.error('Error uploading recording:', error);
          toast.error('Erreur lors de l\'envoi du message vocal');
        } finally {
          setUploadingFile(false);
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Impossible d\'accéder au microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
      toast.info('Enregistrement annulé');
    }
  };
  
  // Override recording functions to send status
  const startRecordingWithStatus = async () => {
    await setVoiceRecordingStatus(true);
    await startRecording();
  };
  
  const stopRecordingWithStatus = () => {
    setVoiceRecordingStatus(false);
    stopRecording();
  };
  
  const cancelRecordingWithStatus = () => {
    setVoiceRecordingStatus(false);
    cancelRecording();
  };
  
  // Poll for typing and recording status
  useEffect(() => {
    if (!selectedConversation || !token) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const [typingResponse, recordingResponse] = await Promise.all([
          axios.get(`${API}/conversations/${selectedConversation.id}/typing-users`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/conversations/${selectedConversation.id}/voice-recording-users`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setTypingUsers(typingResponse.data?.typing_users || []);
        setRecordingUsers(recordingResponse.data?.recording_users || []);
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 2000); // Poll every 2 seconds
    
    return () => clearInterval(pollInterval);
  }, [selectedConversation, token]);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Hier";
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatLastMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Media upload handlers
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedConversation) return;
    
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      console.log('Uploading image for conversation:', selectedConversation.id);
      const response = await axios.post(
        `${API}/conversations/${selectedConversation.id}/upload-image`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      
      console.log('Image upload response:', response.data);
      
      if (response.data.message) {
        setMessages(prev => [...prev, response.data.message]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors de l\'envoi de l\'image');
    } finally {
      setUploadingFile(false);
      setShowMediaMenu(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedConversation) return;
    
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      console.log('Uploading document for conversation:', selectedConversation.id);
      const response = await axios.post(
        `${API}/conversations/${selectedConversation.id}/upload-document`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      
      console.log('Document upload response:', response.data);
      
      if (response.data.message) {
        setMessages(prev => [...prev, response.data.message]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors de l\'envoi du document');
    } finally {
      setUploadingFile(false);
      setShowMediaMenu(false);
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedConversation) return;
    
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      console.log('Uploading audio for conversation:', selectedConversation.id);
      const response = await axios.post(
        `${API}/conversations/${selectedConversation.id}/upload-audio`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      
      console.log('Audio upload response:', response.data);
      
      if (response.data.message) {
        setMessages(prev => [...prev, response.data.message]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Erreur lors de l\'envoi de l\'audio');
    } finally {
      setUploadingFile(false);
      setShowMediaMenu(false);
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c => 
    !searchTerm || 
    c.seller_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const targetConversationId = searchParams.get('conversation');
    if (!targetConversationId || conversations.length === 0) return;
    const target = conversations.find((c) => c.id === targetConversationId);
    if (target) {
      setSelectedConversation(target);
      loadMessages(target.id, true);
    }
  }, [searchParams, conversations, loadMessages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-[600px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen home-premium-gradient pt-20" data-testid="customer-chat-page">
      <div className="container mx-auto px-4 py-6">
        <div className="premium-panel-soft rounded-2xl shadow-lg border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 180px)', minHeight: '500px', maxHeight: '800px' }}>
          <div className="flex h-full">
            
            {/* Conversations List (Left Panel) */}
            <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                      <span className="truncate">Mes Messages</span>
                    </h1>
                    <p className="text-purple-200 text-xs md:text-sm mt-1 truncate">{conversations.length} conversation(s)</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleLogout}
                    className="bg-white/20 text-white hover:bg-white/30 border border-white/30 flex-shrink-0"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Déconnexion</span>
                  </Button>
                </div>
              </div>
              
              {/* Search */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-gray-50 border-gray-200"
                  />
                </div>
              </div>
              
              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Aucune conversation</p>
                    <p className="text-sm mt-1">Contactez un vendeur pour démarrer</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv);
                        loadMessages(conv.id, true);
                      }}
                      className={`w-full p-3 md:p-4 flex items-start gap-2 md:gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left ${
                        selectedConversation?.id === conv.id ? 'bg-purple-50 border-l-4 border-l-purple-600' : ''
                      }`}
                      data-testid={`conversation-${conv.id}`}
                    >
                      {/* Product Image */}
                      <div className="relative flex-shrink-0">
                        {conv.product_image ? (
                          <MediaImg 
                            src={conv.product_image} 
                            alt="" 
                            className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                            <Store className="w-5 h-5 md:w-6 md:h-6 text-white" />
                          </div>
                        )}
                        {conv.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      
                      {/* Conversation Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            {conv?.seller_avatar ? (
                              <MediaImg 
                                src={conv.seller_avatar} 
                                alt={conv.seller_name}
                                className="w-8 h-8 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                                {conv?.seller_name?.[0] || "V"}
                              </div>
                            )}
                            <p className="font-semibold text-gray-900 truncate text-sm md:text-base">{conv.seller_name || 'Vendeur'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatLastMessageTime(conv.last_message_at)}
                            </span>
                            <button
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                              title="Supprimer la conversation"
                            >
                              <X className="w-4 h-4 text-red-500 hover:text-red-700" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs md:text-sm text-purple-600 truncate">{conv.product_name}</p>
                        <p className="text-xs md:text-sm text-gray-500 truncate mt-1">
                          {conv.last_message || 'Démarrez la conversation...'}
                        </p>
                      </div>
                      
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                    </button>
                  ))
                )}
              </div>
            </div>
            
            {/* Chat Area (Right Panel) */}
            <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 md:p-4 border-b border-gray-200 bg-white flex items-center gap-3 md:gap-4">
                    <button
                      onClick={() => {
                        setSelectedConversation(null);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="md:hidden p-2 hover:bg-gray-100 rounded-full flex-shrink-0"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    
                    {/* Clickable Product Image */}
                    <Link 
                      to={`/produit/${selectedConversation.product_id}`}
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                      title="Voir le produit"
                    >
                      {selectedConversation.product_image ? (
                        <MediaImg 
                          src={selectedConversation.product_image} 
                          alt="" 
                          className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover border-2 border-purple-200 hover:border-purple-400 transition-colors"
                        />
                      ) : (
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </div>
                      )}
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      {/* Clickable Seller Name with Avatar */}
                      <div className="flex items-center gap-2">
                        {selectedConversation?.seller_avatar ? (
                          <MediaImg 
                            src={selectedConversation.seller_avatar} 
                            alt={selectedConversation.seller_name}
                            className="w-8 h-8 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                            {selectedConversation?.seller_name?.[0] || "V"}
                          </div>
                        )}
                        <Link 
                          to={`/vendeur-boutique/${selectedConversation.seller_id}`}
                          className="font-semibold text-gray-900 hover:text-purple-600 transition-colors flex items-center gap-1"
                          title="Voir la boutique"
                        >
                          {selectedConversation.seller_name}
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                      <Link 
                        to={`/produit/${selectedConversation.product_id}`}
                        className="text-sm text-purple-600 truncate hover:underline block"
                      >
                        {selectedConversation.product_name}
                      </Link>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-green-500 bg-green-50 px-2 py-1 rounded-full">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      En ligne
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {/* Typing indicator */}
                    {typingUsers.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-slate-600">
                          {typingUsers.length === 1 
                            ? `${typingUsers[0]?.name || 'Quelqu\'un'} est en train d'écrire...`
                            : `${typingUsers.length} personnes sont en train d'écrire...`
                          }
                        </span>
                      </div>
                    )}
                    
                    {/* Voice recording indicator */}
                    {recordingUsers.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs text-red-600">
                          {recordingUsers.length === 1 
                            ? `${recordingUsers[0]?.name || 'Quelqu\'un'} est en train d'enregistrer un message vocal...`
                            : `${recordingUsers.length} personnes sont en train d'enregistrer...`
                          }
                        </span>
                      </div>
                    )}
                    
                    {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                      <div key={date}>
                        <div className="flex items-center justify-center my-4">
                          <span className="px-3 py-1 bg-white text-xs text-gray-500 rounded-full shadow-sm border">
                            {date}
                          </span>
                        </div>
                        {dateMessages.map((message) => {
                          const isOwn = message.sender_id === user?.id;
                          return (
                          <div
                            key={message.id}
                            className={`flex items-end gap-1 ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
                          >
                            {isOwn && selectedConversation && (
                              <ChatMessageDeleteButton
                                token={token}
                                conversationId={selectedConversation.id}
                                messageId={message.id}
                                onDeleted={handleMessageDeleted}
                                className="text-purple-200 hover:text-white"
                                disabled={message.status === 'sending' || String(message.id).startsWith('temp-')}
                              />
                            )}
                            <div
                              className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                                isOwn
                                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-md'
                                  : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
                              } ${message.status === 'sending' ? 'opacity-70' : ''}`}
                            >
                              {message.type === 'offer' ? (
                                <div className="space-y-2">
                                  <p className="text-sm font-semibold">Offre spéciale reçue</p>
                                  <p className="text-sm">{(message.offer_price_fcfa || 0).toLocaleString()} FCFA</p>
                                  <Link
                                    to={message.offer_url || '#'}
                                    className="inline-flex items-center gap-1 text-xs underline"
                                  >
                                    <Tag className="w-3 h-3" />
                                    Voir l'offre et payer
                                  </Link>
                                  {message.text && <p className="text-xs opacity-90">{message.text}</p>}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {message.media_type === 'image' && (
                                    <div>
                                      <MediaImg 
                                        src={message.file_url} 
                                        alt="Image partagée" 
                                        className="max-w-[200px] max-h-[200px] rounded-lg object-contain"
                                      />
                                    </div>
                                  )}
                                  {message.media_type === 'document' && (
                                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-6 h-6 text-blue-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-blue-900 truncate">{message.file_name}</p>
                                        <p className="text-xs text-blue-600">
                                          {message.file_size ? `${(message.file_size / 1024).toFixed(1)} KB` : 'Document'}
                                        </p>
                                      </div>
                                      <a 
                                        href={message.file_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                      >
                                        <FileText className="w-4 h-4" />
                                        Télécharger
                                      </a>
                                    </div>
                                  )}
                                  {message.media_type === 'audio' && (
                                    <div className="space-y-2">
                                      <CustomAudioPlayer audioUrl={message.file_url} duration={message.duration} />
                                    </div>
                                  )}
                                  {message.content && (
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                  )}
                                  {message.text && !message.content && (
                                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                                  )}
                                </div>
                              )}
                              <div className={`flex items-center justify-end gap-1 mt-1 ${
                                isOwn ? 'text-purple-200' : 'text-gray-400'
                              }`}>
                                <span className="text-[10px]">{formatTime(message.created_at)}</span>
                                {isOwn && (
                                  message.status === 'sending' ? (
                                    <Clock className="w-3 h-3" />
                                  ) : message.is_read ? (
                                    <CheckCheck className="w-3 h-3" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Message Input */}
                  <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowMediaMenu(!showMediaMenu)}
                          disabled={uploadingFile}
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                        
                        {showMediaMenu && (
                          <div className="absolute bottom-full left-0 mb-2 bg-white border rounded-lg shadow-lg p-2 space-y-1 z-10">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                fileInputRef.current?.click();
                                setShowMediaMenu(false);
                              }}
                              className="w-full justify-start"
                            >
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Image
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                documentInputRef.current?.click();
                                setShowMediaMenu(false);
                              }}
                              className="w-full justify-start"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Document
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                audioInputRef.current?.click();
                                setShowMediaMenu(false);
                              }}
                              className="w-full justify-start"
                            >
                              <Radio className="w-4 h-4 mr-2" />
                              Audio
                            </Button>
                            <div className="border-t pt-1">
                              {isRecording ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={stopRecordingWithStatus}
                                  className="w-full justify-start text-red-600"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Stop ({formatRecordingTime(recordingTime)})
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={startRecordingWithStatus}
                                  className="w-full justify-start"
                                >
                                  <Mic className="w-4 h-4 mr-2" />
                                  Enregistrer
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Hidden file inputs */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <input
                          ref={documentInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleDocumentUpload}
                          className="hidden"
                        />
                        <input
                          ref={audioInputRef}
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioUpload}
                          className="hidden"
                        />
                      </div>
                      
                      <Input
                        value={newMessage}
                        onChange={handleTyping}
                        placeholder="Écrivez votre message..."
                        className="flex-1 bg-gray-50 border-gray-200 focus:border-purple-400"
                        disabled={sending || uploadingFile}
                      />
                      <Button
                        type="submit"
                        disabled={!newMessage.trim() || sending || uploadingFile}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-6"
                      >
                        {sending || uploadingFile ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                      <MessageCircle className="w-10 h-10 text-purple-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Vos messages</h3>
                    <p className="text-gray-500 max-w-sm">
                      Sélectionnez une conversation pour voir vos messages avec les vendeurs.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerChatPage;
