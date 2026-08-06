import MediaImg from '../components/MediaImg';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  MessageCircle, Send, X, Store, ArrowLeft, Search, LogOut,
  Image as ImageIcon, Clock, Check, CheckCheck, ChevronRight, Tag,
  FileText, Mic, Paperclip
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import ChatMessageDeleteButton from '../components/ChatMessageDeleteButton';

import { API_BASE, API_URL, WS_URL } from '../config/api';
const API = API_URL;


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
  
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);

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
  }, [isAuthenticated, navigate, fetchConversations]);

  // Load messages when conversation is selected
  const loadMessages = useCallback(async (conversationId) => {
    try {
      const response = await axios.get(`${API}/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.messages || []);
      
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

  // WebSocket connection - désactivé temporairement à cause d'erreurs de connexion
  // Les messages fonctionnent via polling HTTP normal
  useEffect(() => {
    if (!selectedConversation) return;

    // Refresh messages periodically instead of WebSocket
    const interval = setInterval(() => {
      loadMessages(selectedConversation.id);
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
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

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

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
      const response = await axios.post(
        `${API}/conversations/${selectedConversation.id}/upload-image`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      
      setMessages(prev => [...prev, response.data.message]);
      scrollToBottom();
      toast.success('Image envoyée');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors de l\'envoi de l\'image');
    } finally {
      setUploadingFile(false);
      setShowMediaMenu(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedConversation) return;
    
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(
        `${API}/conversations/${selectedConversation.id}/upload-document`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      
      setMessages(prev => [...prev, response.data.message]);
      scrollToBottom();
      toast.success('Document envoyé');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors de l\'envoi du document');
    } finally {
      setUploadingFile(false);
      setShowMediaMenu(false);
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedConversation) return;
    
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(
        `${API}/conversations/${selectedConversation.id}/upload-audio`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      
      setMessages(prev => [...prev, response.data.message]);
      scrollToBottom();
      toast.success('Audio envoyé');
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Erreur lors de l\'envoi de l\'audio');
    } finally {
      setUploadingFile(false);
      setShowMediaMenu(false);
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
          const response = await axios.post(
            `${API}/conversations/${selectedConversation.id}/upload-audio`,
            formData,
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
          );
          
          setMessages(prev => [...prev, response.data.message]);
          scrollToBottom();
          toast.success('Message vocal envoyé');
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
      loadMessages(target.id);
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
        <div className="premium-panel-soft rounded-2xl shadow-lg border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
          <div className="flex h-full">
            
            {/* Conversations List (Left Panel) */}
            <div className={`w-full md:w-96 border-r border-gray-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                      <MessageCircle className="w-6 h-6" />
                      Mes Messages
                    </h1>
                    <p className="text-purple-200 text-sm mt-1">{conversations.length} conversation(s)</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleLogout}
                    className="bg-white/20 text-white hover:bg-white/30 border border-white/30"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Déconnexion
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
                        loadMessages(conv.id);
                      }}
                      className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left ${
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
                            className="w-14 h-14 rounded-xl object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                            <Store className="w-6 h-6 text-white" />
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
                          <p className="font-semibold text-gray-900 truncate">{conv.seller_name || 'Vendeur'}</p>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {formatLastMessageTime(conv.last_message_at)}
                          </span>
                        </div>
                        <p className="text-sm text-purple-600 truncate">{conv.product_name}</p>
                        <p className="text-sm text-gray-500 truncate mt-1">
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
                  <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-4">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden p-2 hover:bg-gray-100 rounded-full"
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
                          className="w-12 h-12 rounded-xl object-cover border-2 border-purple-200 hover:border-purple-400 transition-colors"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      {/* Clickable Seller Name */}
                      <Link 
                        to={`/vendeur-boutique/${selectedConversation.seller_id}`}
                        className="font-semibold text-gray-900 hover:text-purple-600 transition-colors flex items-center gap-1"
                        title="Voir la boutique"
                      >
                        {selectedConversation.seller_name}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
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
                                        className="max-w-full rounded-lg"
                                      />
                                    </div>
                                  )}
                                  {message.media_type === 'document' && (
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                      <FileText className="w-5 h-5 text-blue-600" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">{message.file_name}</p>
                                        <p className="text-xs text-gray-500">{message.file_size ? `${(message.file_size / 1024).toFixed(1)} KB` : ''}</p>
                                      </div>
                                      <a 
                                        href={message.file_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        Télécharger
                                      </a>
                                    </div>
                                  )}
                                  {message.media_type === 'audio' && (
                                    <div className="space-y-2">
                                      <audio controls className="w-full">
                                        <source src={message.file_url} type="audio/mpeg" />
                                        Votre navigateur ne supporte pas l'audio
                                      </audio>
                                      {message.duration && (
                                        <p className="text-xs text-gray-500">Durée: {formatRecordingTime(message.duration)}</p>
                                      )}
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
                          <Paperclip className="w-4 h-4" />
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
                              <Mic className="w-4 h-4 mr-2" />
                              Audio
                            </Button>
                            <div className="border-t pt-1">
                              {isRecording ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={stopRecording}
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
                                  onClick={startRecording}
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
                        onChange={(e) => setNewMessage(e.target.value)}
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
