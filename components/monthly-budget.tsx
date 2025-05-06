"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, RotateCcw, Calendar as CalendarIcon, Check, DollarSign } from 'lucide-react';
import { format, parse, compareAsc, addMonths, differenceInDays, isSameDay, isSameMonth, isValid } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useBudget } from '@/context/BudgetContext';
import { Bill, Income } from '@/app/types/budget';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Safe date parsing helper
const safelyParseDate = (dateString: string, formatString: string): Date | null => {
  try {
    const parsedDate = parse(dateString, formatString, new Date());
    if (isValid(parsedDate)) {
      return parsedDate;
    }
  } catch (error) {
    console.error(`Failed to parse date: ${dateString} with format: ${formatString}`, error);
  }
  return null;
};

export function MonthlyBudget() {
  const { state, dispatch } = useBudget();
  const { bills, incomes, debts } = state;
  
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isEditBillOpen, setIsEditBillOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [isEditIncomeOpen, setIsEditIncomeOpen] = useState(false);
  
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  
  const [newBill, setNewBill] = useState({ 
    name: '', 
    amount: '', 
    dueDate: new Date(), 
    isRecurring: true,
    linkedDebtId: null as string | null
  });
  
  const [newIncome, setNewIncome] = useState({ 
    source: '', 
    amount: '', 
    expectedDate: new Date(), 
    isRecurring: true 
  });

  const calculateMonthlyTotals = (month: Date) => {
    try {
      const monthlyBills = bills.reduce((total, bill) => {
        try {
          const billDate = safelyParseDate(bill.dueDate, 'MMM d, yyyy');
          if (billDate && isSameMonth(billDate, month)) {
            return total + (typeof bill.amount === 'number' && !isNaN(bill.amount) ? bill.amount : 0);
          }
        } catch (error) {
          console.error('Error calculating bill total:', bill, error);
        }
        return total;
      }, 0);

      const monthlyIncomes = incomes.reduce((total, income) => {
        try {
          const incomeDate = safelyParseDate(income.expectedDate, 'MMM d, yyyy');
          if (incomeDate && isSameMonth(incomeDate, month)) {
            return total + (typeof income.amount === 'number' && !isNaN(income.amount) ? income.amount : 0);
          }
        } catch (error) {
          console.error('Error calculating income total:', income, error);
        }
        return total;
      }, 0);

      return {
        totalBills: monthlyBills,
        totalIncome: monthlyIncomes,
        remaining: monthlyIncomes - monthlyBills
      };
    } catch (error) {
      console.error('Error calculating monthly totals:', error);
      return {
        totalBills: 0,
        totalIncome: 0,
        remaining: 0
      };
    }
  };

  const handleAddBill = () => {
    try {
      if (newBill.name && newBill.amount) {
        const amount = parseFloat(newBill.amount.toString());
        
        if (isNaN(amount) || !isFinite(amount)) {
          toast({
            title: "Invalid Amount",
            description: "Please enter a valid number for the bill amount",
            variant: "destructive"
          });
          return;
        }
        
        if (amount <= 0) {
          toast({
            title: "Invalid Amount",
            description: "Bill amount must be greater than zero",
            variant: "destructive"
          });
          return;
        }
        
        // Validate due date
        if (!(newBill.dueDate instanceof Date) || isNaN(newBill.dueDate.getTime())) {
          toast({
            title: "Invalid Due Date",
            description: "Please select a valid due date",
            variant: "destructive"
          });
          return;
        }
        
        const newBillEntry: Bill = {
          id: Date.now().toString(),
          name: newBill.name,
          amount: amount,
          dueDate: format(newBill.dueDate, 'MMM d, yyyy'),
          isPaid: false,
          isRecurring: newBill.isRecurring,
          linkedDebtId: newBill.linkedDebtId
        };
        
        dispatch({
          type: 'ADD_BILL',
          payload: newBillEntry
        });
        
        setNewBill({ 
          name: '', 
          amount: '', 
          dueDate: new Date(), 
          isRecurring: true,
          linkedDebtId: null
        });
        
        setIsAddBillOpen(false);
        
        toast({
          title: "Bill Added",
          description: `${newBillEntry.name} has been added to your monthly budget.`,
        });
      } else {
        toast({
          title: "Missing Information",
          description: "Please provide both a name and amount for the bill",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding bill:', error);
      toast({
        title: "Error",
        description: "An error occurred while adding the bill. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEditBill = () => {
    try {
      if (editingBill) {
        // Ensure amount is a valid number
        if (typeof editingBill.amount !== 'number' || isNaN(editingBill.amount) || !isFinite(editingBill.amount)) {
          toast({
            title: "Invalid Amount",
            description: "Please enter a valid number for the bill amount",
            variant: "destructive"
          });
          return;
        }
        
        if (editingBill.amount <= 0) {
          toast({
            title: "Invalid Amount",
            description: "Bill amount must be greater than zero",
            variant: "destructive"
          });
          return;
        }
        
        dispatch({
          type: 'UPDATE_BILL',
          payload: editingBill
        });
        
        setIsEditBillOpen(false);
        setEditingBill(null);
        
        toast({
          title: "Bill Updated",
          description: `${editingBill.name} has been updated successfully.`,
        });
      }
    } catch (error) {
      console.error('Error editing bill:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating the bill. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddIncome = () => {
    try {
      if (newIncome.source && newIncome.amount) {
        const amount = parseFloat(newIncome.amount.toString());
        
        if (isNaN(amount) || !isFinite(amount)) {
          toast({
            title: "Invalid Amount",
            description: "Please enter a valid number for the income amount",
            variant: "destructive"
          });
          return;
        }
        
        if (amount <= 0) {
          toast({
            title: "Invalid Amount",
            description: "Income amount must be greater than zero",
            variant: "destructive"
          });
          return;
        }
        
        // Validate expected date
        if (!(newIncome.expectedDate instanceof Date) || isNaN(newIncome.expectedDate.getTime())) {
          toast({
            title: "Invalid Expected Date",
            description: "Please select a valid expected date",
            variant: "destructive"
          });
          return;
        }
        
        const newIncomeEntry = {
          id: Date.now().toString(),
          source: newIncome.source,
          amount: amount,
          expectedDate: format(newIncome.expectedDate, 'MMM d, yyyy'),
          isRecurring: newIncome.isRecurring,
          isReceived: false
        };
        
        dispatch({
          type: 'ADD_INCOME',
          payload: newIncomeEntry
        });
        
        setNewIncome({ 
          source: '', 
          amount: '', 
          expectedDate: new Date(), 
          isRecurring: true 
        });
        
        setIsAddIncomeOpen(false);
        
        toast({
          title: "Income Added",
          description: "New income has been added to your monthly budget.",
        });
      } else {
        toast({
          title: "Missing Information",
          description: "Please provide both a source and amount for the income",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding income:', error);
      toast({
        title: "Error",
        description: "An error occurred while adding the income. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEditIncome = () => {
    try {
      if (editingIncome) {
        // Ensure amount is a valid number
        if (typeof editingIncome.amount !== 'number' || isNaN(editingIncome.amount) || !isFinite(editingIncome.amount)) {
          toast({
            title: "Invalid Amount",
            description: "Please enter a valid number for the income amount",
            variant: "destructive"
          });
          return;
        }
        
        if (editingIncome.amount <= 0) {
          toast({
            title: "Invalid Amount",
            description: "Income amount must be greater than zero",
            variant: "destructive"
          });
          return;
        }
        
        dispatch({
          type: 'UPDATE_INCOME',
          payload: editingIncome
        });
        
        setIsEditIncomeOpen(false);
        setEditingIncome(null);
        
        toast({
          title: "Income Updated",
          description: "Income has been updated successfully.",
        });
      }
    } catch (error) {
      console.error('Error editing income:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating the income. Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleBillPaid = (id: string) => {
    try {
      dispatch({
        type: 'TOGGLE_BILL_PAID',
        payload: { billId: id }
      });
    } catch (error) {
      console.error('Error toggling bill paid status:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating the bill. Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleIncomeReceived = (id: string) => {
    try {
      dispatch({
        type: 'TOGGLE_INCOME_RECEIVED',
        payload: { incomeId: id }
      });
      
      toast({
        title: "Income Status Updated",
        description: "Income received status has been updated.",
      });
    } catch (error) {
      console.error('Error toggling income received status:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating the income. Please try again.",
        variant: "destructive"
      });
    }
  };

  const startEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setIsEditBillOpen(true);
  };

  const startEditIncome = (income: Income) => {
    setEditingIncome(income);
    setIsEditIncomeOpen(true);
  };

  const deleteBill = (id: string) => {
    try {
      dispatch({
        type: 'DELETE_BILL',
        payload: { id }
      });
      
      toast({
        title: "Bill Removed",
        description: "The bill has been removed from your budget.",
      });
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the bill. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deleteIncome = (id: string) => {
    try {
      dispatch({
        type: 'DELETE_INCOME',
        payload: { id }
      });
      
      toast({
        title: "Income Removed",
        description: "The income has been removed from your budget.",
      });
    } catch (error) {
      console.error('Error deleting income:', error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the income. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    try {
      const newMonth = direction === 'next' 
        ? addMonths(currentMonth, 1)
        : addMonths(currentMonth, -1);
      
      setCurrentMonth(newMonth);
      
      // Only create new recurring items when moving forward
      if (direction === 'next') {
        // Ensure we have a valid date before formatting
        if (newMonth instanceof Date && !isNaN(newMonth.getTime())) {
          console.log('Generating recurring items for:', format(newMonth, 'MMM d, yyyy'));
          dispatch({
            type: 'GENERATE_RECURRING_ITEMS',
            payload: { date: format(newMonth, 'MMM d, yyyy') }
          });
        }
      }
    } catch (error) {
      console.error('Error changing month:', error);
      toast({
        title: "Error",
        description: "An error occurred while changing the month. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getBillStatus = (dueDate: string) => {
    try {
      const today = new Date();
      const billDate = safelyParseDate(dueDate, 'MMM d, yyyy');
      if (!billDate) {
        return 'normal';
      }
      
      const daysUntilDue = differenceInDays(billDate, today);
      
      if (daysUntilDue < 0 || isSameDay(billDate, today)) {
        return 'overdue';
      } else if (daysUntilDue <= 3) {
        return 'upcoming';
      }
      return 'normal';
    } catch (error) {
      console.error('Error getting bill status:', error);
      return 'normal';
    }
  };

  const filteredTransactions = (() => {
    try {
      return [...bills.filter(bill => {
        try {
          const billDate = safelyParseDate(bill.dueDate, 'MMM d, yyyy');
          return billDate && isSameMonth(billDate, currentMonth);
        } catch (error) {
          console.error('Error filtering bill by month:', bill, error);
          return false;
        }
      }).map(bill => ({
        ...bill,
        type: 'bill' as const,
        date: bill.dueDate
      })), ...incomes.filter(income => {
        try {
          const incomeDate = safelyParseDate(income.expectedDate, 'MMM d, yyyy');
          return incomeDate && isSameMonth(incomeDate, currentMonth);
        } catch (error) {
          console.error('Error filtering income by month:', income, error);
          return false;
        }
      }).map(income => ({
        ...income,
        type: 'income' as const,
        date: income.expectedDate
      }))].sort((a, b) => {
        try {
          const dateA = safelyParseDate(a.date, 'MMM d, yyyy');
          const dateB = safelyParseDate(b.date, 'MMM d, yyyy');
          
          if (!dateA || !dateB) {
            return 0;
          }
          
          const dateCompare = compareAsc(dateA, dateB);
          
          if (dateCompare === 0) {
            return a.type === 'income' ? -1 : 1;
          }
          return dateCompare;
        } catch (error) {
          console.error('Error sorting transactions:', error);
          return 0;
        }
      });
    } catch (error) {
      console.error('Error filtering transactions:', error);
      return [];
    }
  })();

  const currentMonthTotals = calculateMonthlyTotals(currentMonth);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <h3 className="text-lg font-semibold">Monthly Budget</h3>
          <p className="text-sm text-muted-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              Total Income: <span className="font-medium text-green-600">${currentMonthTotals.totalIncome.toFixed(2)}</span>
            </p>
            <p className="text-sm">
              Total Bills: <span className="font-medium text-red-600">${currentMonthTotals.totalBills.toFixed(2)}</span>
            </p>
            <p className="text-sm">
              Remaining: <span className={`font-medium ${currentMonthTotals.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${currentMonthTotals.remaining.toFixed(2)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => handleMonthChange('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleMonthChange('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setIsAddBillOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bill
          </Button>
          <Button variant="outline" onClick={() => setIsAddIncomeOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Income
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filteredTransactions.map(transaction => (
            transaction.type === 'income' ? (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <Checkbox 
                    checked={transaction.isReceived} 
                    onCheckedChange={() => toggleIncomeReceived(transaction.id)}
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{transaction.source}</p>
                      {transaction.isRecurring && (
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                      )}
                      {transaction.isReceived && (
                        <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
                          Received
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Expected: {transaction.date}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-green-600 dark:text-green-400">
                    +${transaction.amount.toFixed(2)}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => startEditIncome(transaction)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteIncome(transaction.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={transaction.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  getBillStatus(transaction.dueDate) === 'overdue'
                    ? 'bg-red-50 dark:bg-red-950'
                    : getBillStatus(transaction.dueDate) === 'upcoming'
                    ? 'bg-yellow-50 dark:bg-yellow-950'
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <Checkbox 
                    checked={transaction.isPaid} 
                    onCheckedChange={() => toggleBillPaid(transaction.id)}
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{transaction.name}</p>
                      {transaction.isRecurring && (
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                      )}
                      {transaction.linkedDebtId && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                          Linked to Debt
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Due: {transaction.dueDate}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">${transaction.amount.toFixed(2)}</span>
                  <Button variant="ghost" size="icon" onClick={() => startEditBill(transaction)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteBill(transaction.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          ))}
          
          {filteredTransactions.length === 0 && (
            <div className="text-center p-6 text-muted-foreground">
              No transactions for this month. Add bills or income using the buttons above.
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={isAddBillOpen} onOpenChange={setIsAddBillOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Bill</DialogTitle>
            <DialogDescription>
              Create a new bill and optionally link it to an existing debt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Bill Name"
                value={newBill.name}
                onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Amount"
                value={newBill.amount}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewBill({ ...newBill, amount: value });
                }}
              />
            </div>
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newBill.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newBill.dueDate ? format(newBill.dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newBill.dueDate}
                    onSelect={(date) => setNewBill({ ...newBill, dueDate: date || new Date() })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={newBill.isRecurring}
                onCheckedChange={(checked) => 
                  setNewBill({ ...newBill, isRecurring: checked as boolean })
                }
              />
              <label htmlFor="recurring" className="text-sm">Recurring monthly</label>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Link to Debt (Optional)</label>
              <Select
                value={newBill.linkedDebtId || undefined}
                onValueChange={(value) => setNewBill({ ...newBill, linkedDebtId: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No linked debt" />
                </SelectTrigger>
                <SelectContent>
                  {debts.map(debt => (
                    <SelectItem key={debt.id} value={debt.id}>
                      {debt.name} (${debt.currentBalance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newBill.linkedDebtId && (
                <p className="text-xs text-muted-foreground">
                  When this bill is paid, its amount will be deducted from the linked debt.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddBill}>Add Bill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditBillOpen} onOpenChange={setIsEditBillOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
            <DialogDescription>
              Update bill details or link it to a debt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Bill Name"
                value={editingBill?.name || ''}
                onChange={(e) => setEditingBill(prev => prev ? {...prev, name: e.target.value} : null)}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Amount"
                value={editingBill?.amount || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setEditingBill(prev => prev ? {...prev, amount: isNaN(value) ? 0 : value} : null);
                }}
              />
            </div>
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editingBill?.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editingBill?.dueDate ? editingBill.dueDate : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editingBill?.dueDate ? safelyParseDate(editingBill.dueDate, 'MMM d, yyyy') || undefined : undefined}
                    onSelect={(date) => setEditingBill(prev => prev ? {...prev, dueDate: format(date || new Date(), 'MMM d, yyyy')} : null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="editRecurring"
                checked={editingBill?.isRecurring}
                onCheckedChange={(checked) => 
                  setEditingBill(prev => prev ? {...prev, isRecurring: checked as boolean} : null)
                }
              />
              <label htmlFor="editRecurring" className="text-sm">Recurring monthly</label>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Link to Debt (Optional)</label>
              <Select
                value={editingBill?.linkedDebtId || undefined}
                onValueChange={(value) => setEditingBill(prev => prev ? {...prev, linkedDebtId: value || null} : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No linked debt" />
                </SelectTrigger>
                <SelectContent>
                  {debts.map(debt => (
                    <SelectItem key={debt.id} value={debt.id}>
                      {debt.name} (${debt.currentBalance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingBill?.linkedDebtId && (
                <p className="text-xs text-muted-foreground">
                  When this bill is paid, its amount will be deducted from the linked debt.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditBill}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddIncomeOpen} onOpenChange={setIsAddIncomeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Income</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Income Source"
                value={newIncome.source}
                onChange={(e) => setNewIncome({ ...newIncome, source: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Amount"
                value={newIncome.amount}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewIncome({ ...newIncome, amount: value });
                }}
              />
            </div>
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newIncome.expectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newIncome.expectedDate ? format(newIncome.expectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newIncome.expectedDate}
                    onSelect={(date) => setNewIncome({ ...newIncome, expectedDate: date || new Date() })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurringIncome"
                checked={newIncome.isRecurring}
                onCheckedChange={(checked) => 
                  setNewIncome({ ...newIncome, isRecurring: checked as boolean })
                }
              />
              <label htmlFor="recurringIncome" className="text-sm">Recurring monthly</label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddIncome}>Add Income</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditIncomeOpen} onOpenChange={setIsEditIncomeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Income</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Income Source"
                value={editingIncome?.source || ''}
                onChange={(e) => setEditingIncome((prev) => prev ? {...prev, source: e.target.value} : null)}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Amount"
                value={editingIncome?.amount || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setEditingIncome((prev) => prev ? {...prev, amount: isNaN(value) ? 0 : value} : null);
                }}
              />
            </div>
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editingIncome?.expectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editingIncome?.expectedDate ? editingIncome.expectedDate : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editingIncome?.expectedDate ? safelyParseDate(editingIncome.expectedDate, 'MMM d, yyyy') || undefined : undefined}
                    onSelect={(date) => setEditingIncome((prev) => prev ? {...prev, expectedDate: format(date || new Date(), 'MMM d, yyyy')} : null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="editRecurringIncome"
                checked={editingIncome?.isRecurring}
                onCheckedChange={(checked) => 
                  setEditingIncome((prev) => prev ? {...prev, isRecurring: checked as boolean} : null)
                }
              />
              <label htmlFor="editRecurringIncome" className="text-sm">Recurring monthly</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="editReceivedIncome"
                checked={editingIncome?.isReceived}
                onCheckedChange={(checked) => 
                  setEditingIncome((prev) => prev ? {...prev, isReceived: checked as boolean} : null)
                }
              />
              <label htmlFor="editReceivedIncome" className="text-sm">Mark as received</label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditIncome}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}