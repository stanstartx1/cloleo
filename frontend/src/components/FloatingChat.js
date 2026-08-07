import MediaImg from '../components/MediaImg';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { MessageCircle, Send, X, Mic, Paperclip, Image as ImageIcon, FileText } from "lucide-react";
import ChatMessageDeleteButton from "./ChatMessageDeleteButton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ChatContext = createContext(null);
import { API_URL, WS_URL } from '../config/api';
const API = API_URL;

export const ChatProvider = ({ children }) => {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);

  const startConversation = useCallback(async (productId, dropshippedProductId = null, metadata = {}) => {
    if (!token) return null;

    const payload = {};
    if (productId) payload.product_id = productId;
    if (dropshippedProductId) payload.dropshipped_product_id = dropshippedProductId;

    const response = await axios.post(`${API}/conversations/start`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const conversationId = response?.data?.id || response?.data?.conversationId;
    if (conversationId) {
      setIsOpen(true);
      setActiveConversationId(conversationId);
    }

    return {
      conversationId,
      productId,
      dropshippedProductId,
      metadata,
      openedAt: Date.now(),
    };
  }, [token]);

  const openConversation = useCallback((conversationId) => {
    if (!conversationId) return;
    setIsOpen(true);
    setActiveConversationId(conversationId);
  }, []);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = Array.isArray(response.data) ? response.data : (response.data?.conversations || []);
      setConversations(list);
      if (!activeConversationId && list.length > 0) {
        setActiveConversationId(list[0].id);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  }, [token, activeConversationId]);

  useEffect(() => {
    if (!isOpen) return;
    fetchConversations();
  }, [isOpen, fetchConversations]);

  const value = useMemo(
    () => ({
      isOpen,
      conversations,
      activeConversationId,
      startConversation,
      openConversation,
      openChat,
      closeChat,
      refreshConversations: fetchConversations,
    }),
    [isOpen, conversations, activeConversationId, startConversation, openConversation, openChat, closeChat, fetchConversations]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    return {
      isOpen: false,
      conversations: [],
      activeConversationId: null,
      startConversation: async () => null,
      openConversation: () => {},
      openChat: () => {},
      closeChat: () => {},
      refreshConversations: async () => {},
    };
  }
  return ctx;
};

