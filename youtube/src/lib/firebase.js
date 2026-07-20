import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; 
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD2XOLl4MvwIT7ZlJzKrk_vmPd_IWpzago",
  authDomain: "fir-69910.firebaseapp.com",
  projectId: "fir-69910",
  storageBucket: "fir-69910.firebasestorage.app",
  messagingSenderId: "580171671748",
  appId: "1:580171671748:web:f5f10bf64cfa1d2f2e8191",
  measurementId: "G-N362W78PKW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const storage = getStorage(app);

export { auth, provider, storage };