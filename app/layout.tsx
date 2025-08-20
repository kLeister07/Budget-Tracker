import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { BudgetProvider } from '@/context/BudgetContext';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Budget Tracker',
  description: 'Personal finance management application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <AuthProvider>
            <BudgetProvider>
              {children}
              <Toaster />
            </BudgetProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}