import { useState, useEffect } from "react";
import { MessageCircleMore, X, Search, ArrowLeft } from "lucide-react";
import { auth, db } from "../../firebase";
import "../cssFile/chat.css";
import {
    collection,
    query,
    where,
    addDoc,
    getDocs,
    orderBy,
    onSnapshot,
    doc,
    setDoc,
    serverTimestamp,
    getDoc,
} from "firebase/firestore";
import { useChat } from "../../context/ChatContext";

export default function ChatModal() {
    const { showChatModal, closeChat } = useChat();
    const [currentUser, setCurrentUser] = useState(null);
    const [chatList, setChatList] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [messageUnsub, setMessageUnsub] = useState(null);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
            if (user && showChatModal) {
                loadUserChats();
            }
        });
        return unsub;
    }, [showChatModal]);

    useEffect(() => {
        if (activeChat && currentUser) {
            // Cleanup previous subscription
            if (messageUnsub) {
                messageUnsub();
            }

            const q = query(
                collection(db, "chats", activeChat.id, "messages"),
                orderBy("createdAt", "asc")
            );
            const unsub = onSnapshot(q, (snapshot) => {
                setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
            });
            setMessageUnsub(() => unsub);
        }

        return () => {
            if (messageUnsub) {
                messageUnsub();
            }
        };
    }, [activeChat, currentUser]);

    const loadUserChats = async () => {
        if (!currentUser) return;
        try {
            setLoading(true);
            const q = query(
                collection(db, "chats"),
                where("members", "array-contains", currentUser.uid)
            );
            const snap = await getDocs(q);
            const chats = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setChatList(chats);
        } catch (error) {
            console.error("Error loading chats:", error);
        } finally {
            setLoading(false);
        }
    };

    const openChatRoom = async (chat) => {
        setActiveChat(chat);
        await loadChatUserNames(chat);
    };

    const loadChatUserNames = async (chat) => {
        // Load user names for display
        const otherMemberId = chat.members.find((m) => m !== currentUser.uid);
        if (otherMemberId) {
            try {
                const userDoc = await getDoc(doc(db, "users", otherMemberId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setActiveChat({
                        ...chat,
                        otherUserName: `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userData.email || "Unknown User",
                    });
                }
            } catch (error) {
                console.error("Error loading user name:", error);
            }
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !activeChat || !currentUser) return;

        try {
            await addDoc(collection(db, "chats", activeChat.id, "messages"), {
                from: currentUser.uid,
                text: newMessage.trim(),
                createdAt: serverTimestamp(),
            });

            await setDoc(
                doc(db, "chats", activeChat.id),
                {
                    lastMessage: newMessage.trim(),
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            setNewMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message. Please try again.");
        }
    };

    const handleSearchUsers = async () => {
        if (!searchQuery.trim() || !currentUser) return;

        try {
            setLoading(true);
            const q = query(
                collection(db, "users"),
                where("email", ">=", searchQuery.trim()),
                where("email", "<=", searchQuery.trim() + "\uf8ff")
            );
            const snap = await getDocs(q);
            const results = snap.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((u) => u.id !== currentUser.uid);
            setSearchResults(results);
        } catch (error) {
            console.error("Error searching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const startNewChat = async (otherUser) => {
        if (!otherUser || !currentUser) return;

        try {
            setLoading(true);
            const chatsRef = collection(db, "chats");
            const q = query(chatsRef, where("members", "array-contains", currentUser.uid));
            const snap = await getDocs(q);

            let existing = snap.docs.find((d) => {
                const data = d.data();
                return data.members.includes(otherUser.id) && data.members.length === 2;
            });

            if (existing) {
                const chatData = { id: existing.id, ...existing.data() };
                await openChatRoom(chatData);
            } else {
                const newChatRef = await addDoc(chatsRef, {
                    members: [currentUser.uid, otherUser.id],
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });

                const userData = otherUser;
                const chatData = {
                    id: newChatRef.id,
                    members: [currentUser.uid, otherUser.id],
                    otherUserName: `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userData.email || "Unknown User",
                };
                setActiveChat(chatData);
                await loadUserChats();
            }

            setSearchResults([]);
            setSearchQuery("");
        } catch (error) {
            console.error("Error starting new chat:", error);
            alert("Failed to start chat. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (messageUnsub) {
            messageUnsub();
            setMessageUnsub(null);
        }
        setActiveChat(null);
        setMessages([]);
        setNewMessage("");
        setSearchResults([]);
        setSearchQuery("");
        closeChat();
    };

    if (!showChatModal) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal chat-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={handleClose}>
                    <X size={20} />
                </button>

                <div className="chat-modal-content">
                    {/* Chat Header */}
                    <div className="chat-header">
                        <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>
                            {activeChat ? "Chat" : "Messages"}
                        </h3>
                        {activeChat && (
                            <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
                                {activeChat.otherUserName || "Chat"}
                            </div>
                        )}
                    </div>

                    {/* Active Chat View */}
                    {activeChat ? (
                        <div className="chat-room-container">
                            <button
                                className="back-btn"
                                onClick={() => {
                                    setActiveChat(null);
                                    setMessages([]);
                                    if (messageUnsub) {
                                        messageUnsub();
                                        setMessageUnsub(null);
                                    }
                                }}
                                style={{
                                    padding: "8px 16px",
                                    background: "rgba(255,255,255,0.1)",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    borderRadius: "8px",
                                    color: "var(--text)",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    marginBottom: "16px"
                                }}
                            >
                                <ArrowLeft size={16} />
                                Back to Chats
                            </button>

                            {/* Messages Container */}
                            <div className="messages-container">
                                {loading && messages.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
                                        Loading messages...
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
                                        No messages yet. Start the conversation!
                                    </div>
                                ) : (
                                    messages.map((msg, i) => {
                                        const isOwn = msg.from === currentUser.uid;
                                        return (
                                            <div
                                                key={msg.id || i}
                                                className={`message ${isOwn ? "own" : "other"}`}
                                                style={{
                                                    alignSelf: isOwn ? "flex-end" : "flex-start",
                                                    maxWidth: "70%",
                                                    padding: "10px 14px",
                                                    borderRadius: "12px",
                                                    marginBottom: "8px",
                                                    background: isOwn
                                                        ? "var(--primary-gradient)"
                                                        : "rgba(255,255,255,0.1)",
                                                    color: isOwn ? "#fff" : "var(--text)",
                                                    wordWrap: "break-word"
                                                }}
                                            >
                                                {msg.text}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Message Input */}
                            <div className="chat-input-area">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    placeholder="Type a message..."
                                    style={{
                                        flex: 1,
                                        padding: "12px 16px",
                                        background: "rgba(255,255,255,0.05)",
                                        border: "1px solid rgba(255,255,255,0.15)",
                                        borderRadius: "12px",
                                        color: "var(--text)",
                                        fontSize: "14px"
                                    }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!newMessage.trim()}
                                    style={{
                                        padding: "12px 24px",
                                        background: newMessage.trim() ? "var(--primary-gradient)" : "rgba(255,255,255,0.1)",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "12px",
                                        cursor: newMessage.trim() ? "pointer" : "not-allowed",
                                        fontWeight: "600",
                                        marginLeft: "8px",
                                        opacity: newMessage.trim() ? 1 : 0.5
                                    }}
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* User Search */}
                            <div className="chat-search">
                                <div className="search-bar">
                                    <Search size={18} color="rgba(255,255,255,0.5)" />
                                    <input
                                        type="text"
                                        placeholder="Search users by email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSearchUsers()}
                                        style={{
                                            flex: 1,
                                            padding: "10px 12px",
                                            background: "rgba(255,255,255,0.05)",
                                            border: "1px solid rgba(255,255,255,0.15)",
                                            borderRadius: "8px",
                                            color: "var(--text)",
                                            fontSize: "14px"
                                        }}
                                    />
                                    <button
                                        onClick={handleSearchUsers}
                                        style={{
                                            padding: "10px 20px",
                                            background: "var(--primary-gradient)",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "8px",
                                            cursor: "pointer",
                                            fontWeight: "600"
                                        }}
                                    >
                                        Search
                                    </button>
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="search-results">
                                        {searchResults.map((user) => (
                                            <div
                                                key={user.id}
                                                className="user-result"
                                                onClick={() => startNewChat(user)}
                                                style={{
                                                    padding: "12px 16px",
                                                    background: "rgba(255,255,255,0.05)",
                                                    borderRadius: "8px",
                                                    cursor: "pointer",
                                                    marginTop: "8px",
                                                    border: "1px solid rgba(255,255,255,0.1)",
                                                    transition: "all 0.2s"
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                                }}
                                            >
                                                <div style={{ fontWeight: "600", color: "var(--text)" }}>
                                                    {user.email}
                                                </div>
                                                {(user.firstName || user.lastName) && (
                                                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                                                        {user.firstName} {user.lastName}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Chat List */}
                            <div className="chat-list">
                                {loading && chatList.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
                                        Loading chats...
                                    </div>
                                ) : chatList.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
                                        <MessageCircleMore size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
                                        <p>No chats yet</p>
                                        <p style={{ fontSize: "14px", marginTop: "8px" }}>Search for users to start a conversation</p>
                                    </div>
                                ) : (
                                    chatList.map((chat) => {
                                        const otherMemberId = chat.members.find((m) => m !== currentUser.uid);
                                        return (
                                            <div
                                                key={chat.id}
                                                className="chat-item"
                                                onClick={() => openChatRoom(chat)}
                                                style={{
                                                    padding: "16px",
                                                    background: "rgba(255,255,255,0.05)",
                                                    borderRadius: "12px",
                                                    cursor: "pointer",
                                                    marginBottom: "12px",
                                                    border: "1px solid rgba(255,255,255,0.1)",
                                                    transition: "all 0.2s"
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                                }}
                                            >
                                                <div style={{ fontWeight: "600", color: "var(--text)", marginBottom: "4px" }}>
                                                    Chat with User
                                                </div>
                                                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>
                                                    {chat.lastMessage || "No messages yet"}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