const FloatingChat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, isAuthenticated } = useAuth();
  const { isOpen, closeChat, conversations, activeConversationId, openConversation, openChat, refreshConversations } = useChat();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const listEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const canOpenProduct =
    activeConversation?.product_id &&
    typeof activeConversation.product_id === "string" &&
    !activeConversation.product_id.startsWith("admin-chat-");

  const sellerShopPath = (() => {
    if (!activeConversation?.seller_id) return null;
    if (activeConversation.seller_type === "dropshipper") {
      const slug = activeConversation.seller_shop_slug;
      return slug ? `/boutique/${slug}` : null;
    }
    return `/vendeur-boutique/${activeConversation.seller_id}`;
  })();

  const loadMessages = useCallback(async (forceReload = false) => {
    if (!token || !activeConversationId) return;
    setLoadingMessages(true);
    try {
      const response = await axios.get(`${API}/conversations/${activeConversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newMessages = response.data?.messages || [];
      
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
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Impossible de charger les messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [token, activeConversationId]);

  useEffect(() => {
    if (!isOpen || !activeConversationId) return;
    loadMessages(true); // Force reload on open
  }, [isOpen, activeConversationId]);

  // HTTP polling for messages (WebSocket disabled due to Apache configuration)
  useEffect(() => {
    if (!isOpen || !activeConversationId) return;

    const pollingInterval = setInterval(() => {
      loadMessages(false); // Don't force reload, just merge new messages
      refreshConversations();
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(pollingInterval);
  }, [isOpen, activeConversationId, loadMessages, refreshConversations]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMessageDeleted = useCallback((messageId) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    refreshConversations();
  }, [refreshConversations]);

  // Media upload handlers
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConversationId) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API}/conversations/${activeConversationId}/upload-image`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );

      setMessages(prev => [...prev, response.data.message]);
      refreshConversations();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors de l\'envoi de l\'image');
    } finally {
      setUploadingFile(false);
      fileInputRef.current.value = '';
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConversationId) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API}/conversations/${activeConversationId}/upload-document`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );

      setMessages(prev => [...prev, response.data.message]);
      refreshConversations();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors de l\'envoi du document');
    } finally {
      setUploadingFile(false);
      documentInputRef.current.value = '';
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConversationId) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API}/conversations/${activeConversationId}/upload-audio`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );

      setMessages(prev => [...prev, response.data.message]);
      refreshConversations();
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Erreur lors de l\'envoi de l\'audio');
    } finally {
      setUploadingFile(false);
      audioInputRef.current.value = '';
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
          const response = await axios.post(
            `${API}/conversations/${activeConversationId}/upload-audio`,
            formData,
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
          );
          
          setMessages(prev => [...prev, response.data.message]);
          refreshConversations();
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

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
      audioChunksRef.current = [];
      toast.info('Enregistrement annulé');
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversationId || !token) return;
    const content = newMessage.trim();
    setNewMessage("");
    
    // Optimistic update
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      content: content,
      sender_id: user?.id,
      sender_type: 'customer',
      created_at: new Date().toISOString(),
      is_read: false
    };
    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
      await axios.post(
        `${API}/conversations/${activeConversationId}/messages`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Message will be updated via WebSocket
      refreshConversations();
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(content);
      toast.error("Erreur lors de l'envoi");
    }
  };

  // Hide floating chat button on chat pages
  const isChatPage = location.pathname === '/messages' || location.pathname.startsWith('/message');

  if (isChatPage) {
    return null; // Don't render floating chat button on chat pages
  }

  if (!isOpen) {
    if (!isAuthenticated) {
      return (
        <button
          onClick={() => toast.error("Connectez-vous pour ouvrir le chat")}
          className="fixed bottom-[5.9rem] md:bottom-4 right-3 md:right-4 z-[90] group"
          aria-label="Ouvrir la messagerie"
        >
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-fuchsia-600 via-orange-500 to-amber-500 blur opacity-70 group-hover:opacity-100 animate-pulse" />
          <span className="relative w-16 h-16 rounded-full bg-gradient-to-r from-fuchsia-600 via-orange-500 to-amber-500 shadow-2xl flex items-center justify-center overflow-visible">
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
            <MessageCircle className="w-7 h-7 text-white relative z-10" />
            <span className="absolute top-0 right-0 translate-x-1 -translate-y-1 px-1.5 py-0.5 rounded-full text-[10px] leading-none font-bold bg-slate-700 text-white border border-white shadow">
              Chat
            </span>
          </span>
        </button>
      );
    }
    return (
      <button
        onClick={openChat}
        className="fixed bottom-[5.9rem] md:bottom-4 right-3 md:right-4 z-[90] group"
        aria-label="Ouvrir la messagerie"
      >
        <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-fuchsia-600 via-orange-500 to-amber-500 blur opacity-70 group-hover:opacity-100 animate-pulse" />
        <span className="relative w-16 h-16 rounded-full bg-gradient-to-r from-fuchsia-600 via-orange-500 to-amber-500 shadow-2xl flex items-center justify-center overflow-visible">
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
          <MessageCircle className="w-7 h-7 text-white relative z-10" />
          <span className="absolute top-0 right-0 translate-x-1 -translate-y-1 px-1.5 py-0.5 rounded-full text-[10px] leading-none font-bold bg-emerald-500 text-white border border-white shadow">
            En ligne
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-[5.9rem] md:bottom-4 right-2 md:right-4 z-[90] w-[96vw] md:w-[95vw] max-w-[420px] h-[68vh] md:h-[75vh] max-h-[620px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
      <div className="h-14 bg-gradient-to-r from-fuchsia-600 via-orange-500 to-amber-500 text-white flex items-center justify-between px-4">
        <div className="flex items-center gap-2 font-semibold">
          <MessageCircle className="w-4 h-4" />
          Messagerie
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={closeChat}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="h-[calc(100%-56px)] flex">
        <div className="w-32 sm:w-40 border-r border-slate-200 overflow-y-auto bg-slate-50">
          {conversations.length === 0 ? (
            <div className="p-3 text-xs text-slate-500">Aucune conversation</div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  openConversation(conv.id);
                  loadMessages(true); // Force reload on conversation change
                }}
                className={`w-full text-left p-2 border-b border-slate-200 hover:bg-slate-100 ${conv.id === activeConversationId ? "bg-white" : ""}`}
              >
                <p className="text-xs font-semibold truncate">{conv.seller_name || "Contact"}</p>
                <p className="text-[11px] text-slate-500 truncate">{conv.product_name || "Discussion"}</p>
              </button>
            ))
          )}
        </div>

        <div className="flex-1 flex flex-col">
          <div className="h-10 px-3 border-b border-slate-200 flex items-center justify-between gap-2 min-w-0">
            {activeConversation?.seller_name && sellerShopPath ? (
              <button
                type="button"
                onClick={() => navigate(sellerShopPath)}
                className="text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-700 truncate"
                title="Voir la boutique"
              >
                {activeConversation.seller_name}
              </button>
            ) : (
              <span className="text-xs font-medium text-slate-700 truncate">
                {activeConversation?.seller_name || activeConversation?.product_name || "Choisir une conversation"}
              </span>
            )}
            {activeConversation?.product_name && (
              <span className="text-[10px] text-slate-500 truncate max-w-[45%]">
                {activeConversation.product_name}
              </span>
            )}
          </div>

          {canOpenProduct && (
            <button
              type="button"
              onClick={() => navigate(`/produit/${activeConversation.product_id}`)}
              className="px-3 py-2 border-b border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-left"
            >
              {activeConversation?.product_image ? (
                <MediaImg
                  src={activeConversation.product_image}
                  alt={activeConversation.product_name || "Produit"}
                  className="w-10 h-10 rounded object-cover border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{activeConversation.product_name || "Produit"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {activeConversation?.product_promo_price_fcfa ? (
                    <>
                      <span className="text-[11px] font-bold text-emerald-600">
                        {new Intl.NumberFormat("fr-FR").format(activeConversation.product_promo_price_fcfa)} FCFA
                      </span>
                      {activeConversation?.product_price_fcfa && (
                        <span className="text-[10px] text-slate-400 line-through">
                          {new Intl.NumberFormat("fr-FR").format(activeConversation.product_price_fcfa)} FCFA
                        </span>
                      )}
                    </>
                  ) : activeConversation?.product_price_fcfa ? (
                    <span className="text-[11px] font-bold text-slate-700">
                      {new Intl.NumberFormat("fr-FR").format(activeConversation.product_price_fcfa)} FCFA
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-fuchsia-600 mt-0.5">Voir les détails du produit</p>
              </div>
            </button>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
            {loadingMessages ? (
              <p className="text-xs text-slate-500">Chargement...</p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-slate-500">Aucun message</p>
            ) : (
              messages.map((m) => {
                const isOwn = m.sender_id === user?.id;
                const isCustomerBubble = m.sender_type === "customer";
                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-1 max-w-[85%] ${
                      isCustomerBubble ? "ml-0" : "ml-auto flex-row-reverse"
                    }`}
                  >
                    <div
                      className={`px-3 py-2 rounded-xl text-xs ${
                        isCustomerBubble ? "bg-slate-100 text-slate-800" : "bg-fuchsia-600 text-white"
                      }`}
                    >
                      {m.media_type === 'image' && (
                        <div>
                          <MediaImg 
                            src={m.file_url} 
                            alt="Image partagée" 
                            className="max-w-full rounded-lg"
                          />
                        </div>
                      )}
                      {m.media_type === 'document' && (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-blue-900 truncate">{m.file_name}</p>
                            <p className="text-[10px] text-blue-600">
                              {m.file_size ? `${(m.file_size / 1024).toFixed(1)} KB` : 'Document'}
                            </p>
                          </div>
                          <a 
                            href={m.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                          >
                            <FileText className="w-3 h-3" />
                            Télécharger
                          </a>
                        </div>
                      )}
                      {m.media_type === 'audio' && (
                        <div className="space-y-1">
                          <audio controls className="w-full">
                            <source src={m.file_url} type="audio/mpeg" />
                            Votre navigateur ne supporte pas l'audio
                          </audio>
                          {m.duration && (
                            <p className="text-[10px] text-slate-500">Durée: {formatRecordingTime(m.duration)}</p>
                          )}
                        </div>
                      )}
                      {m.content || m.text}
                    </div>
                    {isOwn && activeConversationId && (
                      <ChatMessageDeleteButton
                        token={token}
                        conversationId={activeConversationId}
                        messageId={m.id}
                        onDeleted={handleMessageDeleted}
                        className={
                          isCustomerBubble
                            ? "text-slate-400 hover:text-red-500"
                            : "text-fuchsia-200 hover:text-white"
                        }
                        disabled={String(m.id).startsWith("temp-")}
                      />
                    )}
                  </div>
                );
              })
            )}
            <div ref={listEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMediaMenu(!showMediaMenu)}
                  className="h-9 w-9 text-slate-500 hover:text-slate-700"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                {showMediaMenu && (
                  <div className="absolute bottom-10 left-0 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 min-w-[140px]">
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
                        <div className="space-y-1 px-2">
                          <div className="text-center text-xs font-medium text-fuchsia-600">
                            {formatRecordingTime(recordingTime)}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={cancelRecording}
                              className="flex-1 justify-start text-xs text-red-600"
                            >
                              Annuler
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={stopRecording}
                              className="flex-1 justify-start text-xs text-green-600"
                            >
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
              </div>
              
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Écrire un message..."
                className="h-9 text-sm flex-1"
              />
              <Button type="submit" size="icon" className="h-9 w-9 bg-fuchsia-600 hover:bg-fuchsia-700" disabled={uploadingFile}>
                {uploadingFile ? (
                  <div className="w-4 h-4 border-2 border-fuchsia-200 border-t-fuchsia-600 rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
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
          </form>
        </div>
      </div>
    </div>
  );
};

export default FloatingChat;
