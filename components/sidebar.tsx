"use client";

import { useState, useEffect } from 'react';
import { TaskList } from '@/components/task-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function Sidebar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="asap" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="asap">ASAP</TabsTrigger>
          <TabsTrigger value="todo">To-Do</TabsTrigger>
        </TabsList>
        <TabsContent value="asap">
          <TaskList category="asap" />
        </TabsContent>
        <TabsContent value="todo">
          <TaskList category="todo" />
        </TabsContent>
      </Tabs>
    </div>
  );
}