import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC53gFLEtCfzktjIY0X7oTwQAgLzpdiyrw",
    authDomain: "exporabnb.firebaseapp.com",
    projectId: "exporabnb",
    storageBucket: "exporabnb.firebasestorage.app",
    messagingSenderId: "309889911685",
    appId: "1:309889911685:web:5fae1b15716250966892ec"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Authentication and Firestore for use in other files
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);