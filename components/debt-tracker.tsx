"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Calendar as CalendarIcon, ArrowUpDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import confetti from 'canvas-confetti';
import { format, parse, isValid } from 'date-fns';
import { cn } from "@/lib/utils";
import { useBudget } from '@/context/BudgetContext';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type SortType = 'balance-asc' | 'balance-desc' | 'interest-asc' | 'interest-desc';

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

export function DebtTracker() {
  const { state, dispatch } = useBudget();
  const { debts } = state;
  
  const { toast } = useToast();
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isEditDebtOpen, setIsEditDebtOpen] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [sortType, setSortType] = useState<SortType>('balance-asc');
  const [newDebt, setNewDebt] = useState({
    name: '',
    totalAmount: '',
    currentBalance: '',
    interestRate: '',
    minimumPayment: '',
    dueDate: new Date(),
    createBill: true
  });
  const [progress, setProgress] = useState<{ [key: string]: number }>({});

  // const triggerCelebration = (debtName: string) => {
  //   try {
  //     // Check if confetti is available and working
  //     if (typeof confetti === 'function') {
  //       confetti({
  //         particleCount: 100,
  //         spread: 70,
  //         origin: { y: 0.6 }
  //       });
  //     } else {
  //       console.warn('confetti function is not available');
  //     }
  //   } catch (error) {
  //     console.error('Error triggering confetti:', error);
  //     // Continue without confetti, but still show the toast
  //   }

  //   toast({
  //     title: "Debt Paid Off! 🎉",
  //     description: `Congratulations! ${debtName} has been fully paid off!`,
  //   });
  // };

  const triggerCelebration = (debtName: string) => {
    try {
      // Ensure we’re on the client and confetti is a function
      if (typeof window !== "undefined" && typeof confetti === "function") {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        console.warn("confetti function is not available or running on the server");
      }
    } catch (error) {
      console.error("Error triggering confetti:", error);
      // continue gracefully—toast still shows
    }
  
    toast({
      title: "Debt Paid Off! 🎉",
      description: `Congratulations! ${debtName} has been fully paid off!`,
    });
  };
  


  const handleAddDebt = () => {
    if (
      newDebt.name && 
      newDebt.totalAmount && 
      newDebt.currentBalance && 
      newDebt.interestRate && 
      newDebt.minimumPayment
    ) {
      try {
        const totalAmount = parseFloat(newDebt.totalAmount);
        const currentBalance = parseFloat(newDebt.currentBalance);
        const minimumPayment = parseFloat(newDebt.minimumPayment);
        const interestRate = parseFloat(newDebt.interestRate);
        
        // Ensure values are valid numbers
        if (isNaN(totalAmount) || isNaN(currentBalance) || isNaN(interestRate) || isNaN(minimumPayment)) {
          toast({
            title: "Invalid Input",
            description: "Please enter valid numbers for all monetary values",
            variant: "destructive"
          });
          return;
        }
        
        // Validate value ranges
        if (totalAmount <= 0 || currentBalance < 0 || interestRate < 0 || minimumPayment <= 0) {
          toast({
            title: "Invalid Input",
            description: "Please enter positive values for amounts and rates",
            variant: "destructive"
          });
          return;
        }
        
        const newDebtId = Date.now().toString();
        
        // Validate the due date
        if (!(newDebt.dueDate instanceof Date) || isNaN(newDebt.dueDate.getTime())) {
          toast({
            title: "Invalid Due Date",
            description: "Please select a valid due date",
            variant: "destructive"
          });
          return;
        }
        
        const newDebtEntry = {
          id: newDebtId,
          name: newDebt.name,
          totalAmount: totalAmount,
          currentBalance: currentBalance,
          interestRate: interestRate,
          minimumPayment: minimumPayment,
          dueDate: format(newDebt.dueDate, 'MMM d, yyyy'),
          isFocus: debts.length === 0
        };
        
        dispatch({
          type: 'ADD_DEBT',
          payload: newDebtEntry
        });

        if (newDebt.createBill) {
          const newBill = {
            id: Date.now().toString() + Math.random(),
            name: `${newDebt.name} Payment`,
            amount: minimumPayment,
            dueDate: format(newDebt.dueDate, 'MMM d, yyyy'),
            isPaid: false,
            isRecurring: true,
            linkedDebtId: newDebtId
          };
          
          dispatch({
            type: 'ADD_BILL',
            payload: newBill
          });
        }

        setNewDebt({ 
          name: '', 
          totalAmount: '', 
          currentBalance: '', 
          interestRate: '', 
          minimumPayment: '',
          dueDate: new Date(),
          createBill: true 
        });
        
        setIsAddDebtOpen(false);
        
        toast({
          title: "Debt Added",
          description: `${newDebtEntry.name} has been added to your debt tracker.`,
        });
      } catch (error) {
        console.error('Error adding debt:', error);
        toast({
          title: "Error",
          description: "An error occurred while adding the debt. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
    }
  };

  const handleEditDebt = () => {
    if (editingDebtId && newBalance) {
      try {
        const debt = debts.find(d => d.id === editingDebtId);
        
        if (debt) {
          const oldBalance = debt.currentBalance;
          const updatedBalance = parseFloat(newBalance);
          
          if (isNaN(updatedBalance)) {
            toast({
              title: "Invalid Balance",
              description: "Please enter a valid number",
              variant: "destructive"
            });
            return;
          }
          
          if (updatedBalance < 0) {
            toast({
              title: "Invalid Balance",
              description: "Balance cannot be negative",
              variant: "destructive"
            });
            return;
          }
          
          if (updatedBalance <= 0) {
            triggerCelebration(debt.name);
          }

          const updatedDebt = {
            ...debt,
            currentBalance: Math.max(0, updatedBalance)
          };
          
          dispatch({
            type: 'UPDATE_DEBT',
            payload: updatedDebt
          });
          
          // Safely calculate progress percentages
          const oldProgressPercentage = debt.totalAmount > 0 ? 
            ((debt.totalAmount - oldBalance) / debt.totalAmount) * 100 : 0;
          
          const newProgressPercentage = debt.totalAmount > 0 ? 
            ((debt.totalAmount - updatedBalance) / debt.totalAmount) * 100 : 0;
          
          setProgress(prev => ({
            ...prev,
            [editingDebtId]: oldProgressPercentage
          }));
          
          setTimeout(() => {
            setProgress(prev => ({
              ...prev,
              [editingDebtId]: newProgressPercentage
            }));
          }, 100);

          toast({
            title: "Debt Updated",
            description: `${debt.name} balance has been updated successfully.`,
          });
        }
        
        setIsEditDebtOpen(false);
        setEditingDebtId(null);
        setNewBalance('');
      } catch (error) {
        console.error('Error updating debt:', error);
        toast({
          title: "Error",
          description: "An error occurred while updating the debt. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleDeleteDebt = (id: string) => {
    try {
      dispatch({
        type: 'DELETE_DEBT',
        payload: { id }
      });
      
      toast({
        title: "Debt Removed",
        description: "The debt has been removed from your tracker.",
      });
    } catch (error) {
      console.error('Error deleting debt:', error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the debt. Please try again.",
        variant: "destructive"
      });
    }
  };

  const startEditDebt = (debtId: string) => {
    try {
      const debt = debts.find(d => d.id === debtId);
      if (debt) {
        setEditingDebtId(debtId);
        setNewBalance(debt.currentBalance.toString());
        setIsEditDebtOpen(true);
      }
    } catch (error) {
      console.error('Error starting debt edit:', error);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  const setFocusDebt = (id: string) => {
    try {
      dispatch({
        type: 'SET_FOCUS_DEBT',
        payload: { id }
      });
      
      toast({
        title: "Focus Debt Updated",
        description: "Your focus debt has been updated in the snowball strategy.",
      });
    } catch (error) {
      console.error('Error setting focus debt:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating the focus debt. Please try again.",
        variant: "destructive"
      });
    }
  };

  const removeFocusDebt = () => {
    try {
      dispatch({
        type: 'SET_FOCUS_DEBT',
        payload: { id: '' }
      });
      
      toast({
        title: "Focus Debt Removed",
        description: "You no longer have a focus debt in the snowball strategy.",
      });
    } catch (error) {
      console.error('Error removing focus debt:', error);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Calculate total debt (safely handle NaN/undefined values)
  const totalDebt = debts.reduce((sum, debt) => {
    const balance = typeof debt.currentBalance === 'number' && !isNaN(debt.currentBalance) ? 
      debt.currentBalance : 0;
    return sum + balance;
  }, 0);
  
  const sortedDebts = [...debts].sort((a, b) => {
    try {
      // Always put focus debts at the top
      if (a.isFocus !== b.isFocus) {
        return a.isFocus ? -1 : 1;
      }
      
      // Safely extract numeric values for comparison
      const aBalance = typeof a.currentBalance === 'number' && !isNaN(a.currentBalance) ? a.currentBalance : 0;
      const bBalance = typeof b.currentBalance === 'number' && !isNaN(b.currentBalance) ? b.currentBalance : 0;
      const aRate = typeof a.interestRate === 'number' && !isNaN(a.interestRate) ? a.interestRate : 0;
      const bRate = typeof b.interestRate === 'number' && !isNaN(b.interestRate) ? b.interestRate : 0;
      
      // Then sort by the selected criteria
      switch(sortType) {
        case 'balance-asc':
          return aBalance - bBalance;
        case 'balance-desc':
          return bBalance - aBalance;
        case 'interest-asc':
          return aRate - bRate;
        case 'interest-desc':
          return bRate - aRate;
        default:
          return 0;
      }
    } catch (error) {
      console.error('Error sorting debts:', error);
      return 0;
    }
  });

  return (
    <Card>
      <CardHeader className="flex flex-col space-y-3">
        <div>
          <h3 className="text-lg font-semibold">Debt Snowball Tracker</h3>
          <p className="text-sm text-muted-foreground">Track your debts using the snowball method</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="text-sm font-medium">Total Debt</span>
            <span className="text-lg font-bold ml-2">
              ${totalDebt.toLocaleString('en-US')}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select
              value={sortType}
              onValueChange={(value) => setSortType(value as SortType)}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balance-asc">Balance (Low to High)</SelectItem>
                <SelectItem value="balance-desc">Balance (High to Low)</SelectItem>
                <SelectItem value="interest-asc">Interest (Low to High)</SelectItem>
                <SelectItem value="interest-desc">Interest (High to Low)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setIsAddDebtOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {sortedDebts.map(debt => {
            try {
              // Safely calculate progress percentage, avoid division by zero
              const progressPercentage = progress[debt.id] !== undefined ? 
                progress[debt.id] : 
                (debt.totalAmount > 0 ? ((debt.totalAmount - debt.currentBalance) / debt.totalAmount) * 100 : 0);
              
              // Ensure the progress is between 0 and 100
              const safeProgress = Math.min(Math.max(0, progressPercentage), 100);
              
              return (
                <div key={debt.id} className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {debt.isFocus && (
                          <span className="text-xs font-medium text-green-600 dark:text-green-500 bg-green-100 dark:bg-green-900/60 px-2 py-0.5 rounded-full">Focus</span>
                        )}
                        <span className="font-medium text-base">{debt.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Interest rate: {debt.interestRate}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditDebt(debt.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {debt.isFocus ? (
                        <Button variant="ghost" size="sm" onClick={removeFocusDebt}>
                          Remove Focus
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setFocusDebt(debt.id)}>
                          Set Focus
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteDebt(debt.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Progress 
                      value={safeProgress} 
                      className="transition-all duration-1000 ease-in-out h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Total: ${debt.totalAmount.toLocaleString('en-US')}</span>
                      <span>${debt.currentBalance.toLocaleString('en-US')} left to pay</span>
                    </div>
                  </div>
                </div>
              );
            } catch (error) {
              console.error('Error rendering debt item:', error);
              return null; // Skip rendering this debt item if there's an error
            }
          })}
        </div>
      </CardContent>

      <Dialog open={isAddDebtOpen} onOpenChange={setIsAddDebtOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Debt</DialogTitle>
            <DialogDescription>
              Add debt details and track your progress toward paying it off.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Debt Name"
                value={newDebt.name}
                onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Total Amount"
                value={newDebt.totalAmount}
                onChange={(e) => setNewDebt({ ...newDebt, totalAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Current Balance"
                value={newDebt.currentBalance}
                onChange={(e) => setNewDebt({ ...newDebt, currentBalance: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Interest Rate (%)"
                value={newDebt.interestRate}
                onChange={(e) => setNewDebt({ ...newDebt, interestRate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Minimum Monthly Payment"
                value={newDebt.minimumPayment}
                onChange={(e) => setNewDebt({ ...newDebt, minimumPayment: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newDebt.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newDebt.dueDate ? format(newDebt.dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newDebt.dueDate}
                    onSelect={(date) => setNewDebt({ ...newDebt, dueDate: date || new Date() })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="createBill"
                checked={newDebt.createBill}
                onChange={(e) => setNewDebt({ ...newDebt, createBill: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="createBill" className="text-sm">
                Create monthly bill for minimum payment
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddDebt}>Add Debt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDebtOpen} onOpenChange={setIsEditDebtOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Debt Balance</DialogTitle>
            <DialogDescription>
              Enter the new current balance for this debt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Current Balance"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditDebt}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}