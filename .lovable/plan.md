

## Mobile Welcome Dialog on HomePage

When the homepage loads on mobile (viewport < 768px), a Dialog will appear automatically with two options:

### Changes

**File: `src/pages/HomePage.tsx`**

1. Import `useIsMobile`, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`, and add state for the dialog
2. Add a `useEffect` that opens the dialog on mobile on mount
3. Dialog UI with two buttons:
   - **"Código"** — closes dialog, activates the easter egg input (`setShowEasterEgg(true)`)
   - **"Quero Conhecer"** — closes dialog, scrolls to top of page (`window.scrollTo({ top: 0, behavior: 'smooth' })`)
4. When "Código" is selected, show a second dialog state with the code input field (same logic as existing easter egg)

### Dialog Design
- Clean, minimal design matching the page's black/white aesthetic
- Two large buttons stacked vertically
- Key icon on "Código", ArrowRight or similar on "Quero Conhecer"

