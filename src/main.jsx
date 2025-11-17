import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BookingProvider } from "./context/BookingContext.jsx";
import { WalletProvider } from "./context/WalletContext.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
import { PointsProvider } from "./context/PointsContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import "leaflet/dist/leaflet.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChatProvider>
      <PointsProvider>
        <WalletProvider>
          <BookingProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </BookingProvider>
        </WalletProvider>
      </PointsProvider>
    </ChatProvider>
  </React.StrictMode>
);
