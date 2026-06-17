"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import Link from "next/link";
import {
  Bell,
  Heart,
  MessageSquare,
  UserPlus,
  Users,
  Briefcase,
  ArrowLeft,
  Trash2,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/notifications/${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);

        // Mark notifications as read in the database
        await fetch(`/api/notifications/${user.uid}/read`, {
          method: "PUT",
        });
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return <Heart className="h-5 w-5 text-red-500 fill-red-500" />;
      case "comment":
        return <MessageSquare className="h-5 w-5 text-green-500 fill-green-500" />;
      case "post":
        return <Sparkles className="h-5 w-5 text-amber-500" />;
      case "connection_request":
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case "connection_accepted":
        return <Users className="h-5 w-5 text-emerald-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
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
          <p className="mt-4 text-sm text-gray-500 font-medium">Checking notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 pb-24 lg:pb-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Navigation & Header */}
        <div className="flex items-center space-x-3 mb-6">
          <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Bell className="h-6 w-6 mr-2.5 text-blue-600" />
              Notifications
            </h1>
            <p className="text-sm text-gray-500">
              Stay updated on your posts activity, incoming connections, and network uploads.
            </p>
          </div>
        </div>

        {/* Notifications list */}
        {notifications.length === 0 ? (
          <Card className="border border-gray-200 shadow-sm py-16">
            <CardContent className="text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No Notifications</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                You&apos;re all caught up! When connections post or people interact with your profile and uploads, you will see notifications here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const isUnread = !notification.isRead;
              const hasPostLink = notification.postId && ["like", "comment", "post"].includes(notification.type);

              return (
                <Card
                  key={notification._id}
                  className={`border border-gray-200 shadow-sm transition-colors hover:bg-gray-50/50 ${
                    isUnread ? "bg-blue-50/30 border-l-4 border-l-blue-600" : "bg-white"
                  }`}
                >
                  <CardContent className="p-4 flex items-start space-x-4">
                    {/* Event Icon */}
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Sender Profile Picture */}
                    <Link
                      href={`/profile/${notification.senderId}`}
                      className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 shadow-inner flex-shrink-0"
                    >
                      {notification.senderAvatar ? (
                        <img
                          src={notification.senderAvatar}
                          alt={notification.senderName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(notification.senderName)}
                        </div>
                      )}
                    </Link>

                    {/* Description & Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-1 gap-1">
                        <p className="text-sm text-gray-950 font-medium">
                          <Link href={`/profile/${notification.senderId}`} className="font-bold hover:underline hover:text-blue-600 mr-1.5">
                            {notification.senderName}
                          </Link>
                          <span className="text-gray-750">{notification.message}</span>
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>

                      {/* Excerpt of Post content if liked or commented */}
                      {notification.postContent && (
                        <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded-lg border border-gray-150/50 line-clamp-1 mb-2">
                          &quot;{notification.postContent}&quot;
                        </p>
                      )}

                      {/* View Action Buttons */}
                      {hasPostLink ? (
                        <Link href={`/post/${notification.postId}`}>
                          <Button size="sm" variant="outline" className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50 py-1 px-3">
                            View Post
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/profile/${notification.senderId}`}>
                          <Button size="sm" variant="outline" className="text-xs text-gray-650 hover:bg-gray-100 py-1 px-3">
                            View Profile
                          </Button>
                        </Link>
                      )}
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
