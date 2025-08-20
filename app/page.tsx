'use client'; // ⬅️ needed because we use useAuth directly here

import { MainDashboard } from '@/components/main-dashboard';
import { ThemeToggle } from '@/components/theme-toggle';
import { InspirationalQuote } from '@/components/inspirational-quote';
import { AuthButton } from '@/components/auth-button';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

export default function Home() {
  const { user, loading } = useAuth();
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  if (loading) return null; // or a spinner

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-semibold">Sign in to continue</h1>
          <AuthButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <main className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Budget Tracker</h1>
            <p className="text-muted-foreground">Today: {today}</p>
          </div>

          <div className="flex-1 mx-4 hidden md:block">
            <InspirationalQuote />
          </div>

          <div className="flex items-center gap-3">
            <AuthButton />
            <ThemeToggle />
          </div>
        </div>

        <div className="md:hidden mb-6">
          <InspirationalQuote />
        </div>

        <MainDashboard />
      </main>
    </div>
  );
}
