import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Layers, ArrowLeft, Type, FileText, ChevronRight } from 'lucide-react';
import WordBankStudentView from './WordBankStudentView';
import StraightToPointView from './StraightToPointView';

interface Book { id: string; name: string; description: string | null; cover_color: string; sort_order: number; }
interface Unit { id: string; book_id: string; name: string; sort_order: number; }

type ViewState = 
  | { type: 'books' }
  | { type: 'units'; book: Book }
  | { type: 'wordbank'; unit: Unit; book: Book }
  | { type: 'stp'; unit: Unit; book: Book };

const BooksView = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [view, setView] = useState<ViewState>({ type: 'books' });
  const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});

  useEffect(() => { loadBooks(); }, []);

  useEffect(() => {
    if (view.type === 'units') loadUnits(view.book.id);
  }, [view]);

  const loadBooks = async () => {
    const { data: booksData } = await supabase.from('spn_books').select('*').order('sort_order');
    if (booksData) {
      setBooks(booksData as Book[]);
      // Load unit counts
      const { data: unitsData } = await supabase.from('spn_book_units').select('book_id');
      if (unitsData) {
        const counts: Record<string, number> = {};
        (unitsData as any[]).forEach(u => { counts[u.book_id] = (counts[u.book_id] || 0) + 1; });
        setUnitCounts(counts);
      }
    }
  };

  const loadUnits = async (bookId: string) => {
    const { data } = await supabase.from('spn_book_units').select('*').eq('book_id', bookId).order('sort_order');
    if (data) setUnits(data as Unit[]);
  };

  // Word Bank view
  if (view.type === 'wordbank') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView({ type: 'units', book: view.book })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to {view.book.name}
        </button>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: view.book.cover_color }}>
            <Type className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-lg">{view.unit.name}</h2>
            <p className="text-xs text-muted-foreground">Word Bank</p>
          </div>
        </div>
        <WordBankStudentView unitId={view.unit.id} />
      </div>
    );
  }

  // STP view
  if (view.type === 'stp') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView({ type: 'units', book: view.book })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to {view.book.name}
        </button>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: view.book.cover_color }}>
            <FileText className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-lg">{view.unit.name}</h2>
            <p className="text-xs text-muted-foreground">Straight to the Point</p>
          </div>
        </div>
        <StraightToPointView unitId={view.unit.id} />
      </div>
    );
  }

  // Units list
  if (view.type === 'units') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView({ type: 'books' })} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Books
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: view.book.cover_color }}>
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{view.book.name}</h1>
            {view.book.description && <p className="text-sm text-muted-foreground">{view.book.description}</p>}
          </div>
        </div>

        {units.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No units available yet.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {units.map((u, i) => (
              <div key={u.id} className="space-y-2">
                <div className="flex items-center gap-3 px-1">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: view.book.cover_color }}>
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-foreground">{u.name}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 ml-11">
                  <Card className="cursor-pointer hover:shadow-md transition-all active:scale-[0.98]" onClick={() => setView({ type: 'wordbank', unit: u, book: view.book })}>
                    <CardContent className="p-3 flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30">
                        <Type className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Word Bank</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:shadow-md transition-all active:scale-[0.98]" onClick={() => setView({ type: 'stp', unit: u, book: view.book })}>
                    <CardContent className="p-3 flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Straight to the Point</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Books grid
  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
        <BookOpen className="h-6 w-6" /> Books
      </h1>

      {books.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No books available yet.</p>
          <p className="text-sm mt-1">Check back later!</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {books.map((b) => (
            <Card key={b.id} className="cursor-pointer hover:shadow-lg transition-all overflow-hidden active:scale-[0.98]" onClick={() => setView({ type: 'units', book: b })}>
              <div className="h-24 flex items-center justify-center relative" style={{ background: `linear-gradient(135deg, ${b.cover_color}, ${b.cover_color}99)` }}>
                <BookOpen className="h-10 w-10 text-white/80" />
                <div className="absolute bottom-2 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white font-medium">
                  {unitCounts[b.id] || 0} units
                </div>
              </div>
              <CardContent className="p-3">
                <p className="font-bold text-foreground">{b.name}</p>
                {b.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{b.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BooksView;
