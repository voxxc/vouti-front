

## Add SPN Easter Egg Code to HomePage

The issue is that the **HomePage** (`src/pages/HomePage.tsx`) -- which is the actual page at route `/` -- does not have the `spn` code in its `handleEasterEggSubmit` function. The code was only added to `LandingPage2.tsx`.

### Change

**File: `src/pages/HomePage.tsx`** (line ~121-122)

Add an `else if` branch for `'spn'` after the `veridicto` case:

```tsx
} else if (code === 'veridicto') {
  navigate('/veridicto');
} else if (code === 'spn') {
  await supabase.auth.signOut();
  navigate('/spn/auth');
}
```

Also check and add to `LandingPage1.tsx` and `BatinkLanding.tsx` if needed for consistency.

