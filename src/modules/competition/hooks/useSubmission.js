import { useCallback, useState, useRef } from 'react';
import { encryptedFetch } from '../../../utils/encryption';
import { apiGet, PARTICIPANT_SERVICE_UNAVAILABLE_MESSAGE } from '../../../utils/api';
import { FaCircleCheck, FaCircleXmark } from '../../../utils/icons';
import { getAwardedPointsFromSubmission } from '../utils/scoringUtils';

const MAX_ATTEMPTS = 10;
const MIN_SUBMIT_DELAY = 500;
const buildSessionPayload = () => {
  const rawSession = localStorage.getItem('competitionSession');

  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession);

    if (!session.memberId || !session.teamId) {
      return null;
    }

    return {
      memberId: parseInt(session.memberId, 10),
      teamId: parseInt(session.teamId, 10),
      competitionId: session.competitionId ? parseInt(session.competitionId, 10) : null,
    };
  } catch {
    return null;
  }
};

export const useSubmission = () => {
  const [flag, setFlag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [wasSolved, setWasSolved] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const isSubmittingRef = useRef(false);
  const lastSubmitTimeRef = useRef(0);
  const loadAttemptSummary = useCallback(async (challengeId) => {
    const session = buildSessionPayload();

    if (!session || !challengeId) {
      setAttempts(0);
      setWasSolved(false);
      return null;
    }

    try {
      const summary = await apiGet(
        `/submissions/attempt-summary?team_id=${session.teamId}&team_member_id=${session.memberId}&competition_id=${session.competitionId || ''}&challenge_id=${challengeId}`
      );
      const payload = summary.data || {};

      setAttempts(payload.attempts_used || 0);
      setWasSolved(Boolean(payload.team_solved));

      return payload;
    } catch {
      setAttempts(0);
      setWasSolved(false);

      return null;
    }
  }, []);

  const handleSubmit = async (e, challengeId, challengeFlag = null, testMode = true) => {
    e.preventDefault();

    if (attempts >= MAX_ATTEMPTS) {
      setResult({
        success: false,
        message: "Team attempt limit exceeded!",
        icon: FaCircleXmark,
      });
      return;
    }
    
    const now = Date.now();
    if (isSubmittingRef.current || now - lastSubmitTimeRef.current < MIN_SUBMIT_DELAY) {
      return;
    }
    
    isSubmittingRef.current = true;
    lastSubmitTimeRef.current = now;
    setSubmitting(true);
    setAttempts(attempts + 1);

    try {
      // Test mode: validate locally against challenge flag
      if (testMode && challengeFlag) {
        const isCorrect = flag.trim().toLowerCase() === challengeFlag.trim().toLowerCase();
        
        if (isCorrect) {
          setResult({
            success: true,
            message: "Correct! Flag is valid!",
            icon: FaCircleCheck,
          });
          setWasSolved(true);
        } else {
          setResult({
            success: false,
            message: `Wrong flag. Team attempts: ${attempts}/${MAX_ATTEMPTS}`,
            icon: FaCircleXmark,
          });
        }
        setFlag("");
        return;
      }

      // Database mode: submit to server
      const session = buildSessionPayload();

      if (!session) {
        throw new Error('Competition session not found. Please log in again.');
      }

      const submissionPayload = {
        team_id: session.teamId,
        team_member_id: session.memberId,
        competition_id: session.competitionId,
        challenge_id: challengeId,
        flag: flag.trim()
      };

      const response = await encryptedFetch('/api/submissions', {
        method: 'POST',
        body: JSON.stringify(submissionPayload)
      });

      const data = await response.json();
      const summary = data.data || null;
      const awardedPoints = getAwardedPointsFromSubmission(data);

      if (summary && summary.attempts_used !== undefined) {
        setAttempts(summary.attempts_used);
      }

      if (response.ok && data.success && data.submission?.is_correct) {
        const awardedPointsText = awardedPoints !== null ? ` (${awardedPoints} pts earned)` : '';
        setResult({
          success: true,
          message: `Correct! Challenge solved in ${summary?.attempts_used || attempts + 1}/${MAX_ATTEMPTS} team attempts${awardedPointsText}`,
          icon: FaCircleCheck,
        });
        setWasSolved(true);

        setFlag("");
      } else {
        const status = data.status || summary?.last_status;
        let message = response.status === 503
          ? PARTICIPANT_SERVICE_UNAVAILABLE_MESSAGE
          : (data.error || `Error. Team attempts: ${attempts}/${MAX_ATTEMPTS}`);

        if (status === 'incorrect') {
          message = `Wrong flag. Team attempts: ${summary?.attempts_used || attempts}/${MAX_ATTEMPTS}`;
        } else if (status === 'limit_reached') {
          message = 'Team attempt limit reached for this challenge.';
        } else if (status === 'already_solved') {
          const firstSolver = summary?.first_solver || null;
          const firstSolverLabel = firstSolver?.team_member_name
            || firstSolver?.team_member_username
            || null;

          message = firstSolverLabel
            ? `This challenge was solved first by ${firstSolverLabel}.`
            : 'This challenge is already solved by your team.';
          setWasSolved(true);
        }

        setResult({
          success: false,
          message,
          icon: FaCircleXmark,
        });

        setFlag("");
      }
    } catch {
      setResult({
        success: false,
        message: `Error submitting flag. Team attempts: ${attempts}/${MAX_ATTEMPTS}`,
        icon: FaCircleXmark,
      });
      
      setFlag("");
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return {
    flag,
    setFlag,
    submitting,
    result,
    setResult,
    wasSolved,
    attempts,
    loadAttemptSummary,
    handleSubmit,
    attemptsExceeded: attempts >= MAX_ATTEMPTS,
    maxAttempts: MAX_ATTEMPTS,
  };
};
