"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { useBudget } from '@/context/BudgetContext';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

export function TaskList({ category }: { category: 'asap' | 'todo' }) {
  const { state, dispatch } = useBudget();
  const { tasks } = state;
  const { toast } = useToast();
  
  const [newTaskText, setNewTaskText] = useState('');
  const [activeTab, setActiveTab] = useState<'asap' | 'todo'>(category);

  const addTask = () => {
    if (newTaskText.trim()) {
      dispatch({
        type: 'ADD_TASK',
        payload: {
          id: Date.now().toString(),
          text: newTaskText,
          completed: false,
          category: activeTab,
          createdAt: format(new Date(), 'MMM d, yyyy')
        }
      });
      setNewTaskText('');
    } else {
      toast({
        title: "Task Required",
        description: "Please enter a task description",
        variant: "destructive"
      });
    }
  };

  const toggleTask = (id: string) => {
    dispatch({
      type: 'TOGGLE_TASK',
      payload: { id }
    });
  };

  const deleteTask = (id: string) => {
    dispatch({
      type: 'DELETE_TASK',
      payload: { id }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <h3 className="text-lg font-semibold">Task Lists</h3>
          <p className="text-sm text-muted-foreground">Keep track of urgent and regular tasks</p>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={category} onValueChange={(value) => setActiveTab(value as 'asap' | 'todo')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="asap">ASAP</TabsTrigger>
            <TabsTrigger value="todo">To Do</TabsTrigger>
          </TabsList>
          <TabsContent value="asap" className="space-y-4">
            <div className="flex space-x-2 mt-4">
              <Input
                placeholder="Add an urgent task..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              <Button size="icon" onClick={addTask}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {tasks
                .filter(task => task.category === 'asap')
                .map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between space-x-2"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={task.completed}
                        onCheckedChange={() => toggleTask(task.id)}
                      />
                      <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                        {task.text}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="todo" className="space-y-4">
            <div className="flex space-x-2 mt-4">
              <Input
                placeholder="Add a task..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              <Button size="icon" onClick={addTask}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {tasks
                .filter(task => task.category === 'todo')
                .map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between space-x-2"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={task.completed}
                        onCheckedChange={() => toggleTask(task.id)}
                      />
                      <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                        {task.text}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}