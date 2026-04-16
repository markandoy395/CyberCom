import { useEffect, memo } from "react";
import CompetitionChallengeModal from "./CompetitionChallengeModal";
import ChallengeFilters from "./challenges/ChallengeFilters";
import DifficultyRow from "./challenges/DifficultyRow";
import { useChallengeState } from "../hooks/challenges/useChallengeState";
import "./CompetitionChallenges.css";

const CompetitionChallenges = ({ 
  selectedChallenge: parentSelectedChallenge = null,
  onSelectChallenge = () => {},
  challenges: parentChallenges = [],
  competitionStatus = null
}) => {
  const {
    challenges,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedChallenge,
    setSelectedChallenge,
    scrollContainerRef,
    filteredChallenges,
    availableCategories,
    handleChallengeSolved,
  } = useChallengeState(parentChallenges, parentSelectedChallenge);

  // Manage body scroll when modal is open
  useEffect(() => {
    if (selectedChallenge) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedChallenge]);

  // Scroll to first newly unlocked challenge (only on first render or when new challenges unlock)
  useEffect(() => {
    if (scrollContainerRef.current && filteredChallenges.hard && filteredChallenges.hard.length > 0) {
      // Only auto-scroll on initial render, not on every filter change
      // This allows users to manually scroll without the scroll position being reset
      const scrollContainer = scrollContainerRef.current;
      
      // Check if we haven't scrolled yet (scrollLeft is 0)
      if (scrollContainer.scrollLeft === 0 && scrollContainer.scrollWidth > scrollContainer.clientWidth) {
        // Only scroll if there are challenges to scroll to
        setTimeout(() => {
          requestAnimationFrame(() => {
            // Scroll slightly to show that scrolling is possible, but not all the way
            if (scrollContainer && scrollContainer.scrollWidth > scrollContainer.clientWidth) {
              scrollContainer.scrollLeft = Math.min(360, scrollContainer.scrollWidth);
            }
          });
        }, 100);
      }
    }
  }, [scrollContainerRef]);

  // Notify parent of selected challenge changes
  useEffect(() => {
    onSelectChallenge(selectedChallenge);
  }, [selectedChallenge, onSelectChallenge]);

  useEffect(() => {
    if (!selectedChallenge) {
      return;
    }

    const updatedChallenge = challenges.find(challenge => challenge.id === selectedChallenge.id);

    if (!updatedChallenge) {
      setSelectedChallenge(null);
      return;
    }

    if (updatedChallenge !== selectedChallenge) {
      setSelectedChallenge(updatedChallenge);
    }
  }, [challenges, selectedChallenge, setSelectedChallenge]);

  const handleChallengeClick = (challenge) => {
    setSelectedChallenge(challenge);
  };

  const handleCloseModal = (challengeId, wasSolved) => {
    if (wasSolved && challengeId) {
      handleChallengeSolved(challengeId);
    }
    setSelectedChallenge(null);
  };

  return (
    <div className="competition-challenges">
      <ChallengeFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        availableCategories={availableCategories}
      />

      <div className="difficulty-rows-container">
        <DifficultyRow
          difficulty="hard"
          challenges={filteredChallenges.hard}
          selectedCategory={selectedCategory}
          onChallengeClick={handleChallengeClick}
          scrollContainerRef={scrollContainerRef}
        />

        <DifficultyRow
          difficulty="medium"
          challenges={filteredChallenges.medium}
          selectedCategory={selectedCategory}
          onChallengeClick={handleChallengeClick}
        />

        <DifficultyRow
          difficulty="easy"
          challenges={filteredChallenges.easy}
          selectedCategory={selectedCategory}
          onChallengeClick={handleChallengeClick}
        />
      </div>

      {selectedChallenge && (
        <CompetitionChallengeModal
          challenge={selectedChallenge}
          onClose={handleCloseModal}
          competitionStatus={competitionStatus}
        />
      )}
    </div>
  );
};

export default memo(CompetitionChallenges);
