"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  UserMinus,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Search,
  Mail,
  User,
  ExternalLink,
  Check,
  X,
  Clock,
  Plus,
} from "lucide-react";

export default function NetworkPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState([]);

  const [invitations, setInvitations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [requestingIds, setRequestingIds] = useState(new Set());


  const fetchNetworkData = async () => {
    if (!user) return;
    try {
      const [connRes, invRes] = await Promise.all([
        fetch(`/api/connections/list/${user.uid}`),
        fetch(`/api/connections/pending/${user.uid}`),
      ]);

      let connData = [];
      let invData = [];

      if (connRes.ok) {
        connData = await connRes.json();
      }

      if (invRes.ok) {
        invData = await invRes.json();
      }

      setConnections(connData);

      setInvitations(invData);
    } catch (error) {
      console.error("Error fetching network data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNetworkData();
    }
  }, [user]);



  const handleAcceptInvitation = async (senderId) => {
    if (requestingIds.has(senderId)) return;
    setRequestingIds((prev) => {
      const next = new Set(prev);
      next.add(senderId);
      return next;
    });

    try {
      const response = await fetch("/api/connections/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId, receiverId: user.uid }),
      });

      if (response.ok) {
        fetchNetworkData();
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
    } finally {
      setRequestingIds((prev) => {
        const next = new Set(prev);
        next.delete(senderId);
        return next;
      });
    }
  };

  const handleIgnoreInvitation = async (senderId) => {
    if (requestingIds.has(senderId)) return;
    setRequestingIds((prev) => {
      const next = new Set(prev);
      next.add(senderId);
      return next;
    });

    try {
      const response = await fetch("/api/connections/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId, receiverId: user.uid }),
      });

      if (response.ok) {
        fetchNetworkData();
      }
    } catch (error) {
      console.error("Error ignoring invitation:", error);
    } finally {
      setRequestingIds((prev) => {
        const next = new Set(prev);
        next.delete(senderId);
        return next;
      });
    }
  };

  const handleRemoveConnection = async (targetUid) => {
    if (!window.confirm("Are you sure you want to remove this connection?")) return;
    try {
      const response = await fetch("/api/connections/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: user.uid, receiverId: targetUid }),
      });
      if (response.ok) {
        fetchNetworkData();
      }
    } catch (error) {
      console.error("Error removing connection:", error);
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

  const filteredConnections = connections.filter(
    (conn) =>
      conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conn.headline && conn.headline.toLowerCase().includes(searchQuery.toLowerCase()))
  );



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600 font-medium animate-pulse">
            Loading your professional network...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f2ee] py-8 pb-24 lg:pb-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb Header */}
        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">My Network</span>
        </div>

        {/* Dashboard Header Banner */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-700" />
                My Network
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your professional connections and expand your network.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 font-medium">
                <strong>{connections.length}</strong> Connection{connections.length !== 1 && "s"}
              </span>
            </div>
          </div>
        </div>

        {/* Pending Invitations Section (If any) */}
        {invitations.length > 0 && (
          <Card className="border border-gray-200 shadow-sm mb-6 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center">
                <Mail className="h-4 w-4 mr-2 text-blue-600" />
                Pending Invitations ({invitations.length})
              </h3>
            </div>
            <CardContent className="p-0 divide-y divide-gray-100">
              {invitations.map((inv) => {
                const isProcessing = requestingIds.has(inv.firebaseUid);
                return (
                  <div key={inv.firebaseUid} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/profile/${inv.firebaseUid}`}
                        className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 hover:scale-105 transition-transform"
                      >
                        {inv.profilePicture ? (
                          <img src={inv.profilePicture} alt={inv.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                            {getInitials(inv.name)}
                          </div>
                        )}
                      </Link>
                      <div>
                        <Link href={`/profile/${inv.firebaseUid}`} className="font-bold text-gray-900 hover:underline hover:text-blue-600 text-sm">
                          {inv.name}
                        </Link>
                        <p className="text-xs text-gray-500 line-clamp-1">{inv.headline || "Professional"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 self-end sm:self-center">
                      <Button
                        onClick={() => handleIgnoreInvitation(inv.firebaseUid)}
                        disabled={isProcessing}
                        variant="outline"
                        className="text-xs py-1.5 px-4 rounded-full border-gray-300 text-gray-600 hover:bg-gray-100 shadow-none font-semibold"
                      >
                        Ignore
                      </Button>
                      <Button
                        onClick={() => handleAcceptInvitation(inv.firebaseUid)}
                        disabled={isProcessing}
                        className="text-xs py-1.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Connections vs Suggestions Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Connections Filter */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border border-gray-200 shadow-sm bg-white">
              <CardContent className="p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-4">Filter Connections</h3>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search connected friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-black transition-all"
                  />
                </div>

                <div className="mt-4 border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-xs text-gray-500 py-1">
                    <span>Connected Contacts</span>
                    <span className="font-semibold text-gray-800">
                      {filteredConnections.length} of {connections.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Connections List & Suggestions */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. Connections Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Connected Contacts
              </h2>

              {connections.length === 0 ? (
                <Card className="border border-gray-200 shadow-sm py-12 bg-white">
                  <CardContent className="text-center max-w-md mx-auto">
                    <div className="w-14 h-14 bg-blue-50 text-[#0a66c2] rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Grow your professional circle</h3>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                      You are not connected to anyone yet. Send requests to suggestions below to grow your network!
                    </p>
                  </CardContent>
                </Card>
              ) : filteredConnections.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <p className="text-gray-500 text-xs">No matching connections found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredConnections.map((friend) => (
                    <Card
                      key={friend.firebaseUid}
                      className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col justify-between bg-white"
                    >
                      <CardContent className="p-4 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <Link
                              href={`/profile/${friend.firebaseUid}`}
                              className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 hover:scale-105 transition-transform"
                            >
                              {friend.profilePicture ? (
                                <img src={friend.profilePicture} alt={friend.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                                  {getInitials(friend.name)}
                                </div>
                              )}
                            </Link>
                            <div className="min-w-0">
                              <Link href={`/profile/${friend.firebaseUid}`} className="hover:underline flex items-center gap-1">
                                <h3 className="font-bold text-gray-950 text-xs leading-snug truncate">
                                  {friend.name}
                                </h3>
                                <ExternalLink className="h-3 w-3 text-gray-400" />
                              </Link>
                              <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                {friend.headline || "Professional"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Message / Remove Actions */}
                        <div className="flex items-center space-x-2 border-t border-gray-150 pt-2.5 mt-auto">
                          <Link href={`/messages?userId=${friend.firebaseUid}`} className="flex-1">
                            <Button className="w-full bg-white text-[#0a66c2] border border-[#0a66c2] hover:bg-[#f0f7fe] hover:text-[#004182] font-semibold text-xs py-1.5 flex items-center justify-center rounded-full transition-colors shadow-none">
                              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                              Message
                            </Button>
                          </Link>
                          <button
                            onClick={() => handleRemoveConnection(friend.firebaseUid)}
                            className="p-1.5 border border-gray-250 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-full transition-all shadow-none flex items-center justify-center active:scale-95"
                            title="Remove Connection"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}
