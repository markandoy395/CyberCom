import { CATEGORIES, DIFFICULTIES } from "../../utils/constants";
import "./ChallengeFilters.css";

const ChallengeFilters = ({
  selectedCategory,
  setSelectedCategory,
  selectedDifficulty,
  setSelectedDifficulty,
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <div className="challenge-filters">
      {/* Search Bar */}
      <div className="filter-search">
        <input
          type="text"
          className="input search-input"
          placeholder="🔍 Search challenges..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Filters */}
      <div className="filter-group">
        <label className="filter-label">Category:</label>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${
              selectedCategory === "all" ? "active" : ""
            }`}
            onClick={() => setSelectedCategory("all")}
          >
            All
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              className={`filter-btn filter-btn-${category.color} ${
                selectedCategory === category.id ? "active" : ""
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="filter-icon">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty Filters */}
      <div className="filter-group">
        <label className="filter-label">Difficulty:</label>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${
              selectedDifficulty === "all" ? "active" : ""
            }`}
            onClick={() => setSelectedDifficulty("all")}
          >
            All
          </button>
          {DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty.id}
              className={`filter-btn difficulty-badge difficulty-${
                difficulty.id
              } ${selectedDifficulty === difficulty.id ? "active" : ""}`}
              onClick={() => setSelectedDifficulty(difficulty.id)}
            >
              {difficulty.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChallengeFilters;
