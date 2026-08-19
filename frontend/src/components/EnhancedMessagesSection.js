import React, { useState, useEffect } from 'react';
import { MessageSquare, Bell, Send, Clock, Check, CheckCheck, Trash2, Search, Filter, Loader2, MoreVertical } from 'lucide-react';
import axios from 'axios';

import { API_URL } from '../config/api';

const API = API_URL;

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

  useEffect(() => {
    fetchConversations();
  }, [token]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data.conversations || []);
      setUnreadCount(response.data.conversations?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(`${API}/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
    // Mark as read locally
    setConversations(conversations.map(c =>
      c.id === conversation.id ? { ...c, unread_count: 0 } : c
    ));
    setUnreadCount(Math.max(0, unreadCount - (conversation.unread_count || 0)));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await axios.post(`${API}/conversations/${selectedConversation.id}/messages`, {
        text: newMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh messages after sending
      fetchMessages(selectedConversation.id);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const name = conv.other_party_name || conv.customer_name || conv.seller_name || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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
          {/* Search */}
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

          {/* Conversations */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredConversations.map((conversation) => {
              const name = conversation.other_party_name || conversation.customer_name || conversation.seller_name || 'Inconnu';
              const avatar = conversation.seller_avatar || conversation.customer_avatar || null;
              const lastMessage = conversation.last_message || 'Aucun message';
              const lastTime = conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
              const unread = conversation.unread_count || 0;

              return (
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
                    {avatar ? (
                      <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {unread}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-white truncate">{name}</p>
                      <p className="text-xs text-slate-400">{lastTime}</p>
                    </div>
                    <p className="text-sm text-slate-400 truncate">{lastMessage}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages Area */}
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  {selectedConversation.seller_avatar || selectedConversation.customer_avatar ? (
                    <img
                      src={selectedConversation.seller_avatar || selectedConversation.customer_avatar}
                      alt={selectedConversation.other_party_name || selectedConversation.customer_name || selectedConversation.seller_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold">
                      {(selectedConversation.other_party_name || selectedConversation.customer_name || selectedConversation.seller_name || 'I').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-white">
                      {selectedConversation.other_party_name || selectedConversation.customer_name || selectedConversation.seller_name || 'Inconnu'}
                    </h3>
                    <p className="text-xs text-slate-400 capitalize">
                      {selectedConversation.other_participant?.role || selectedConversation.seller_type || 'Utilisateur'}
                    </p>
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
                    className={`flex ${message.sender_id === selectedConversation.customer_id ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl ${
                        message.sender_id !== selectedConversation.customer_id
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <p className="text-xs opacity-70">
                          {message.created_at ? new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
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
