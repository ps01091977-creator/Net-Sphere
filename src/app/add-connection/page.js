"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";
import { UserPlus, Plus, Check, Clock, ArrowLeft, Briefcase, MapPin } from "lucide-react";

export default function AddConnectionPage() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingIds, setRequestingIds] = useState(new Set());

  const fetchSuggestions = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/connections/suggestions/${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Error fetching connection suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }
  }, [user]);

  const handleConnect = async (targetUid) => {
    if (requestingIds.has(targetUid)) return;
    
    // Set loading for this user card
    setRequestingIds((prev) => {
      const next = new Set(prev);
      next.add(targetUid);
      return next;
    });

    try {
      const response = await fetch("/api/connections/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: user.uid, receiverId: targetUid }),
      });

      if (response.ok) {
        const data = await response.json();
        const nextStatus = data.status || "pending";
        // Update the button text in local state
        setSuggestions((prev) =>
          prev.map((s) =>
            s.firebaseUid === targetUid ? { ...s, status: nextStatus } : s
          )
        );
      }
    } catch (error) {
      console.error("Error sending connection request:", error);
    } finally {
      setRequestingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUid);
        return next;
      });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500 font-medium">Finding potential connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 pb-24 lg:pb-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Navigation and Title */}
        <div className="bg-white/70 backdrop-blur-md border border-gray-200/50 shadow-sm rounded-2xl p-5 mb-6 flex items-center space-x-4">
          <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600 flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <UserPlus className="h-6 w-6 mr-2.5 text-blue-600 flex-shrink-0" />
              Add Connections
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Expand your network by connecting with professionals in your industry.
            </p>
          </div>
        </div>

        {/* Suggestions Grid */}
        {suggestions.length === 0 ? (
          <Card className="border border-gray-200 shadow-sm py-12">
            <CardContent className="text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">All Caught Up!</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                We couldn&apos;t find any new suggestions right now. Try checking back later or searching for specific profiles using the search bar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {suggestions.map((person) => {
              const isPending = person.status === "pending";
              const isIncoming = person.status === "incoming";
              const isAccepted = person.status === "accepted";
              const isLoading = requestingIds.has(person.firebaseUid);

              return (
                <Card
                  key={person.firebaseUid}
                  className="group hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden flex flex-col justify-between"
                >
                  <CardContent className="p-0 flex flex-col h-full">
                    {/* Cover Header Graphic */}
                    <div className="h-12 sm:h-20 bg-gradient-to-r from-blue-500 to-indigo-600 relative flex-shrink-0">
                      <div className="absolute inset-0 bg-black opacity-10"></div>
                    </div>

                    {/* Profile details */}
                    <div className="px-2 sm:px-4 pb-3 sm:pb-4 flex-1 flex flex-col items-center text-center relative">
                      {/* Avatar */}
                      <Link
                        href={`/profile/${person.firebaseUid}`}
                        className="w-14 h-14 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 border-white shadow-md -mt-7 sm:-mt-10 mb-2 sm:mb-3 flex-shrink-0 hover:scale-105 transition-transform duration-200"
                      >
                        {person.profilePicture ? (
                          <img
                            src={person.profilePicture}
                            alt={person.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-base sm:text-xl font-bold">
                            {getInitials(person.name)}
                          </div>
                        )}
                      </Link>

                      {/* Info */}
                      <Link href={`/profile/${person.firebaseUid}`} className="hover:underline">
                        <h3 className="font-bold text-gray-950 text-xs sm:text-base line-clamp-1 mb-0.5 sm:mb-1">
                          {person.name}
                        </h3>
                      </Link>
                      <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-2 h-6 sm:h-8 mb-2 sm:mb-3">
                        {person.headline || "Professional"}
                      </p>

                      <div className="w-full border-t border-gray-100 pt-2 sm:pt-3 mt-auto">
                        {isPending ? (
                          <Button
                            disabled
                            className="w-full py-1.5 sm:py-2 bg-gray-100 text-gray-500 text-[10px] sm:text-xs flex items-center justify-center border border-gray-200 cursor-not-allowed"
                          >
                            <Clock className="h-3.5 w-3.5 mr-1.5" />
                            Pending Request
                          </Button>
                        ) : isAccepted ? (
                          <Button
                            disabled
                            className="w-full py-1.5 sm:py-2 bg-green-50 text-green-600 text-[10px] sm:text-xs flex items-center justify-center border border-green-200 cursor-not-allowed font-semibold"
                          >
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Connected
                          </Button>
                        ) : isIncoming ? (
                          <Button
                            onClick={() => handleConnect(person.firebaseUid)}
                            disabled={isLoading}
                            className="w-full py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-xs font-semibold flex items-center justify-center shadow-md active:scale-95 transition-transform"
                          >
                            {isLoading ? (
                              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Accept Request
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleConnect(person.firebaseUid)}
                            disabled={isLoading}
                            className="w-full py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-semibold flex items-center justify-center shadow-md shadow-blue-500/10 active:scale-95 transition-transform"
                          >
                            {isLoading ? (
                              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Connect
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
