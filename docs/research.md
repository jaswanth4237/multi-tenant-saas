# Research Document

## Multi-Tenancy Approaches

### 1. Shared Database + Shared Schema
- Single DB
- tenant_id column
- Pros: Simple, scalable
- Cons: Requires strict isolation

### 2. Shared Database + Separate Schema
- One schema per tenant
- Pros: Better isolation
- Cons: Complex migrations

### 3. Separate Database per Tenant
- Pros: Maximum isolation
- Cons: Very expensive

### Chosen Approach
We use **Shared Database + Shared Schema** because it balances scalability and cost.

## Technology Stack
Backend: Node.js + Express  
Frontend: React  
Database: PostgreSQL  
Auth: JWT  
Containerization: Docker  

## Security Considerations
- Tenant isolation using tenant_id
- JWT authentication
- bcrypt password hashing
- RBAC authorization
- CORS enforcement
