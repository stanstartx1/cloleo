import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X, Send, Minus, Maximize2, User, Store, ChevronDown, Loader2, Package, Circle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import Draggable from 'react-draggable';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
const API = `${BACKEND_URL}/api`;

// ============== CHAT CONTEXT ==============
const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [openChats, setOpenChats] = useState([]); // Array of open chat windows
  const [minimizedChats, setMinimizedChats] = useState([]); // Array of minimized chat IDs
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showBubbles, setShowBubbles] = useState(true);
  const wsRefs = useRef({});

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    
    try {
      const response = await axios.get(`${API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data.conversations || []);
      
      // Calculate unread counts
      const counts = {};
      (response.data.conversations || []).forEach(conv => {
        counts[conv.id] = conv.unread_count || 0;
      });
      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    fetchConversations();
    // Refresh every 30 seconds
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Open a chat window
  const openChat = useCallback((conversation) => {
    setOpenChats(prev => {
      // Check if already open
      if (prev.some(c => c.id === conversation.id)) {
        // Just bring it to front and unminimize
        setMinimizedChats(m => m.filter(id => id !== conversation.id));
        return prev;
      }
      // Limit to 3 open chats
      const newChats = prev.length >= 3 ? prev.slice(1) : prev;
      return [...newChats, conversation];
    });
    setMinimizedChats(m => m.filter(id => id !== conversation.id));
  }, []);

  // Close a chat window
  const closeChat = useCallback((conversationId) => {
    setOpenChats(prev => prev.filter(c => c.id !== conversationId));
    setMinimizedChats(m => m.filter(id => id !== conversationId));
    // Close WebSocket
    if (wsRefs.current[conversationId]) {
      wsRefs.current[conversationId].close();
      delete wsRefs.current[conversationId];
    }
  }, []);

  // Minimize a chat window
  const minimizeChat = useCallback((conversationId) => {
    setMinimizedChats(prev => {
      if (prev.includes(conversationId)) return prev;
      return [...prev, conversationId];
    });
  }, []);

  // Maximize a chat window
  const maximizeChat = useCallback((conversationId) => {
    setMinimizedChats(prev => prev.filter(id => id !== conversationId));
  }, []);

  // Start a new conversation
  const startConversation = useCallback(async (productId, dropshippedProductId, sellerInfo) => {
    if (!isAuthenticated || !token) {
      toast.error('Connectez-vous pour discuter');
      return null;
    }

    try {
      const payload = dropshippedProductId 
        ? { dropshipped_product_id: dropshippedProductId }
        : { product_id: productId };

      const response = await axios.post(`${API}/conversations/start`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newConv = {
        ...response.data,
        ...sellerInfo
      };
      
      // Add to conversations if not exists
      setConversations(prev => {
        if (prev.some(c => c.id === newConv.id)) return prev;
        return [newConv, ...prev];
      });
      
      // Open the chat
      openChat(newConv);
      
      return newConv;
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Erreur lors du démarrage de la conversation');
      return null;
    }
  }, [isAuthenticated, token, openChat]);

  // Mark conversation as read
  const markAsRead = useCallback((conversationId) => {
    setUnreadCounts(prev => ({ ...prev, [conversationId]: 0 }));
  }, []);

  // Get total unread count
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <ChatContext.Provider value={{
      conversations,
      openChats,
      minimizedChats,
      unreadCounts,
      totalUnread,
      showBubbles,
      setShowBubbles,
      openChat,
      closeChat,
      minimizeChat,
      maximizeChat,
      startConversation,
      markAsRead,
      fetchConversations,
      wsRefs,
      token,
      user
    }}>
      {children}
    </ChatContext.Provider>
  );
};

// ============== CHAT WINDOW COMPONENT ==============
const ChatWindow = ({ conversation, position, onClose, onMinimize, isMinimized }) => {
  const { token, user, markAsRead, wsRefs } = useChat();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const messagesEndRef = useRef(null);
  const nodeRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!conversation?.id || !token) return;
      
      try {
        const response = await axios.get(`${API}/conversations/${conversation.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(response.data.messages || []);
        markAsRead(conversation.id);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [conversation?.id, token, markAsRead]);

  // WebSocket connection
  useEffect(() => {
    if (!conversation?.id || !token || isMinimized) return;

    const ws = new WebSocket(`${WS_URL}/ws/chat/${conversation.id}?token=${token}`);
    wsRefs.current[conversation.id] = ws;

    ws.onopen = () => {
      setIsOnline(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          setMessages(prev => [...prev, data.message]);
          markAsRead(conversation.id);
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    ws.onclose = () => {
      setIsOnline(false);
    };

    return () => {
      ws.close();
    };
  }, [conversation?.id, token, isMinimized, markAsRead, wsRefs]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await axios.post(`${API}/messages`, {
        conversation_id: conversation.id,
        content: newMessage.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Add message locally (WebSocket will also send it)
      setMessages(prev => {
        if (prev.some(m => m.id === response.data.id)) return prev;
        return [...prev, response.data];
      });
      setNewMessage('');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const otherParticipant = conversation?.other_participant || {
    name: conversation?.other_party_name || conversation?.seller_name || 'Vendeur',
    role: 'vendor'
  };

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-0 bg-white rounded-t-lg shadow-lg cursor-pointer hover:bg-gray-50 transition-colors z-50"
        style={{ right: `${position * 250 + 90}px`, width: '220px' }}
        onClick={() => onMinimize(false)}
      >
        <div className="flex items-center gap-2 p-3 border-b">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold">
              {otherParticipant.name?.[0] || 'V'}
            </div>
            <Circle className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${isOnline ? 'text-green-500 fill-green-500' : 'text-gray-300 fill-gray-300'}`} />
          </div>
          <span className="font-medium text-sm truncate flex-1">{otherParticipant.name}</span>
          <Maximize2 className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <Draggable handle=".chat-header" nodeRef={nodeRef} bounds="parent">
      <div 
        ref={nodeRef}
        className="fixed bg-white rounded-lg shadow-2xl overflow-hidden z-50 flex flex-col"
        style={{ 
          right: `${position * 340 + 90}px`, 
          bottom: '0px',
          width: '320px',
          height: '450px'
        }}
      >
        {/* Header - Draggable */}
        <div className="chat-header bg-gradient-to-r from-orange-500 to-amber-500 text-white p-3 cursor-move flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                {otherParticipant.name?.[0] || 'V'}
              </div>
              <Circle className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${isOnline ? 'text-green-400 fill-green-400' : 'text-gray-300 fill-gray-300'}`} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{otherParticipant.name}</p>
              <p className="text-xs text-white/80">{isOnline ? 'En ligne' : 'Hors ligne'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onMinimize(true)}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product info if available */}
        {conversation?.product_name && (
          <div className="bg-gray-50 px-3 py-2 border-b flex items-center gap-2">
            {conversation?.product_image && (
              <img 
                src={conversation.product_image} 
                alt="" 
                className="w-10 h-10 rounded object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">Discussion à propos de</p>
              <p className="text-sm font-medium truncate">{conversation.product_name}</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Commencez la conversation !</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <div 
                  key={msg.id || index} 
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    isOwn 
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-md' 
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-md'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text || msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 border-t bg-white">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez un message..."
              className="flex-1 text-sm"
              disabled={sending}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!newMessage.trim() || sending}
              className="bg-orange-500 hover:bg-orange-600 flex-shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </div>
    </Draggable>
  );
};

// ============== CHAT BUBBLES COMPONENT ==============
export const ChatBubbles = () => {
  const { 
    conversations, 
    openChats, 
    minimizedChats,
    unreadCounts, 
    totalUnread,
    showBubbles,
    setShowBubbles,
    openChat,
    closeChat,
    minimizeChat,
    maximizeChat
  } = useChat();
  const { isAuthenticated } = useAuth();
  const [expanded, setExpanded] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Open Chat Windows */}
      {openChats.map((conv, index) => (
        <ChatWindow
          key={conv.id}
          conversation={conv}
          position={index}
          isMinimized={minimizedChats.includes(conv.id)}
          onClose={() => closeChat(conv.id)}
          onMinimize={(min) => min ? minimizeChat(conv.id) : maximizeChat(conv.id)}
        />
      ))}

      {/* Main Chat Bubble */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Conversations List */}
        {expanded && (
          <div className="bg-white rounded-2xl shadow-2xl w-80 max-h-96 overflow-hidden animate-slide-in-bottom mb-2">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4">
              <h3 className="font-bold">Messages</h3>
              <p className="text-sm text-white/80">{conversations.length} conversation(s)</p>
            </div>
            <div className="overflow-y-auto max-h-72">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Aucune conversation</p>
                  <p className="text-xs text-gray-400 mt-1">Contactez un vendeur pour commencer</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      openChat(conv);
                      setExpanded(false);
                    }}
                    className="w-full p-3 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b last:border-0"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold">
                        {conv.other_participant?.name?.[0] || conv.seller_name?.[0] || 'V'}
                      </div>
                      {unreadCounts[conv.id] > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {unreadCounts[conv.id]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-sm truncate">
                        {conv.other_participant?.name || conv.other_party_name || conv.seller_name || 'Vendeur'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {conv.last_message || conv.product_name || 'Nouvelle conversation'}
                      </p>
                    </div>
                    {conv.updated_at && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(conv.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
            <Link 
              to="/mes-messages" 
              className="block p-3 text-center text-orange-500 hover:bg-orange-50 font-medium text-sm border-t"
              onClick={() => setExpanded(false)}
            >
              Voir tous les messages
            </Link>
          </div>
        )}

        {/* Main Bubble Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
            expanded 
              ? 'bg-gray-600 rotate-0' 
              : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:scale-110 animate-bounce-pulse'
          }`}
        >
          {expanded ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <MessageCircle className="w-6 h-6 text-white" />
          )}
          {totalUnread > 0 && !expanded && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>
      </div>
    </>
  );
};

// ============== FLOATING CHAT WIDGET (Main Export) ==============
const FloatingChat = () => {
  return <ChatBubbles />;
};

export default FloatingChat;
