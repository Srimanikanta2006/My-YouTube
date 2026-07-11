"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  _id?: string;
  channelname?: string;
}

interface AuthContextType {
  user: User | null;
  logout: () => void;
  handlegooglesignin: () => void;
  login: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const handlegooglesignin = useCallback(() => {
    // TODO: Implement Google sign-in logic
  }, []);

  const login = useCallback((userData: User) => {
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider value={{ user, logout, handlegooglesignin, login }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useUser must be used within AuthProvider");
  }
  return context;
};
