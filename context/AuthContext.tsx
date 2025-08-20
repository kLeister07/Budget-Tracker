// context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuth, signInWithGoogle, logOut } from '@/lib/firebase';
import type { User } from 'firebase/auth';

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuth(u => { setUser(u); setLoading(false); }), []);

  return (
    <Ctx.Provider value={{
      user,
      loading,
      signIn: async () => { await signInWithGoogle(); },
      signOut: async () => { await logOut(); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
