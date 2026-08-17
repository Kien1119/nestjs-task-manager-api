-- Run this manually against the database (init.sql only runs on first container init,
-- and tables like labels/comments were already added the same way).

CREATE TABLE IF NOT EXISTS task_shares (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(10) NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE (task_id, shared_with_user_id)
);
