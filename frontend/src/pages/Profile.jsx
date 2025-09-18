// frontend/src/pages/Profile.jsx
import { useEffect, useState, useMemo } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Profile({ onLogout }) {
  // Optional API base (unused for now, but ready when you wire backend PUT)
  const API = useMemo(() => {
    const RAW = import.meta.env.VITE_API_URL || "http://localhost:3000";
    return RAW.replace(/\/+$/, "");
  }, []);

  const navigate = useNavigate();
  const [user, setUser] = useState({ id: "", name: "", email: "" });
  const [editMode, setEditMode] = useState(false);
  const [profileImage, setProfileImage] = useState(
    () => localStorage.getItem("profileImage") || "/default-avatar.png"
  );
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);

  // Decode token & hydrate
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const decoded = jwtDecode(token);
    // restore edits if present
    const updated = JSON.parse(localStorage.getItem("updatedUser") || "{}");
    setUser({
      id: decoded.id || "",
      name: updated.name || decoded.fullName || "User",
      email: updated.email || decoded.email || "unknown@example.com",
    });
  }, []);

  const handleLogout = () => {
    onLogout?.();
    navigate("/login");
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setUser((u) => ({ ...u, [name]: value }));
  };

  const onSelectAvatar = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfileImage(reader.result);
      localStorage.setItem("profileImage", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // TODO: When backend route exists, replace this with a real PUT:
      // await axios.put(`${API}/api/users/me`, { name: user.name, email: user.email }, { headers: { Authorization: `Bearer ${token}` }})
      localStorage.setItem(
        "updatedUser",
        JSON.stringify({ name: user.name, email: user.email })
      );

      setEditMode(false);
      alert("Changes saved (locally).");
    } catch (e) {
      console.error(e);
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = () => {
    if (!passwords.currentPassword || !passwords.newPassword) {
      return alert("Enter current and new password.");
    }
    if (passwords.newPassword.length < 6) {
      return alert("New password must be at least 6 characters.");
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return alert("Passwords do not match.");
    }

    // TODO: wire to backend when route is available
    // await axios.post(`${API}/api/users/change-password`, { currentPassword, newPassword }, { headers: { Authorization: `Bearer ${token}` }})
    alert("Password change not yet connected to backend.");
  };

  const copy = async (value, label = "Copied!") => {
    try {
      await navigator.clipboard.writeText(value);
      // quick UX feedback without bringing in a toast lib
      window?.dispatchEvent(new CustomEvent("profile-copied"));
      alert(label);
    } catch {
      alert("Could not copy.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-indigo-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Your Profile
          </h1>
          <div className="flex items-center gap-2">
            {!editMode ? (
              <Button onClick={() => setEditMode(true)} className="bg-indigo-600 text-white hover:bg-indigo-700">
                Edit Info
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </>
            )}
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="ml-1"
              title="Log out"
            >
              Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[360px,1fr]">
          {/* Left: Avatar + Basics */}
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="size-28 ring-2 ring-indigo-100">
                  <AvatarImage src={profileImage} />
                  <AvatarFallback className="text-lg">
                    {user.name?.[0] ?? "U"}
                  </AvatarFallback>
                </Avatar>

                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-2 right-0 cursor-pointer rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white shadow hover:bg-indigo-700"
                >
                  Change
                </label>

                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onSelectAvatar(e.target.files?.[0])}
                />
              </div>

              <div className="mt-4">
                <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {user.name || "User"}
                </div>
                <div className="text-sm text-slate-500">{user.email}</div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  ● Online
                </div>
              </div>

              <Separator className="my-6" />

              <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">User ID</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    onClick={() => copy(user.id, "User ID copied")}
                  >
                    Copy
                  </Button>
                </div>
                <div className="truncate rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                  {user.id || "—"}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Email</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    onClick={() => copy(user.email, "Email copied")}
                  >
                    Copy
                  </Button>
                </div>
                <div className="truncate rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                  {user.email || "—"}
                </div>
              </div>
            </div>
          </Card>

          {/* Right: Editable fields + password */}
          <div className="grid gap-6">
            <Card className="p-6">
              <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">
                Account Details
              </h2>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={user.name}
                    onChange={onChange}
                    disabled={!editMode}
                    placeholder="Your name"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={user.email}
                    onChange={onChange}
                    disabled={!editMode}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {!editMode && (
                <div className="mt-4 text-xs text-slate-500">
                  Tip: Click <span className="font-medium">Edit Info</span> to
                  update your profile. Changes are saved locally until the
                  backend endpoint is connected.
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">
                Change Password
              </h2>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="••••••••"
                    value={passwords.currentPassword}
                    onChange={(e) =>
                      setPasswords((p) => ({
                        ...p,
                        currentPassword: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="At least 6 characters"
                    value={passwords.newPassword}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, newPassword: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat new password"
                    value={passwords.confirmPassword}
                    onChange={(e) =>
                      setPasswords((p) => ({
                        ...p,
                        confirmPassword: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                  onClick={() =>
                    setPasswords({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    })
                  }
                >
                  Reset
                </Button>
                <Button
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={handlePasswordChange}
                >
                  Update Password
                </Button>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Note: This action isn’t wired to the backend yet. We’ll hook it
                up once there’s a route like <code>/api/users/change-password</code>.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-100">
                Danger Zone
              </h2>
              <p className="mb-4 text-sm text-slate-600">
                Deleting your account removes your profile and may remove
                messages depending on retention policy.
              </p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => alert("Account deletion not yet connected.")}
              >
                Delete Account
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}