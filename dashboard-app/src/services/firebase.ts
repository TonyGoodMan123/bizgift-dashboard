import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    projectId: "bizgift-dashboard",
    appId: "1:167553653255:web:b696ec63b9d862603be8a2",
    storageBucket: "bizgift-dashboard.firebasestorage.app",
    apiKey: "AIzaSyAqQiUUf2OtOig96VaXpo_qKVF7WYXofTo",
    authDomain: "bizgift-dashboard.firebaseapp.com",
    messagingSenderId: "167553653255"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
