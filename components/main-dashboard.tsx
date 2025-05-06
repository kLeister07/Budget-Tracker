"use client";

import { useState, useEffect } from 'react';
import { BankBalanceCard } from '@/components/bank-balance-card';
import { MonthlyBudget } from '@/components/monthly-budget';
import { DebtTracker } from '@/components/debt-tracker';
import { TaskList } from '@/components/task-list';

export function MainDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <BankBalanceCard />
        <MonthlyBudget />
      </div>
      <div className="space-y-6">
        <DebtTracker />
        <TaskList category="asap" />
      </div>
    </div>
  );
}