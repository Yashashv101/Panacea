import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_HOME = {
  ADMIN: "/records",
  STAFF: "/records",
  STUDENT: "/",
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const role = await login(email, password);
      navigate(ROLE_HOME[role] ?? "/records");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Panacea</h1>
        <p className="mb-8 text-sm text-slate">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood"
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-0 border-b border-brass/40 bg-transparent px-0 py-2 text-sm text-ink outline-none focus:border-oxblood"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="text-sm text-oxblood">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded bg-oxblood py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
