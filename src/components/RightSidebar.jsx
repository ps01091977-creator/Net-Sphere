"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "./Card";
import { Button } from "./Button";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  Info,
  Plus,
  TrendingUp,
  Briefcase,
  Calendar,
  Users,
  ArrowRight,
  BookOpen,
  Award,
  Target,
  Check,
  X,
  UserPlus,
} from "lucide-react";

export function RightSidebar() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  const fetchPendingRequests = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/connections/pending/${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/connections/suggestions/${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.slice(0, 3)); // show top 3 suggestions
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPendingRequests();
      fetchSuggestions();
    }
  }, [user]);

  const handleAcceptRequest = async (senderId) => {
    try {
      const response = await fetch("/api/connections/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId, receiverId: user.uid }),
      });
      if (response.ok) {
        // Refresh list
        fetchPendingRequests();
      }
    } catch (error) {
      console.error("Error accepting connection request:", error);
    }
  };

  const handleIgnoreRequest = async (senderId) => {
    try {
      const response = await fetch("/api/connections/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId, receiverId: user.uid }),
      });
      if (response.ok) {
        // Refresh list
        fetchPendingRequests();
      }
    } catch (error) {
      console.error("Error ignoring connection request:", error);
    }
  };

  const handleConnect = async (targetUid) => {
    try {
      const response = await fetch("/api/connections/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: user.uid, receiverId: targetUid }),
      });
      if (response.ok) {
        // Update local suggestion status to pending
        setSuggestions((prev) =>
          prev.map((s) =>
            s.firebaseUid === targetUid ? { ...s, status: "pending" } : s
          )
        );
      }
    } catch (error) {
      console.error("Error connecting with user:", error);
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

  return (
    <div className="space-y-4">
      {/* Connection Requests - Replacing LinkedIn News */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
            <h4 className="font-semibold text-gray-900 flex items-center text-sm">
              <Users className="h-4 w-4 mr-2 text-blue-600 animate-pulse" />
              Connection Requests
            </h4>
            {pendingRequests.length > 0 && (
              <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </div>

          {loadingRequests ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-xs text-gray-500 italic">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((sender) => (
                <div
                  key={sender.firebaseUid}
                  className="flex items-start justify-between p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all duration-200"
                >
                  <Link href={`/profile/${sender.firebaseUid}`} className="flex items-start flex-1 min-w-0 mr-2">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-2.5 flex-shrink-0 border border-gray-200">
                      {sender.profilePicture ? (
                        <img
                          src={sender.profilePicture}
                          alt={sender.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
                          {getInitials(sender.name)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-semibold text-gray-900 truncate hover:text-blue-600">
                        {sender.name}
                      </h5>
                      <p className="text-[10px] text-gray-500 truncate">
                        {sender.headline || "Professional"}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <button
                      onClick={() => handleAcceptRequest(sender.firebaseUid)}
                      className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all duration-150"
                      title="Accept Request"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleIgnoreRequest(sender.firebaseUid)}
                      className="p-1.5 bg-gray-50 text-gray-500 rounded-full hover:bg-red-50 hover:text-red-500 transition-all duration-150"
                      title="Ignore"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link href="/network">
            <Button
              variant="ghost"
              className="w-full mt-3 text-xs text-gray-600 justify-center hover:bg-gray-50 py-1.5"
            >
              Manage network
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* People you may know */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <h4 className="font-semibold text-gray-900 mb-4 text-sm flex items-center">
            <UserPlus className="h-4 w-4 mr-2 text-indigo-600" />
            People you may know
          </h4>

          {loadingSuggestions ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-xs text-gray-500 italic">No new suggestions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((person) => (
                <div key={person.firebaseUid} className="flex items-start">
                  <Link href={`/profile/${person.firebaseUid}`} className="w-10 h-10 rounded-full overflow-hidden mr-2.5 flex-shrink-0 border border-gray-200">
                    {person.profilePicture ? (
                      <img
                        src={person.profilePicture}
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                        {getInitials(person.name)}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${person.firebaseUid}`}>
                      <h5 className="text-xs font-semibold text-gray-900 truncate hover:text-blue-600">
                        {person.name}
                      </h5>
                    </Link>
                    <p className="text-[10px] text-gray-500 truncate mb-1.5">
                      {person.headline || "Professional"}
                    </p>
                    {person.status === "pending" ? (
                      <Button
                        disabled
                        className="w-full text-[11px] py-1 bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed flex items-center justify-center font-medium"
                      >
                        Pending
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConnect(person.firebaseUid)}
                        className="w-full text-[11px] py-1 border-gray-200 hover:border-blue-600 hover:text-blue-600"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link href="/add-connection">
            <Button
              variant="ghost"
              className="w-full mt-3 text-xs text-gray-600 justify-center hover:bg-gray-50 py-1.5"
            >
              See all suggestions
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center pt-2">
        <div className="flex flex-wrap justify-center gap-2 text-[10px] text-gray-500 mb-2">
          <span className="hover:text-blue-600 cursor-pointer">About</span>
          <span>•</span>
          <span className="hover:text-blue-600 cursor-pointer">Help Center</span>
          <span>•</span>
          <span className="hover:text-blue-600 cursor-pointer">Privacy</span>
          <span>•</span>
          <span className="hover:text-blue-600 cursor-pointer">Terms</span>
        </div>
        <p className="text-[10px] text-gray-400">NetSphere © 2026</p>
      </div>
    </div>
  );
}
