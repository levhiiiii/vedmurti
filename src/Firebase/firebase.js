// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCgTdcjF2mnM3OCvC1VCSN-0UMV6ZDXm1Y",
  authDomain: "vedmurti-ebb72.firebaseapp.com",
  projectId: "vedmurti-ebb72",
  storageBucket: "vedmurti-ebb72.firebasestorage.app",
  messagingSenderId: "275227995679",
  appId: "1:275227995679:web:e8b5878382946bed05af2a",
  measurementId: "G-2DVQLJMF64"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage, analytics };
