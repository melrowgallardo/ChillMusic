// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDAj5DJMzrbscqmGLfxLOoM034AYDgEEw",
  authDomain: "chillmusicapp.firebaseapp.com",
  projectId: "chillmusicapp",
  storageBucket: "chillmusicapp.firebasestorage.app",
  messagingSenderId: "526233858504",
  appId: "1:526233858504:web:b3d400e05981ec15c1d0fd",
  measurementId: "G-DLLFQ86S2G"
};

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
