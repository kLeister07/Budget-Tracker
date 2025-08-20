// context/BudgetContext.tsx
'use client';

import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { format, parse, addMonths, isSameMonth, isValid } from 'date-fns';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { BudgetState, BudgetAction } from '@/app/types/budget';

// -------- constants / utils (unchanged) --------
const initialState: BudgetState = {
  bankBalance: 0,
  bills: [],
  incomes: [],
  debts: [],
  tasks: [],
  lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
};

const MAX_BANK_BALANCE = 1_000_000_000; // 1B

const safelyParseDate = (dateString: string, formatStr: string, defaultDate: Date): Date => {
  try {
    const date = parse(dateString, formatStr, defaultDate);
    return isValid(date) ? date : defaultDate;
  } catch {
    return defaultDate;
  }
};

// ---------- INTERNAL action (for Firestore hydration only) ----------
type InternalAction = BudgetAction | { type: 'HYDRATE'; payload: BudgetState };

// ---------- reducer (your logic + HYDRATE) ----------
function budgetReducer(state: BudgetState, action: InternalAction): BudgetState {
  if (action.type === 'HYDRATE') {
    const next = action.payload;
    // minimal shape check
    if (!next || typeof next !== 'object' || typeof next.bankBalance !== 'number') return state;
    return next;
  }

  let newState: BudgetState;
  switch (action.type) {
    case 'UPDATE_BANK_BALANCE': {
      const amount = action.payload.amount;
      if (isNaN(amount) || !isFinite(amount)) return state;
      const safeAmount = Math.min(Math.max(amount, -MAX_BANK_BALANCE), MAX_BANK_BALANCE);
      newState = { ...state, bankBalance: safeAmount, lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss') };
      break;
    }
    case 'ADD_BILL': {
      const bill = action.payload;
      if (typeof bill.amount !== 'number' || isNaN(bill.amount)) return state;
      newState = { ...state, bills: [...state.bills, bill], lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss') };
      break;
    }
    case 'UPDATE_BILL': {
      const bill = action.payload;
      if (typeof bill.amount !== 'number' || isNaN(bill.amount)) return state;
      newState = {
        ...state,
        bills: state.bills.map(b => (b.id === bill.id ? bill : b)),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }
    case 'DELETE_BILL':
      newState = {
        ...state,
        bills: state.bills.filter(b => b.id !== action.payload.id),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;

    case 'TOGGLE_BILL_PAID': {
      const bill = state.bills.find(b => b.id === action.payload.billId);
      if (!bill) return state;

      const updatedBill = { ...bill, isPaid: !bill.isPaid };
      let updatedBalance = state.bankBalance;
      const amt = typeof bill.amount === 'number' && !isNaN(bill.amount) ? bill.amount : 0;

      if (!bill.isPaid) updatedBalance = Math.max(-MAX_BANK_BALANCE, updatedBalance - amt);
      else updatedBalance = Math.min(MAX_BANK_BALANCE, updatedBalance + amt);

      // adjust debts if linked
      let updatedDebts = state.debts;
      if (bill.linkedDebtId) {
        updatedDebts = updatedDebts.map(d => {
          if (d.id !== bill.linkedDebtId) return d;
          const nb = !bill.isPaid ? Math.max(0, d.currentBalance - amt) : Math.min(d.totalAmount, d.currentBalance + amt);
          return { ...d, currentBalance: nb };
        });
      }

      newState = {
        ...state,
        bankBalance: updatedBalance,
        bills: state.bills.map(b => (b.id === bill.id ? updatedBill : b)),
        debts: updatedDebts,
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }

    case 'ADD_INCOME': {
      const inc = action.payload;
      if (typeof inc.amount !== 'number' || isNaN(inc.amount)) return state;
      newState = { ...state, incomes: [...state.incomes, inc], lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss') };
      break;
    }
    case 'UPDATE_INCOME': {
      const inc = action.payload;
      if (typeof inc.amount !== 'number' || isNaN(inc.amount)) return state;
      newState = {
        ...state,
        incomes: state.incomes.map(i => (i.id === inc.id ? inc : i)),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }
    case 'DELETE_INCOME':
      newState = {
        ...state,
        incomes: state.incomes.filter(i => i.id !== action.payload.id),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;

    case 'TOGGLE_INCOME_RECEIVED': {
      const inc = state.incomes.find(i => i.id === action.payload.incomeId);
      if (!inc) return state;
      const updated = { ...inc, isReceived: !inc.isReceived };
      const amt = typeof inc.amount === 'number' && !isNaN(inc.amount) ? inc.amount : 0;
      const updatedBalance = !inc.isReceived
        ? Math.min(MAX_BANK_BALANCE, state.bankBalance + amt)
        : Math.max(-MAX_BANK_BALANCE, state.bankBalance - amt);

      newState = {
        ...state,
        bankBalance: updatedBalance,
        incomes: state.incomes.map(i => (i.id === inc.id ? updated : i)),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }

    case 'ADD_DEBT': {
      const d = action.payload;
      if (
        [d.totalAmount, d.currentBalance, d.interestRate, d.minimumPayment].some(v => typeof v !== 'number' || isNaN(v))
      ) return state;
      newState = { ...state, debts: [...state.debts, d], lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss') };
      break;
    }
    case 'UPDATE_DEBT': {
      const d = action.payload;
      if (
        [d.totalAmount, d.currentBalance, d.interestRate, d.minimumPayment].some(v => typeof v !== 'number' || isNaN(v))
      ) return state;
      newState = {
        ...state,
        debts: state.debts.map(x => (x.id === d.id ? d : x)),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }
    case 'DELETE_DEBT': {
      const pruned = state.debts.filter(d => d.id !== action.payload.id);
      const bills = state.bills.map(b => (b.linkedDebtId === action.payload.id ? { ...b, linkedDebtId: null } : b));

      // choose new focus if removed one was focus
      let finalDebts = pruned;
      const removedWasFocus = state.debts.find(d => d.id === action.payload.id)?.isFocus;
      if (removedWasFocus && pruned.length > 0) {
        const smallest = [...pruned].sort((a, b) => (a.currentBalance || 0) - (b.currentBalance || 0))[0];
        finalDebts = pruned.map(d => ({ ...d, isFocus: d.id === smallest.id }));
      }

      newState = { ...state, debts: finalDebts, bills, lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss') };
      break;
    }
    case 'SET_FOCUS_DEBT':
      newState = {
        ...state,
        debts: state.debts.map(d => ({ ...d, isFocus: action.payload.id === '' ? false : d.id === action.payload.id })),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;

    case 'ADD_TASK':
      newState = { ...state, tasks: [...state.tasks, action.payload], lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss') };
      break;
    case 'UPDATE_TASK':
      newState = {
        ...state,
        tasks: state.tasks.map(t => (t.id === action.payload.id ? action.payload : t)),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    case 'TOGGLE_TASK':
      newState = {
        ...state,
        tasks: state.tasks.map(t => (t.id === action.payload.id ? { ...t, completed: !t.completed } : t)),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    case 'DELETE_TASK':
      newState = { ...state, tasks: state.tasks.filter(t => t.id !== action.payload.id), lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss') };
      break;

    case 'GENERATE_RECURRING_ITEMS': {
      try {
        const targetDate = safelyParseDate(action.payload.date, 'MMM d, yyyy', new Date());
        const processedBillIds = new Set<string>();
        const processedIncomeIds = new Set<string>();

        const existingBills = state.bills.filter(b => {
          try { return !isSameMonth(safelyParseDate(b.dueDate, 'MMM d, yyyy', new Date()), targetDate); }
          catch { return true; }
        });

        const recurringBills = state.bills
          .filter(b => b.isRecurring)
          .flatMap(b => {
            if (processedBillIds.has(b.id)) return [];
            processedBillIds.add(b.id);
            try {
              const d = addMonths(safelyParseDate(b.dueDate, 'MMM d, yyyy', new Date()), 1);
              return [{ ...b, id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, isPaid: false, dueDate: format(d, 'MMM d, yyyy') }];
            } catch {
              return [{ ...b, id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, isPaid: false }];
            }
          });

        const existingIncomes = state.incomes.filter(i => {
          try { return !isSameMonth(safelyParseDate(i.expectedDate, 'MMM d, yyyy', new Date()), targetDate); }
          catch { return true; }
        });

        const recurringIncomes = state.incomes
          .filter(i => i.isRecurring)
          .flatMap(i => {
            if (processedIncomeIds.has(i.id)) return [];
            processedIncomeIds.add(i.id);
            try {
              const d = addMonths(safelyParseDate(i.expectedDate, 'MMM d, yyyy', new Date()), 1);
              return [{ ...i, id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, isReceived: false, expectedDate: format(d, 'MMM d, yyyy') }];
            } catch {
              return [{ ...i, id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, isReceived: false }];
            }
          });

        newState = {
          ...state,
          bills: [...existingBills, ...recurringBills],
          incomes: [...existingIncomes, ...recurringIncomes],
          lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
        };
      } catch {
        newState = { ...state, lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss') };
      }
      break;
    }

    default:
      return state;
  }

  return newState;
}

// ---------- context ----------
type BudgetContextType = {
  state: BudgetState;
  dispatch: React.Dispatch<BudgetAction>; // external callers only see your union
  resetBudget: () => void;
};

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

// debounce helper
function useDebounced<T extends (...args: any[]) => void>(fn: T, ms: number) {
  const t = useRef<number | null>(null);
  return (...args: Parameters<T>) => {
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => fn(...args), ms) as unknown as number;
  };
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Keep internal reducer with InternalAction
  const [state, dispatchInternal] = useReducer(budgetReducer, initialState);

  // Adapter so components only dispatch BudgetAction (HYDRATE is internal)
  const dispatch: React.Dispatch<BudgetAction> = (action) => dispatchInternal(action);

  // firestore doc path: users/{uid}/budget/state
  const docRef = user ? doc(db, `users/${user.uid}/budget/state`) : null;

  // subscribe to Firestore (hydrate on changes)
  useEffect(() => {
    if (!docRef) return;
    const unsub = onSnapshot(docRef, snap => {
      if (snap.exists()) {
        dispatchInternal({ type: 'HYDRATE', payload: snap.data() as BudgetState });
      } else {
        // seed with current memory state if no doc yet
        setDoc(docRef, state).catch(console.error);
      }
    }, console.error);
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // debounced persist on state change
  const persist = useDebounced(async (next: BudgetState) => {
    if (!docRef) return;
    try { await setDoc(docRef, next, { merge: true }); } catch (e) { console.error('Firestore save failed', e); }
  }, 300);

  useEffect(() => { if (docRef) persist(state); /* else: logged out, keep in memory */ }, [state, docRef, persist]);

  const resetBudget = async () => {
    const fresh = { ...initialState, lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss') };
    dispatchInternal({ type: 'HYDRATE', payload: fresh });
    if (docRef) await setDoc(docRef, fresh, { merge: false });
  };

  return (
    <BudgetContext.Provider value={{ state, dispatch, resetBudget }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within a BudgetProvider');
  return ctx;
}
