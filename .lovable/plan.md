

# Admin Create Users for SPN

## Problem
Currently, SPN users can only self-register via signUp. The admin needs the ability to create users directly and assign their role (admin, teacher, student).

## Approach

### 1. New Edge Function: `spn-create-user`
Since creating a user without logging them in requires the Admin API (service role key), we need an edge function similar to the existing `create-user` but for SPN:

- Validates the caller is an SPN admin (via `has_spn_role`)
- Creates user via `supabase.auth.admin.createUser()` (no auto-login)
- Inserts into `spn_profiles` and `spn_user_roles` with the chosen role
- Returns the created user info

### 2. Update `AdminUsersManager.tsx`
Add a "Create User" section at the top with:
- **Email**, **Password**, **Full Name** inputs
- **Role** select (Admin / Teacher / Student)
- "Create" button that calls the edge function
- Success → refetch user list, clear form
- Mobile-friendly layout (stacked on small screens)

### 3. Delete user capability
Add a delete button per user (admin only) that calls the edge function or directly deletes from `spn_profiles` + `spn_user_roles` (the auth user remains, but the SPN profile is removed).

## Files

| File | Action |
|------|--------|
| `supabase/functions/spn-create-user/index.ts` | **New** — Edge function to create SPN users |
| `src/components/Spn/AdminUsersManager.tsx` | **Modify** — Add create user form + delete |
| `supabase/config.toml` | **Modify** — Add `[functions.spn-create-user]` with `verify_jwt = false` |

## Edge Function Logic
```
1. Validate Authorization header → get caller user
2. Check has_spn_role(caller, 'admin') → reject if not admin
3. Create auth user via admin.createUser (email_confirm: true)
4. Insert spn_profiles (user_id, full_name)
5. Insert spn_user_roles (user_id, role)
6. Return success with user data
```

No database schema changes needed — existing tables and RLS policies already support this flow (the edge function uses the service role key to bypass RLS).

