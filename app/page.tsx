import { MainDashboard } from '@/components/main-dashboard';
import { ThemeToggle } from '@/components/theme-toggle';
import { InspirationalQuote } from '@/components/inspirational-quote';
import { format } from 'date-fns';

export default function Home() {
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

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
          
          <ThemeToggle />
        </div>
        
        <div className="md:hidden mb-6">
          <InspirationalQuote />
        </div>
        
        <MainDashboard />
      </main>
    </div>
  );
}