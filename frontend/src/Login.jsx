// frontend/src/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // API base (fallback to localhost)
  const RAW = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const API = RAW.replace(/\/+$/, "");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: "" }));
  };

  const validate = () => {
    const er = {};
    if (!form.email) er.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) er.email = "Email is invalid";

    if (!form.password) er.password = "Password is required";
    else if (form.password.length < 6) er.password = "At least 6 characters";

    setErrors(er);
    return !Object.keys(er).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API}/login`, form);
      localStorage.setItem("token", data.token);
      onLogin?.(data.token);
      navigate("/home");
    } catch (err) {
      alert(err?.response?.data?.error ?? "Login failed");
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
            <Link className="hover:underline" to="/register">Register</Link>
          </nav>
        </div>
      </header>

      {/* Card */}
      <main className="mx-auto max-w-md px-4 py-10">
        <Card className="p-6 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">Community Talk</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back! Please log in to continue.
            </p>
          </div>

          <form className="space-y-4" onSubmit={submit}>
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
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="size-4" />
                Remember me
              </label>
              <a className="hover:underline" href="#">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Logging in..." : "Log In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="underline">
              Sign up
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}

export default Login;