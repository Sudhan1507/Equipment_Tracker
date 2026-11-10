import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, Package, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, demoLogin, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="route-loading">Checking session...</div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const from = location.state?.from?.pathname;
      navigate(from || "/dashboard", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function enterDemo(role) {
    demoLogin(role);
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="login-screen">
      <section className="login-visual">
        <div className="login-brand"><div className="brand-mark"><Package size={22} /></div><strong>EquipTrack</strong></div>
        <div className="visual-content">
          <span className="eyebrow">EQUIPMENT CHECKOUT PORTAL</span>
          <h1>Everything you need.<br /><em>Accounted for.</em></h1>
          <p>Manage equipment, track requests, and keep every checkout accountable in one place.</p>
          <div className="visual-feature"><ShieldCheck size={20} /><span>Role-based access for technicians and supervisors</span></div>
        </div>
        <div className="visual-footer">A clearer view of your equipment workflow.</div>
      </section>
      <section className="login-form-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-icon"><LockKeyhole size={22} /></div>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to your Equipment Checkout account.</p>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <label className="field-label" htmlFor="email">Email address</label>
          <input id="email" className="text-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          <label className="field-label" htmlFor="password">Password</label>
          <input id="password" className="text-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
          <button className="primary-button login-submit" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </div>
  );
}
