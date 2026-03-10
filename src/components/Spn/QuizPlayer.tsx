import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle } from 'lucide-react';

interface QuizPlayerProps {
  sectionId: string;
}

const QuizPlayer = ({ sectionId }: QuizPlayerProps) => {
  const { user } = useSpnAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    supabase.from('spn_quiz_questions').select('*').eq('section_id', sectionId).order('sort_order')
      .then(({ data }) => setQuestions((data as any[]) || []));
  }, [sectionId]);

  const checkAnswer = () => {
    const q = questions[currentIdx];
    const userAnswer = q.question_type === 'multiple_choice' ? selectedOption : answer.trim().toLowerCase();
    const correct = q.correct_answer.toLowerCase() === userAnswer;
    setIsCorrect(correct);
    setShowResult(true);
    if (correct) setScore(s => s + 1);
  };

  const next = () => {
    setShowResult(false);
    setAnswer('');
    setSelectedOption('');
    if (currentIdx + 1 >= questions.length) {
      finishQuiz();
    } else {
      setCurrentIdx(i => i + 1);
    }
  };

  const finishQuiz = async () => {
    setFinished(true);
    if (!user) return;

    await supabase.from('spn_quiz_attempts').insert({
      user_id: user.id, section_id: sectionId, score, total_questions: questions.length,
    });

    const points = score === questions.length ? 20 : 10;
    await supabase.from('spn_points').insert({ user_id: user.id, points, reason: 'Quiz completed' });

    await supabase.from('spn_progress').upsert({
      user_id: user.id, section_id: sectionId, completed: true,
      score: Math.round((score / questions.length) * 100),
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,section_id' });

    toast({ title: score === questions.length ? '🏆 Perfect score!' : '✅ Quiz complete!', description: `+${points} points` });
  };

  if (questions.length === 0) return <p className="text-sm text-muted-foreground">No quiz questions added yet.</p>;

  if (finished) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <span className="text-5xl">{score === questions.length ? '🏆' : '✅'}</span>
          <h3 className="text-xl font-bold text-foreground">Quiz Complete!</h3>
          <p className="text-lg">Score: <span className="font-bold text-emerald-600">{score}/{questions.length}</span></p>
          <p className="text-sm text-muted-foreground">{Math.round((score / questions.length) * 100)}% correct</p>
        </CardContent>
      </Card>
    );
  }

  const q = questions[currentIdx];
  const options = Array.isArray(q.options) ? q.options : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Question {currentIdx + 1} of {questions.length}</span>
        <span>Score: {score}</span>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-lg font-medium text-foreground">{q.question}</p>

          {q.question_type === 'multiple_choice' && (
            <div className="space-y-2">
              {options.map((opt: string, i: number) => (
                <button key={i}
                  onClick={() => !showResult && setSelectedOption(opt)}
                  disabled={showResult}
                  className={`w-full text-left p-3 rounded-lg border transition-colors text-sm
                    ${selectedOption === opt ? 'border-emerald-500 bg-emerald-50' : 'border-border hover:border-muted-foreground'}
                    ${showResult && opt === q.correct_answer ? 'border-emerald-500 bg-emerald-50' : ''}
                    ${showResult && selectedOption === opt && !isCorrect ? 'border-destructive bg-destructive/10' : ''}`}>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {(q.question_type === 'fill_blank' || q.question_type === 'translation') && (
            <Input value={answer} onChange={e => setAnswer(e.target.value)}
              placeholder="Type your answer..." disabled={showResult} />
          )}

          {showResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-destructive/10 text-destructive'}`}>
              {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="text-sm font-medium">
                {isCorrect ? 'Correct!' : `Wrong. The answer is: ${q.correct_answer}`}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            {!showResult ? (
              <Button onClick={checkAnswer} className="bg-emerald-600 hover:bg-emerald-700"
                disabled={!answer && !selectedOption}>
                Check Answer
              </Button>
            ) : (
              <Button onClick={next} className="bg-emerald-600 hover:bg-emerald-700">
                {currentIdx + 1 >= questions.length ? 'Finish Quiz' : 'Next Question'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizPlayer;
