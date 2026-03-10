

## Mobile Background Image for SPN Auth

On mobile, the classroom photo is currently hidden (`hidden lg:flex`). The plan is to show it as a fixed full-screen background on mobile, with the form overlaid on top with a semi-transparent dark overlay for readability.

### Changes to `src/pages/SpnAuth.tsx`

1. Add a **full-screen background image** layer visible on mobile only (behind the form), with a dark overlay
2. Keep the existing desktop split layout unchanged
3. Make the mobile form card semi-transparent with a backdrop blur for a polished look
4. Ensure the logo and slogan text on mobile remain white/readable against the background

### Structure

```text
Mobile:
  └── Full-screen bg image (fixed)
      └── Dark overlay
          └── Logo + slogan (top)
          └── Form card (centered, glass effect)

Desktop (unchanged):
  └── Left 60%: photo + overlay + branding
  └── Right 40%: form
```

