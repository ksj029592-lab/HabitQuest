import React, { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { CheckCheck, Coins, LoaderCircle, MessageCircle, RotateCw, Send, Trophy, X, Zap } from 'lucide-react';
import { DailyQuest } from '@types';
import { questApi } from '@api';
import { Button } from './Button';

interface QuestVerificationDialogProps {
  quest: DailyQuest;
  userId: string;
  onVerified: (quest: DailyQuest) => void;
  onClose: () => void;
}

const adjustmentText = {
  daily_gold_cap: '일일 골드 지급 한도가 적용됐어요.',
  daily_point_cap: '일일 시즌 점수 한도가 적용됐어요.',
  repeated_category: '같은 습관 카테고리의 반복 완료로 시즌 점수가 감산됐어요.',
};

const reflectionErrorMessage = (failure: unknown) => {
  if (isAxiosError(failure) && failure.response?.status === 401) return '세션이 만료됐어요. 답변은 이 탭에 남아 있어요. 창을 닫고 페르소나 선택 화면으로 돌아가 주세요.';
  if (isAxiosError(failure)) return 'AI 연결이 원활하지 않아요. 입력한 내용을 유지한 채 잠시 후 다시 시도해 주세요.';
  return failure instanceof Error ? failure.message : '검토 중 문제가 생겼어요. 다시 시도해 주세요.';
};

export const QuestVerificationDialog: React.FC<QuestVerificationDialogProps> = ({ quest, userId, onVerified, onClose }) => {
  const [question, setQuestion] = useState('');
  const draftKey = `habitquest:reflection:${userId}:${quest.id}`;
  const [answer, setAnswer] = useState(() => {
    try { return sessionStorage.getItem(draftKey) || ''; } catch { return ''; }
  });
  const updateAnswer = (value: string) => {
    setAnswer(value);
    try {
      if (value) sessionStorage.setItem(draftKey, value);
      else sessionStorage.removeItem(draftKey);
    } catch {
      // The current answer remains available if storage is disabled.
    }
  };
  const [phase, setPhase] = useState<'loading' | 'ready' | 'submitting' | 'success'>('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [completed, setCompleted] = useState<DailyQuest | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const busyRef = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busyRef.current) closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setError('');
    const load = async () => {
      try {
        const response = await questApi.getVerificationQuestion(quest.id, userId);
        if (!response.success || !response.data?.question) throw new Error(response.error?.message || '질문을 준비하지 못했어요. 다시 시도해 주세요.');
        if (!cancelled) { setQuestion(response.data.question); setPhase('ready'); }
      } catch (failure) {
        if (!cancelled) { setError(reflectionErrorMessage(failure)); setPhase('ready'); }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [quest.id, quest.title, quest.description, userId, attempt]);

  useEffect(() => {
    if (phase === 'ready' && question) answerRef.current?.focus();
    if (phase === 'success') dialogRef.current?.focus();
  }, [phase, question]);

  const showCompletion = (verified: DailyQuest) => {
    updateAnswer('');
    onVerified(verified);
    setCompleted(verified);
    setPhase('success');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busyRef.current || !answer.trim() || !question) return;
    busyRef.current = true;
    setPhase('submitting');
    setError('');
    try {
      const response = await questApi.completeQuest(quest.id, undefined, userId, answer.trim());
      if (!response.success || response.data?.status !== 'completed') {
        throw new Error(response.error?.message || '검토를 마치지 못했어요. 다시 시도해 주세요.');
      }
      showCompletion(response.data);
    } catch (failure) {
      if (isAxiosError(failure) && (!failure.response || failure.response.status >= 500)) {
        const daily = await questApi.getDailyQuests(userId).catch(() => undefined);
        const confirmed = daily?.data?.find((entry) => entry.id === quest.id && entry.status === 'completed');
        if (daily?.success && confirmed) {
          showCompletion(confirmed);
          return;
        }
      }
      setError(reflectionErrorMessage(failure));
      setPhase('ready');
    } finally {
      busyRef.current = false;
    }
  };

  return (
    <div className="hq-verification-backdrop">
      <div className="hq-verification-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="verification-title" aria-describedby="verification-quest" tabIndex={-1}>
        <div className="hq-verification-heading">
          <span className="hq-verification-icon">{phase === 'success' ? <CheckCheck size={22} /> : <MessageCircle size={22} />}</span>
          <button className="hq-icon-button" aria-label="검증 창 닫기" title="닫기" disabled={phase === 'submitting'} onClick={onClose}><X size={18} /></button>
        </div>
        <p className="hq-eyebrow">{phase === 'success' ? '완료 기록' : '실천 기록'}</p>
        <h2 id="verification-title">{phase === 'success' ? '오늘의 실천이 쌓였어요.' : '오늘의 경험을 들려주세요.'}</h2>
        <p id="verification-quest" className="hq-verification-quest">{quest.title}</p>

        {phase === 'loading' ? (
          <div className="hq-verification-loading" role="status"><LoaderCircle className="animate-spin" size={24} /><p>퀘스트에 맞는 질문을 준비하고 있어요.</p></div>
        ) : phase === 'success' && completed ? (
          <div className="hq-verification-success" role="status">
            {completed.levelUp && <p className="hq-level-up"><Zap size={20} aria-hidden="true" /> 레벨 업! Lv.{completed.levelUp}</p>}
            <p>{completed.verificationFeedback || '오늘의 작은 실천을 응원해요!'}</p>
            <div className="hq-quest-rewards">
              <span><Zap size={16} /> +{completed.expReward} XP</span>
              <span><Coins size={16} /> +{completed.goldReward} G</span>
              <span><Trophy size={16} /> +{completed.rankingPointAwarded ?? '—'} PT</span>
            </div>
            {!!completed.rewardAdjustments?.length && <ul className="hq-reward-adjustments">{completed.rewardAdjustments.map((reason) => <li key={reason}>{adjustmentText[reason]}</li>)}</ul>}
            <Button onClick={onClose} className="w-full">확인</Button>
          </div>
        ) : question ? (
          <form onSubmit={submit}>
            <label className="hq-verification-question" htmlFor="verification-answer">{question}</label>
            <textarea ref={answerRef} id="verification-answer" value={answer} onChange={(event) => updateAnswer(event.target.value)} maxLength={2000} rows={5} placeholder="활동하면서 느낀 점이나 기억에 남는 결과를 적어 주세요." disabled={phase === 'submitting'} aria-describedby="verification-privacy verification-error" />
            <div className="hq-verification-count">{answer.length.toLocaleString()} / 2,000</div>
            <p className="hq-verification-privacy" id="verification-privacy">답변은 AI 검토와 완료 기록에 사용돼요. 검토 전에는 이 브라우저 탭에 임시 저장돼요. 민감한 개인정보는 적지 마세요.</p>
            {error && <p className="hq-verification-error" id="verification-error" role="alert">{error}</p>}
            <Button type="submit" disabled={phase === 'submitting' || !answer.trim()} className="hq-verification-submit">
              {phase === 'submitting' ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
              {phase === 'submitting' ? '답변을 살펴보고 있어요' : '답변 보내고 검토받기'}
            </Button>
          </form>
        ) : (
          <div className="hq-verification-loading"><p role="alert" className="hq-verification-error">{error}</p><Button onClick={() => setAttempt((value) => value + 1)}><RotateCw size={16} /> 질문 다시 받기</Button></div>
        )}
      </div>
    </div>
  );
};