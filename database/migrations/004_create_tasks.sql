CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'todo',
  priority VARCHAR DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id),
  due_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
