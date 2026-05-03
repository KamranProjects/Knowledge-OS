import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export const Login: React.FC = () => {
    const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLogin) await signInWithEmail(email, pass);
            else await signUpWithEmail(email, pass);
        } catch (e: any) { alert(e.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center h-screen bg-canvas px-4">
            <div className="max-w-md mb-12 md:mb-0 md:mr-16 text-center md:text-left">
                <h1 className="text-5xl font-serif text-text-primary mb-6">Welcome to AI Study OS</h1>
                <p className="text-xl text-text-secondary leading-relaxed">
                    Your personal AI-powered learning architect. Generate custom curricula, 
                    track your progress, and master any domain with adaptive learning pathways.
                </p>
            </div>
            <form onSubmit={handleSubmit} className="p-8 bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col gap-4">
                <h1 className="text-2xl font-bold">{isLogin ? "Login" : "Sign Up"}</h1>
                <input type="email" placeholder="Email" className="p-3 border rounded-lg" onChange={e => setEmail(e.target.value)} />
                <input type="password" placeholder="Password" className="p-3 border rounded-lg" onChange={e => setPass(e.target.value)} />
                <button className="p-3 bg-coral text-white rounded-lg font-semibold">Submit</button>
                <button type="button" onClick={signInWithGoogle} className="p-3 border rounded-lg font-semibold">Sign in with Google</button>
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-500">
                    {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
                </button>
            </form>
        </div>
    )
};
