// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBDAj5DJMzrbscqmGLfxLOoM034AYDgEEw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "chillmusicapp.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "chillmusicapp",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "chillmusicapp.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "526233858504",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:526233858504:web:b3d400e05981ec15c1d0fd",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-DLLFQ86S2G"
};

// Config validation log
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
  console.error("[Firebase Config Error] Critical Firebase keys (apiKey or authDomain) are missing or undefined!", firebaseConfig);
} else {
  console.log("[Firebase Config] Firebase initialized with authDomain:", firebaseConfig.authDomain);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Safely initialize Analytics without throwing in Android WebView / Capacitor release builds
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(() => {});

const auth = getAuth(app);

// Initialize Firestore with long-polling fallback to prevent hanging in Android WebView / release APKs
let db;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false,
  });
} catch (e) {
  // Fallback if initializeFirestore was already called
  db = getFirestore(app);
}

export { app, analytics, auth, db };
export default app;
