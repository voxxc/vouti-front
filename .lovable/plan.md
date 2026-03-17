
# Fix: Project deletion blocked by foreign key constraint

## Root Cause

The `task_history` table has a foreign key `task_history_project_id_fkey` referencing `projects(id)` **without** `ON DELETE CASCADE` or `ON DELETE SET NULL`. When a user tries to delete a project that has task history records, the database silently rejects the deletion (RLS makes the error invisible — Supabase returns no error but deletes 0 rows).

## Fix

Single migration to alter the foreign key constraint:

```sql
ALTER TABLE task_history 
  DROP CONSTRAINT task_history_project_id_fkey,
  ADD CONSTRAINT task_history_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
```

Using `SET NULL` (not CASCADE) since `project_id` is nullable and it makes sense to preserve history records even after a project is deleted.

No code changes needed — the existing `deleteProject` function in `useProjectsOptimized.ts` is correct. The database constraint was the sole blocker.

## Files

| File | Action |
|------|--------|
| DB migration | Alter `task_history_project_id_fkey` to add `ON DELETE SET NULL` |
