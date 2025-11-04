import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BookingProvider } from "./context/BookingContext.jsx";
import { WalletProvider } from "./context/WalletContext.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
import { PointsProvider } from "./context/PointsContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChatProvider>
      <PointsProvider>
        <WalletProvider>
          <BookingProvider>
            <App />
          </BookingProvider>
        </WalletProvider>
      </PointsProvider>
    </ChatProvider>
  </React.StrictMode>
);
