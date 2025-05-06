export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  isRecurring: boolean;
  linkedDebtId: string | null;
  frequency?: 'monthly' | 'weekly' | 'biweekly';
}

export interface Income {
  id: string;
  source: string;
  amount: number;
  expectedDate: string;
  isRecurring: boolean;
  frequency?: 'monthly' | 'weekly' | 'biweekly';
  isReceived: boolean;
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: string;
  isFocus: boolean;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  category: 'asap' | 'todo';
  createdAt: string;
}

export interface BudgetState {
  bankBalance: number;
  bills: Bill[];
  incomes: Income[];
  debts: Debt[];
  tasks: Task[];
  lastUpdated: string;
}

export type BudgetAction =
  | { type: 'UPDATE_BANK_BALANCE'; payload: { amount: number } }
  | { type: 'ADD_BILL'; payload: Bill }
  | { type: 'UPDATE_BILL'; payload: Bill }
  | { type: 'DELETE_BILL'; payload: { id: string } }
  | { type: 'TOGGLE_BILL_PAID'; payload: { billId: string } }
  | { type: 'ADD_INCOME'; payload: Income }
  | { type: 'UPDATE_INCOME'; payload: Income }
  | { type: 'DELETE_INCOME'; payload: { id: string } }
  | { type: 'TOGGLE_INCOME_RECEIVED'; payload: { incomeId: string } }
  | { type: 'ADD_DEBT'; payload: Debt }
  | { type: 'UPDATE_DEBT'; payload: Debt }
  | { type: 'DELETE_DEBT'; payload: { id: string } }
  | { type: 'SET_FOCUS_DEBT'; payload: { id: string } }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'TOGGLE_TASK'; payload: { id: string } }
  | { type: 'DELETE_TASK'; payload: { id: string } }
  | { type: 'GENERATE_RECURRING_ITEMS'; payload: { date: string } };