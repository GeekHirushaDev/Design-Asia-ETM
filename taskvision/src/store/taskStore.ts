import { create } from 'zustand';

interface Task {
  _id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'paused' | 'completed';
  location?: {
    lat: number;
    lng: number;
    radiusMeters: number;
    address?: string;
  };
  estimateMinutes?: number;
  dueDate?: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  assignedTo: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
  tags: string[];
  approvals: {
    required: boolean;
    status: 'pending' | 'approved' | 'rejected';
    by?: {
      _id: string;
      name: string;
      email: string;
    };
    at?: string;
    comment?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  isLoading: boolean;
  error: string | null;
  activeTimer: { taskId: string; startTime: Date } | null;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  setCurrentTask: (task: Task | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  startTimer: (taskId: string) => void;
  stopTimer: () => void;
  clearTasks: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  currentTask: null,
  isLoading: false,
  error: null,
  activeTimer: null,
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task._id === taskId ? { ...task, ...updates } : task
      ),
      currentTask:
        state.currentTask?._id === taskId
          ? { ...state.currentTask, ...updates }
          : state.currentTask,
    })),
  setCurrentTask: (task) => set({ currentTask: task }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  startTimer: (taskId) =>
    set({ activeTimer: { taskId, startTime: new Date() } }),
  stopTimer: () => set({ activeTimer: null }),
  clearTasks: () =>
    set({ tasks: [], currentTask: null, activeTimer: null, error: null }),
}));