import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyCarVvuIv98dVchEfAG3ESqK6dWGCfnYhc",
  authDomain: "studio-1495468656-91226.firebaseapp.com",
  projectId: "studio-1495468656-91226",
  storageBucket: "studio-1495468656-91226.firebasestorage.app",
  messagingSenderId: "41404589473",
  appId: "1:41404589473:web:7008a66e8a1ce4b74097e0"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
