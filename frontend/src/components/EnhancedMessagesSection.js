import React, { useState, useEffect } from 'react';
import { MessageSquare, Bell, Send, Clock, Check, CheckCheck, Trash2, Search, Filter, Loader2, MoreVertical } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

/**
 * EnhancedMessagesSection - Enhanced messages section with unread notifications
 * @param {Object} props - Component props
 */
const EnhancedMessagesSection = ({ token, userType }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchConversations();
  }, [token]);

  const fetchConversations = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await axios.get(`${API}/enterprises/conversations`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // setConversations(response.data.conversations || []);
      // setUnreadCount(response.data.unreadCount || 0);

      // Mock data for now
      const mockConversations = [
        { id: 1, name: 'TechCorp Solutions', avatar: 'TC', lastMessage: 'Merci pour votre offre !', lastTime: '10:30', unread: 2, type: 'vendor' },
        { id: 2, name: 'Global Logistics', avatar: 'GL', lastMessage: 'Livraison prévue demain', lastTime: '09:15', unread: 0, type: 'vendor' },
        { id: 3, name: 'Client Premium', avatar: 'CP', lastMessage: 'Puis-je avoir une remise ?', lastTime: 'Hier', unread: 5, type: 'customer' },
        { id: 4, name: 'Support Client', avatar: 'SC', lastMessage: 'Votre ticket a été résolu', lastTime: 'Hier', unread: 1, type: 'support' },
        { id: 5, name: 'Partenaire B2B', avatar: 'PB', lastMessage: 'Proposition de partenariat', lastTime: '2j', unread: 0, type: 'partner' },
      ];
      setConversations(mockConversations);
      setUnreadCount(mockConversations.reduce((sum, c) => sum + c.unread, 0));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      // TODO: Replace with actual API call
      // const response = await axios.get(`${API}/enterprises/conversations/${conversationId}/messages`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // setMessages(response.data.messages || []);

      // Mock data for now
      const mockMessages = [
        { id: 1, sender: 'them', text: 'Bonjour, je suis intéressé par vos produits', time: '10:00', read: true },
        { id: 2, sender: 'me', text: 'Bonjour ! Je suis ravi de vous entendre', time: '10:05', read: true },
        { id: 3, sender: 'them', text: 'Merci pour votre offre !', time: '10:30', read: false },
      ];
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
    // Mark as read
    setConversations(conversations.map(c => 
      c.id === conversation.id ? { ...c, unread: 0 } : c
    ));
    setUnreadCount(Math.max(0, unreadCount - conversation.unread));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      // TODO: Replace with actual API call
      // await axios.post(`${API}/enterprises/conversations/${selectedConversation.id}/messages`, {
      //   text: newMessage
      // }, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });

      const message = {
        id: Date.now(),
        sender: 'me',
        text: newMessage,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        read: true
      };
      setMessages([...messages, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || conv.type === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-amber-400" />
          Messages
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors">
          <MessageSquare className="w-4 h-4" />
          Nouvelle conversation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search & Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'vendor', 'customer', 'support'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    filter === type
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {type === 'all' ? 'Tous' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors text-left ${
                  selectedConversation?.id === conversation.id
                    ? 'bg-amber-500/20 border border-amber-500/30'
                    : 'bg-slate-800/50 hover:bg-slate-800'
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold">
                    {conversation.avatar}
                  </div>
                  {conversation.unread > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {conversation.unread}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-white truncate">{conversation.name}</p>
                    <p className="text-xs text-slate-400">{conversation.lastTime}</p>
                  </div>
                  <p className="text-sm text-slate-400 truncate">{conversation.lastMessage}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold">
                    {selectedConversation.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{selectedConversation.name}</h3>
                    <p className="text-xs text-slate-400 capitalize">{selectedConversation.type}</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Messages */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl ${
                        message.sender === 'me'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <p className="text-xs opacity-70">{message.time}</p>
                        {message.sender === 'me' && (
                          message.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Écrivez votre message..."
                  className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <MessageSquare className="w-16 h-16 text-slate-600 mb-4" />
              <p className="text-slate-400">Sélectionnez une conversation pour commencer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedMessagesSection;
