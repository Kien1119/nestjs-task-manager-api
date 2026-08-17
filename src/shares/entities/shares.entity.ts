export interface Shares {
  task_id: number;
  shared_with_user_id: number;
  permission: 'view' | 'edit';
}
