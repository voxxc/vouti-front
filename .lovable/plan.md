

# Redesign SPN: Books → Units → Word Bank + Straight to the Point

## New Database Tables

```sql
-- Books (replacing the levels/modules concept)
CREATE TABLE spn_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_color TEXT DEFAULT '#10b981',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Book Units
CREATE TABLE spn_book_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES spn_books(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Word Bank items (admin adds words + optional audio URL)
CREATE TABLE spn_word_bank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES spn_book_units(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  phonetic TEXT,
  audio_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Student translations for words
CREATE TABLE spn_word_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id UUID REFERENCES spn_word_bank_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  translation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(word_id, user_id)
);

-- "Straight to the Point" content blocks per unit
CREATE TABLE spn_straight_to_point (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES spn_book_units(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

RLS: Authenticated users can SELECT all content tables. Only admins (via `has_spn_role`) can INSERT/UPDATE/DELETE on books, units, word bank, straight-to-point. Students can INSERT/UPDATE their own translations.

## New Components

### 1. `AdminBooksManager.tsx` (replaces AdminLevelsManager for books)
- **Book list** as stylish cards with color accent, name, unit count
- **Add Book** dialog with name, description, color picker
- **Click book → expand to show units list**
- **Click unit → tabs: "Word Bank" | "Straight to the Point"**
- **Word Bank tab**: Table of words with add/edit/delete. Fields: word, phonetic (optional), audio URL (optional)
- **Straight to the Point tab**: List of content blocks with title + rich text (HTML via textarea). Add/edit/delete
- Mobile-first: full-width cards, bottom sheets for adding, large touch targets

### 2. `BooksView.tsx` (student-facing, replaces ModulesView for books)
- Grid of book cards with color accent, book name, unit count
- Click book → list of units
- Click unit → two section cards: "Word Bank" and "Straight to the Point"
- Clean mobile layout with smooth transitions

### 3. `WordBankStudentView.tsx` (student view for a unit's word bank)
- List of words as flashcard-style cards
- Each card shows: **word**, phonetic, 🔊 play audio button
- Below each word: input field for student's translation (auto-saved via upsert to `spn_word_translations`)
- If student already has a translation, show it pre-filled
- Mobile: full-width cards, large play button, comfortable input spacing

### 4. `StraightToPointView.tsx` (student view)
- Renders the content blocks in order
- Each block: title as heading + rendered HTML content
- Clean typography, mobile-optimized reading experience

### 5. Update `SpnSidebar.tsx`
- Add "Books" nav item alongside existing