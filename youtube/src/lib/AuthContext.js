import { onAuthStateChanged, signInWithPopup, signOut, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { useState, useEffect, useContext, createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };
  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };
  const handlegooglesignin = async () => {
    try {
      // Try popup first (opens new tab on mobile) to bypass browser storage partitioning blocks
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };
      const response = await axiosInstance.post("/user/login", payload);
      login(response.data.result);
    } catch (error) {
      console.warn("Popup Sign-in blocked or failed, falling back to redirect:", error);
      if (error.code === "auth/popup-blocked" || error.code === "auth/cancelled-popup-request" || error.code === "auth/popup-closed-by-user") {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          console.error("Redirect Sign-in failed:", redirectError);
        }
      }
    }
  };
  useEffect(() => {
    // 1. Process Google auth redirect result on page load
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          const firebaseuser = result.user;
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          const response = await axiosInstance.post("/user/login", payload);
          login(response.data.result);
        }
      })
      .catch((error) => {
        console.error("Google Redirect Auth Error:", error);
      });

    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          const response = await axiosInstance.post("/user/login", payload);
          login(response.data.result);
        } catch (error) {
          console.error(error);
          logout();
        }
      }
    });
    return () => unsubcribe();
  }, []);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved !== null) {
      setIsSidebarCollapsed(JSON.parse(saved));
    } else {
      if (typeof window !== "undefined") {
        setIsSidebarCollapsed(window.innerWidth < 768);
      }
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", JSON.stringify(next));
      return next;
    });
  };

  const updateUserData = (updatedFields) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        updateUserData,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const AuthProvider = UserProvider;

export const useUser = () => useContext(UserContext);