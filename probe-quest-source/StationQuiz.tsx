import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { stationQuestions } from '@/game/quizzes';
import type { Mission } from '@/game/catalog';

export function StationQuiz({ mission, onAnswer, onClose }: {
  mission: Mission;
  onAnswer: (choice: number) => void;
  onClose: () => void;
}) {
  const question = stationQuestions[mission.id];
  const answered = useRef(false);
  useEffect(() => { answered.current = false; }, [mission.id]);
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-auto rounded-3xl bg-card sm:max-w-xl" data-testid="station-quiz">
        <div className="text-xs font-bold uppercase tracking-wider text-primary">Station challenge · Game paused</div>
        <DialogTitle className="font-display text-2xl">{mission.name}</DialogTitle>
        <DialogDescription>Choose one answer. A correct answer collects this record and earns 100 points. A wrong answer locks only this station for one minute.</DialogDescription>
        <h3 className="mt-3 font-display text-xl font-bold">{question.question}</h3>
        <div className="grid gap-2">
          {question.choices.map((choice, index) => (
            <button key={choice} data-testid={`quiz-choice-${index}`}
              className="rounded-xl border-2 border-border bg-background p-3 text-left font-semibold transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
              onClick={() => {
                if (answered.current) return;
                answered.current = true;
                onAnswer(index);
              }}>
              <span className="mr-3 inline-block rounded-lg bg-muted px-2 py-1 font-mono">{'ABCD'[index]}</span>{choice}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Source: {question.source}. Read the Field guide before your next visit to learn more.</p>
        <a href="https://nssdc.gsfc.nasa.gov/nmc/" target="_blank" rel="noreferrer" className="text-xs font-bold underline">Explore NASA’s NSSDCA catalog</a>
        <button className="rounded-xl bg-muted p-2 font-bold" onClick={onClose}>Leave station without answering</button>
      </DialogContent>
    </Dialog>
  );
}
