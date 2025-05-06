export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
  isRecurring: boolean;
  frequency?: 'monthly' | 'weekly' | 'biweekly';
}

export interface Income {
  id: string;
  source: string;
  amount: number;
  expectedDate: Date;
  isRecurring: boolean;
  frequency?: 'monthly' | 'weekly' | 'biweekly';
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: Date;
  isFocus: boolean;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  category: 'asap' | 'todo';
  createdAt: Date;
}

export interface BankBalance {
  currentBalance: number;
  lastUpdated: Date;
}