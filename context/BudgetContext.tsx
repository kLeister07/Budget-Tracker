"use client";

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { BudgetState, BudgetAction, Bill, Debt, Income, Task } from '@/app/types/budget';
import { format, parse, addMonths, isSameMonth, isValid } from 'date-fns';

const initialState: BudgetState = {
  bankBalance: 0,
  bills: [],
  incomes: [],
  debts: [],
  tasks: [],
  lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
};

// Maximum reasonable bank balance to prevent errors
const MAX_BANK_BALANCE = 1000000000; // 1 billion

// Safe date parsing function to handle errors
const safelyParseDate = (dateString: string, formatStr: string, defaultDate: Date): Date => {
  try {
    const date = parse(dateString, formatStr, defaultDate);
    return isValid(date) ? date : defaultDate;
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return defaultDate;
  }
};

const saveState = (state: BudgetState) => {
  if (typeof window !== 'undefined') {
    try {
      // First check if localStorage is available
      if (typeof localStorage === 'undefined') {
        console.error('localStorage is not available');
        return;
      }
      
      // Try setting a test item to check if localStorage works
      localStorage.setItem('budgetStateTest', 'test');
      localStorage.removeItem('budgetStateTest');
      
      // If we got here, localStorage seems to be working
      const stateString = JSON.stringify(state);
      localStorage.setItem('budgetState', stateString);
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
      // We'll continue silently without saving state
    }
  }
};

const loadState = (): BudgetState | undefined => {
  if (typeof window !== 'undefined') {
    try {
      // First check if localStorage is available
      if (typeof localStorage === 'undefined') {
        console.error('localStorage is not available');
        return undefined;
      }
      
      const savedState = localStorage.getItem('budgetState');
      
      if (!savedState) {
        return undefined;
      }
      
      try {
        const parsedState = JSON.parse(savedState);
        
        // Validate that the parsed state has the expected structure
        if (
          typeof parsedState === 'object' && 
          parsedState !== null &&
          'bankBalance' in parsedState &&
          'bills' in parsedState &&
          'incomes' in parsedState &&
          'debts' in parsedState &&
          'tasks' in parsedState
        ) {
          return parsedState;
        } else {
          console.error('Invalid state structure in localStorage');
          return undefined;
        }
      } catch (parseError) {
        console.error('Failed to parse state from localStorage:', parseError);
        // Remove the invalid state to prevent future errors
        try {
          localStorage.removeItem('budgetState');
        } catch (removeError) {
          console.error('Failed to remove invalid state from localStorage:', removeError);
        }
        return undefined;
      }
    } catch (error) {
      console.error('Failed to access localStorage:', error);
      return undefined;
    }
  }
  return undefined;
};

