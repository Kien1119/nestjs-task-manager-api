export interface Task {
  id: number;
  title: string;
  description?: string | null;
  is_completed: boolean;
  created_at: Date;
  user_id: number | null;
  priority: 'low' | 'medium' | 'high';
  due_date?: string | null;
}
