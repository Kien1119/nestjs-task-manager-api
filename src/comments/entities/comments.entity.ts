export interface Comment {
  id: number;
  content: string;
  created_at: Date;
  user_id: number;
  task_id: number;
}
