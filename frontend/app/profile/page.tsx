"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/authContext";
import PhotoUpload from "@/components/PhotoUpload";
import { useToast } from "@/components/Toast";

export default function ProfilePage() {
  const { user, token, refreshUser, isLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  
  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoading && !token) {
      router.push("/login");
    }
    
    if (user) {
      setName(user.name || "");
      setHeight(user.height_cm ? String(user.height_cm) : "");
      setWeight(user.weight_kg ? String(user.weight_kg) : "");
    }
  }, [user, token, isLoading, router]);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const photoRes = await fetch("http://localhost:8000/users/me/photos", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        if (!photoRes.ok) throw new Error("Failed to upload photo");
      }

      const profileRes = await fetch("http://localhost:8000/users/me/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name || null,
          height_cm: height ? parseFloat(height) : null,
          weight_kg: weight ? parseFloat(weight) : null,
        }),
      });
      
      if (!profileRes.ok) throw new Error("Failed to update profile");
      
      await refreshUser();
      addToast("Profile updated successfully!", "success");
      handleClear();
    } catch (err: any) {
      addToast(err.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-white/50">
          Loading...
        </div>
      </div>
    );
  }

  const primaryPhotoUrl = user.saved_photos && user.saved_photos.length > 0
    ? user.saved_photos[user.saved_photos.length - 1].url
    : null;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-4xl w-full mx-auto p-6 pt-12">
        <h1 className="text-3xl font-light text-white mb-8">My Profile</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Photo Section */}
          <div>
            <h2 className="text-xl font-medium text-white mb-4">My Try-On Photo</h2>
            {primaryPhotoUrl && !previewUrl ? (
              <div className="mb-6 relative group rounded-2xl overflow-hidden border border-white/10">
                <img 
                  src={primaryPhotoUrl} 
                  alt="Profile" 
                  className="w-full aspect-[3/4] object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white text-sm">Upload a new photo below to replace</p>
                </div>
              </div>
            ) : null}
            
            <p className="text-sm text-white/60 mb-4">
              {primaryPhotoUrl ? "Upload a new photo" : "Upload a full-body photo for try-ons"}
            </p>
            <PhotoUpload 
              onFileSelect={handleFileSelect}
              previewUrl={previewUrl}
              onClear={handleClear}
            />
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-medium text-white mb-4">Personal Details</h2>
            
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Email</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Height (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  placeholder="175"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Weight (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  placeholder="70"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-white text-black font-medium py-3 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 mt-4"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
