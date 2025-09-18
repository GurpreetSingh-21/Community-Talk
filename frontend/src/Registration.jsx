// frontend/src/Registration.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Registration({ onRegister }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Build API base from env (fallback to localhost)
  const RAW = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const API = RAW.replace(/\/+$/, "");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: "" }));
  };

  const validate = () => {
    const er = {};
    if (!form.fullName) er.fullName = "Full name is required";
    if (!form.email) er.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) er.email = "Email is invalid";

    if (!form.password) er.password = "Password is required";
    else if (form.password.length < 6) er.password = "At least 6 characters";

    if (!form.confirmPassword) er.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword)
      er.confirmPassword = "Passwords do not match";

    setErrors(er);
    return !Object.keys(er).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      // 1) Register
      const { confirmPassword, ...payload } = form;
      await axios.post(`${API}/register`, payload);

      // 2) Auto-login to obtain JWT (your backend issues token on /login)
      const { data: loginRes } = await axios.post(`${API}/login`, {
        email: form.email,
        password: form.password,
      });

      // 3) Persist token and bump app auth state
      localStorage.setItem("token", loginRes.token);
      onRegister?.();
      navigate("/home");
    } catch (err) {
      alert(err?.response?.data?.error ?? "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div
            className="font-bold cursor-pointer"
            onClick={() => navigate("/")}
          >
            <span>Community</span>
            <span className="text-primary">Talk</span>
          </div>
          <nav className="text-sm space-x-4">
            <Link className="hover:underline" to="/">Home</Link>
            <Link className="hover:underline" to="/login">Login</Link>
          </nav>
        </div>
      </header>

      {/* Card */}
      <main className="mx-auto max-w-md px-4 py-10">
        <Card className="p-6 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">Community Talk</h1>
            <p className="text-sm text-muted-foreground">
              Create a new account to get started.
            </p>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                value={form.fullName}
                onChange={onChange}
                autoComplete="name"
              />
              {errors.fullName && (
                <p className="text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={onChange}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="underline">
              Log in
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}

export default Registration;