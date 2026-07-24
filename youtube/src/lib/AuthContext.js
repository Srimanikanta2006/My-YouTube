import { onAuthStateChanged, signInWithPopup, signOut, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { useState, useEffect, useContext, createContext, useRef } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";

const UserContext = createContext();

// Helper to determine default theme based on current IST login time
const getIstThemeClient = () => {
  try {
    const istTimeStr = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      hour12: false,
    });
    const timePart = istTimeStr.split(", ")[1] || istTimeStr;
    const parts = timePart.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const totalMins = hours * 60 + minutes;

    // 10:00 AM (600 mins) to 12:00 PM (720 mins) IST -> "light"
    if (totalMins >= 600 && totalMins <= 720) {
      return "light";
    }
    return "dark";
  } catch (err) {
    console.error("Error calculating client IST time:", err);
    return "dark";
  }
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark");

  // OTP Verification Modal State for New City/State/Device Logins
  const [otpData, setOtpData] = useState(null);

  // Sync theme class to document <html> element
  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [theme]);

  // Set theme from user profile or IST time on initial load
  useEffect(() => {
    if (user?.theme) {
      setTheme(user.theme);
    } else {
      const initialTheme = getIstThemeClient();
      setTheme(initialTheme);
    }
  }, [user]);

  const toggleTheme = async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (user?._id) {
      updateUserData({ theme: nextTheme });
      try {
        await axiosInstance.patch(`/user/update/${user._id}`, { theme: nextTheme });
      } catch (err) {
        console.error("Error updating saved theme on server:", err);
      }
    }
  };

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
    if (userdata?.theme) {
      setTheme(userdata.theme);
    }
  };

  const logout = async () => {
    setUser(null);
    setOtpData(null);
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

  const processLoginResponse = (resData) => {
    if (resData.otpRequired) {
      // Security Check Triggered: New Location/Device Detected!
      setOtpData({
        required: true,
        userId: resData.userId,
        email: resData.email,
        message: resData.message || "Security Check: Verification OTP required for new device/location.",
        locationInfo: resData.locationInfo,
      });
    } else if (resData.result) {
      login(resData.result);
    }
  };

  const verifyLoginOtp = async (otpCode) => {
    if (!otpData?.userId) return { success: false, message: "No active login verification request." };

    try {
      const res = await axiosInstance.post("/user/verify-otp", {
        userId: otpData.userId,
        otp: otpCode,
      });

      if (res.data.success && res.data.result) {
        setOtpData(null);
        login(res.data.result);
        return { success: true, message: "Security verification successful!" };
      } else {
        return { success: false, message: res.data.message || "Invalid OTP verification code." };
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      return {
        success: false,
        message: err.response?.data?.message || "Verification failed. Please check the code.",
      };
    }
  };

  const resendLoginOtp = async () => {
    if (!otpData?.userId) return { success: false, message: "No active verification session." };
    try {
      const res = await axiosInstance.post("/user/resend-otp", { userId: otpData.userId });
      return { success: true, message: res.data.message || "New security OTP sent to your email!" };
    } catch (err) {
      console.error("Error resending OTP:", err);
      return { success: false, message: "Failed to resend OTP. Please try again." };
    }
  };

  const fetchClientLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const data = await res.json();
        if (data.city) {
          return {
            city: data.city,
            state: data.region || data.city,
            country: data.country_name || "India",
          };
        }
      }
    } catch (e) {
      console.warn("Client Geo-IP lookup unavailable, falling back to server Geo-IP:", e);
    }
    return null;
  };

  const isAuthProcessingRef = useRef(false);

  const handlegooglesignin = async () => {
    if (isAuthProcessingRef.current) return;
    isAuthProcessingRef.current = true;
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const clientLocation = await fetchClientLocation();
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        location: clientLocation,
      };
      const response = await axiosInstance.post("/user/login", payload);
      processLoginResponse(response.data);
    } catch (error) {
      console.warn("Popup Sign-in blocked or failed, falling back to redirect:", error);
      if (
        error.code === "auth/popup-blocked" ||
        error.code === "auth/cancelled-popup-request" ||
        error.code === "auth/popup-closed-by-user"
      ) {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          console.error("Redirect Sign-in failed:", redirectError);
        }
      }
    } finally {
      isAuthProcessingRef.current = false;
    }
  };

  useEffect(() => {
    // 1. Process Google auth redirect result on page load
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user && !isAuthProcessingRef.current) {
          isAuthProcessingRef.current = true;
          try {
            const firebaseuser = result.user;
            const clientLocation = await fetchClientLocation();
            const payload = {
              email: firebaseuser.email,
              name: firebaseuser.displayName,
              image: firebaseuser.photoURL || "https://github.com/shadcn.png",
              location: clientLocation,
            };
            const response = await axiosInstance.post("/user/login", payload);
            processLoginResponse(response.data);
          } finally {
            isAuthProcessingRef.current = false;
          }
        }
      })
      .catch((error) => {
        console.error("Google Redirect Auth Error:", error);
      });

    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser && !user && !isAuthProcessingRef.current && !otpData) {
        isAuthProcessingRef.current = true;
        try {
          const clientLocation = await fetchClientLocation();
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
            location: clientLocation,
          };
          const response = await axiosInstance.post("/user/login", payload);
          processLoginResponse(response.data);
        } catch (error) {
          console.error(error);
          logout();
        } finally {
          isAuthProcessingRef.current = false;
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("user-profile-updated"));
        window.dispatchEvent(new Event("video-list-changed"));
      }
      return updated;
    });
  };

  return (
    <UserContext.Provider
      value={{
        user,
        theme,
        toggleTheme,
        login,
        logout,
        handlegooglesignin,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        updateUserData,
        otpData,
        setOtpData,
        verifyLoginOtp,
        resendLoginOtp,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const AuthProvider = UserProvider;

export const useUser = () => useContext(UserContext);