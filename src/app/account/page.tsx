"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Camera, Save, Eye, EyeOff, LogOut, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setName(data.user.name);
          setEmail(data.user.email);
          setAvatar(data.user.avatar || "");
        }
        setLoading(false);
      })
      .catch(() => {
        router.push("/auth/login");
      });
  }, [router]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setProfileMsg({ type: "error", text: "Use JPG, PNG, WebP or GIF" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ type: "error", text: "Max file size is 5MB" });
      return;
    }

    setProfileMsg(null);
    const url = URL.createObjectURL(file);
    setPreview(url);

    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    fetch("/api/auth/avatar", { method: "POST", body: formData })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setAvatar(data.avatar);
          setProfileMsg({ type: "success", text: "Profile picture updated!" });
          setUser((prev) => prev ? { ...prev, avatar: data.avatar } : prev);
        } else {
          setProfileMsg({ type: "error", text: data.error || "Upload failed" });
        }
        setUploading(false);
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        setProfileMsg({ type: "error", text: "Upload failed" });
        setUploading(false);
        URL.revokeObjectURL(url);
      });

    e.target.value = "";
  }, []);

  const handleRemoveAvatar = useCallback(async () => {
    setProfileMsg(null);
    try {
      const res = await fetch("/api/auth/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: "" }),
      });
      if (res.ok) {
        setAvatar("");
        setUser((prev) => prev ? { ...prev, avatar: null } : prev);
        setProfileMsg({ type: "success", text: "Profile picture removed" });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Failed to remove" });
    }
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/auth/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setProfileMsg({ type: "success", text: "Profile updated!" });
      } else {
        setProfileMsg({ type: "error", text: data.error || "Failed to update" });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Failed to update" });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ type: "success", text: "Password changed!" });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setPasswordMsg({ type: "error", text: data.error || "Failed to change password" });
      }
    } catch {
      setPasswordMsg({ type: "error", text: "Failed to change password" });
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500" style={{ animation: "kuro-spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const displayAvatar = preview || avatar;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 kuro-animate-in">
          <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
          <p className="mt-2 text-sm text-muted">Manage your profile and security</p>
        </div>

        <div className="space-y-6">
          {/* Avatar + Profile */}
          <div className="rounded-2xl border border-border bg-surface p-6 kuro-animate-in-delay-1">
            <h2 className="text-lg font-semibold text-foreground mb-4">Profile</h2>

            <div className="flex items-center gap-5 mb-6">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="relative group flex-shrink-0"
              >
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={name}
                    className="h-20 w-20 rounded-2xl object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white text-2xl font-bold">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploading ? (
                    <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent" style={{ animation: "kuro-spin 0.6s linear infinite" }} />
                  ) : (
                    <Upload className="h-5 w-5 text-white" />
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted truncate">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="text-xs text-accent hover:underline"
                  >
                    {displayAvatar ? "Change picture" : "Upload picture"}
                  </button>
                  {displayAvatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                  />
                </div>
              </div>

              {profileMsg && (
                <p className={cn("text-sm", profileMsg.type === "success" ? "text-green-500" : "text-red-500")}>
                  {profileMsg.text}
                </p>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="rounded-2xl border border-border bg-surface p-6 kuro-animate-in-delay-2">
            <h2 className="text-lg font-semibold text-foreground mb-4">Change Password</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                  >
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                  >
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {passwordMsg && (
                <p className={cn("text-sm", passwordMsg.type === "success" ? "text-green-500" : "text-red-500")}>
                  {passwordMsg.text}
                </p>
              )}

              <button
                onClick={handleChangePassword}
                disabled={!currentPassword || !newPassword}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover transition-all disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                Change Password
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className="kuro-animate-in-delay-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/20 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
