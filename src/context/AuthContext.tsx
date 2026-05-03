import React, { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";

const googleProvider = new GoogleAuthProvider();

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => { await signInWithPopup(auth, googleProvider); };
  const logOut = async () => { await signOut(auth); };
  const signInWithEmail = async (email: string, pass: string) => { await signInWithEmailAndPassword(auth, email, pass); };
  const signUpWithEmail = async (email: string, pass: string) => { await createUserWithEmailAndPassword(auth, email, pass); };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logOut, signInWithEmail, signUpWithEmail }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
