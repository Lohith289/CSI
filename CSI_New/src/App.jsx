import React, { useState, useEffect } from 'react';
import { teamAQuestions, teamBQuestions, tieBreakerQuestions, penaltyQuestions } from './questions';

function App() {
  const [gamePhase, setGamePhase] = useState('intro'); // intro, playing, tiebreaker, gameover
  const [ropePosition, setRopePosition] = useState(0); // -20 (A wins) to +20 (B wins)
  const [winner, setWinner] = useState(null);

  // Deep clone to avoid mutating original exports
  const initialA = JSON.parse(JSON.stringify(teamAQuestions));
  const initialB = JSON.parse(JSON.stringify(teamBQuestions));

  const [teamA, setTeamA] = useState({
    name: 'Team A',
    questions: initialA,
    currentIndex: 0,
    timeLeft: initialA[0].time,
    selectedOption: null,
    powerups: { challenge: 1, timeBomb: 1, passThePain: 1 },
    hasPain: false // If true, they are answering a passed question
  });

  const [teamB, setTeamB] = useState({
    name: 'Team B',
    questions: initialB,
    currentIndex: 0,
    timeLeft: initialB[0].time,
    selectedOption: null,
    powerups: { challenge: 1, timeBomb: 1, passThePain: 1 },
    hasPain: false
  });

  const WIN_THRESHOLD = 20;

  // Timer Effect
  useEffect(() => {
    if (gamePhase !== 'playing' && gamePhase !== 'tiebreaker') return;

    const timer = setInterval(() => {
      setTeamA(prev => {
        if (prev.currentIndex >= prev.questions.length) return prev;
        const nextTime = prev.timeLeft - 1;
        if (nextTime <= 0) {
          handleAutoSubmit('A', prev);
          return prev; // state will be updated in handleSubmit
        }
        return { ...prev, timeLeft: nextTime };
      });

      setTeamB(prev => {
        if (prev.currentIndex >= prev.questions.length) return prev;
        const nextTime = prev.timeLeft - 1;
        if (nextTime <= 0) {
          handleAutoSubmit('B', prev);
          return prev;
        }
        return { ...prev, timeLeft: nextTime };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase]);

  // Check Win Condition
  useEffect(() => {
    if (gamePhase === 'playing') {
      if (ropePosition <= -WIN_THRESHOLD) endGame('Team A');
      else if (ropePosition >= WIN_THRESHOLD) endGame('Team B');
      else if (teamA.currentIndex >= teamA.questions.length && teamB.currentIndex >= teamB.questions.length) {
        if (ropePosition < 0) endGame('Team A');
        else if (ropePosition > 0) endGame('Team B');
        else {
          // Tie breaker
          setGamePhase('tiebreaker');
          setTeamA(prev => ({ ...prev, questions: JSON.parse(JSON.stringify(tieBreakerQuestions)), currentIndex: 0, timeLeft: tieBreakerQuestions[0].time }));
          setTeamB(prev => ({ ...prev, questions: JSON.parse(JSON.stringify(tieBreakerQuestions)), currentIndex: 0, timeLeft: tieBreakerQuestions[0].time }));
        }
      }
    } else if (gamePhase === 'tiebreaker') {
      if (ropePosition < 0) endGame('Team A');
      else if (ropePosition > 0) endGame('Team B');
    }
  }, [ropePosition, teamA.currentIndex, teamB.currentIndex, gamePhase]);

  const endGame = (winnerName) => {
    setWinner(winnerName);
    setGamePhase('gameover');
  };

  const handleAutoSubmit = (teamId, teamState) => {
    // This function acts as a bridge for the timer
    // We defer to the main submit but passing the current state snapshot
    setTimeout(() => submitAnswer(teamId, teamState.selectedOption), 0);
  };

  const submitAnswer = (teamId, selectedOption) => {
    const isTeamA = teamId === 'A';
    const currentTeamState = isTeamA ? teamA : teamB;
    const setTeam = isTeamA ? setTeamA : setTeamB;
    const opponentId = isTeamA ? 'B' : 'A';
    
    if (currentTeamState.currentIndex >= currentTeamState.questions.length) return;

    const question = currentTeamState.questions[currentTeamState.currentIndex];
    const isCorrect = selectedOption === question.correctIndex;
    
    let ropeDelta = 0;
    
    if (currentTeamState.hasPain) {
      // It was a passed question
      if (!isCorrect) {
        // Punish the answering team, move towards opponent
        ropeDelta = isTeamA ? question.points : -question.points;
      }
      // If correct, nothing happens
    } else if (question.difficulty === 'very_hard') {
      // It was a challenge
      if (isCorrect) {
        ropeDelta = isTeamA ? -question.points : question.points;
      } else {
        ropeDelta = isTeamA ? (question.points * 2) : -(question.points * 2);
      }
    } else {
      // Normal question
      if (isCorrect) {
        ropeDelta = isTeamA ? -question.points : question.points;
      }
    }

    setRopePosition(prev => {
      let newPos = prev + ropeDelta;
      if (newPos < -WIN_THRESHOLD) newPos = -WIN_THRESHOLD;
      if (newPos > WIN_THRESHOLD) newPos = WIN_THRESHOLD;
      return newPos;
    });

    setTeam(prev => {
      const nextIndex = prev.currentIndex + 1;
      const nextQ = prev.questions[nextIndex];
      return {
        ...prev,
        currentIndex: nextIndex,
        timeLeft: nextQ ? nextQ.time : 0,
        selectedOption: null,
        hasPain: false
      };
    });
  };

  const usePowerup = (teamId, powerup) => {
    const isTeamA = teamId === 'A';
    const currentTeamState = isTeamA ? teamA : teamB;
    const opponentState = isTeamA ? teamB : teamA;
    const setTeam = isTeamA ? setTeamA : setTeamB;
    const setOpponent = isTeamA ? setTeamB : setTeamA;

    if (currentTeamState.powerups[powerup] <= 0) return;

    // Deduct powerup
    setTeam(prev => ({
      ...prev,
      powerups: { ...prev.powerups, [powerup]: prev.powerups[powerup] - 1 }
    }));

    if (powerup === 'challenge') {
      // Replace opponent's current question with a penalty question
      setOpponent(prev => {
        const pQ = penaltyQuestions[Math.floor(Math.random() * penaltyQuestions.length)];
        const newQs = [...prev.questions];
        newQs[prev.currentIndex] = pQ;
        return {
          ...prev,
          questions: newQs,
          timeLeft: pQ.time,
          selectedOption: null
        };
      });
    } else if (powerup === 'timeBomb') {
      // Decrease opponent time
      setOpponent(prev => {
        const q = prev.questions[prev.currentIndex];
        const decrease = q.difficulty === 'hard' || q.difficulty === 'very_hard' ? 30 : 25;
        const newTime = Math.max(1, prev.timeLeft - decrease);
        return { ...prev, timeLeft: newTime };
      });
    } else if (powerup === 'passThePain') {
      // Give current question to opponent
      const currentQ = currentTeamState.questions[currentTeamState.currentIndex];
      setOpponent(prev => {
        const newQs = [...prev.questions];
        // Insert right at current index to force them to answer it now
        newQs.splice(prev.currentIndex, 0, currentQ);
        return {
          ...prev,
          questions: newQs,
          timeLeft: currentQ.time,
          hasPain: true,
          selectedOption: null
        };
      });
      // Skip current question for activating team
      setTeam(prev => {
        const nextIndex = prev.currentIndex + 1;
        const nextQ = prev.questions[nextIndex];
        return {
          ...prev,
          currentIndex: nextIndex,
          timeLeft: nextQ ? nextQ.time : 0,
          selectedOption: null
        };
      });
    }
  };

  if (gamePhase === 'intro') {
    return (
      <div className="arena-viewport">
        <div className="scanline"></div>
        <div className="frosted-ambient-orb"></div>
        <div className="header" style={{ marginTop: '20vh' }}>
          <h1 className="brand-title">Code'Clash</h1>
          <h2 style={{ color: 'var(--cyan-core)', marginTop: '20px', letterSpacing: '0.2em' }}>TUG OF WAR ARENA</h2>
          <button 
            style={{ marginTop: '50px', padding: '15px 40px', background: 'transparent', border: '1px solid var(--cyan-core)', color: 'var(--cyan-core)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.2em' }}
            onClick={() => setGamePhase('playing')}
          >
            INITIALISE ARENA
          </button>
        </div>
      </div>
    );
  }

  const renderTeamPanel = (teamId) => {
    const isA = teamId === 'A';
    const state = isA ? teamA : teamB;
    const q = state.questions[state.currentIndex];
    if (!q) return <div className={`team-panel team-${teamId.toLowerCase()}`}><h2>Finished</h2></div>;

    const progress = (state.timeLeft / q.time) * 100;

    return (
      <div className={`team-panel team-${teamId.toLowerCase()}`}>
        <div className="hud-corners"></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
          <h2 style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{state.name}</h2>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Q {state.currentIndex + 1} / {state.questions.length}</span>
        </div>

        <div className="timer-bar">
          <div className="timer-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div style={{ textAlign: 'right', marginBottom: '20px', fontSize: '0.9rem' }}>{state.timeLeft}s</div>

        <div className="question-card">
          <div style={{ fontSize: '0.8rem', color: isA ? 'var(--cyan-core)' : 'var(--crimson-core)', marginBottom: '10px', textTransform: 'uppercase' }}>
            {state.hasPain ? '⚠️ PASSED TO YOU (NO ESCAPE)' : q.difficulty.replace('_', ' ')}
            {' '}- {q.points} PTS
          </div>
          <div className="question-text">{q.text}</div>
          
          <div className="options-grid">
            {q.options.map((opt, idx) => (
              <button 
                key={idx} 
                className={`option-btn ${state.selectedOption === idx ? 'selected' : ''}`}
                onClick={() => {
                  const setter = isA ? setTeamA : setTeamB;
                  setter(p => ({ ...p, selectedOption: idx }));
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="action-row">
            <button className="submit-btn" onClick={() => submitAnswer(teamId, state.selectedOption)}>
              Submit Answer
            </button>
          </div>

          <div className="powerups-panel">
            <button 
              className="powerup-btn" 
              disabled={state.powerups.challenge === 0}
              onClick={() => usePowerup(teamId, 'challenge')}
            >
              Challenge
            </button>
            <button 
              className="powerup-btn" 
              disabled={state.powerups.timeBomb === 0 || q.difficulty === 'easy'} // Cannot timebomb if opponent is not on med/hard, but we don't know opponent's state easily here. Let's just rely on click.
              onClick={() => usePowerup(teamId, 'timeBomb')}
            >
              Time Bomb
            </button>
            <button 
              className="powerup-btn" 
              disabled={state.powerups.passThePain === 0}
              onClick={() => usePowerup(teamId, 'passThePain')}
            >
              No Escape
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="arena-viewport">
      <div className="scanline"></div>
      <div className="frosted-ambient-orb"></div>
      
      <div className="header">
        <h1 className="brand-title">Code'Clash</h1>
      </div>

      <div className="rope-container">
        <div className="rope-line"></div>
        {/* Calculate percentage left for marker: 0% is Team A wins, 100% is Team B wins. 
            ropePosition runs from -WIN_THRESHOLD to +WIN_THRESHOLD.
            Percentage = ((ropePosition + WIN_THRESHOLD) / (2 * WIN_THRESHOLD)) * 100
        */}
        <div 
          className="rope-marker" 
          style={{ left: `${((ropePosition + WIN_THRESHOLD) / (2 * WIN_THRESHOLD)) * 100}%` }}
        ></div>
      </div>

      <div className="split-screen">
        {renderTeamPanel('A')}
        {renderTeamPanel('B')}
      </div>

      {gamePhase === 'gameover' && (
        <div className="game-over-screen">
          <h1 style={{ color: winner === 'Team A' ? 'var(--cyan-core)' : 'var(--crimson-core)', fontSize: '4rem', marginBottom: '20px' }}>
            {winner} WINS
          </h1>
          <button 
            style={{ padding: '10px 30px', background: 'transparent', border: '1px solid #fff', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase' }}
            onClick={() => window.location.reload()}
          >
            Restart Arena
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