function budgetReducer(state: BudgetState, action: BudgetAction): BudgetState {
  let newState: BudgetState;

  switch (action.type) {
    case 'UPDATE_BANK_BALANCE': {
      // Ensure the amount is a valid number and within reasonable limits
      const amount = action.payload.amount;
      if (isNaN(amount) || !isFinite(amount)) {
        return state;
      }
      
      // Cap at reasonable maximum to prevent overflow issues
      const safeAmount = Math.min(Math.max(amount, -MAX_BANK_BALANCE), MAX_BANK_BALANCE);
      
      newState = {
        ...state,
        bankBalance: safeAmount,
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }

    case 'ADD_BILL': {
      // Validate that the bill has valid properties
      const bill = action.payload;
      if (typeof bill.amount !== 'number' || isNaN(bill.amount)) {
        return state;
      }
      
      newState = {
        ...state,
        bills: [...state.bills, action.payload],
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }

    case 'UPDATE_BILL': {
      // Validate the updated bill
      const bill = action.payload;
      if (typeof bill.amount !== 'number' || isNaN(bill.amount)) {
        return state;
      }
      
      newState = {
        ...state,
        bills: state.bills.map((b) => 
          b.id === action.payload.id ? action.payload : b
        ),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }

    case 'DELETE_BILL':
      newState = {
        ...state,
        bills: state.bills.filter((bill) => bill.id !== action.payload.id),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;

    case 'TOGGLE_BILL_PAID': {
      const bill = state.bills.find((b) => b.id === action.payload.billId);
      
      if (!bill) return state;
      
      const updatedBill = { ...bill, isPaid: !bill.isPaid };
      let updatedDebts = [...state.debts];
      let updatedBalance = state.bankBalance;
      
      // Safely get bill amount
      const billAmount = typeof bill.amount === 'number' && !isNaN(bill.amount) ? bill.amount : 0;
      
      // If marking as paid
      if (!bill.isPaid) {
        // Decrease bank balance
        updatedBalance = Math.max(-MAX_BANK_BALANCE, updatedBalance - billAmount);
        
        // If linked to a debt, reduce the debt balance
        if (bill.linkedDebtId) {
          updatedDebts = updatedDebts.map((debt) => {
            if (debt.id === bill.linkedDebtId) {
              const newBalance = Math.max(0, debt.currentBalance - billAmount);
              return {
                ...debt,
                currentBalance: newBalance,
              };
            }
            return debt;
          });
        }
      } else {
        // If marking as unpaid, reverse the changes
        updatedBalance = Math.min(MAX_BANK_BALANCE, updatedBalance + billAmount);
        
        if (bill.linkedDebtId) {
          updatedDebts = updatedDebts.map((debt) => {
            if (debt.id === bill.linkedDebtId) {
              const newBalance = debt.currentBalance + billAmount;
              return {
                ...debt,
                currentBalance: newBalance > debt.totalAmount ? debt.totalAmount : newBalance,
              };
            }
            return debt;
          });
        }
      }
      
      newState = {
        ...state,
        bankBalance: updatedBalance,
        bills: state.bills.map((b) => (b.id === action.payload.billId ? updatedBill : b)),
        debts: updatedDebts,
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }

    case 'ADD_INCOME': {
      // Validate that the income has valid properties
      const income = action.payload;
      if (typeof income.amount !== 'number' || isNaN(income.amount)) {
        return state;
      }
      
      newState = {
        ...state,
        incomes: [...state.incomes, action.payload],
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }

    case 'UPDATE_INCOME': {
      // Validate the updated income
      const income = action.payload;
      if (typeof income.amount !== 'number' || isNaN(income.amount)) {
        return state;
      }
      
      newState = {
        ...state,
        incomes: state.incomes.map((inc) => 
          inc.id === action.payload.id ? action.payload : inc
        ),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }

    case 'DELETE_INCOME':
      newState = {
        ...state,
        incomes: state.incomes.filter((income) => income.id !== action.payload.id),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;

    case 'TOGGLE_INCOME_RECEIVED': {
      const income = state.incomes.find((i) => i.id === action.payload.incomeId);
      
      if (!income) return state;
      
      const updatedIncome = { ...income, isReceived: !income.isReceived };
      let updatedBalance = state.bankBalance;
      
      // Safely get income amount
      const incomeAmount = typeof income.amount === 'number' && !isNaN(income.amount) ? income.amount : 0;
      
      // If marking as received, add to bank balance
      if (!income.isReceived) {
        updatedBalance = Math.min(MAX_BANK_BALANCE, updatedBalance + incomeAmount);
      } else {
        // If marking as not received, subtract from bank balance
        updatedBalance = Math.max(-MAX_BANK_BALANCE, updatedBalance - incomeAmount);
      }
      
      newState = {
        ...state,
        bankBalance: updatedBalance,
        incomes: state.incomes.map((i) => (i.id === action.payload.incomeId ? updatedIncome : i)),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }

    case 'ADD_DEBT': {
      // Validate that the debt has valid properties
      const debt = action.payload;
      if (
        typeof debt.totalAmount !== 'number' || isNaN(debt.totalAmount) ||
        typeof debt.currentBalance !== 'number' || isNaN(debt.currentBalance) ||
        typeof debt.interestRate !== 'number' || isNaN(debt.interestRate) ||
        typeof debt.minimumPayment !== 'number' || isNaN(debt.minimumPayment)
      ) {
        return state;
      }
      
      newState = {
        ...state,
        debts: [...state.debts, action.payload],
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }

    case 'UPDATE_DEBT': {
      // Validate the updated debt
      const debt = action.payload;
      if (
        typeof debt.totalAmount !== 'number' || isNaN(debt.totalAmount) ||
        typeof debt.currentBalance !== 'number' || isNaN(debt.currentBalance) ||
        typeof debt.interestRate !== 'number' || isNaN(debt.interestRate) ||
        typeof debt.minimumPayment !== 'number' || isNaN(debt.minimumPayment)
      ) {
        return state;
      }
      
      newState = {
        ...state,
        debts: state.debts.map((d) => 
          d.id === action.payload.id ? action.payload : d
        ),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }

    case 'DELETE_DEBT': {
      const updatedDebts = state.debts.filter((debt) => debt.id !== action.payload.id);
      
      // Remove debt ID references from bills
      const updatedBills = state.bills.map((bill) => {
        if (bill.linkedDebtId === action.payload.id) {
          return { ...bill, linkedDebtId: null };
        }
        return bill;
      });
      
      // If the deleted debt was the focus debt, set a new focus
      let finalDebts = [...updatedDebts];
      if (state.debts.find((d) => d.id === action.payload.id)?.isFocus && updatedDebts.length > 0) {
        // Set the smallest debt as the new focus
        const smallestDebt = [...updatedDebts].sort((a, b) => {
          const aBalance = typeof a.currentBalance === 'number' && !isNaN(a.currentBalance) ? a.currentBalance : 0;
          const bBalance = typeof b.currentBalance === 'number' && !isNaN(b.currentBalance) ? b.currentBalance : 0;
          return aBalance - bBalance;
        })[0];
        
        finalDebts = updatedDebts.map(debt => ({
          ...debt,
          isFocus: debt.id === smallestDebt.id
        }));
      }
      
      newState = {
        ...state,
        debts: finalDebts,
        bills: updatedBills,
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
    }
      
    case 'SET_FOCUS_DEBT':
      newState = {
        ...state,
        debts: state.debts.map((debt) => ({
          ...debt,
          isFocus: action.payload.id === '' ? false : debt.id === action.payload.id,
        })),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
      
    case 'ADD_TASK':
      newState = {
        ...state,
        tasks: [...state.tasks, action.payload],
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
      
    case 'UPDATE_TASK':
      newState = {
        ...state,
        tasks: state.tasks.map((task) => 
          task.id === action.payload.id ? action.payload : task
        ),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
      
    case 'TOGGLE_TASK':
      newState = {
        ...state,
        tasks: state.tasks.map((task) => 
          task.id === action.payload.id ? { ...task, completed: !task.completed } : task
        ),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
      
    case 'DELETE_TASK':
      newState = {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.payload.id),
        lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
      };
      break;
      
    case 'GENERATE_RECURRING_ITEMS': {
      try {
        console.log('Starting GENERATE_RECURRING_ITEMS');
        const targetDate = safelyParseDate(action.payload.date, 'MMM d, yyyy', new Date());
        
        // Sets to track processed items to prevent duplicates
        const processedBillIds = new Set<string>();
        const processedIncomeIds = new Set<string>();
        
        // Generate recurring bills
        console.log('Filtering existing bills');
        const existingBills = state.bills.filter((bill) => {
          try {
            const billDate = safelyParseDate(bill.dueDate, 'MMM d, yyyy', new Date());
            return !isSameMonth(billDate, targetDate);
          } catch (error) {
            console.error('Error filtering bills:', error);
            return true; // Keep the bill if there's an error
          }
        });
        
        console.log('Creating recurring bills');
        const recurringBills: Bill[] = [];
        
        state.bills
          .filter(bill => bill.isRecurring)
          .forEach(bill => {
            if (processedBillIds.has(bill.id)) {
              return; // Skip if already processed to prevent duplicates
            }
            
            processedBillIds.add(bill.id);
            
            try {
              const currentDate = safelyParseDate(bill.dueDate, 'MMM d, yyyy', new Date());
              const newDate = addMonths(currentDate, 1);
              
              recurringBills.push({
                ...bill,
                id: `${Date.now().toString()}-${Math.random().toString(36).substr(2, 9)}`,
                isPaid: false,
                dueDate: format(newDate, 'MMM d, yyyy')
              });
            } catch (error) {
              console.error('Error creating recurring bill:', error);
              
              // Fallback to creating a copy with the same date if there's an error
              recurringBills.push({
                ...bill,
                id: `${Date.now().toString()}-${Math.random().toString(36).substr(2, 9)}`,
                isPaid: false
              });
            }
          });
          
        // Generate recurring incomes
        console.log('Filtering existing incomes');
        const existingIncomes = state.incomes.filter((income) => {
          try {
            const incomeDate = safelyParseDate(income.expectedDate, 'MMM d, yyyy', new Date());
            return !isSameMonth(incomeDate, targetDate);
          } catch (error) {
            console.error('Error filtering incomes:', error);
            return true; // Keep the income if there's an error
          }
        });
        
        console.log('Creating recurring incomes');
        const recurringIncomes: Income[] = [];
        
        state.incomes
          .filter(income => income.isRecurring)
          .forEach(income => {
            if (processedIncomeIds.has(income.id)) {
              return; // Skip if already processed to prevent duplicates
            }
            
            processedIncomeIds.add(income.id);
            
            try {
              const currentDate = safelyParseDate(income.expectedDate, 'MMM d, yyyy', new Date());
              const newDate = addMonths(currentDate, 1);
              
              recurringIncomes.push({
                ...income,
                id: `${Date.now().toString()}-${Math.random().toString(36).substr(2, 9)}`,
                isReceived: false,
                expectedDate: format(newDate, 'MMM d, yyyy')
              });
            } catch (error) {
              console.error('Error creating recurring income:', error);
              
              // Fallback to creating a copy with the same date if there's an error
              recurringIncomes.push({
                ...income,
                id: `${Date.now().toString()}-${Math.random().toString(36).substr(2, 9)}`,
                isReceived: false
              });
            }
          });
        
        console.log('Finalizing state with recurring items');
        newState = {
          ...state,
          bills: [...existingBills, ...recurringBills],
          incomes: [...existingIncomes, ...recurringIncomes],
          lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
        };
      } catch (error) {
        console.error('Major error in GENERATE_RECURRING_ITEMS:', error);
        // If there's an error processing dates, return the original state
        newState = {
          ...state,
          lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss'),
        };
      }
      break;
    }
      
    default:
      return state;
  }
  
  return newState;
}

type BudgetContextType = {
  state: BudgetState;
  dispatch: React.Dispatch<BudgetAction>;
  resetBudget: () => void;
};

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(
    budgetReducer,
    loadState() || initialState
  );

  useEffect(() => {
    try {
      saveState(state);
    } catch (error) {
      console.error('Error saving state', error);
    }
  }, [state]);

  const resetBudget = () => {
    if (typeof window !== 'undefined') {
      try {
        // First, clear local storage
        localStorage.removeItem('budgetState');
        
        // Create a fresh state with current timestamp
        const freshState = {
          ...initialState,
          lastUpdated: format(new Date(), 'MMM d, yyyy HH:mm:ss')
        };
        
        // Save empty state to localStorage
        localStorage.setItem('budgetState', JSON.stringify(freshState));
        
        // Force a complete reload of the page to ensure a clean state
        window.location.reload();
      } catch (error) {
        console.error('Failed to reset budget', error);
      }
    }
  };

  return (
    <BudgetContext.Provider value={{ state, dispatch, resetBudget }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}