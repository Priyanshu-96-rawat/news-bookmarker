import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

// Use global cache to survive Next.js hot reloads
const globalForFirebase = globalThis as unknown as {
    _firebaseAdmin?: { app: App; db: Firestore; auth: Auth };
};

function initAdmin() {
    if (globalForFirebase._firebaseAdmin) {
        return globalForFirebase._firebaseAdmin;
    }

    let app: App;
    if (getApps().length === 0) {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            app = initializeApp({ credential: cert(serviceAccount), projectId });
        } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            app = initializeApp({
                credential: cert({
                    projectId: projectId!,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
                }),
                projectId,
            });
        } else {
            app = initializeApp({ projectId });
        }
    } else {
        app = getApps()[0];
    }

    const db = getFirestore(app);
    try {
        db.settings({ ignoreUndefinedProperties: true });
    } catch {
        // Already initialized — safe to ignore during hot reload
    }

    const auth = getAuth(app);
    globalForFirebase._firebaseAdmin = { app, db, auth };
    return globalForFirebase._firebaseAdmin;
}

const { db, auth } = initAdmin();
export { db, auth };
