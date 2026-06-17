"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/Textarea";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  User,
  Clock,
  Sparkles,
  Search,
  Paperclip,
  X,
  FileText,
  Download,
  Image as ImageIcon,
  Video as VideoIcon,
  CheckCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function MessagesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeUserIdParam = searchParams.get("userId");

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // File attachment states
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Full-screen image modal state
  const [modalImageUrl, setModalImageUrl] = useState(null);

  // Mobile responsive view toggle
  const [mobileView, setMobileView] = useState("list"); // list or chat

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchConversations = async (selectUid = null) => {
    if (!user) return;
    try {
      // Fetch both inbox conversations and mutual connections list in parallel
      const [convRes, connRes] = await Promise.all([
        fetch(`/api/messages/conversations/${user.uid}`),
        fetch(`/api/connections/list/${user.uid}`),
      ]);

      let convData = [];
      let connData = [];

      if (convRes.ok) {
        convData = await convRes.json();
      }
      if (connRes.ok) {
        connData = await connRes.json();
      }

      // Merge mutual connections into the conversations list
      const mergedConversations = [...convData];

      connData.forEach((connection) => {
        const alreadyExists = mergedConversations.some(
          (c) => c.otherUser.firebaseUid === connection.firebaseUid
        );
        if (!alreadyExists) {
          mergedConversations.push({
            otherUser: {
              firebaseUid: connection.firebaseUid,
              name: connection.name,
              headline: connection.headline,
              profilePicture: connection.profilePicture,
            },
            lastMessage: null,
            isTemp: true,
          });
        }
      });

      // Sort: conversations with messages first (by createdAt desc), followed by alphabetical names for empty chats
      mergedConversations.sort((a, b) => {
        if (a.lastMessage && b.lastMessage) {
          return (
            new Date(b.lastMessage.createdAt) -
            new Date(a.lastMessage.createdAt)
          );
        }
        if (a.lastMessage) return -1;
        if (b.lastMessage) return 1;
        return a.otherUser.name.localeCompare(b.otherUser.name);
      });

      setConversations(mergedConversations);

      // Determine which conversation should be active
      const uidToSelect = selectUid || activeUserIdParam;
      if (uidToSelect) {
        const found = mergedConversations.find(
          (c) => c.otherUser.firebaseUid === uidToSelect
        );
        if (found) {
          setActiveConversation(found);
          setMobileView("chat");
        } else {
          // Fallback if not found in list (e.g. direct message initiated from profile card of non-friend)
          try {
            const userRes = await fetch(`/api/users/${uidToSelect}`);
            if (userRes.ok) {
              const partner = await userRes.json();
              const tempConv = {
                otherUser: {
                  firebaseUid: partner.firebaseUid,
                  name: partner.name,
                  headline: partner.headline,
                  profilePicture: partner.profilePicture,
                },
                lastMessage: null,
                isTemp: true,
              };
              setActiveConversation(tempConv);
              setConversations((prev) => [tempConv, ...prev]);
              setMobileView("chat");
            }
          } catch (err) {
            console.error("Error fetching partner details:", err);
          }
        }
      } else if (mergedConversations.length > 0 && !activeConversation) {
        setActiveConversation(mergedConversations[0]);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, activeUserIdParam]);

  // Fetch messages for active conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user || !activeConversation) return;
      if (activeConversation.isTemp) {
        setMessages([]);
        return;
      }

      setLoadingMessages(true);
      try {
        const response = await fetch(
          `/api/messages/thread/${user.uid}/${activeConversation.otherUser.firebaseUid}`
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error("Error fetching message thread:", error);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [user, activeConversation]);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessages]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setAttachedFile(file);

    // Create a local preview URL if it's an image
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachmentPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreviewUrl(null);
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    setAttachmentPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async () => {
    if (!attachedFile) return null;
    setUploadingAttachment(true);

    try {
      const formData = new FormData();
      formData.append("file", attachedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();
      return {
        url: data.url,
        resourceType: data.resourceType,
        fileName: data.fileName,
        fileSize: data.fileSize,
      };
    } catch (err) {
      console.error("Attachment upload error:", err);
      alert("Failed to upload file. Please try again.");
      return null;
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessageText.trim() && !attachedFile) || !user || !activeConversation) return;
    setSendingMessage(true);

    let mediaObj = null;
    if (attachedFile) {
      mediaObj = await uploadFile();
      if (!mediaObj) {
        setSendingMessage(false);
        return; // Upload failed
      }
    }

    const isTemp = activeConversation.isTemp;
    const receiverId = activeConversation.otherUser.firebaseUid;
    const content = newMessageText.trim();

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.uid,
          receiverId,
          content,
          media: mediaObj || undefined,
          initiatedFromProfile: isTemp, // initiates thread if temp
        }),
      });

      if (response.ok) {
        const savedMsg = await response.json();
        setNewMessageText("");
        removeAttachment();
        setMessages((prev) => [...prev, savedMsg]);

        // Refresh conversation list and select the conversation
        fetchConversations(receiverId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const selectConversation = (conv) => {
    setActiveConversation(conv);
    setMobileView("chat");
    router.replace(`/messages?userId=${conv.otherUser.firebaseUid}`);
  };

  const handleBackToList = () => {
    setMobileView("list");
  };

  // Filter connections/conversations dynamically in search bar
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.otherUser.headline &&
        conv.otherUser.headline.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (loadingConversations) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0a66c2] mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500 font-medium animate-pulse">
            Opening your chats...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f4f2ee] lg:py-6">
      <div className="max-w-6xl mx-auto lg:px-4 h-[calc(100vh-4rem)] lg:h-[calc(100vh-8rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-full bg-white lg:rounded-lg border-0 lg:border border-gray-200 overflow-hidden lg:shadow-sm">
          
          {/* Left Panel: Chats List */}
          <div
            className={`${
              mobileView === "chat" ? "hidden" : "block"
            } lg:block lg:col-span-4 border-r border-gray-200 h-full flex flex-col`}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-150 flex items-center justify-between bg-gray-50">
              <h2 className="font-bold text-gray-900 text-base flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-[#0a66c2]" />
                Chats
              </h2>
            </div>

            {/* Search filter input */}
            <div className="p-3 border-b border-gray-150 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search chats or connections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-gray-100 border border-transparent rounded-full text-xs placeholder-gray-400 focus:outline-none focus:bg-white focus:border-gray-250 text-black transition-all"
                />
              </div>
            </div>

            {/* Conversations list container */}
            <div className="flex-1 overflow-y-auto bg-white divider-y">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-xs italic">
                  {searchQuery
                    ? "No matching connections found."
                    : "No connections yet. Connect with professionals to start messaging!"}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive =
                    activeConversation?.otherUser.firebaseUid ===
                    conv.otherUser.firebaseUid;

                  return (
                    <button
                      key={conv.otherUser.firebaseUid}
                      onClick={() => selectConversation(conv)}
                      className={`w-full flex items-start p-3.5 text-left border-b border-gray-100 transition-colors ${
                        isActive
                          ? "bg-blue-50/70 border-l-4 border-l-[#0a66c2]"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0 border border-gray-200 relative">
                        {conv.otherUser.profilePicture ? (
                          <img
                            src={conv.otherUser.profilePicture}
                            alt={conv.otherUser.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                            {getInitials(conv.otherUser.name)}
                          </div>
                        )}
                      </div>

                      {/* Info details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="text-xs font-bold text-gray-900 truncate">
                            {conv.otherUser.name}
                          </h4>
                          {conv.lastMessage && (
                            <span className="text-[10px] text-gray-400">
                              {formatDistanceToNow(new Date(conv.lastMessage.createdAt), {
                                addSuffix: false,
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 truncate mb-1 leading-snug">
                          {conv.otherUser.headline || "Professional"}
                        </p>
                        <p className="text-[11px] text-gray-600 truncate italic">
                          {conv.lastMessage
                            ? conv.lastMessage.media
                              ? `📎 [Attachment: ${conv.lastMessage.media.fileName}]`
                              : conv.lastMessage.content
                            : "Click to start conversation"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Conversation Workspace */}
          <div
            className={`${
              mobileView === "list" ? "hidden" : "block"
            } lg:block lg:col-span-8 h-full flex flex-col bg-gray-50`}
          >
            {activeConversation ? (
              <div className="h-full flex flex-col">
                {/* Active Chat Header */}
                <div className="px-6 py-3 border-b border-gray-200 flex items-center bg-white">
                  <button
                    onClick={handleBackToList}
                    className="mr-3 p-1.5 rounded-full hover:bg-gray-150 transition-colors text-gray-650 lg:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <Link
                    href={`/profile/${activeConversation.otherUser.firebaseUid}`}
                    className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 mr-3 flex-shrink-0"
                  >
                    {activeConversation.otherUser.profilePicture ? (
                      <img
                        src={activeConversation.otherUser.profilePicture}
                        alt={activeConversation.otherUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                        {getInitials(activeConversation.otherUser.name)}
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0">
                    <Link
                      href={`/profile/${activeConversation.otherUser.firebaseUid}`}
                      className="hover:underline font-bold text-gray-950 text-sm block truncate leading-snug"
                    >
                      {activeConversation.otherUser.name}
                    </Link>
                    <span className="text-[10px] text-gray-500 truncate block leading-none">
                      {activeConversation.otherUser.headline || "Professional"}
                    </span>
                  </div>
                </div>

                {/* Message Threads Stream */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 relative shadow-inner">

                  {loadingMessages ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0a66c2]"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center max-w-xs mx-auto relative z-10">
                      <div className="w-12 h-12 bg-blue-50 text-[#0a66c2] rounded-full flex items-center justify-center mb-3">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <h4 className="font-bold text-gray-800 text-sm mb-1">
                        Start the Conversation
                      </h4>
                      <p className="text-xs text-gray-550 leading-relaxed">
                        Send a friendly hello or share an update. Your connection will see it instantly!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user.uid;

                      return (
                        <div
                          key={msg._id}
                          className={`flex relative z-10 ${
                            isMe ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                              isMe
                                ? "bg-blue-50 text-gray-900 border border-blue-100 rounded-tr-sm"
                                : "bg-white text-gray-900 border border-gray-200 rounded-tl-sm"
                            }`}
                          >
                            {/* Inline Media Rendering */}
                            {msg.media && msg.media.url && (
                              <div className="mb-2 rounded overflow-hidden max-w-full">
                                {msg.media.resourceType === "image" && (
                                  <img
                                    src={msg.media.url}
                                    alt={msg.media.fileName || "Uploaded Image"}
                                    onClick={() => setModalImageUrl(msg.media.url)}
                                    className="max-h-60 object-contain rounded cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
                                  />
                                )}
                                {msg.media.resourceType === "video" && (
                                  <video
                                    src={msg.media.url}
                                    controls
                                    className="max-h-60 w-full object-contain rounded"
                                  />
                                )}
                                {msg.media.resourceType !== "image" &&
                                  msg.media.resourceType !== "video" && (
                                    <div className="flex items-center bg-black/5 p-2 rounded border border-black/10 gap-2 min-w-[180px]">
                                      <FileText className="h-8 w-8 text-[#0a66c2] flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-gray-900 truncate">
                                          {msg.media.fileName}
                                        </p>
                                        <p className="text-[10px] text-gray-500">
                                          {formatFileSize(msg.media.fileSize)}
                                        </p>
                                      </div>
                                      <a
                                        href={msg.media.url}
                                        download={msg.media.fileName}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 hover:bg-black/10 rounded transition-colors text-gray-600"
                                      >
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </div>
                                  )}
                              </div>
                            )}

                            {/* Message Content */}
                            {msg.content && (
                              <p className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                                {msg.content}
                              </p>
                            )}

                            {/* Time */}
                            <div className="text-[9px] mt-1 text-right text-gray-400 leading-none">
                              {formatDistanceToNow(new Date(msg.createdAt), {
                                addSuffix: true,
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Pre-send file preview container */}
                {attachedFile && (
                  <div className="px-6 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between animate-in slide-in-from-bottom duration-150">
                    <div className="flex items-center gap-3 min-w-0">
                      {attachmentPreviewUrl ? (
                        <div className="w-10 h-10 rounded overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                          <img
                            src={attachmentPreviewUrl}
                            alt="Attachment preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded border border-gray-200 bg-white flex items-center justify-center text-gray-400 flex-shrink-0">
                          {attachedFile.type.startsWith("video/") ? (
                            <VideoIcon className="h-5 w-5 text-indigo-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-[#0a66c2]" />
                          )}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {attachedFile.name}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {formatFileSize(attachedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeAttachment}
                      className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Chat Footer Input Area */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex items-end gap-2.5">
                    {/* File Attachment paperclip button */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sendingMessage || uploadingAttachment}
                      className="h-10 w-10 p-0 rounded-full hover:bg-gray-100 flex items-[#efeae2] items-center justify-center flex-shrink-0 text-gray-550"
                      title="Attach Image/Video/Document"
                    >
                      <Paperclip className="h-5 w-5 text-gray-500" />
                    </Button>

                    <Textarea
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder={
                        attachedFile ? "Add a caption..." : "Type a message..."
                      }
                      rows={1}
                      disabled={sendingMessage || uploadingAttachment}
                      className="w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg resize-none text-black placeholder-gray-400 text-xs py-2 h-10 max-h-12"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={
                        (uploadingAttachment || sendingMessage) ||
                        (!newMessageText.trim() && !attachedFile)
                      }
                      className="bg-[#0a66c2] hover:bg-[#004182] text-white rounded-full h-10 w-10 p-0 flex items-center justify-center flex-shrink-0 shadow shadow-blue-500/10 active:scale-95 transition-transform"
                    >
                      {uploadingAttachment || sendingMessage ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto p-6">
                <div className="w-14 h-14 bg-blue-50 text-[#0a66c2] rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Your Inbox</h3>
                <p className="text-xs text-gray-550 leading-relaxed">
                  Select a chat connection from the left sidebar or initiate a message directly from a professional&apos;s profile to begin.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Image Modal Viewer */}
      {modalImageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 animate-in fade-in duration-200"
          onClick={() => setModalImageUrl(null)}
        >
          <button
            onClick={() => setModalImageUrl(null)}
            className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-all cursor-pointer z-50"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={modalImageUrl}
            alt="Expanded view"
            className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
