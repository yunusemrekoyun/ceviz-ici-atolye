"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    if (response.ok) {
      router.push("/admin");
      router.refresh();
      return;
    }

    const data = await response.json().catch(() => ({}));
    setError(data?.error ?? "Login failed");
    setIsSubmitting(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Admin Sign In</h1>
        <p className="login-subtitle">Use your admin credentials to continue.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Username or Email</span>
            <input
              className="login-input"
              type="text"
              name="identifier"
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
            />
          </label>

          <label className="login-field">
            <span>Password</span>
            <input
              className="login-input"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button className="login-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          {error ? <p className="login-error">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}
