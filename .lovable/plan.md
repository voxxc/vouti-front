
# Fix Mobile Topbar: Horizontal Scroll Issue

## Problem
The topbar in `DashboardLayout.tsx` has multiple buttons/icons on the right side that overflow the screen width on mobile, forcing users to scroll horizontally.

## Root Cause
- Line 289: `<div className="flex items-center gap-3 ml-auto">` contains 6+ elements (TOTP, Search, Messages, Notifications, Theme, Logout)
- `gap-3` (12px) between items adds up
- No `overflow-hidden` on parent container
- Empty spacer div on mobile (`<div className="md:hidden" />`) doesn't help balance

## Solution

**File: `src/components/Dashboard/DashboardLayout.tsx`**

1. **Add `overflow-x-hidden` to main wrapper** (line 266)
2. **Reduce gap on mobile** — Change `gap-3` to `gap-1.5 md:gap-3`
3. **Shrink button sizes on mobile** — Use `h-8 w-8` on mobile, `h-9 w-9` on desktop
4. **Hide less-essential icons on mobile** — Hide TOTP button on mobile (`hidden sm:flex`)
5. **Make header container prevent overflow** — Add `overflow-hidden min-w-0`

### Changes:
```
Line 266: Add overflow-x-hidden
Line 278: Add overflow-hidden to header flex container
Line 289: Change gap-3 to gap-1.5 md:gap-3
Line 290-298: Hide TOTP on mobile (hidden sm:inline-flex)
```

**Expected Result:**
- No horizontal scroll on mobile
- All essential buttons visible
- TOTP (less used) hidden on mobile, accessible via bottom nav "Mais"
