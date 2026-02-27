

## Plan: Align Sidebar Header with Main Header

The problem is that the sidebar's logo section and the main content header have different heights, so their bottom borders don't align horizontally.

**Root cause**: The sidebar logo area (`DashboardSidebar.tsx`) has `px-4 py-3 min-h-[57px]` while the main header (`DashboardLayout.tsx`) uses `px-6 py-3`. The content inside each has different intrinsic heights, causing the border-bottom lines to misalign.

### Changes

**`src/components/Dashboard/DashboardSidebar.tsx`**:
- Remove `min-h-[57px]` from the logo container
- Match the exact padding and height to the main header by using the same `py-3` and ensuring the container stretches to match via `h-[49px]` (or whatever the header's computed height is) — or better, use a shared height approach

The simplest fix: take a screenshot to see the exact mismatch, then set the sidebar logo container height to match the header exactly. The header content (with `py-3` = 12px+12px + ~25px content) is roughly 49px. The sidebar should match with the same fixed height or identical padding structure.

**Step**: In `DashboardSidebar.tsx`, change the logo container from `px-4 py-3 min-h-[57px]` to match the header's effective height. Since both use `py-3`, the issue is `min-h-[57px]` forcing the sidebar taller. Remove `min-h-[57px]` and let both containers naturally size to the same height with `py-3`.

