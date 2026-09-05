import React, { useState, useEffect, useRef } from 'react';
import { Zap, Timer, Award, CheckCircle2, XCircle, ArrowRight, Trophy } from 'lucide-react';
import { sounds } from '../utils/soundEffects';
import confetti from 'canvas-confetti';

export default function TieBreaker({
  tiebreakerQuestions, // 5 questions (ordered hard -> medium -> easy)
  teamA,
  teamB,
  onFinishTieBreaker
}) {
  // Turn phase: 'A_PLAYING' -> 'B_PLAYING' -> 'RESULTS'
  const [phase, setPhase] = useState('A_PLAYING');
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Scores state
  const [teamAResults, setTeamAResults] = useState({ correct: 0, totalTime: 0, answers: [] });
  const [teamBResults, setTeamBResults] = useState({ correct: 0, totalTime: 0, answers: [] });

  // Timer states
  const [elapsedMs, setElapsedMs] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);

  const activeTeamName = phase === 'A_PLAYING' ? teamA.name : teamB.name;
  const currentQ = tiebreakerQuestions[currentQIndex] || tiebreakerQuestions[0];

  // Increasing time limits: Q1 (easiest): 25s, Q2: 30s, Q3: 35s, Q4: 40s, Q5 (hardest): 45s
  const maxTimeSeconds = 25 + (currentQIndex * 5);

  const timerIntervalRef = useRef(null);
  const selectedOptionRef = useRef(selectedOption);
  const qStartRef = useRef(Date.now());
  selectedOptionRef.current = selectedOption;

  useEffect(() => {
    if (phase === 'RESULTS') {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      sounds.playVictory();
      return;
    }

    // Reset for new question
    const startTime = Date.now();
    qStartRef.current = startTime;
    setElapsedMs(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);

    timerIntervalRef.current = setInterval(() => {
      const diff = Date.now() - qStartRef.current;
      setElapsedMs(diff);

      if (diff >= maxTimeSeconds * 1000) {
        clearInterval(timerIntervalRef.current);
        // Auto-timeout: submit whatever is selected
        submitAnswer(selectedOptionRef.current, maxTimeSeconds * 1000);
      }
    }, 50);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [phase, currentQIndex]);

  const submitAnswer = (optionIdx, takenTimeMs) => {
    if (isAnswerSubmitted) return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsAnswerSubmitted(true);
    setSelectedOption(optionIdx);

    const isCorrect = optionIdx !== null && optionIdx === currentQ.correctIndex;
    const finalTime = Math.min(takenTimeMs, maxTimeSeconds * 1000);

    if (isCorrect) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }

    const answerRecord = {
      qIndex: currentQIndex,
      isCorrect,
      timeMs: finalTime,
      chosen: optionIdx
    };

    if (phase === 'A_PLAYING') {
      setTeamAResults((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        totalTime: prev.totalTime + finalTime,
        answers: [...prev.answers, answerRecord]
      }));
    } else {
      setTeamBResults((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        totalTime: prev.totalTime + finalTime,
        answers: [...prev.answers, answerRecord]
      }));
    }
  };

  const handleSelectAndSubmit = (idx) => {
    if (isAnswerSubmitted) return;
    const timeTaken = Date.now() - qStartRef.current;
    submitAnswer(idx, timeTaken);
  };

  const handleNextQuestion = () => {
    if (currentQIndex < tiebreakerQuestions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      if (phase === 'A_PLAYING') {
        // Switch to Team B
        setPhase('B_PLAYING');
        setCurrentQIndex(0);
      } else {
        // Show Results
        setPhase('RESULTS');
      }
    }
  };

  // Format milliseconds
  const formatMs = (ms) => {
    const sec = (ms / 1000).toFixed(2);
    return `${sec}s`;
  };

  // Determine Tie Breaker Winner
  const getWinner = () => {
    if (teamAResults.correct > teamBResults.correct) return teamA.name;
    if (teamBResults.correct > teamAResults.correct) return teamB.name;
    // Equal correct answers -> compare fastest total time
    if (teamAResults.totalTime < teamBResults.totalTime) return teamA.name;
    if (teamBResults.totalTime < teamAResults.totalTime) return teamB.name;
    return "TIE GAME!";
  };

  // Get difficulty label for current question (increasing: easy, easy, medium, medium, hard)
  const getDiffLabel = () => {
    if (currentQIndex <= 1) return 'EASY';
    if (currentQIndex <= 3) return 'MEDIUM';
    return 'HARD';
  };

  if (phase === 'RESULTS') {
    const winnerName = getWinner();
    return (
      <div className="tiebreaker-results-card">
        <Trophy className="trophy-gold" size={64} />
        <h2>TIE BREAKER CHAMPION!</h2>
        <h1 className="winner-title">{winnerName}</h1>

        <div className="tiebreaker-comparison-grid">
          <div className={`team-res-card ${winnerName === teamA.name ? 'winner-card' : ''}`}>
            <h3>{teamA.name}</h3>
            <div className="res-stat">
              <span>Correct Answers:</span>
              <strong>{teamAResults.correct} / 5</strong>
            </div>
            <div className="res-stat">
              <span>Total Speed Time:</span>
              <strong>{formatMs(teamAResults.totalTime)}</strong>
            </div>
          </div>

          <div className={`team-res-card ${winnerName === teamB.name ? 'winner-card' : ''}`}>
            <h3>{teamB.name}</h3>
            <div className="res-stat">
              <span>Correct Answers:</span>
              <strong>{teamBResults.correct} / 5</strong>
            </div>
            <div className="res-stat">
              <span>Total Speed Time:</span>
              <strong>{formatMs(teamBResults.totalTime)}</strong>
            </div>
          </div>
        </div>

        <button className="btn-finish-all" onClick={() => onFinishTieBreaker(winnerName)}>
          COMPLETE ROUND 2 <ArrowRight size={20} />
        </button>
      </div>
    );
  }

  const timePercent = Math.max(0, 100 - (elapsedMs / (maxTimeSeconds * 1000)) * 100);

  return (
    <div className="tiebreaker-container">
      <div className="tiebreaker-banner">
        <Zap className="bolt-icon" size={28} />
        <div>
          <h2>⚡ TIE-BREAKER SPEED ROUND ⚡</h2>
          <p>5 Questions of Decreasing Difficulty — Speed & Accuracy Count!</p>
        </div>
      </div>

      <div className="tiebreaker-status-bar">
        <div className="active-team-indicator">
          Playing Now: <strong>{activeTeamName}</strong>
        </div>
        <div className="q-progress-pill">
          Q{currentQIndex + 1} of 5 — <strong>{getDiffLabel()}</strong>
        </div>
        <div className="speed-timer-pill">
          <Timer size={18} />
          <span>Time: {formatMs(elapsedMs)} / {maxTimeSeconds}s</span>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="tb-timer-bar-track">
        <div
          className="tb-timer-bar-fill"
          style={{ width: `${timePercent}%` }}
        ></div>
      </div>

      <div className="tiebreaker-q-card">
        <h3 className="tb-question-text">{currentQ.question}</h3>

        <div className="options-grid">
          {currentQ.options.map((opt, idx) => {
            let stateClass = '';
            if (isAnswerSubmitted) {
              if (idx === currentQ.correctIndex) stateClass = 'option-correct';
              else if (idx === selectedOption) stateClass = 'option-wrong';
              else stateClass = 'option-disabled';
            } else if (idx === selectedOption) {
              stateClass = 'option-selected';
            }

            return (
              <button
                key={idx}
                className={`option-card ${stateClass}`}
                disabled={isAnswerSubmitted}
                onClick={() => handleSelectAndSubmit(idx)}
              >
                <span className="option-key">{String.fromCharCode(65 + idx)}</span>
                <span className="option-text">{opt}</span>
              </button>
            );
          })}
        </div>

        {isAnswerSubmitted && (
          <div className="tb-next-footer">
            <button className="btn-next-tb" onClick={handleNextQuestion}>
              {currentQIndex < 4 ? `NEXT QUESTION (${currentQIndex + 2}/5)` : phase === 'A_PLAYING' ? `${teamB.name}'s TURN →` : 'VIEW RESULTS →'} <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
