import { useState, useMemo } from "react";
import { CATEGORIES, DIFFICULTIES } from "../../../utils/constants";
import { BiSearch } from "../../../utils/icons";
import "./ChallengeFilters.css";

const ChallengeFilters = ({
  selectedCategory,
  setSelectedCategory,
  selectedDifficulty,
  setSelectedDifficulty,
  searchQuery,
  setSearchQuery,
  displayCount,
  setDisplayCount,
  _totalChallenges,
  challenges = [], // Add challenges data for autocomplete
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Generate search suggestions from challenges
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return challenges
      .filter((c) => c.title.toLowerCase().includes(query))
      .slice(0, 5)
      .map((c) => c.title);
  }, [searchQuery, challenges]);

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="challenge-filters">
      {/* Enhanced Search Bar with Autocomplete */}
      <div className="search-container">
        <div className="search-box">
          <BiSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Find a challenge..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => searchQuery && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <BiSearch className="suggestion-icon" />
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simplified Filters Row */}
      <div className="filters-row">
        {/* Category Filter - Compact */}
        <div className="filter-group compact">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty Filter - Compact */}
        <div className="filter-group compact">
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="filter-select"
            aria-label="Filter by difficulty"
          >
            <option value="all">All Levels</option>
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty.id} value={difficulty.id}>
                {difficulty.name}
              </option>
            ))}
          </select>
        </div>

        {/* Display Count - Compact */}
        <div className="filter-group compact">
          <select
            value={displayCount}
            onChange={(e) => setDisplayCount(Number(e.target.value))}
            className="filter-select"
            aria-label="Results per page"
          >
            <option value={6}>Show 6</option>
            <option value={12}>Show 12</option>
            <option value={24}>Show 24</option>
            <option value={-1}>Show All</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ChallengeFilters;
