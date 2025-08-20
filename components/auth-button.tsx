'use client';

import { useAuth } from '@/context/AuthContext';

export function AuthButton() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) return null; // or a tiny spinner

  return user ? (
    <button onClick={signOut}>Sign out ({user.displayName ?? user.email ?? 'user'})</button>
  ) : (
    <button onClick={signIn}>Sign in with Google</button>
  );
}
