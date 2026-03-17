import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  Plus, BookOpen, ChevronLeft, Pencil, Trash2, GripVertical,
  Volume2, ArrowLeft, Layers, Type, FileText
} from 'lucide-react';

interface Book { id: string; name: string; description: string | null; cover_color: string; sort_order: number; }
interface Unit { id: string; book_id: string; name: string; sort_order: number; }
interface WordItem { id: string; unit_id: string; word: string; phonetic: string | null; audio_url: string | null; sort_order: number; }
interface STPBlock { id: string; unit_id: string; title: string; content_html: string | null; sort_order: number; }

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const AdminBooksManager = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [words, setWords] = useState<WordItem[]>([]);
  const [stpBlocks, setStpBlocks] = useState<STPBlock[]>([]);

  // Dialog states
  const [bookDialog, setBookDialog] = useState(false);
  const [unitDialog, setUnitDialog] = useState(false);
  const [wordDialog, setWordDialog] = useState(false);
  const [stpDialog, setStpDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // Form states
  const [bookName, setBookName] = useState('');
  const [bookDesc, setBookDesc] = useState('');
  const [bookColor, setBookColor] = useState('#10b981');
  const [unitName, setUnitName] = useState('');
  const [wordText, setWordText] = useState('');
  const [wordPhonetic, setWordPhonetic] = useState('');
  const [wordAudio, setWordAudio] = useState('');
  const [stpTitle, setStpTitle] = useState('');
  const [stpContent, setStpContent] = useState('');

  useEffect(() => { loadBooks(); }, []);
  useEffect(() => { if (selectedBook) loadUnits(selectedBook.id); }, [selectedBook]);
  useEffect(() => { if (selectedUnit) { loadWords(selectedUnit.id); loadSTP(selectedUnit.id); } }, [selectedUnit]);

  const loadBooks = async () => {
    const { data } = await supabase.from('spn_books').select('*').order('sort_order');
    if (data) setBooks(data as Book[]);
  };

  const loadUnits = async (bookId: string) => {
    const { data } = await supabase.from('spn_book_units').select('*').eq('book_id', bookId).order('sort_order');
    if (data) setUnits(data as Unit[]);
  };

  const loadWords = async (unitId: string) => {
    const { data } = await supabase.from('spn_word_bank_items').select('*').eq('unit_id', unitId).order('sort_order');
    if (data) setWords(data as WordItem[]);
  };

  const loadSTP = async (unitId: string) => {
    const { data } = await supabase.from('spn_straight_to_point').select('*').eq('unit_id', unitId).order('sort_order');
    if (data) setStpBlocks(data as STPBlock[]);
  };

  // CRUD: Books
  const saveBook = async () => {
    if (!bookName.trim()) return;
    if (editItem) {
      await supabase.from('spn_books').update({ name: bookName, description: bookDesc || null, cover_color: bookColor }).eq('id', editItem.id);
    } else {
      await supabase.from('spn_books').insert({ name: bookName, description: bookDesc || null, cover_color: bookColor, sort_order: books.length });
    }
    resetBookDialog(); loadBooks();
    toast({ title: editItem ? 'Book updated' : 'Book created' });
  };

  const deleteBook = async (id: string) => {
    await supabase.from('spn_books').delete().eq('id', id);
    if (selectedBook?.id === id) { setSelectedBook(null); setSelectedUnit(null); }
    loadBooks();
    toast({ title: 'Book deleted' });
  };

  const resetBookDialog = () => { setBookDialog(false); setEditItem(null); setBookName(''); setBookDesc(''); setBookColor('#10b981'); };

  // CRUD: Units
  const saveUnit = async () => {
    if (!unitName.trim() || !selectedBook) return;
    if (editItem) {
      await supabase.from('spn_book_units').update({ name: unitName }).eq('id', editItem.id);
    } else {
      await supabase.from('spn_book_units').insert({ name: unitName, book_id: selectedBook.id, sort_order: units.length });
    }
    resetUnitDialog(); loadUnits(selectedBook.id);
    toast({ title: editItem ? 'Unit updated' : 'Unit created' });
  };

  const deleteUnit = async (id: string) => {
    if (!selectedBook) return;
    await supabase.from('spn_book_units').delete().eq('id', id);
    if (selectedUnit?.id === id) setSelectedUnit(null);
    loadUnits(selectedBook.id);
    toast({ title: 'Unit deleted' });
  };

  const resetUnitDialog = () => { setUnitDialog(false); setEditItem(null); setUnitName(''); };

  // CRUD: Words
  const saveWord = async () => {
    if (!wordText.trim() || !selectedUnit) return;
    if (editItem) {
      await supabase.from('spn_word_bank_items').update({ word: wordText, phonetic: wordPhonetic || null, audio_url: wordAudio || null }).eq('id', editItem.id);
    } else {
      await supabase.from('spn_word_bank_items').insert({ word: wordText, phonetic: wordPhonetic || null, audio_url: wordAudio || null, unit_id: selectedUnit.id, sort_order: words.length });
    }
    resetWordDialog(); loadWords(selectedUnit.id);
    toast({ title: editItem ? 'Word updated' : 'Word added' });
  };

  const deleteWord = async (id: string) => {
    if (!selectedUnit) return;
    await supabase.from('spn_word_bank_items').delete().eq('id', id);
    loadWords(selectedUnit.id);
  };

  const resetWordDialog = () => { setWordDialog(false); setEditItem(null); setWordText(''); setWordPhonetic(''); setWordAudio(''); };

  // CRUD: STP
  const saveSTP = async () => {
    if (!stpTitle.trim() || !selectedUnit) return;
    if (editItem) {
      await supabase.from('spn_straight_to_point').update({ title: stpTitle, content_html: stpContent || null }).eq('id', editItem.id);
    } else {
      await supabase.from('spn_straight_to_point').insert({ title: stpTitle, content_html: stpContent || null, unit_id: selectedUnit.id, sort_order: stpBlocks.length });
    }
    resetStpDialog(); loadSTP(selectedUnit.id);
    toast({ title: editItem ? 'Block updated' : 'Block added' });
  };

  const deleteSTP = async (id: string) => {
    if (!selectedUnit) return;
    await supabase.from('spn_straight_to_point').delete().eq('id', id);
    loadSTP(selectedUnit.id);
  };

  const resetStpDialog = () => { setStpDialog(false); setEditItem(null); setStpTitle(''); setStpContent(''); };

  // ===== RENDER: Unit Content =====
  if (selectedUnit) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedUnit(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Units
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{selectedUnit.name}</h1>
            <p className="text-sm text-muted-foreground">{selectedBook?.name}</p>
          </div>
        </div>

        <Tabs defaultValue="wordbank" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="wordbank" className="gap-2"><Type className="h-4 w-4" /> Word Bank</TabsTrigger>
            <TabsTrigger value="stp" className="gap-2"><FileText className="h-4 w-4" /> Straight to the Point</TabsTrigger>
          </TabsList>

          {/* Word Bank Tab */}
          <TabsContent value="wordbank" className="space-y-3 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-foreground">Words ({words.length})</h3>
              <Button size="sm" onClick={() => { resetWordDialog(); setWordDialog(true); }} className="gap-1">
                <Plus className="h-4 w-4" /> Add Word
              </Button>
            </div>
            {words.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No words yet. Add your first word!</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {words.map((w) => (
                  <Card key={w.id} className="group">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{w.word}</p>
                        {w.phonetic && <p className="text-xs text-muted-foreground italic">/{w.phonetic}/</p>}
                      </div>
                      {w.audio_url && <Volume2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setEditItem(w); setWordText(w.word); setWordPhonetic(w.phonetic || ''); setWordAudio(w.audio_url || ''); setWordDialog(true);
                        }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteWord(w.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Straight to the Point Tab */}
          <TabsContent value="stp" className="space-y-3 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-foreground">Content Blocks ({stpBlocks.length})</h3>
              <Button size="sm" onClick={() => { resetStpDialog(); setStpDialog(true); }} className="gap-1">
                <Plus className="h-4 w-4" /> Add Block
              </Button>
            </div>
            {stpBlocks.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No content yet. Add your first block!</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {stpBlocks.map((b) => (
                  <Card key={b.id} className="group">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">{b.title}</p>
                          {b.content_html && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.content_html.replace(/<[^>]*>/g, '').slice(0, 120)}...</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setEditItem(b); setStpTitle(b.title); setStpContent(b.content_html || ''); setStpDialog(true);
                          }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSTP(b.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Word Dialog */}
        <Dialog open={wordDialog} onOpenChange={(o) => { if (!o) resetWordDialog(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? 'Edit Word' : 'Add Word'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Word *</label>
                <Input value={wordText} onChange={e => setWordText(e.target.value)} placeholder="e.g. Beautiful" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Phonetic</label>
                <Input value={wordPhonetic} onChange={e => setWordPhonetic(e.target.value)} placeholder="e.g. ˈbjuːtɪfəl" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Audio URL</label>
                <Input value={wordAudio} onChange={e => setWordAudio(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetWordDialog}>Cancel</Button>
              <Button onClick={saveWord} disabled={!wordText.trim()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* STP Dialog */}
        <Dialog open={stpDialog} onOpenChange={(o) => { if (!o) resetStpDialog(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editItem ? 'Edit Block' : 'Add Content Block'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Title *</label>
                <Input value={stpTitle} onChange={e => setStpTitle(e.target.value)} placeholder="e.g. Present Simple" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Content (HTML)</label>
                <Textarea value={stpContent} onChange={e => setStpContent(e.target.value)} placeholder="Write your content here... HTML supported." rows={8} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetStpDialog}>Cancel</Button>
              <Button onClick={saveSTP} disabled={!stpTitle.trim()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===== RENDER: Units List =====
  if (selectedBook) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setSelectedBook(null); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Books
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: selectedBook.cover_color }}>
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{selectedBook.name}</h1>
              {selectedBook.description && <p className="text-sm text-muted-foreground">{selectedBook.description}</p>}
            </div>
          </div>
          <Button size="sm" onClick={() => { resetUnitDialog(); setUnitDialog(true); }} className="gap-1">
            <Plus className="h-4 w-4" /> Add Unit
          </Button>
        </div>

        {units.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No units yet. Create your first unit!</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {units.map((u, i) => (
              <Card key={u.id} className="group cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedUnit(u)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: selectedBook.cover_color }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{u.name}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setEditItem(u); setUnitName(u.name); setUnitDialog(true);
                    }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteUnit(u.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Unit Dialog */}
        <Dialog open={unitDialog} onOpenChange={(o) => { if (!o) resetUnitDialog(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? 'Edit Unit' : 'Add Unit'}</DialogTitle></DialogHeader>
            <div>
              <label className="text-sm font-medium text-foreground">Unit Name *</label>
              <Input value={unitName} onChange={e => setUnitName(e.target.value)} placeholder="e.g. Unit 1 - Greetings" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetUnitDialog}>Cancel</Button>
              <Button onClick={saveUnit} disabled={!unitName.trim()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===== RENDER: Books List =====
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Manage Books
        </h1>
        <Button onClick={() => { resetBookDialog(); setBookDialog(true); }} className="gap-1">
          <Plus className="h-4 w-4" /> New Book
        </Button>
      </div>

      {books.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No books yet</p>
          <p className="text-sm mt-1">Create your first book to get started!</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {books.map((b) => (
            <Card key={b.id} className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden" onClick={() => setSelectedBook(b)}>
              <div className="h-2" style={{ backgroundColor: b.cover_color }} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: b.cover_color + '20' }}>
                      <BookOpen className="h-6 w-6" style={{ color: b.cover_color }} />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{b.name}</p>
                      {b.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setEditItem(b); setBookName(b.name); setBookDesc(b.description || ''); setBookColor(b.cover_color); setBookDialog(true);
                    }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBook(b.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Book Dialog */}
      <Dialog open={bookDialog} onOpenChange={(o) => { if (!o) resetBookDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Book' : 'New Book'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Book Name *</label>
              <Input value={bookName} onChange={e => setBookName(e.target.value)} placeholder="e.g. Beginner A1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Input value={bookDesc} onChange={e => setBookDesc(e.target.value)} placeholder="Optional description" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Cover Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setBookColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${bookColor === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetBookDialog}>Cancel</Button>
            <Button onClick={saveBook} disabled={!bookName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBooksManager;
