"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/Card";
import { PostFeed } from "@/components/PostFeed";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { ProfileLoadingScreen } from "@/components/LoadingScreen";
import {
  Edit3,
  Save,
  X,
  MapPin,
  Building,
  Calendar,
  User,
  Camera,
  Upload,
} from "lucide-react";
import { SafeImage } from "@/components/SafeImage";

export default function ProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    headline: "",
    bio: "",
    profilePicture: "",
  });
  
  const [connectionStatus, setConnectionStatus] = useState("none");
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const isOwnProfile = user && user.uid === params.id;

  useEffect(() => {
    const fetchConnectionStatus = async () => {
      if (!user || user.uid === params.id) return;
      try {
        const response = await fetch(`/api/connections/status/${user.uid}/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(data.status);
        }
      } catch (error) {
        console.error("Error fetching connection status:", error);
      }
    };

    if (user && params.id) {
      fetchConnectionStatus();
    }
  }, [user, params.id]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/users/${params.id}`);
        if (response.ok) {
          const userData = await response.json();
          setProfile(userData);
          setEditData({
            name: userData.name || "",
            headline: userData.headline || "",
            bio: userData.bio || "",
            profilePicture: userData.profilePicture || "",
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProfile();
    }
  }, [params.id]);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditData({
      name: profile.name || "",
      headline: profile.headline || "",
      bio: profile.bio || "",
      profilePicture: profile.profilePicture || "",
    });
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/users/${user.uid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editData.name,
          headline: editData.headline,
          bio: editData.bio,
          profilePicture: editData.profilePicture,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setProfile(updatedUser);
        setEditing(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file");
      return;
    }

    setUploadingImage(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append("profilePicture", file);

      const response = await fetch("/api/upload/profile-picture", {
        method: "POST",
        body: formDataObj,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      setEditData((prev) => ({
        ...prev,
        profilePicture: data.url,
      }));
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleConnect = async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/connections/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: user.uid,
          receiverId: params.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.status === "pending" ? "pending_sent" : data.status);
      }
    } catch (error) {
      console.error("Error connecting:", error);
    }
  };

  const handleAcceptConnection = async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/connections/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: params.id,
          receiverId: user.uid,
        }),
      });

      if (response.ok) {
        setConnectionStatus("accepted");
      }
    } catch (error) {
      console.error("Error accepting connection:", error);
    }
  };

  const handleDisconnect = async () => {
    if (!user || !window.confirm("Are you sure you want to remove this connection?")) return;
    try {
      const response = await fetch("/api/connections/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: user.uid,
          receiverId: params.id,
        }),
      });

      if (response.ok) {
        setConnectionStatus("none");
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !user) return;
    setSendingMessage(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: user.uid,
          receiverId: params.id,
          content: messageContent,
          initiatedFromProfile: true,
        }),
      });

      if (response.ok) {
        setMessageContent("");
        setIsMessageModalOpen(false);
        alert("Message sent successfully!");
        window.location.href = "/messages";
      } else {
        alert("Failed to send message.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message.");
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return <ProfileLoadingScreen />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            User not found
          </h1>
          <p className="text-gray-600">
            The requested profile could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-24 lg:pb-8">
        {/* Main Profile Card */}
        <Card className="mb-6 overflow-hidden">
          {/* Cover Photo */}
          <div className="h-48 bg-gradient-to-r from-blue-600 to-blue-800 relative">
            <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          </div>

          {/* Profile Information */}
          <div className="px-6 pb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-6">
              {/* Profile Picture */}
              <div className="relative -mt-16 mb-4 lg:mb-0">
                {editing ? (
                  <div className="relative">
                    <SafeImage
                      src={editData.profilePicture}
                      alt="Profile"
                      width={128}
                      height={128}
                      className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg animate-fade-in"
                      fallbackInitials={getInitials(editData.name || "U")}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="profilePictureEdit"
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="profilePictureEdit"
                      className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50"
                    >
                      <Camera className="h-4 w-4 text-gray-600" />
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <SafeImage
                      src={profile.profilePicture}
                      alt="Profile"
                      width={128}
                      height={128}
                      className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg"
                      fallbackInitials={getInitials(profile.name || "U")}
                    />
                  </div>
                )}
              </div>

              {/* Profile Details */}
              <div className="flex-1 pt-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    {editing ? (
                      <div className="space-y-4">
                        <div>
                          <Input
                            value={editData.name}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            placeholder="Full Name"
                            className="text-2xl font-bold border-0 border-b-2 border-gray-200 rounded-none px-0 focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <Input
                            value={editData.headline}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                headline: e.target.value,
                              }))
                            }
                            placeholder="Professional Headline"
                            className="text-lg border-0 border-b-2 border-gray-200 rounded-none px-0 focus:border-blue-600"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                          {profile.name}
                        </h1>
                        {profile.headline && (
                          <p className="text-lg text-gray-700 mb-2">
                            {profile.headline}
                          </p>
                        )}
                        <div className="flex items-center text-gray-600 text-sm mb-2">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>Location • </span>
                          <Building className="h-4 w-4 mr-1 ml-2" />
                          <span>Company</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col lg:flex-row gap-2 mt-4 lg:mt-0">
                    {isOwnProfile ? (
                      editing ? (
                        <>
                          <Button
                            onClick={handleSave}
                            disabled={uploadingImage}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {uploadingImage ? "Uploading..." : "Save"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancel}
                            className="border-gray-300"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={handleEdit}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                        </>
                      )
                    ) : (
                      <>
                        {connectionStatus === "none" && (
                          <Button onClick={handleConnect} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Connect
                          </Button>
                        )}
                        {(connectionStatus === "pending_sent" || connectionStatus === "pending") && (
                          <Button disabled className="bg-gray-300 text-gray-500 cursor-not-allowed">
                            Pending Request
                          </Button>
                        )}
                        {connectionStatus === "pending_received" && (
                          <Button onClick={handleAcceptConnection} className="bg-green-600 hover:bg-green-700 text-white">
                            Accept Request
                          </Button>
                        )}
                        {connectionStatus === "accepted" && (
                          <Button onClick={handleDisconnect} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                            Disconnect
                          </Button>
                        )}
                        <Button onClick={() => setIsMessageModalOpen(true)} variant="outline" className="border-gray-300 text-black hover:bg-gray-50">
                          Message
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* About Section */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">About</h2>
            </div>
            {editing ? (
              <Textarea
                value={editData.bio}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, bio: e.target.value }))
                }
                placeholder="Write about yourself, your career journey, interests, or anything you'd like others to know..."
                rows={6}
                className="w-full border-gray-300 focus:border-blue-600 focus:ring-blue-600"
              />
            ) : (
              <div className="text-gray-700 leading-relaxed">
                {profile.bio ? (
                  <p className="whitespace-pre-wrap">{profile.bio}</p>
                ) : (
                  <p className="text-gray-500 italic">
                    {isOwnProfile
                      ? "Add information about yourself to help others get to know you better."
                      : "No information available."}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Activity/Posts Section */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Activity
            </h2>
            <div className="border-t border-gray-200 pt-4">
              <PostFeed userId={params.id} />
            </div>
          </div>
        </Card>
        {/* Message Modal */}
        {isMessageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="font-semibold text-gray-900">
                  Send a message to {profile.name}
                </h3>
                <button
                  onClick={() => {
                    setIsMessageModalOpen(false);
                    setMessageContent("");
                  }}
                  className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <Textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Write a message to start a conversation..."
                  rows={5}
                  className="w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg text-black placeholder-gray-400"
                />
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsMessageModalOpen(false);
                    setMessageContent("");
                  }}
                  className="border-gray-200 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageContent.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                >
                  {sendingMessage ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
