import { config } from "./index";
import * as admin from "firebase-admin";

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase(): admin.app.App | null {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!config.firebaseProjectId || !config.firebasePrivateKey || !config.firebaseClientEmail) {
    console.warn("[Firebase] Firebase credentials not configured. Push notifications will be disabled.");
    return null;
  }

  try {
    const privateKey = config.firebasePrivateKey.replace(/\\n/g, "\n");

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebaseProjectId,
        privateKey,
        clientEmail: config.firebaseClientEmail,
      }),
      databaseURL: config.firebaseDatabaseUrl,
    });

    console.log("[Firebase] Firebase Admin SDK initialized successfully");
    return firebaseApp;
  } catch (error) {
    console.error("[Firebase] Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}

export function getFirebaseApp(): admin.app.App | null {
  return firebaseApp;
}

export function isFirebaseInitialized(): boolean {
  return firebaseApp !== null;
}