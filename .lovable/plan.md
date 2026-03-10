

## Add Easter Egg Code "spn"

Add a new `else if` branch in the `handleEasterEggSubmit` function in `LandingPage2.tsx` that navigates to `/spn/auth` when the code "spn" is entered.

### Change

**`src/pages/LandingPage2.tsx`** (line ~117-118): Add new condition after the `veridicto` block:

```tsx
} else if (code === 'spn') {
  await supabase.auth.signOut();
  absoluteNavigate('/spn/auth');
}
```

Single-line addition following the existing easter egg pattern (sign out first, then navigate).

