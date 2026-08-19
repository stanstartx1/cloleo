import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Phone, MapPin, User, Truck, Store, 
  X, Minimize2, Maximize2, MoreVertical, Camera, 
  Image as ImageIcon, FileText, Check, CheckCheck,
  Clock, AlertCircle, MessageCircle, Mic
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

const API = API_URL;

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
  
  const messagesEndRef = useRef(null);

  // Typing indicator functionality
  const setTypingStatus = async (isTyping) => {
    if (!token) return;
    try {
      await axios.post(
        `${API}/conversations/${orderId}/typing`,
        { is_typing: isTyping },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  };

  // Voice recording indicator functionality
  const setVoiceRecordingStatus = async (isRecording) => {
    if (!token) return;
    try {
      await axios.post(
        `${API}/conversations/${orderId}/voice-recording`,
        { is_recording: isRecording },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error setting voice recording status:', error);
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
      setLoading(true);
      const response = await axios.get(`${API}/chat/conversation/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.messages) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Don't show error for missing conversations
    } finally {
      setLoading(false);
    }
  }, [orderId, token, API]);

  // Initialize WebSocket for real-time chat
  useEffect(() => {
    if (!isOpen || !orderId || !user?.id || !token) return;

    let wsCleanup;
    wsCleanup = createChatRealtime({
      conversationId: orderId,
      token,
      onEvent: (event) => {
        if (event.type === 'new_message' && event.message) {
          setMessages(prev => {
            // If message already exists, don't add duplicate
            if (prev.some(message => message.id === event.message.id)) {
              return prev;
            }
            return [...prev, event.message];
          });
          scrollToBottom();
          playNotificationSound();
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
        console.log('Tripartite chat WebSocket status:', isConnected);
      }
    });

    return () => {
      if (wsCleanup) wsCleanup();
    };
  }, [isOpen, orderId, token, user?.id, recipientName]);

  // Initial fetch when chat opens
  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen, fetchMessages]);

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
    
    try {
      setSending(true);
      
      const messageData = {
        order_id: orderId,
        recipient_id: recipientId,
        recipient_type: recipientType,
        message_type: messageType,
        content: newMessage.trim(),
        attachment: attachment
      };
      
      const response = await axios.post(`${API}/chat/send`, messageData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.message) {
        setMessages(prev => [...prev, response.data.message]);
        setNewMessage('');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      setTypingStatus(true);
    } else {
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
