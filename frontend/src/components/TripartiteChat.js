import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Phone, MapPin, User, Truck, Store, 
  X, Minimize2, Maximize2, MoreVertical, Camera, 
  Image as ImageIcon, FileText, Check, CheckCheck,
  Clock, AlertCircle, MessageCircle, Mic, Paperclip, Upload,
  Play, Pause, Radio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL, WS_URL } from '../config/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { toast } from 'sonner';
import axios from 'axios';
import { createChatRealtime } from '../services/chatRealtime';
import MediaImg from './MediaImg';

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

const TripartiteChat = ({ orderId, recipientType, recipientId, recipientName, isOpen, onClose }) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [recordingUsers, setRecordingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const discardRecordingRef = useRef(false);

  // Typing indicator functionality
  const setTypingStatus = async (isTyping) => {
    if (!token || !orderId) return;
    try {
      await axios.post(
        `${API}/chat/conversation/${orderId}/typing`,
        { is_typing: isTyping },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  };

  // Voice recording indicator functionality
  const setVoiceRecordingStatus = async (isRecording) => {
    if (!token || !orderId) return;
    try {
      await axios.post(
        `${API}/chat/conversation/${orderId}/voice-recording`,
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
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          stream.getTracks().forEach(track => track.stop());
          audioChunksRef.current = [];
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        
        setUploadingFile(true);
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('duration', recordingTime);
        
        try {
          const response = await axios.post(
            `${API}/chat/conversation/${orderId}/upload`,
            formData,
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
          );
          
          if (response.data && response.data.message) {
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
      discardRecordingRef.current = false;
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      await setVoiceRecordingStatus(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Impossible d\'accéder au microphone');
      throw error;
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
      setVoiceRecordingStatus(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      discardRecordingRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
      audioChunksRef.current = [];
      setVoiceRecordingStatus(false);
      toast.info('Enregistrement annulé');
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Media upload handlers
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !orderId) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API}/chat/conversation/${orderId}/upload`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data && response.data.message) {
        setMessages(prev => [...prev, response.data.message]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors de l\'envoi de l\'image');
    } finally {
      setUploadingFile(false);
      fileInputRef.current.value = '';
      setShowMediaMenu(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !orderId) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API}/chat/conversation/${orderId}/upload`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data && response.data.message) {
        setMessages(prev => [...prev, response.data.message]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors de l\'envoi du document');
    } finally {
      setUploadingFile(false);
      documentInputRef.current.value = '';
      setShowMediaMenu(false);
    }
  };

  // Share location
  const shareLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Votre navigateur ne supporte pas la géolocalisation');
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      const response = await axios.post(
        `${API}/chat/conversation/${orderId}/location`,
        { location, recipient_id: recipientId, recipient_type: recipientType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.message) {
        setMessages(prev => [...prev, response.data.message]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sharing location:', error);
      toast.error('Erreur lors du partage de localisation');
    }
  };

  // Determine chat context based on user role
  const getChatContext = useCallback(() => {
    if (!user) return null;
    
    const contexts = {
      customer: {
        title: `Chat avec ${recipientName}`,
        recipient: { type: recipientType, id: recipientId, name: recipientName },
        canCall: true,
        canShareLocation: true
      },
      vendor: {
        title: `Chat client - ${recipientName}`,
        recipient: { type: 'customer', id: recipientId, name: recipientName },
        canCall: true,
        canShareLocation: false
      },
      driver: {
        title: `Chat livraison - ${recipientName}`,
        recipient: { type: recipientType, id: recipientId, name: recipientName },
        canCall: true,
        canShareLocation: true
      }
    };
    
    // Determine user role
    const userRole = user.is_driver ? 'driver' : user.is_vendor ? 'vendor' : 'customer';
    return contexts[userRole] || contexts.customer;
  }, [user, recipientType, recipientId, recipientName]);

  const chatContext = getChatContext();

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!orderId || !token) return;
    
    try {
      console.log('📱 [CHAT DEBUG] Fetching messages for order:', orderId);
      setLoading(true);
      const response = await axios.get(`${API}/chat/conversation/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📱 [CHAT DEBUG] Messages fetched:', response.data);
      if (response.data && response.data.messages) {
        const pinMessages = response.data.messages.filter(m => m.is_system && m.content.includes('PIN'));
        if (pinMessages.length > 0) {
          console.log('🔐 [PIN DEBUG] Found PIN messages in chat:', pinMessages);
          // Show toast notification if PIN is found
          toast.success('Code de livraison disponible', {
            description: 'Vérifiez votre chat pour le code de livraison',
            duration: 5000
          });
        }
        // Log each message for debugging
        response.data.messages.forEach((msg, idx) => {
          console.log(`📱 [MSG ${idx}]`, {
            id: msg.id,
            sender_role: msg.sender_role,
            sender_name: msg.sender_name,
            is_system: msg.is_system,
            content: msg.content?.substring(0, 50)
          });
        });
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('📱 [CHAT DEBUG] Error fetching messages:', error);
      // Don't show error for missing conversations
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  // Initialize WebSocket for real-time chat (connect when order is loaded, not just when chat is open)
  useEffect(() => {
    if (!orderId || !user?.id || !token) return;

    let wsCleanup;
    wsCleanup = createChatRealtime({
      conversationId: orderId,
      token,
      isOrderChat: true, // Use order chat endpoint for tripartite conversations
      onEvent: (event) => {
        console.log('📱 [CHAT DEBUG] WebSocket event received:', event.type, event);
        if (event.type === 'new_message' && event.message) {
          console.log('📱 [CHAT DEBUG] New message received:', event.message);
          if (event.message.is_system && event.message.content.includes('PIN')) {
            console.log('🔐 [PIN DEBUG] PIN message received in chat:', event.message);
            // Show toast notification for PIN
            toast.success('Code de livraison reçu', {
              description: 'Vérifiez votre chat pour le code de livraison',
              duration: 5000
            });
          }
          setMessages(prev => {
            // If message already exists, don't add duplicate
            if (prev.some(message => message.id === event.message.id)) {
              return prev;
            }
            return [...prev, event.message];
          });
          if (isOpen) {
            scrollToBottom();
            playNotificationSound();
          }
        }
        if (event.type === 'chat_notification' && event.message) {
          console.log('📱 [CHAT DEBUG] Chat notification received:', event.message);
          // Refresh messages when receiving chat notification
          fetchMessages();
        }
        if (event.type === 'message_deleted' && event.message_id) {
          setMessages(prev => prev.filter(message => message.id !== event.message_id));
        }
        // Don't show own typing/recording indicators
        if (event.user_id === user?.id) return;
        
        // Handle typing status
        if (event.type === 'typing_status') {
          if (event.conversation_id === orderId || !event.conversation_id) {
            const participant = { id: event.user_id, name: recipientName };
            setTypingUsers(event.is_typing ? [participant] : []);
          }
          return;
        }
        
        // Handle voice recording status
        if (event.type === 'voice_recording_status') {
          if (event.conversation_id === orderId || !event.conversation_id) {
            const participant = { id: event.user_id, name: recipientName };
            setRecordingUsers(event.is_recording ? [participant] : []);
          }
          return;
        }
      },
      onStatusChange: (isConnected) => {
        console.log('📱 [CHAT DEBUG] Tripartite chat WebSocket status:', isConnected);
        // When WebSocket connects, refresh messages to catch any missed messages
        if (isConnected) {
          console.log('📱 [CHAT DEBUG] WebSocket connected, refreshing messages');
          fetchMessages();
        }
      }
    });

    return () => {
      if (wsCleanup) wsCleanup();
    };
  }, [orderId, token, user?.id, recipientName, isOpen]);

  // Initial fetch when order is loaded (not just when chat opens)
  useEffect(() => {
    if (orderId) {
      console.log('📱 [CHAT DEBUG] Order loaded, fetching messages for order:', orderId);
      fetchMessages();
    }
  }, [orderId, token, fetchMessages]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const sendMessage = async (messageType = 'text', attachment = null) => {
    if ((!newMessage.trim() && !attachment) || sending) return;
    
    // Stop typing indicator
    await setTypingStatus(false);
    
    const content = newMessage.trim();
    setNewMessage('');
    
    // Optimistic update
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      content: content,
      sender_id: user?.id,
      sender_name: user?.name,
      sender_role: user?.role,
      message_type: messageType,
      attachment: attachment,
      created_at: new Date().toISOString(),
      is_optimistic: true
    };
    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
      setSending(true);
      
      const messageData = {
        order_id: orderId,
        recipient_id: recipientId,
        recipient_type: recipientType,
        message_type: messageType,
        content: content,
        attachment: attachment
      };
      
      const response = await axios.post(`${API}/chat/send`, messageData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove optimistic message and add real message
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== optimisticMessage.id);
        if (response.data && response.data.message) {
          return [...filtered, response.data.message];
        }
        return filtered;
      });
      
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(content);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (e) => {
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

  // Play notification sound
  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => {
      // Ignore errors from autoplay policies
    });
  };

  // Format message time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('fr-FR');
  };

  // Get user avatar based on role
  const getUserAvatar = (message) => {
    if (message.sender_id === user.id) {
      return user.photo_url;
    }
    return message.sender_photo;
  };

  // Get user name based on role
  const getUserName = (message) => {
    if (message.sender_id === user.id) {
      return 'Vous';
    }
    return message.sender_name || 'Utilisateur';
  };

  // Handle attachment upload
  const handleAttachment = async (type) => {
    // This would open file picker or camera
    // For now, just show placeholder
    toast.info(`Fonctionnalité ${type} à venir`);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10 border-2 border-white">
              <AvatarImage src={recipientName ? `https://ui-avatars.com/api/?name=${recipientName}&background=random` : ''} />
              <AvatarFallback>{recipientName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            {onlineUsers.includes(recipientId) && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{chatContext?.title}</h3>
            <p className="text-xs text-blue-100">
              {onlineUsers.includes(recipientId) ? 'En ligne' : 'Hors ligne'}
              {typingUsers.length > 0 && ' - En train d\'écrire...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {chatContext?.canCall && (
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8">
              <Phone className="w-4 h-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 h-[calc(600px-140px)]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Chargement des messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm mb-2">Aucun message</p>
                  <p className="text-xs">Commencez la conversation !</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const isOwn = message.sender_id === user.id;
                  const isSystemMessage = message.sender_role === 'system' || message.sender_name === 'Cloleo';
                  
                  console.log(`📱 [RENDER MSG ${index}]`, {
                    sender_role: message.sender_role,
                    sender_name: message.sender_name,
                    is_system: message.is_system,
                    isSystemMessage,
                    content: message.content?.substring(0, 30)
                  });
                  
                  // Special styling for system messages from Cloleo
                  if (isSystemMessage) {
                    // Highlight PIN messages
                    const isPinMessage = message.content.includes('code de livraison') || message.content.includes('delivery pin');
                    
                    return (
                      <div key={message.id || index} className="flex justify-center my-4">
                        <div className={`border rounded-xl px-4 py-3 max-w-[90%] shadow-sm ${
                          isPinMessage 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
                            : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isPinMessage 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                : 'bg-gradient-to-r from-blue-500 to-purple-500'
                            }`}>
                              {isPinMessage ? <Check className="w-4 h-4 text-white" /> : <Store className="w-4 h-4 text-white" />}
                            </div>
                            <span className={`font-semibold text-sm ${
                              isPinMessage ? 'text-green-700' : 'text-blue-700'
                            }`}>Cloleo</span>
                            <Badge variant="outline" className={`text-xs ${
                              isPinMessage 
                                ? 'bg-green-100 text-green-700 border-green-300' 
                                : 'bg-blue-100 text-blue-700 border-blue-300'
                            }`}>Système</Badge>
                          </div>
                          <div className={`text-sm whitespace-pre-line ${
                            isPinMessage ? 'text-slate-800 font-medium' : 'text-slate-700'
                          }`}>
                            {message.content}
                          </div>
                          <div className="text-xs text-slate-400 mt-2">
                            {formatTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={message.id || index} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={getUserAvatar(message)} />
                          <AvatarFallback>{getUserName(message)[0]}</AvatarFallback>
                        </Avatar>
                        <div className={`space-y-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                          <div className={`px-3 py-2 rounded-2xl ${
                            isOwn 
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                              : 'bg-slate-100 text-slate-900'
                          }`}>
                            {message.message_type === 'text' && (
                              <p className="text-sm">{message.content}</p>
                            )}
                            {message.message_type === 'location' && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">Position partagée</span>
                              </div>
                            )}
                            {message.message_type === 'image' && (
                              <div>
                                <img src={message.attachment} alt="Shared" className="rounded-lg max-w-full" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <span>{formatTime(message.created_at)}</span>
                            {isOwn && (
                              <span>
                                {message.read ? (
                                  <CheckCheck className="w-3 h-3 text-blue-500" />
                                ) : (
                                  <Check className="w-3 h-3 text-slate-400" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm mb-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-gray-600">
                      {typingUsers.map(u => u.name).join(', ')} {typingUsers.length > 1 ? 'sont' : 'est'} en train d'écrire...
                    </span>
                  </div>
                )}

                {/* Voice recording indicator */}
                {recordingUsers.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg shadow-sm mb-2">
                    <Mic className="w-4 h-4 text-red-600 animate-pulse" />
                    <span className="text-sm text-red-700">
                      {recordingUsers.map(u => u.name).join(', ')} {recordingUsers.length > 1 ? 'sont' : 'est'} en train d'enregistrer un message vocal...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-slate-50 rounded-b-2xl">
            <div className="flex items-center gap-2 mb-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleAttachment('image')}>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Image
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAttachment('camera')}>
                    <Camera className="w-4 h-4 mr-2" />
                    Caméra
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAttachment('document')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Document
                  </DropdownMenuItem>
                  {chatContext?.canShareLocation && (
                    <DropdownMenuItem onClick={() => sendMessage('location')}>
                      <MapPin className="w-4 h-4 mr-2" />
                      Partager ma position
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={handleInputChange}
                onBlur={() => setTypingStatus(false)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Écrivez votre message..."
                className="flex-1"
                disabled={sending}
              />
              <Button 
                onClick={() => sendMessage()} 
                disabled={sending || !newMessage.trim()}
                size="icon"
                className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500"
              >
                {sending ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TripartiteChat;
