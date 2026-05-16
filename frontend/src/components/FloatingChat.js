import React, { createContext, useContext, useMemo, useState } from "react";
import axios from "axios";

const ChatContext = createContext(null);
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BACKEND_URL}/api`;

export const ChatProvider = ({ children }) => {
  const [activeConversation, setActiveConversation] = useState(null);

  const startConversation = async (productId, dropshippedProductId = null, metadata = {}) => {
    const token = localStorage.getItem("cloleo_token");
    if (!token) return null;

    const payload = {};
    if (productId) payload.product_id = productId;
    if (dropshippedProductId) payload.dropshipped_product_id = dropshippedProductId;

    const response = await axios.post(`${API}/conversations/start`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const conversationId = response?.data?.id;
    const convo = {
      conversationId,
      productId,
      dropshippedProductId,
      metadata,
      openedAt: Date.now(),
    };
    setActiveConversation(convo);
    return convo;
  };

  const value = useMemo(
    () => ({
      activeConversation,
      startConversation,
    }),
    [activeConversation]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    return {
      activeConversation: null,
      startConversation: async () => false,
    };
  }
  return ctx;
};

const FloatingChat = () => null;

export default FloatingChat;
