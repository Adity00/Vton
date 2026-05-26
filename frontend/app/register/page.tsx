"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/authContext";
import PhotoUpload from "@/components/PhotoUpload";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  
  const router = useRouter();
  const { login, refreshUser } = useAuth();
  const previewUrlRef = useRef<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Registration failed");
      }

      // Automatically log them in after registration
      const loginRes = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });
      
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        login(loginData.access_token);
        await refreshUser();
        setStep(2);
      } else {
        router.push("/login");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const handleCompleteProfile = async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("vton_token");
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

      if (height || weight) {
        const profileRes = await fetch("http://localhost:8000/users/me/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            height_cm: height ? parseFloat(height) : null,
            weight_kg: weight ? parseFloat(weight) : null,
          }),
        });
        if (!profileRes.ok) throw new Error("Failed to update profile");
      }
      
      await refreshUser();
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
          <h2 className="text-3xl font-light text-white mb-6 text-center">
            {step === 1 ? "Create Account" : "Complete Profile"}
          </h2>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black font-medium py-3 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 mt-6"
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-white/40">
                Already have an account?{" "}
                <button onClick={() => router.push("/login")} className="text-white hover:underline">
                  Sign in
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-white/60 text-center">
                Upload a clear photo of yourself to try on clothes instantly.
              </p>
              
              <PhotoUpload 
                onFileSelect={handleFileSelect}
                previewUrl={previewUrl}
                onClear={handleClear}
              />
              
              <div className="grid grid-cols-2 gap-4 mt-4">
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
                onClick={handleCompleteProfile}
                disabled={loading}
                className="w-full bg-white text-black font-medium py-3 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 mt-6"
              >
                {loading ? "Saving..." : (selectedFile || height || weight) ? "Save Profile" : "Skip for now"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
