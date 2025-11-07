import React, { createContext, useContext, useState } from "react";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [showChatModal, setShowChatModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState(null);

  const openChat = (userId = null) => {
    setTargetUserId(userId);
    setShowChatModal(true);
  };

  const closeChat = () => {
    setShowChatModal(false);
    setTargetUserId(null);
  };

  return (
    <ChatContext.Provider value={{ showChatModal, openChat, closeChat, targetUserId }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}

