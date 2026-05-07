import React from 'react';
import { create } from 'zustand';

export interface Task {
  id: string;
  title: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completed: boolean;
  date: string;
}

interface TaskStore {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'completed' | 'date'>) => void;
  completeTask: (id: string) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  addTask: (taskData) => set((state) => ({
    tasks: [
      ...state.tasks,
      {
        ...taskData,
        id: Math.random().toString(36).substr(2, 9),
        completed: false,
        date: new Date().toISOString().split('T')[0],
      },
    ],
  })),
  completeTask: (id) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, completed: true } : t),
  })),
}));
