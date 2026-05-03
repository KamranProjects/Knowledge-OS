import React, { useState } from "react";
import { auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import confetti from "canvas-confetti";

export const ProfileSetup: React.FC<{ onComplete: (data?: any) => void }> = ({ onComplete }) => {
  const { user } = useAuth();
  const [data, setData] = useState({ weakSubjects: "", learningStyle: "", goal: "", experienceLevel: "", language: "", dailyTime: "" });
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState<any>(null);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    console.log("Saving user profile for:", user.uid, data);
    try {
      const docRef = doc(db, "users", user.uid);
      const profileData = {
        ...data,
        email: user.email,
        createdAt: new Date(), // Local fallback for immediate UI update
      };
      await setDoc(docRef, {
        ...data,
        email: user.email,
        createdAt: serverTimestamp(),
      });
      console.log("Profile saved successfully");
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setShowConfetti(profileData);
    } catch (e: any) {
      console.error("Firestore Save Error:", e);
      alert("Failed to save profile: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (showConfetti) return (
    <div className="flex flex-col items-center justify-center h-screen bg-canvas text-text-primary text-center p-8">
        <h1 className="text-6xl mb-4 text-coral">🎉 Congratulations!</h1>
        <p className="text-2xl mb-8">You've successfully set up your profile and unlocked access!</p>
        <button className="p-4 bg-coral text-white rounded-xl font-bold" onClick={() => onComplete(showConfetti)}>Enter Workspace</button>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-canvas text-text-primary">
      <h1 className="text-4xl font-serif mb-8">Welcome! Let's tailor your experience. 🎓</h1>
      <div className="flex flex-col gap-4 w-full max-w-lg">
        <input className="p-4 rounded-xl border bg-white" placeholder="Weak Subjects (e.g., Math, History)" value={data.weakSubjects} onChange={e => setData({...data, weakSubjects: e.target.value})} />
        <input className="p-4 rounded-xl border bg-white" placeholder="Learning Style (e.g., Visual, Auditory)" value={data.learningStyle} onChange={e => setData({...data, learningStyle: e.target.value})} />
        <input className="p-4 rounded-xl border bg-white" placeholder="Main Learning Goal" value={data.goal} onChange={e => setData({...data, goal: e.target.value})} />
        <select className="p-4 rounded-xl border bg-white" value={data.experienceLevel} onChange={e => setData({...data, experienceLevel: e.target.value})}>
            <option value="">Select Experience Level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
        </select>
        <input className="p-4 rounded-xl border bg-white" placeholder="Preferred Language" value={data.language} onChange={e => setData({...data, language: e.target.value})} />
        <select className="p-4 rounded-xl border bg-white" value={data.dailyTime} onChange={e => setData({...data, dailyTime: e.target.value})}>
            <option value="">Daily Study Commitment</option>
            <option value="15min">15 Minutes</option>
            <option value="30min">30 Minutes</option>
            <option value="1hr">1 Hour</option>
            <option value="2hr+">2+ Hours</option>
        </select>
        <button className="p-4 bg-coral text-white rounded-xl font-bold" onClick={handleSubmit} disabled={loading}>{loading ? "Saving..." : "Start Learning"}</button>
      </div>
    </div>
  );
};
