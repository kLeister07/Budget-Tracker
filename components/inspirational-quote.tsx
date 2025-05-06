"use client";

import { useState, useEffect } from 'react';

const quotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "It's not about the money. It's about taking control of your life.", author: "Dave Ramsey" },
  { text: "Financial peace isn't the acquisition of stuff. It's learning to live on less than you make.", author: "Dave Ramsey" },
  { text: "The stock market is filled with individuals who know the price of everything, but the value of nothing.", author: "Philip Fisher" },
  { text: "Money is only a tool. It will take you wherever you wish, but it will not replace you as the driver.", author: "Ayn Rand" },
  { text: "Too many people spend money they haven't earned to buy things they don't want to impress people they don't like.", author: "Will Rogers" },
  { text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus" },
  { text: "Don't tell me what you value, show me your budget, and I'll tell you what you value.", author: "Joe Biden" },
  { text: "A budget is telling your money where to go instead of wondering where it went.", author: "John C. Maxwell" },
  { text: "The art is not in making money, but in keeping it.", author: "Proverb" },
  { text: "It's not how much money you make, but how much money you keep.", author: "Robert Kiyosaki" },
  { text: "If you want to know what a man's like, take a good look at how he treats his inferiors, not his equals.", author: "J.K. Rowling" },
  { text: "Beware of little expenses; a small leak will sink a great ship.", author: "Benjamin Franklin" },
  { text: "The habit of saving is itself an education; it fosters every virtue, teaches self-denial, cultivates the sense of order, trains to forethought.", author: "T.T. Munger" },
  { text: "If you buy things you don't need, you'll soon sell things you need.", author: "Warren Buffett" },
  { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
  { text: "The individual investor should act consistently as an investor and not as a speculator.", author: "Ben Graham" },
  { text: "Money is a terrible master but an excellent servant.", author: "P.T. Barnum" },
  { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
  { text: "Every day is a bank account, and time is our currency. No one is rich, no one is poor, we've got 24 hours each.", author: "Christopher Rice" }
];

export function InspirationalQuote() {
  const [quote, setQuote] = useState({ text: "", author: "" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Get a random quote
    const getRandomQuote = () => {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      return quotes[randomIndex];
    };
    
    try {
      // Check if localStorage is available
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage is not available');
        setQuote(getRandomQuote());
        return;
      }
      
      const savedDate = localStorage.getItem('quoteDate');
      const today = new Date().toDateString();
      
      // If we have a saved date and it's still today, use the saved quote
      if (savedDate === today) {
        const savedQuote = localStorage.getItem('quote');
        if (savedQuote) {
          try {
            setQuote(JSON.parse(savedQuote));
          } catch (error) {
            // If parsing fails, get a new quote
            const newQuote = getRandomQuote();
            setQuote(newQuote);
          }
          return;
        }
      }
      
      // Otherwise, get a new random quote
      const newQuote = getRandomQuote();
      setQuote(newQuote);
      
      try {
        // Test localStorage with a small value first
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        
        // Save the new quote and today's date
        localStorage.setItem('quote', JSON.stringify(newQuote));
        localStorage.setItem('quoteDate', today);
      } catch (error) {
        console.error('Failed to save quote to localStorage', error);
        // Continue silently without saving to localStorage
      }
    } catch (error) {
      // If localStorage is completely unavailable
      console.error('Failed to access localStorage', error);
      // Still show a quote even if localStorage is unavailable
      setQuote(getRandomQuote());
    }
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="max-w-xl">
      <blockquote className="italic text-muted-foreground">
        "{quote.text}"
      </blockquote>
      <p className="text-sm text-right mt-1">— {quote.author}</p>
    </div>
  );
}