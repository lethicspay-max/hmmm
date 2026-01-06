import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDED2vp-idQzvZL8UPTrl5lmaqz3tZJO18",
  authDomain: "suraj-int.firebaseapp.com",
  projectId: "suraj-int",
  storageBucket: "suraj-int.firebasestorage.app",
  messagingSenderId: "844404284750",
  appId: "1:844404284750:web:25ae9bc382e148454e921f",
  measurementId: "G-Y4FZ9FLSLZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;