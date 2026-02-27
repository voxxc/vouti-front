

## Plan: Fix Sidebar/Header Border Alignment

**Problem**: The sidebar logo area border-bottom and the main header border-bottom don't align because their content has different heights, even though both use `py-3`.

**Solution**: Set an explicit matching height on both containers so borders align perfectly.

### Changes

1. **`src/components/Dashboard/DashboardSidebar.tsx`** (line 200):
   - Change `"px-4 py-3 border-b border-border flex items-center"` to `"px-4 border-b border-border flex items-center h-[49px]"`
   - Use fixed height instead of padding to guarantee alignment

2. **`src/components/Dashboard/DashboardLayout.tsx`** (line 247):
   - Change the header's inner div from `"flex items-center justify-between px-6 py-3"` to `"flex items-center justify-between px-6 h-[49px]"`
   - Both containers now share the exact same `h-[49px]`, ensuring their border-bottom lines are perfectly aligned

