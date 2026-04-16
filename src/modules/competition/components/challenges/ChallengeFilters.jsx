import { memo } from "react";
import { BiSearch } from "../../../../utils/icons";

const ChallengeFilters = memo(({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  availableCategories,
}) => {
  return (
    <div className="competition-filters">
      <div className="filter-search">
        <BiSearch className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search challenges..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <select
        className="select"
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
      >
        <option value="all">All Categories</option>
        {availableCategories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
    </div>
  );
});

ChallengeFilters.displayName = 'ChallengeFilters';

export default ChallengeFilters;
