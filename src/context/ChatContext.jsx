import React, { createContext, useContext, useState } from "react";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [showChatModal, setShowChatModal] = useState(false);

  const openChat = () => {
    setShowChatModal(true);
  };

  const closeChat = () => {
    setShowChatModal(false);
  };

  return (
    <ChatContext.Provider value={{ showChatModal, openChat, closeChat }}>
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

