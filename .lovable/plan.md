

# Fix "Ver Projeto" opening with agenda drawer in new tab

## Problem
When clicking "Ver Projeto" from deadline details, the new browser tab inherits the `sessionStorage` state including `vouti-active-drawer: 'agenda'`, so the agenda drawer remains open and hides the project view. Additionally, the URL is missing the tenant slug prefix.

## Solution

### 1. Use tenant-aware URL + query param to clear drawer

In both `AgendaContent.tsx` and `DeadlineDetailDialog.tsx`, change the `window.open` calls to:
- Include the tenant slug in the URL
- Append `?clearDrawer=true` to signal the new tab should not show any drawer

### 2. Handle `clearDrawer` param in `DashboardLayout.tsx`

On mount, check for `?clearDrawer=true` in the URL. If present:
- Clear `sessionStorage` `vouti-active-drawer`
- Set `activeDrawer` to `null`
- Remove the query param from the URL (clean up)

### Files to modify

- **`src/components/Agenda/AgendaContent.tsx`** (~line 1567-1568): Use `tenantSlug` to build URL and add `?clearDrawer=true`
- **`src/components/Agenda/DeadlineDetailDialog.tsx`** (~line 365): Same fix
- **`src/components/Dashboard/DashboardLayout.tsx`**: Add `useEffect` on mount to check for `clearDrawer` query param and reset drawer state

