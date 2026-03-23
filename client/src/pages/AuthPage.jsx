import { useState } from "react";
import supabase from "../supabase";

export default function AuthPage() {
    const [mode, setMode] = useState("login"); // "login" | "register"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        try {
            if (mode === "register") {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMessage("✅ Account created! Check your email to confirm, then log in.");
                setMode("login");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // App.jsx will detect the auth state change and show Dashboard
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-bg">
            <div className="auth-card">
                <div className="auth-logo">
                    <span className="logo-icon">🎓</span>
                    <span className="logo-text">Student Tracker</span>
                </div>

                <h2 className="auth-title">
                    {mode === "login" ? "Welcome back" : "Create account"}
                </h2>
                <p className="auth-subtitle">
                    {mode === "login"
                        ? "Sign in to access your dashboard"
                        : "Track your subjects, attendance & marks"}
                </p>

                {error && <div className="auth-error">⚠️ {error}</div>}
                {message && <div className="auth-success">{message}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            id="auth-email"
                            className="input"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            id="auth-password"
                            className="input"
                            type="password"
                            placeholder="Min 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete={mode === "login" ? "current-password" : "new-password"}
                        />
                    </div>

                    <button
                        id="auth-submit"
                        type="submit"
                        className="btn-primary auth-btn"
                        disabled={loading}
                    >
                        {loading
                            ? "Please wait…"
                            : mode === "login"
                            ? "Sign In"
                            : "Create Account"}
                    </button>
                </form>

                <div className="auth-toggle">
                    {mode === "login" ? (
                        <>
                            Don't have an account?{" "}
                            <button className="auth-link" onClick={() => { setMode("register"); setError(null); setMessage(null); }}>
                                Register
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{" "}
                            <button className="auth-link" onClick={() => { setMode("login"); setError(null); setMessage(null); }}>
                                Sign In
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
