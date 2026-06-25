import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

// ADD YOUR FIREBASE CONFIG HERE
// Stride is pre-configured with the provisioned AI Studio Firebase project.
// You can replace this with your own configuration:
const firebaseConfig = {
  apiKey: "AIzaSyCCnndTbSpmtHu3hqXBnCewuO_U3W-zywA",
  authDomain: "abstract-legacy-nsjh2.firebaseapp.com",
  projectId: "abstract-legacy-nsjh2",
  storageBucket: "abstract-legacy-nsjh2.firebasestorage.app",
  messagingSenderId: "228495156176",
  appId: "1:228495156176:web:43a68264f73181c98f8fd5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with persistent offline cache and multi-tab sync support
const customDatabaseId = "ai-studio-30548c0e-6730-442c-b7e3-be67a8cb0d3b";
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, customDatabaseId || "(default)");

export default app;
