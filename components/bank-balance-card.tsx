"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';
import { format, parse, isAfter, isBefore, isSameDay, isValid } from 'date-fns';
import { useBudget } from '@/context/BudgetContext';
import { useToast } from "@/hooks/use-toast";

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

export function BankBalanceCard() {
  const { state, dispatch } = useBudget();
  const { bankBalance, bills, incomes } = state;
  const { toast } = useToast();
  
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(bankBalance.toString());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setEditValue(bankBalance.toString());
  }, [bankBalance]);

  const handleUpdateBalance = () => {
    const newBalance = parseFloat(editValue);
    if (!isNaN(newBalance) && isFinite(newBalance)) {
      dispatch({
        type: 'UPDATE_BANK_BALANCE',
        payload: { amount: newBalance }
      });
      setIsEditing(false);
    } else {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid number for the bank balance",
        variant: "destructive"
      });
    }
  };

  const calculateBillsUntilNextPaycheck = () => {
    if (!mounted) return {
      untilNextPaycheck: 0,
      nextPaycheckAmount: 0,
      nextPaycheckDate: '',
      hasInsufficientFunds: false,
      afterNextPaycheck: 0,
      followingPaycheckDate: '',
      followingPaycheckAmount: 0
    };

    try {
      const today = new Date();
      
      // Filter for unreceived paychecks and sort by date
      const sortedUnreceivedPaychecks = incomes
        .filter(income => !income.isReceived)
        .sort((a, b) => {
          try {
            const dateA = safelyParseDate(a.expectedDate, 'MMM d, yyyy', new Date());
            const dateB = safelyParseDate(b.expectedDate, 'MMM d, yyyy', new Date());
            return dateA.getTime() - dateB.getTime();
          } catch (error) {
            console.error('Error sorting paychecks', error);
            return 0; // Default sorting if date parsing fails
          }
        });

      // Find the next unreceived paycheck
      const nextPaycheck = sortedUnreceivedPaychecks.find(paycheck => {
        try {
          const paycheckDate = safelyParseDate(paycheck.expectedDate, 'MMM d, yyyy', new Date());
          return isAfter(paycheckDate, today) || isSameDay(paycheckDate, today);
        } catch (error) {
          console.error('Error finding next paycheck', error);
          return false; // Skip this paycheck if date parsing fails
        }
      });

      // Find the following paycheck (after the next one)
      const followingPaycheckIndex = nextPaycheck 
        ? sortedUnreceivedPaychecks.findIndex(p => p.id === nextPaycheck.id) + 1 
        : -1;
      
      const followingPaycheck = followingPaycheckIndex >= 0 && followingPaycheckIndex < sortedUnreceivedPaychecks.length
        ? sortedUnreceivedPaychecks[followingPaycheckIndex]
        : null;

      // If there's a next paycheck, calculate bills due before it
      let billsUntilNextPaycheck = 0;
      if (nextPaycheck) {
        try {
          const nextPaycheckDate = safelyParseDate(nextPaycheck.expectedDate, 'MMM d, yyyy', new Date());
          billsUntilNextPaycheck = bills
            .filter(bill => {
              if (bill.isPaid) return false;
              try {
                const billDate = safelyParseDate(bill.dueDate, 'MMM d, yyyy', new Date());
                return (isAfter(billDate, today) || isSameDay(billDate, today)) && 
                       (isBefore(billDate, nextPaycheckDate) || isSameDay(billDate, nextPaycheckDate));
              } catch (error) {
                console.error('Error filtering bills until next paycheck', error);
                return false; // Skip this bill if date parsing fails
              }
            })
            .reduce((sum, bill) => {
              const amount = typeof bill.amount === 'number' && !isNaN(bill.amount) ? bill.amount : 0;
              return sum + amount;
            }, 0);
        } catch (error) {
          console.error('Error calculating bills until next paycheck', error);
          billsUntilNextPaycheck = 0; // Default to 0 if there's an error
        }
      }

      // Calculate bills between next paycheck and following paycheck
      let billsAfterNextPaycheck = 0;
      if (nextPaycheck && followingPaycheck) {
        try {
          const nextPaycheckDate = safelyParseDate(nextPaycheck.expectedDate, 'MMM d, yyyy', new Date());
          const followingPaycheckDate = safelyParseDate(followingPaycheck.expectedDate, 'MMM d, yyyy', new Date());
          
          billsAfterNextPaycheck = bills
            .filter(bill => {
              if (bill.isPaid) return false;
              try {
                const billDate = safelyParseDate(bill.dueDate, 'MMM d, yyyy', new Date());
                return isAfter(billDate, nextPaycheckDate) && 
                       (isBefore(billDate, followingPaycheckDate) || isSameDay(billDate, followingPaycheckDate));
              } catch (error) {
                console.error('Error filtering bills after next paycheck', error);
                return false; // Skip this bill if date parsing fails
              }
            })
            .reduce((sum, bill) => {
              const amount = typeof bill.amount === 'number' && !isNaN(bill.amount) ? bill.amount : 0;
              return sum + amount;
            }, 0);
        } catch (error) {
          console.error('Error calculating bills after next paycheck', error);
          billsAfterNextPaycheck = 0; // Default to 0 if there's an error
        }
      }

      const safeNextPaycheckAmount = nextPaycheck && 
        typeof nextPaycheck.amount === 'number' && 
        !isNaN(nextPaycheck.amount) ? 
        nextPaycheck.amount : 0;

      const safeFollowingPaycheckAmount = followingPaycheck && 
        typeof followingPaycheck.amount === 'number' && 
        !isNaN(followingPaycheck.amount) ? 
        followingPaycheck.amount : 0;

      // Ensure bankBalance is a number
      const safeBankBalance = typeof bankBalance === 'number' && !isNaN(bankBalance) ? bankBalance : 0;
      
      return {
        untilNextPaycheck: billsUntilNextPaycheck,
        nextPaycheckAmount: safeNextPaycheckAmount,
        nextPaycheckDate: nextPaycheck?.expectedDate || '',
        hasInsufficientFunds: safeBankBalance < billsUntilNextPaycheck,
        afterNextPaycheck: billsAfterNextPaycheck,
        followingPaycheckDate: followingPaycheck?.expectedDate || '',
        followingPaycheckAmount: safeFollowingPaycheckAmount
      };
    } catch (error) {
      console.error('Error in calculateBillsUntilNextPaycheck', error);
      return {
        untilNextPaycheck: 0,
        nextPaycheckAmount: 0,
        nextPaycheckDate: '',
        hasInsufficientFunds: false,
        afterNextPaycheck: 0,
        followingPaycheckDate: '',
        followingPaycheckAmount: 0
      };
    }
  };

  const billsSummary = useMemo(calculateBillsUntilNextPaycheck, [bills, incomes, bankBalance, mounted]);

  if (!mounted) {
    return null;
  }

  // Ensure bankBalance is a valid number for display purposes
  const safeBankBalance = typeof bankBalance === 'number' && !isNaN(bankBalance) ? bankBalance : 0;
  const hasValidBankBalance = typeof bankBalance === 'number' && !isNaN(bankBalance);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="font-medium text-sm text-muted-foreground">Current Bank Balance</h3>
        <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
          <span className="sr-only">Update balance</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"/>
          </svg>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">Your available funds</p>
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="text-2xl font-bold"
                  step="0.01"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateBalance();
                    }
                  }}
                />
                <Button onClick={handleUpdateBalance}>Save</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <p className="text-3xl font-bold">
                    ${hasValidBankBalance ? safeBankBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                  </p>
                  {billsSummary.hasInsufficientFunds && (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                </div>
                
                {billsSummary.nextPaycheckDate && (
                  <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">
                        Bills until {billsSummary.nextPaycheckDate}:
                      </p>
                      <p className={`text-sm font-bold ${billsSummary.hasInsufficientFunds ? 'text-destructive' : ''}`}>
                        ${billsSummary.untilNextPaycheck.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">Balance after bills:</p>
                      <p className={`text-sm font-bold ${(safeBankBalance - billsSummary.untilNextPaycheck) < 0 ? 'text-destructive' : 'text-green-500'}`}>
                        ${(safeBankBalance - billsSummary.untilNextPaycheck).toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">Next paycheck ({billsSummary.nextPaycheckDate}):</p>
                      <p className="text-sm font-bold text-green-500">
                        +${billsSummary.nextPaycheckAmount.toFixed(2)}
                      </p>
                    </div>
                    
                    {billsSummary.followingPaycheckDate && (
                      <>
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-medium">
                              Bills after {billsSummary.nextPaycheckDate} until {billsSummary.followingPaycheckDate}:
                            </p>
                            <p className="text-sm font-bold">
                              ${billsSummary.afterNextPaycheck.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-sm font-medium">Balance after these bills:</p>
                            {/* Safely calculate the final balance */}
                            <p className={`text-sm font-bold ${(safeBankBalance - billsSummary.untilNextPaycheck + billsSummary.nextPaycheckAmount - billsSummary.afterNextPaycheck) < 0 ? 'text-destructive' : 'text-green-500'}`}>
                              ${(safeBankBalance - billsSummary.untilNextPaycheck + billsSummary.nextPaycheckAmount - billsSummary.afterNextPaycheck).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}