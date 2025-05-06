"use client";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
import { useBudget } from '@/context/BudgetContext';
import { parse, isValid, isSameDay } from 'date-fns';

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

export function BillsCalendar() {
  const [mounted, setMounted] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { state } = useBudget();
  const { bills, incomes } = state;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Create a map of dates with events
  const calendarEvents = useMemo(() => {
    if (!mounted) return {};
    
    const events: Record<string, { bills: number, incomes: number }> = {};
    
    // Process bills
    bills.forEach(bill => {
      try {
        const billDate = safelyParseDate(bill.dueDate, 'MMM d, yyyy', new Date());
        const dateStr = billDate.toISOString().split('T')[0];
        if (!events[dateStr]) {
          events[dateStr] = { bills: 0, incomes: 0 };
        }
        events[dateStr].bills += 1;
      } catch (error) {
        console.error('Error processing bill for calendar', error);
        // Skip invalid dates
      }
    });
    
    // Process incomes
    incomes.forEach(income => {
      try {
        const incomeDate = safelyParseDate(income.expectedDate, 'MMM d, yyyy', new Date());
        const dateStr = incomeDate.toISOString().split('T')[0];
        if (!events[dateStr]) {
          events[dateStr] = { bills: 0, incomes: 0 };
        }
        events[dateStr].incomes += 1;
      } catch (error) {
        console.error('Error processing income for calendar', error);
        // Skip invalid dates
      }
    });
    
    return events;
  }, [bills, incomes, mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bills Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border"
          modifiers={{
            hasBills: (date) => {
              const dateStr = date.toISOString().split('T')[0];
              return !!calendarEvents[dateStr]?.bills;
            },
            hasIncomes: (date) => {
              const dateStr = date.toISOString().split('T')[0];
              return !!calendarEvents[dateStr]?.incomes;
            }
          }}
          modifiersStyles={{
            hasBills: { 
              textDecoration: 'underline', 
              textDecorationColor: 'rgba(239, 68, 68, 0.75)',
              textDecorationThickness: '2px'
            },
            hasIncomes: { 
              fontWeight: 'bold',
              color: 'rgba(16, 185, 129, 1)'
            }
          }}
        />
        <div className="mt-4 text-sm">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span>Bills</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Income</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}