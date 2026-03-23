import { useState, useEffect } from "react";
import supabase from "./supabase";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for login / logout changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="auth-bg">
                <div style={{ color: "#a78bfa", fontSize: "1.2rem" }}>Loading…</div>
            </div>
        );
    }

    return user ? <Dashboard user={user} /> : <AuthPage />;
}

export default App;