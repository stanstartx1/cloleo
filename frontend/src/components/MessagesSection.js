import MediaImg from '../components/MediaImg';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, Send, User, Clock, Search, ChevronLeft, 
  Loader2, Package, Store, Check, CheckCheck, Bell, Tag,
  Image as ImageIcon, FileText, Mic, Phone, Paperclip, X,
  Share2, Forward, Play, Pause, RotateCcw, Upload, Radio
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import ChatMessageDeleteButton from './ChatMessageDeleteButton';

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
        className="w-8 h-8 rounded-full bg-fuchsia-600 text-white flex items-center justify-center hover:bg-fuchsia-700 transition-colors flex-shrink-0"
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
            background: `linear-gradient(to right, #d946ef 0%, #d946ef ${(currentTime / (totalDuration || 1)) * 100}%, #e5e7eb ${(currentTime / (totalDuration || 1)) * 100}%, #e5e7eb 100%)`
          }}
        />
        <span className="text-xs text-gray-500 w-12 text-right flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>
    </div>
  );
};

const MessagesSection = ({ token, userType = 'vendor' }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  
  const messagesEndRef = useRef(null);
  const userId = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Close message menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMessageMenu && !event.target.closest('.message-menu-container')) {
        setShowMessageMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMessageMenu]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      let endpoint;
      if (userType === 'dropshipper') {
        endpoint = '/dropshipper/conversations';
      } else if (userType === 'revendeur') {
        endpoint = '/revendeur/conversations';
      } else {
        endpoint = '/vendor/conversations';
      }
        
      const response = await axios.get(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Erreur lors du chargement des conversations');
    } finally {
      setLoading(false);
    }
  }, [token, userType]);

  useEffect(() => {
    fetchConversations();
    // Disabled polling to prevent message flickering
    // const interval = setInterval(fetchConversations, 60000); // 60s instead of 30s
    // return () => clearInterval(interval);
  }, [fetchConversations]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId, forceReload = false) => {
    setLoadingMessages(true);
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
      
      userId.current = response.data.conversation.seller_id;
      
      // Update unread count in local state
      setConversations(prev => prev.map(c => 
        c.id === conversationId ? { ...c, unread_count: 0, unread_seller: 0 } : c
      ));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [token]);

  // Select conversation
  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    fetchMessages(conv.id, true); // Force reload on conversation change
  };

  // Delete conversation
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

  // HTTP polling for messages (WebSocket disabled due to Apache configuration)
  useEffect(() => {
    if (!selectedConversation) return;

    // Disabled polling to prevent message flickering
    // const pollingInterval = setInterval(() => {
    //   fetchMessages(selectedConversation.id);
    // }, 15000); // Reduced from 10s to 15s to reduce flickering
    
    // return () => clearInterval(pollingInterval);
  }, [selectedConversation, fetchMessages]);

  // Send message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_id: userId.current,
      sender_type: 'seller',
      created_at: new Date().toISOString(),
      is_read: false
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await axios.post(
        `${API}/conversations/${selectedConversation.id}/messages`,
        { content: messageContent },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Replace optimistic message with real message
      setMessages(prev => prev.map(m => 
        m.id === optimisticMessage.id ? response.data : m
      ));

      // Update conversation preview
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

  const handleMessageDeleted = useCallback((messageId) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    fetchConversations();
  }, [fetchConversations]);

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
      
      // Add message to state immediately
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
      // Reset file input
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

  // Audio recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
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
        audioChunksRef.current = [];
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        if (!isPaused) {
          setRecordingTime(prev => prev + 1);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Impossible d\'accéder au microphone');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
      audioChunksRef.current = [];
      toast.info('Enregistrement annulé');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
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

  // Message actions
  const handleShareMessage = (message) => {
    if (navigator.share) {
      const shareData = {
        title: 'Message partagé',
        text: message.content || message.text || 'Regarde ce message',
        url: window.location.href
      };
      navigator.share(shareData).catch(() => {
        toast.error('Partage annulé');
      });
    } else {
      // Fallback: copy to clipboard
      const textToCopy = message.content || message.text || window.location.href;
      navigator.clipboard.writeText(textToCopy).then(() => {
        toast.success('Message copié dans le presse-papier');
      }).catch(() => {
        toast.error('Impossible de copier le message');
      });
    }
    setShowMessageMenu(null);
  };

  const handleForwardMessage = (message) => {
    setSelectedMessage(message);
    setShowForwardDialog(true);
    setShowMessageMenu(null);
  };

  const handleForwardToConversation = async (targetConversationId) => {
    if (!selectedMessage) return;
    
    try {
      const messageContent = selectedMessage.content || selectedMessage.text || '';
      
      if (selectedMessage.media_type === 'image' && selectedMessage.file_url) {
        // Forward image
        await axios.post(
          `${API}/conversations/${targetConversationId}/upload-image`,
          { file_url: selectedMessage.file_url, file_name: selectedMessage.file_name },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (selectedMessage.media_type === 'document' && selectedMessage.file_url) {
        // Forward document
        await axios.post(
          `${API}/conversations/${targetConversationId}/upload-document`,
          { file_url: selectedMessage.file_url, file_name: selectedMessage.file_name },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (messageContent) {
        // Forward text message
        await axios.post(
          `${API}/conversations/${targetConversationId}/messages`,
          { content: `[Transféré]: ${messageContent}` },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      toast.success('Message transféré avec succès');
      setShowForwardDialog(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error forwarding message:', error);
      toast.error('Erreur lors du transfert du message');
    }
  };

  const handleSendOffer = async () => {
    if (!selectedConversation || sendingOffer) return;
    const price = parseInt(offerPrice, 10);
    if (!price || price <= 0) {
      toast.error('Prix de l\'offre invalide');
      return;
    }
    setSendingOffer(true);
    try {
      await axios.post(
        `${API}/offers/create`,
        {
          conversation_id: selectedConversation.id,
          offered_price_fcfa: price,
          note: offerNote
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOfferPrice('');
      setOfferNote('');
      toast.success('Offre envoyée');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi de l\'offre');
    } finally {
      setSendingOffer(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
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

  // Filter conversations
  const filteredConversations = conversations.filter(c => 
    c.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.seller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Total unread
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] min-h-[500px]" data-testid="messages-section">
      <div className="grid md:grid-cols-3 gap-4 h-full">
        {/* Conversations List */}
        <Card className={`overflow-hidden ${selectedConversation ? 'hidden md:block' : ''}`}>
          <CardHeader className="border-b py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="w-5 h-5 text-purple-600" />
                Messages
                {totalUnread > 0 && (
                  <Badge className="bg-red-500 text-white animate-pulse">{totalUnread}</Badge>
                )}
              </CardTitle>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          
          <div className="overflow-y-auto h-[calc(100%-140px)]">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <MessageCircle className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">Aucune conversation</p>
                <p className="text-gray-400 text-xs mt-1">Les messages de vos clients apparaîtront ici</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {conv?.seller_avatar ? (
                        <MediaImg 
                          src={conv.seller_avatar} 
                          alt={conv.seller_name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {conv?.seller_name?.[0] || conv?.customer_name?.[0] || "C"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{conv.seller_name || conv.customer_name}</p>
                          <div className="flex items-center gap-2">
                            {conv.unread_count > 0 && (
                              <Badge className="bg-purple-600 text-white text-xs">{conv.unread_count}</Badge>
                            )}
                            <button
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                              title="Supprimer la conversation"
                            >
                              <X className="w-4 h-4 text-red-500 hover:text-red-700" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                          <Package className="w-3 h-3" />
                          {conv.product_name}
                        </p>
                        {conv.last_message && (
                          <p className="text-xs text-gray-400 truncate mt-1">{conv.last_message}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(conv.last_message_at || conv.created_at)} • {formatTime(conv.last_message_at || conv.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className={`md:col-span-2 overflow-hidden flex flex-col ${!selectedConversation ? 'hidden md:flex' : ''}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="border-b p-4 bg-white">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium">{selectedConversation.customer_name}</p>
                    <p className="text-xs text-gray-500">{selectedConversation.customer_email}</p>
                  </div>
                  
                  {selectedConversation.product_image && (
                    <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                      <MediaImg 
                        src={selectedConversation.product_image} 
                        alt="" 
                        className="w-8 h-8 rounded object-cover"
                      />
                      <span className="text-xs text-gray-600 max-w-32 truncate">
                        {selectedConversation.product_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">Début de la conversation</p>
                  </div>
                ) : (
                  Object.entries(groupedMessages).map(([date, dateMessages]) => (
                    <div key={date}>
                      <div className="flex items-center justify-center mb-3">
                        <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">
                          {date}
                        </span>
                      </div>
                      {dateMessages.map((message) => {
                        const isSeller = message.sender_type === 'seller';
                        const isOwn = message.sender_id === userId.current;
                        return (
                          <div
                            key={message.id}
                            className={`flex mb-3 items-end gap-1 ${isSeller ? 'justify-end' : 'justify-start'}`}
                          >
                            {/* Message Actions Menu */}
                            <div className="relative message-menu-container">
                              <button
                                onClick={() => setShowMessageMenu(showMessageMenu === message.id ? null : message.id)}
                                className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${isSeller ? 'text-purple-200 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="12" cy="5" r="1" />
                                  <circle cx="12" cy="19" r="1" />
                                </svg>
                              </button>
                              
                              {showMessageMenu === message.id && (
                                <div className={`absolute ${isSeller ? 'right-0' : 'left-0'} mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[150px]`}>
                                  {isOwn && (
                                    <>
                                      <button
                                        onClick={() => handleShareMessage(message)}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                      >
                                        <Share2 className="w-4 h-4" />
                                        Partager
                                      </button>
                                      <button
                                        onClick={() => handleForwardMessage(message)}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                      >
                                        <Forward className="w-4 h-4" />
                                        Transférer
                                      </button>
                                      <div className="border-t border-gray-200 my-1" />
                                      <ChatMessageDeleteButton
                                        token={token}
                                        conversationId={selectedConversation.id}
                                        messageId={message.id}
                                        onDeleted={() => {
                                          handleMessageDeleted(message.id);
                                          setShowMessageMenu(null);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
                                        disabled={String(message.id).startsWith('temp-')}
                                      >
                                        <X className="w-4 h-4" />
                                        Supprimer
                                      </ChatMessageDeleteButton>
                                    </>
                                  )}
                                  {!isOwn && (
                                    <button
                                      onClick={() => handleShareMessage(message)}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      <Share2 className="w-4 h-4" />
                                      Partager
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className={`max-w-[80%] ${isSeller ? '' : ''}`}>
                              <div
                                className={`px-4 py-2 rounded-2xl ${
                                  isSeller
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-md'
                                    : 'bg-white text-gray-800 shadow-sm rounded-bl-md'
                                }`}
                              >
                                {message.type === 'offer' ? (
                                  <div className="space-y-2">
                                    <p className="text-sm font-semibold">Offre spéciale</p>
                                    <p className="text-sm">{(message.offer_price_fcfa || 0).toLocaleString()} FCFA</p>
                                    <a
                                      href={message.offer_url || '#'}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-xs underline"
                                    >
                                      <Tag className="w-3 h-3" />
                                      Voir lien de paiement
                                    </a>
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
                                  </div>
                                )}
                              </div>
                              <div className={`flex items-center gap-1 mt-1 ${isSeller ? 'justify-end' : ''}`}>
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-400">{formatTime(message.created_at)}</span>
                                {isSeller && (
                                  message.is_read 
                                    ? <CheckCheck className="w-3 h-3 text-blue-500" />
                                    : <Check className="w-3 h-3 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-4 border-t bg-white space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="Prix offre (FCFA)"
                  />
                  <Input
                    value={offerNote}
                    onChange={(e) => setOfferNote(e.target.value)}
                    placeholder="Message offre (optionnel)"
                  />
                  <Button
                    type="button"
                    onClick={handleSendOffer}
                    disabled={sendingOffer || !offerPrice}
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Faire une offre
                  </Button>
                </div>
                <div className="flex gap-2">
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
                            <div className="space-y-1">
                              <div className="text-center text-sm font-medium text-purple-600">
                                {formatRecordingTime(recordingTime)}
                              </div>
                              <div className="flex gap-1">
                                {isPaused ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={resumeRecording}
                                    className="flex-1 justify-start"
                                  >
                                    <Play className="w-4 h-4 mr-2" />
                                    Reprendre
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={pauseRecording}
                                    className="flex-1 justify-start"
                                  >
                                    <Pause className="w-4 h-4 mr-2" />
                                    Pause
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelRecording}
                                  className="flex-1 justify-start text-red-600"
                                >
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Annuler
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={stopRecording}
                                  className="flex-1 justify-start text-green-600"
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Envoyer
                                </Button>
                              </div>
                            </div>
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
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrivez votre réponse..."
                    className="flex-1"
                    disabled={sending || uploadingFile}
                    data-testid="message-input"
                  />
                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim() || sending || uploadingFile}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    data-testid="message-send-btn"
                  >
                    {sending || uploadingFile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Vos messages</h3>
              <p className="text-gray-500 text-sm mt-1">
                Sélectionnez une conversation pour voir les messages
              </p>
            </div>
          )}
        </Card>
        
        {/* Forward Dialog */}
        {showForwardDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-lg">Transférer le message</h3>
                <button
                  onClick={() => {
                    setShowForwardDialog(false);
                    setSelectedMessage(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                <p className="text-sm text-gray-600 mb-4">Sélectionnez une conversation :</p>
                {conversations.filter(c => c.id !== selectedConversation?.id).map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleForwardToConversation(conv.id)}
                    className="w-full p-3 text-left hover:bg-gray-100 rounded-lg mb-2 flex items-center gap-3"
                  >
                    {conv?.seller_avatar ? (
                      <MediaImg 
                        src={conv.seller_avatar} 
                        alt={conv.seller_name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {conv?.seller_name?.[0] || conv?.customer_name?.[0] || "C"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{conv.seller_name || conv.customer_name || 'Vendeur'}</p>
                      <p className="text-sm text-gray-500 truncate">{conv.product_name || 'Discussion'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesSection;
