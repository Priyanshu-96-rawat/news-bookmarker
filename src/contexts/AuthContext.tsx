"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
    User,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    configured: boolean;
    signUp: (email: string, password: string, name?: string) => Promise<void>;
    logIn: (email: string, password: string) => Promise<void>;
    logOut: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [configured, setConfigured] = useState(false);

    useEffect(() => {
        if (!isFirebaseConfigured) {
            setLoading(false);
            setConfigured(false);
            return;
        }

        setConfigured(true);
        try {
            const auth = getFirebaseAuth();
            const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
                setUser(currentUser);
                setLoading(false);
            });
            return () => unsubscribe();
        } catch {
            setLoading(false);
        }
    }, []);

    const signUp = async (email: string, password: string, name?: string) => {
        if (!isFirebaseConfigured) throw new Error("Firebase not configured");
        const auth = getFirebaseAuth();
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
            await updateProfile(cred.user, { displayName: name });
        }
    };

    const logIn = async (email: string, password: string) => {
        if (!isFirebaseConfigured) throw new Error("Firebase not configured");
        const auth = getFirebaseAuth();
        await signInWithEmailAndPassword(auth, email, password);
    };

    const logOut = async () => {
        if (!isFirebaseConfigured) return;
        const auth = getFirebaseAuth();
        await signOut(auth);
    };

    const signInWithGoogle = async () => {
        if (!isFirebaseConfigured) throw new Error("Firebase not configured");
        const auth = getFirebaseAuth();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    };

    return (
        <AuthContext.Provider value={{ user, loading, configured, signUp, logIn, logOut, signInWithGoogle }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
