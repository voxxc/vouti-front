
-- Books
CREATE TABLE public.spn_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_color TEXT DEFAULT '#10b981',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.spn_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read books" ON public.spn_books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert books" ON public.spn_books FOR INSERT TO authenticated WITH CHECK (public.has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update books" ON public.spn_books FOR UPDATE TO authenticated USING (public.has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete books" ON public.spn_books FOR DELETE TO authenticated USING (public.has_spn_role(auth.uid(), 'admin'));

-- Book Units
CREATE TABLE public.spn_book_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.spn_books(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.spn_book_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read units" ON public.spn_book_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert units" ON public.spn_book_units FOR INSERT TO authenticated WITH CHECK (public.has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update units" ON public.spn_book_units FOR UPDATE TO authenticated USING (public.has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete units" ON public.spn_book_units FOR DELETE TO authenticated USING (public.has_spn_role(auth.uid(), 'admin'));

-- Word Bank Items
CREATE TABLE public.spn_word_bank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.spn_book_units(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  phonetic TEXT,
  audio_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.spn_word_bank_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read words" ON public.spn_word_bank_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert words" ON public.spn_word_bank_items FOR INSERT TO authenticated WITH CHECK (public.has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update words" ON public.spn_word_bank_items FOR UPDATE TO authenticated USING (public.has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete words" ON public.spn_word_bank_items FOR DELETE TO authenticated USING (public.has_spn_role(auth.uid(), 'admin'));

-- Student Translations
CREATE TABLE public.spn_word_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id UUID REFERENCES public.spn_word_bank_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  translation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(word_id, user_id)
);
ALTER TABLE public.spn_word_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own translations" ON public.spn_word_translations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own translations" ON public.spn_word_translations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own translations" ON public.spn_word_translations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own translations" ON public.spn_word_translations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Straight to the Point
CREATE TABLE public.spn_straight_to_point (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.spn_book_units(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.spn_straight_to_point ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read content" ON public.spn_straight_to_point FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert content" ON public.spn_straight_to_point FOR INSERT TO authenticated WITH CHECK (public.has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update content" ON public.spn_straight_to_point FOR UPDATE TO authenticated USING (public.has_spn_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete content" ON public.spn_straight_to_point FOR DELETE TO authenticated USING (public.has_spn_role(auth.uid(), 'admin'));
