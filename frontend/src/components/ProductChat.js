import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, User, Store, Clock, ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
const API = `${BACKEND_URL}/api`;

const ProductChat = ({ 
  productId, 
  dropshippedProductId,
  sellerName,
  productName,
  productImage 
}) => {
  const { user, token, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start or load conversation
  const startConversation = useCallback(async () => {
    if (!isAuthenticated || !token) {
      toast.error('Veuillez vous connecter pour discuter');
      return;
    }

    setLoading(true);
    try {
      const payload = dropshippedProductId 
        ? { dropshipped_product_id: dropshippedProductId }
        : { product_id: productId };

      const response = await axios.post(`${API}/conversations/start`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setConversation(response.data);
      
      // Load existing messages
      const messagesRes = await axios.get(`${API}/conversations/${response.data.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(messagesRes.data.messages || []);
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Erreur lors du démarrage de la conversation');
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated, productId, dropshippedProductId]);

  // Connect WebSocket when conversation is active
  useEffect(() => {
    if (!conversation || !isOpen) return;

    const connectWs = () => {
      const ws = new WebSocket(`${WS_URL}/ws/chat/${conversation.id}`);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message' && data.message.sender_id !== user?.id) {
            setMessages(prev => [...prev, data.message]);
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        if (isOpen) setTimeout(connectWs, 3000);
      };

      wsRef.current = ws;
    };

    connectWs();

    return () => {
      wsRef.current?.close();
    };
  }, [conversation, isOpen, user?.id]);

  // Open chat
  const handleOpen = () => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour discuter avec le vendeur');
      return;
    }
    setIsOpen(true);
    if (!conversation) {
      startConversation();
    }
  };

  // Send message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_id: user?.id,
      sender_name: user?.name,
      sender_type: 'customer',
      created_at: new Date().toISOString(),
      is_read: false
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await axios.post(
        `${API}/conversations/${conversation.id}/messages`,
        { content: messageContent },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => 
        m.id === optimisticMessage.id ? response.data : m
      ));
    } catch (error) {
      // Remove optimistic message on error
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
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Hier";
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        data-testid="chat-button"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-scale-in"
          data-testid="chat-window"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{sellerName || 'Vendeur'}</h3>
                  <p className="text-xs text-purple-200 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    En ligne
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Product info */}
            {productName && (
              <div className="mt-3 p-2 bg-white/10 rounded-lg flex items-center gap-2">
                {productImage && (
                  <img src={productImage} alt="" className="w-10 h-10 rounded object-cover" />
                )}
                <p className="text-xs truncate flex-1">{productName}</p>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 bg-gray-50 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <MessageCircle className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-sm">Démarrez la conversation!</p>
                <p className="text-xs text-gray-400 mt-1">Posez vos questions sur ce produit</p>
              </div>
            ) : (
              Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  <div className="flex items-center justify-center mb-3">
                    <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">
                      {date}
                    </span>
                  </div>
                  {dateMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex mb-3 ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] ${message.sender_id === user?.id ? 'order-2' : ''}`}>
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            message.sender_id === user?.id
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-md'
                              : 'bg-white text-gray-800 shadow-sm rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${message.sender_id === user?.id ? 'justify-end' : ''}`}>
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">{formatTime(message.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Écrivez votre message..."
                className="flex-1"
                disabled={loading || sending}
                data-testid="chat-input"
              />
              <Button 
                type="submit" 
                disabled={!newMessage.trim() || loading || sending}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                data-testid="chat-send-btn"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ProductChat;
