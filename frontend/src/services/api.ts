import { User, Password, Contact, Task } from '../types';

// Helper functions for localStorage
const getItem = <T>(key: string): T[] => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : [];
};

const setItem = <T>(key: string, value: T[]): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Mock user for offline mode
export const mockUser: User = {
  id: '1',
  username: 'demo',
  email: 'demo@example.com'
};

// Initialize mock data if not exists
const initializeMockData = () => {
  if (!localStorage.getItem('tasks')) {
    setItem('tasks', mockTasks);
  }
  if (!localStorage.getItem('passwords')) {
    setItem('passwords', []);
  }
  if (!localStorage.getItem('contacts')) {
    setItem('contacts', []);
  }
};

// Initialize mock data on first load
initializeMockData();

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Complete project documentation',
    description: 'Write comprehensive documentation for the project',
    completed: false,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    userId: mockUser.id,
  },
  {
    id: '2',
    title: 'Review pull requests',
    description: 'Review and merge pending pull requests',
    completed: true,
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    userId: mockUser.id,
  },
  {
    id: '3',
    title: 'Update dependencies',
    description: 'Update project dependencies to latest versions',
    completed: false,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    userId: mockUser.id,
  },
];

export const auth = {
  login: async (email: string, password: string) => {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Invalid email or password');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    return data;
  },

  register: async (email: string, password: string) => {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    return data;
  },
};

export const passwords = {
  getAll: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return getItem<Password>('passwords');
  },
  create: async (data: Omit<Password, 'id'>) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const passwords = getItem<Password>('passwords');
    const newPassword = {
      ...data,
      id: Date.now().toString(),
      userId: mockUser.id,
    };
    setItem('passwords', [...passwords, newPassword]);
    return newPassword;
  },
  update: async (id: string, data: Partial<Password>) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const passwords = getItem<Password>('passwords');
    const index = passwords.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Password not found');
    
    passwords[index] = { ...passwords[index], ...data };
    setItem('passwords', passwords);
    return passwords[index];
  },
  delete: async (id: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const passwords = getItem<Password>('passwords');
    const filtered = passwords.filter(p => p.id !== id);
    setItem('passwords', filtered);
    return { success: true };
  },
};

export const contacts = {
  getAll: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return getItem<Contact>('contacts');
  },
  create: async (data: Omit<Contact, 'id' | 'userId'>) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const contacts = getItem<Contact>('contacts');
    const newContact = {
      ...data,
      id: Date.now().toString(),
      userId: mockUser.id,
    };
    setItem('contacts', [...contacts, newContact]);
    return newContact;
  },
  update: async (id: string, data: Partial<Omit<Contact, 'id' | 'userId'>>) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const contacts = getItem<Contact>('contacts');
    const index = contacts.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Contact not found');
    
    contacts[index] = { ...contacts[index], ...data };
    setItem('contacts', contacts);
    return contacts[index];
  },
  delete: async (id: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const contacts = getItem<Contact>('contacts');
    const filtered = contacts.filter(c => c.id !== id);
    setItem('contacts', filtered);
    return { success: true };
  },
};

export const tasks = {
  getAll: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return getItem<Task>('tasks');
  },
  create: async (data: Omit<Task, 'id'>) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const tasks = getItem<Task>('tasks');
    const newTask = {
      ...data,
      id: Date.now().toString(),
      userId: mockUser.id,
      completed: false,
    };
    setItem('tasks', [...tasks, newTask]);
    return newTask;
  },
  update: async (id: string, data: Partial<Task>) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const tasks = getItem<Task>('tasks');
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Task not found');
    
    tasks[index] = { ...tasks[index], ...data };
    setItem('tasks', tasks);
    return tasks[index];
  },
  delete: async (id: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const tasks = getItem<Task>('tasks');
    const filtered = tasks.filter(t => t.id !== id);
    setItem('tasks', filtered);
    return { success: true };
  },
}; 