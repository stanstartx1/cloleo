import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { MessageCircle, Send, X } from "lucide-react";
import ChatMessageDeleteButton from "./ChatMessageDeleteButton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ChatContext = createContext(null);
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BACKEND_URL}/api`;

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
  const { user, token, isAuthenticated } = useAuth();
  const { isOpen, closeChat, conversations, activeConversationId, openConversation, openChat, refreshConversations } = useChat();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const listEndRef = useRef(null);

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

  const loadMessages = useCallback(async () => {
    if (!token || !activeConversationId) return;
    setLoadingMessages(true);
    try {
      const response = await axios.get(`${API}/conversations/${activeConversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data?.messages || []);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Impossible de charger les messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [token, activeConversationId]);

  useEffect(() => {
    if (!isOpen || !activeConversationId) return;
    loadMessages();
  }, [isOpen, activeConversationId, loadMessages]);

  useEffect(() => {
    if (!isOpen || !activeConversationId) return;
    const timer = setInterval(() => {
      loadMessages();
      refreshConversations();
    }, 5000);
    return () => clearInterval(timer);
  }, [isOpen, activeConversationId, loadMessages, refreshConversations]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMessageDeleted = useCallback((messageId) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    refreshConversations();
  }, [refreshConversations]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversationId || !token) return;
    const content = newMessage.trim();
    setNewMessage("");
    try {
      await axios.post(
        `${API}/conversations/${activeConversationId}/messages`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadMessages();
      await refreshConversations();
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    }
  };

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
                onClick={() => openConversation(conv.id)}
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
                <img
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

          <form onSubmit={handleSend} className="p-2 border-t border-slate-200 flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              className="h-9 text-sm"
            />
            <Button type="submit" size="icon" className="h-9 w-9 bg-fuchsia-600 hover:bg-fuchsia-700">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FloatingChat;
