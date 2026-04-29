import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  MessageCircle, Send, X, Store, ArrowLeft, Search, 
  Image as ImageIcon, Clock, Check, CheckCheck, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const CustomerChatPage = () => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data || []);
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

  // WebSocket connection
  useEffect(() => {
    if (!selectedConversation) return;

    let ws = null;
    let reconnectAttempts = 0;
    let pingInterval = null;
    let isMounted = true;

    const connectWs = () => {
      if (!isMounted) return;
      
      ws = new WebSocket(`${WS_URL}/ws/chat/${selectedConversation.id}`);
      
      ws.onopen = () => {
        console.log('Customer Chat WebSocket connected');
        reconnectAttempts = 0;
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message' && data.message.sender_id !== user?.id) {
            setMessages(prev => [...prev, data.message]);
            // Play notification sound
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleUMOOpO5IAVNEW7h1o5wPAdE0+UBC1FiDtDNiXFGDEzO');
            audio.volume = 0.3;
            audio.play().catch(() => {});
            scrollToBottom();
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        if (pingInterval) clearInterval(pingInterval);
        if (isMounted && selectedConversation && reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectAttempts++;
          setTimeout(connectWs, delay);
        }
      };

      wsRef.current = ws;
    };

    connectWs();

    return () => {
      isMounted = false;
      if (pingInterval) clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, [selectedConversation, user?.id]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
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
      const response = await axios.post(`${API}/messages`, {
        conversation_id: selectedConversation.id,
        text: messageContent
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

  // Filter conversations
  const filteredConversations = conversations.filter(c => 
    !searchTerm || 
    c.seller_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="min-h-screen bg-gray-50 pt-20" data-testid="customer-chat-page">
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
          <div className="flex h-full">
            
            {/* Conversations List (Left Panel) */}
            <div className={`w-full md:w-96 border-r border-gray-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-6 h-6" />
                  Mes Messages
                </h1>
                <p className="text-purple-200 text-sm mt-1">{conversations.length} conversation(s)</p>
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
                          <img 
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
                        <img 
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
                        {dateMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'} mb-3`}
                          >
                            <div
                              className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                                message.sender_id === user?.id
                                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-md'
                                  : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
                              } ${message.status === 'sending' ? 'opacity-70' : ''}`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                              <div className={`flex items-center justify-end gap-1 mt-1 ${
                                message.sender_id === user?.id ? 'text-purple-200' : 'text-gray-400'
                              }`}>
                                <span className="text-[10px]">{formatTime(message.created_at)}</span>
                                {message.sender_id === user?.id && (
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
                        ))}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Message Input */}
                  <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex items-center gap-3">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Écrivez votre message..."
                        className="flex-1 bg-gray-50 border-gray-200 focus:border-purple-400"
                        disabled={sending}
                      />
                      <Button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-6"
                      >
                        <Send className="w-4 h-4" />
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
