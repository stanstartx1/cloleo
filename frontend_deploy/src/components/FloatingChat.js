import React, { createContext, useContext, useMemo, useState } from "react";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [activeConversation, setActiveConversation] = useState(null);

  const startConversation = async (productId, dropshippedProductId = null, metadata = {}) => {
    setActiveConversation({
      productId,
      dropshippedProductId,
      metadata,
      openedAt: Date.now(),
    });
    return true;
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
