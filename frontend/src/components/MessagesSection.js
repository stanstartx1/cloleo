import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, Send, User, Clock, Search, ChevronLeft, 
  Loader2, Package, Store, Check, CheckCheck, Bell, Tag
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import ChatMessageDeleteButton from './ChatMessageDeleteButton';

import { API_BASE, API_URL } from '../config/api';
const WS_URL = BACKEND_URL
  .replace(/^https:\/\//, 'wss://')
  .replace(/^http:\/\//, 'ws://');
const API = `${BACKEND_URL}/api`;

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
  
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const userId = useRef(null);

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
      const endpoint = (userType === 'dropshipper' || userType === 'revendeur')
        ? '/dropshipper/conversations'
        : '/vendor/conversations';
        
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
    // Refresh every 30s
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId) => {
    setLoadingMessages(true);
    try {
      const response = await axios.get(`${API}/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.messages || []);
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
    fetchMessages(conv.id);
  };

  // WebSocket connection
  useEffect(() => {
    if (!selectedConversation) return;

    let ws = null;
    let reconnectAttempts = 0;
    let pingInterval = null;
    let isMounted = true;

    const connectWs = () => {
      if (!isMounted) return;
      
      ws = new WebSocket(`${WS_URL}/api/ws/chat/${selectedConversation.id}`);
      
      ws.onopen = () => {
        console.log('Vendor Chat WebSocket connected');
        reconnectAttempts = 0;
        
        // Start ping/pong to keep connection alive
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message_deleted' && data.message_id) {
            setMessages(prev => prev.filter(m => m.id !== data.message_id));
            fetchConversations();
          } else if (data.type === 'new_message' && data.message.sender_id !== userId.current) {
            setMessages(prev => [...prev, data.message]);
            // Play notification sound
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleUMOOpO5IAVNEW7h1o5wPAdE0+UBC1FiDtDNiXFGDEzO');
            audio.volume = 0.3;
            audio.play().catch(() => {});
            scrollToBottom();
            
            // Update conversation list unread count
            setConversations(prev => prev.map(c => 
              c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c
            ));
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('Vendor Chat WebSocket disconnected');
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
      if (ws) {
        ws.close();
      }
    };
  }, [selectedConversation]);

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
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{conv.customer_name}</p>
                          {conv.unread_count > 0 && (
                            <Badge className="bg-purple-600 text-white text-xs">{conv.unread_count}</Badge>
                          )}
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
                      <img 
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
                            {isOwn && selectedConversation && (
                              <ChatMessageDeleteButton
                                token={token}
                                conversationId={selectedConversation.id}
                                messageId={message.id}
                                onDeleted={handleMessageDeleted}
                                className={isSeller ? 'text-purple-200 hover:text-white' : 'text-gray-400 hover:text-red-500'}
                                disabled={String(message.id).startsWith('temp-')}
                              />
                            )}
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
                                  <p className="text-sm whitespace-pre-wrap">{message.content || message.text}</p>
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
                  <Input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrivez votre réponse..."
                    className="flex-1"
                    disabled={sending}
                    data-testid="message-input"
                  />
                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim() || sending}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    data-testid="message-send-btn"
                  >
                    {sending ? (
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
      </div>
    </div>
  );
};

export default MessagesSection;
