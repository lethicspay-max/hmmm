import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBNBMPc57ZqQJfSfVrevYYt0986ymCh-VA",
  authDomain: "tapwell-vending.firebaseapp.com",
  projectId: "tapwell-vending",
  storageBucket: "tapwell-vending.firebasestorage.app",
  messagingSenderId: "857008947741",
  appId: "1:857008947741:web:c6d7b905954eb60376bcf4",
  measurementId: "G-Y4FZ9FLSLZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;