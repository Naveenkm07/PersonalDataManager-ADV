export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Password {
  id: string;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  category: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
  userId: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  userId: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
} 