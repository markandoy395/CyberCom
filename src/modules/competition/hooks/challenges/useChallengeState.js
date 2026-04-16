import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  transformChallengeData,
  getInitialUnlockedChallenges,
  groupChallengesByDifficulty,
  filterChallengesByCategory,
  filterChallengesBySearch,
  calculateUnlockCount,
  formatElapsedTime,
  getAvailableCategories,
} from '../../utils/challengeUtils';

export const useChallengeState = (parentChallenges = [], parentSelectedChallenge = null) => {
  // Transform data - ONLY use database challenges from API
  // Deduplicate to prevent repeating challenges in display
  const uniqueParentChallenges = Array.from(
    new Map((parentChallenges || []).map(c => [c.id, c])).values()
  );
  
  const initialChallenges = uniqueParentChallenges.length > 0 
    ? transformChallengeData(uniqueParentChallenges)
    : [];

  // State
  const [challenges, setChallenges] = useState(initialChallenges);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChallenge, setSelectedChallenge] = useState(parentSelectedChallenge);
  const [unlockedChallenges, setUnlockedChallenges] = useState(() => 
    getInitialUnlockedChallenges(uniqueParentChallenges, initialChallenges)
  );
  const scrollContainerRef = useRef(null);

  // Calculate solve counts from challenges array to avoid dependency cycle
  const getSolveCountForDifficulty = useCallback((difficulty) => {
    return challenges.filter(c => c.difficulty === difficulty && c.status === "solved").length;
  }, [challenges]);

  const challengeSignature = useMemo(() => {
    if (!parentChallenges || parentChallenges.length === 0) {
      return '';
    }

    // Deduplicate challenges before computing signature
    const uniqueChallenges = Array.from(
      new Map(parentChallenges.map(c => [c.id, c])).values()
    );

    return JSON.stringify(uniqueChallenges.map(challenge => ({
      id: challenge.id,
      competitionChallengeId: challenge.competition_challenges_id || null,
      title: challenge.title,
      description: challenge.description,
      fullDescription: challenge.full_description || challenge.fullDescription || null,
      difficulty: challenge.difficulty,
      points: challenge.competition_points || challenge.points || null,
      solverCount: challenge.solver_count || challenge.solverCount || 0,
      status: challenge.status,
      teamSolved: challenge.team_solved || false,
      categoryId: challenge.category_id || challenge.category?.id || null,
      categoryName: challenge.category_name || challenge.category?.name || null,
      hints: challenge.hints || challenge.hint || null,
      resources: challenge.resources || challenge.attachments || null,
    })));
  }, [parentChallenges]);

  useEffect(() => {
    if (!parentChallenges) {
      return;
    }

    // Deduplicate before transforming
    const uniqueChallenges = Array.from(
      new Map(parentChallenges.map(c => [c.id, c])).values()
    );

    const transformed = transformChallengeData(uniqueChallenges);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChallenges(prevChallenges => {
      const previousById = new Map(prevChallenges.map(challenge => [challenge.id, challenge]));

      return transformed.map(challenge => {
        const previousChallenge = previousById.get(challenge.id);

        if (!previousChallenge) {
          return challenge;
        }

        if (challenge.status !== 'solved') {
          return challenge;
        }

        return {
          ...challenge,
          status: 'solved',
          solved: challenge.solved || previousChallenge.solved || 1,
          solveTime: previousChallenge.solveTime || challenge.solveTime,
        };
      });
    });

    setUnlockedChallenges(prevUnlockedChallenges => {
      const now = Date.now();
      const nextUnlockedChallenges = new Map();

      transformed.forEach(challenge => {
        if (challenge.status !== 'locked') {
          nextUnlockedChallenges.set(
            challenge.id,
            prevUnlockedChallenges.get(challenge.id) || { unlockedAt: now }
          );
        }
      });

      return nextUnlockedChallenges;
    });
  }, [challengeSignature, parentChallenges]);

  // Computed values
  const challengesByDifficulty = challenges.length > 0 
    ? groupChallengesByDifficulty(challenges)
    : { hard: [], medium: [], easy: [] };

  const filteredByCategory = filterChallengesByCategory(
    challengesByDifficulty,
    unlockedChallenges,
    selectedCategory
  );

  const filteredChallenges = filterChallengesBySearch(filteredByCategory, searchQuery);

  const availableCategories = getAvailableCategories(challenges);

  // Unlock next challenges logic
  const unlockNextChallenges = useCallback((solvedChallenge) => {
    const difficulty = solvedChallenge.difficulty;
    const currentSolveCount = getSolveCountForDifficulty(difficulty);
    const challengesToUnlock = calculateUnlockCount(difficulty, currentSolveCount);

    const unsolvedInDifficulty = challenges
      .filter(
        (c) =>
          c.difficulty === difficulty &&
          c.status === "unsolved" &&
          !unlockedChallenges.has(c.id)
      )
      .slice(0, challengesToUnlock);

    if (unsolvedInDifficulty.length > 0) {
      const newUnlockedMap = new Map(unlockedChallenges);
      const now = Date.now();
      unsolvedInDifficulty.forEach((c) =>
        newUnlockedMap.set(c.id, { unlockedAt: now })
      );
      setUnlockedChallenges(newUnlockedMap);
    }
  }, [challenges, unlockedChallenges, getSolveCountForDifficulty]);

  // Handle challenge solved
  const handleChallengeSolved = useCallback((challengeId) => {
    const solvedChallenge = challenges.find((c) => c.id === challengeId);
    const unlockedInfo = unlockedChallenges.get(challengeId);

    setChallenges((prevChallenges) =>
      prevChallenges.map((c) =>
        c.id === challengeId
          ? {
              ...c,
              status: "solved",
              solved: c.solved + 1,
              solveTime: formatElapsedTime(unlockedInfo?.unlockedAt),
            }
          : c
      )
    );

    unlockNextChallenges(solvedChallenge);
  }, [challenges, unlockedChallenges, unlockNextChallenges]);

  return {
    challenges,
    setChallenges,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedChallenge,
    setSelectedChallenge,
    unlockedChallenges,
    setUnlockedChallenges,
    scrollContainerRef,
    challengesByDifficulty,
    filteredChallenges,
    availableCategories,
    handleChallengeSolved,
  };
};
