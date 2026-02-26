import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

export const isFirebaseConfigured =
    typeof window !== "undefined" &&
    !!firebaseConfig.apiKey &&
    !!firebaseConfig.projectId;

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _functions: Functions | null = null;

function getApp(): FirebaseApp {
    if (!_app) {
        _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    }
    return _app;
}

export function getFirebaseAuth(): Auth {
    if (!_auth) _auth = getAuth(getApp());
    return _auth;
}

export function getFirebaseDb(): Firestore {
    if (!_db) _db = getFirestore(getApp());
    return _db;
}

export function getFirebaseFunctions(): Functions {
    if (!_functions) _functions = getFunctions(getApp());
    return _functions;
}
