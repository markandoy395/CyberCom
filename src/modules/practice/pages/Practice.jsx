import { useState, useEffect, useMemo } from "react";

import { BiSearch, BiTrendingUp, BiCategory, BiPlay } from "../../../utils/icons";
import HeroSection from "../components/HeroSection";
import ChallengeFilters from "../components/ChallengeFilters";
import ChallengeGrid from "../components/ChallengeGrid";
import ChallengeModal from "../components/ChallengeModal";
import PracticeRules from "../components/PracticeRules";
import RecentAttempts from "../components/RecentAttempts";
import CategoryProgress from "../components/CategoryProgress";
import { apiGet, API_ENDPOINTS } from "../../../utils/api";
import "./Practice.css";

const _mockUserData = {
  recentAttempts: [
    {
      id: 1,
      challengeId: 1,
      name: "Hidden Message",
      status: "solved",
      timeAgo: "2 hours ago",
    },
    {
      id: 2,
      challengeId: 12,
      name: "SQL Injection",
      status: "in_progress",
      timeAgo: "5 hours ago",
    },
    {
      id: 3,
      challengeId: 6,
      name: "Caesar Shift",
      status: "solved",
      timeAgo: "1 day ago",
    },
    {
      id: 4,
      challengeId: 13,
      name: "XSS Stored",
      status: "unsolved",
      timeAgo: "2 days ago",
    },
  ],
  recommendations: [
    { id: 7, name: "Base64 Madness", difficulty: "easy", icon: "🔐" },
    { id: 14, name: "Directory Traversal", difficulty: "easy", icon: "🌐" },
    { id: 26, name: "Obfuscated Code", difficulty: "easy", icon: "🔧" },
  ],
  categoryProgress: {
    forensics: 40,
    crypto: 35,
    web: 28,
    binary: 8,
    reverse: 15,
  },
};

const normalizeAttachment = (resource) => {
  if (!resource || typeof resource !== "object") {
    return null;
  }

  return {
    type: resource.type || "file",
    name: resource.name || resource.title || resource.url || "Resource",
    url: resource.url || "",
  };
};

const normalizePracticeChallenge = (challenge) => {
  const categoryId = Number.parseInt(
    challenge.category_id ?? challenge.categoryId ?? challenge.category,
    10
  );

  return {
    ...challenge,
    title: challenge.title || "Untitled Challenge",
    description: challenge.description || "No description provided yet.",
    fullDescription:
      challenge.fullDescription || challenge.full_description || null,
    category: Number.isNaN(categoryId) ? null : categoryId,
    category_id: Number.isNaN(categoryId) ? null : categoryId,
    difficulty:
      typeof challenge.difficulty === "string"
        ? challenge.difficulty.toLowerCase()
        : "easy",
    solveCount: Number(challenge.solveCount ?? challenge.solve_count ?? 0),
    status: "unsolved",
    availabilityStatus: challenge.status || "active",
    hints: Array.isArray(challenge.hints) ? challenge.hints : [],
    tags: Array.isArray(challenge.tags) ? challenge.tags : [],
    attachment:
      Array.isArray(challenge.resources) && challenge.resources.length > 0
        ? normalizeAttachment(challenge.resources[0])
        : null,
  };
};

const Practice = () => {
  const [challenges, setChallenges] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(12); // Default: show 12 challenges
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [recentAttempts, setRecentAttempts] = useState(() => {
    // Initialize from localStorage on mount
    const savedAttempts = typeof window !== 'undefined' ? localStorage.getItem("userRecentAttempts") : null;
    if (savedAttempts) {
      try {
        return JSON.parse(savedAttempts);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [sidebarTab, setSidebarTab] = useState("filters"); // New state for tabs

  // Load challenges on mount
  useEffect(() => {
    const fetchChallenges = async () => {
      setLoading(true);

      try {
        const response = await apiGet(
          `${API_ENDPOINTS.CHALLENGES_LIST}?mode=practice`
        );
        const practiceChallenges = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.challenges)
            ? response.challenges
            : Array.isArray(response)
              ? response
              : [];

        const formattedChallenges = practiceChallenges
          .filter((challenge) => !challenge.status || challenge.status === "active")
          .map(normalizePracticeChallenge);

        setChallenges(formattedChallenges);
      } catch (error) {
        console.error("Failed to load practice challenges", error);
        setChallenges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, []);
  {
    /* Challenge Grid */
  }
  // Add this function in Practice.js, after handleChallengeClick

  const handleStatusUpdate = (challengeId, newStatus) => {
    setChallenges((prevChallenges) =>
      prevChallenges.map((challenge) => {
        // If this is the clicked challenge, set it to the new status
        if (challenge.id === challengeId) {
          return { ...challenge, status: newStatus };
        }
        // If another challenge was "in_progress", reset it to "unsolved"
        if (challenge.status === "in_progress" && newStatus === "in_progress") {
          return { ...challenge, status: "unsolved" };
        }
        return challenge;
      })
    );
  };
  // Filter challenges using useMemo
  const filteredChallengesComputed = useMemo(() => {
    let filtered = challenges;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((c) => String(c.category) === selectedCategory);
    }

    // Filter by difficulty
    if (selectedDifficulty !== "all") {
      filtered = filtered.filter((c) => c.difficulty === selectedDifficulty);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.tags?.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    return filtered;
  }, [selectedCategory, selectedDifficulty, searchQuery, challenges]);

  // Apply display count limit using useMemo
  const displayedChallenges = useMemo(() => {
    if (displayCount === -1) {
      // Show all challenges
      return filteredChallengesComputed;
    } else {
      // Show only the specified number
      return filteredChallengesComputed.slice(0, displayCount);
    }
  }, [filteredChallengesComputed, displayCount]);

  // Manage body scroll when modal is open
  useEffect(() => {
    if (selectedChallenge) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedChallenge]);
  // Calculate category progress based on solved challenges
  const calculateCategoryProgress = useMemo(() => {
    const categoryProgress = {};
    const categoryTotals = {};

    // Count total and solved challenges per category
    challenges.forEach((challenge) => {
      const category = challenge.category;
      if (!categoryTotals[category]) {
        categoryTotals[category] = { total: 0, solved: 0 };
      }
      categoryTotals[category].total += 1;
      if (challenge.status === "solved") {
        categoryTotals[category].solved += 1;
      }
    });

    // Calculate percentage for each category
    Object.keys(categoryTotals).forEach((category) => {
      const { total, solved } = categoryTotals[category];
      categoryProgress[category] = total > 0 ? Math.round((solved / total) * 100) : 0;
    });

    return categoryProgress;
  }, [challenges]);

  // Update stats to use calculated progress
  const stats = {
    totalChallenges: challenges.length,
    categories: new Set(challenges.map((challenge) => challenge.category).filter(Boolean))
      .size,
    problemsSolved: challenges.filter((c) => c.status === "solved").length,
    completedPercentage:
      Math.round(
        (challenges.filter((c) => c.status === "solved").length /
          challenges.length) *
          100
      ) || 0,
  };

  const handleChallengeClick = (challenge) => {
    setSelectedChallenge(challenge);
  };

  const handleCloseModal = (challengeId, wasSolved) => {
    // If challenge was solved, update its status
    if (wasSolved && challengeId) {
      setChallenges((prevChallenges) =>
        prevChallenges.map((c) =>
          c.id === challengeId
            ? { ...c, status: "solved", solveCount: c.solveCount + 1 }
            : c
        )
      );
    }

    // Record the attempt in recent attempts only if solved
    if (wasSolved && challengeId) {
      const challenge = challenges.find((c) => c.id === challengeId);
      if (challenge) {
        const newAttempt = {
          id: Date.now(), // Use timestamp as unique ID
          challengeId: challengeId,
          name: challenge.title,
          status: "solved",
          timeAgo: "just now",
        };

        // Add new attempt to the beginning and limit to 4 most recent
        setRecentAttempts((prevAttempts) => {
          const updatedAttempts = [newAttempt, ...prevAttempts].slice(0, 4);
          // Save to localStorage
          localStorage.setItem("userRecentAttempts", JSON.stringify(updatedAttempts));
          return updatedAttempts;
        });
      }
    }

    setSelectedChallenge(null);
  };

  return (
    <div className="practice-page">
      {/* Hero Section */}
      <HeroSection stats={stats} loading={loading} />

      {/* Practice Rules Banner */}
      <div className="practice-rules-banner-container">
        <PracticeRules isModal={false} />
      </div>

      {/* Main Content with Sidebar Layout */}
      <div className="practice-container">
        {/* Left Sidebar - Tabbed Navigation */}
        <aside className="practice-sidebar">
          {/* Tab Navigation */}
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${sidebarTab === "filters" ? "active" : ""}`}
              onClick={() => setSidebarTab("filters")}
              title="Filter challenges"
            >
              <BiSearch className="tab-icon" />
              <span className="tab-label">Filters</span>
            </button>
            <button
              className={`sidebar-tab ${sidebarTab === "stats" ? "active" : ""}`}
              onClick={() => setSidebarTab("stats")}
              title="View your statistics"
            >
              <BiTrendingUp className="tab-icon" />
              <span className="tab-label">Stats</span>
            </button>
            <button
              className={`sidebar-tab ${sidebarTab === "progress" ? "active" : ""}`}
              onClick={() => setSidebarTab("progress")}
              title="Category progress"
            >
              <BiCategory className="tab-icon" />
              <span className="tab-label">Progress</span>
            </button>
            <button
              className={`sidebar-tab ${sidebarTab === "recent" ? "active" : ""}`}
              onClick={() => setSidebarTab("recent")}
              title="Recent attempts"
            >
              <BiPlay className="tab-icon" />
              <span className="tab-label">Recent</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="sidebar-content">
            {/* Filters Tab */}
            {sidebarTab === "filters" && (
              <div className="tab-panel">
                <ChallengeFilters
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  selectedDifficulty={selectedDifficulty}
                  setSelectedDifficulty={setSelectedDifficulty}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  displayCount={displayCount}
                  setDisplayCount={setDisplayCount}
                  totalChallenges={filteredChallengesComputed.length}
                  challenges={challenges}
                />
              </div>
            )}

            {/* Stats Tab */}
            {sidebarTab === "stats" && (
              <div className="tab-panel">
                <div className="stats-panel">
                  <div className="stat-row">
                    <span className="stat-label">Challenges Solved</span>
                    <span className="stat-value">{stats.problemsSolved}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Current Rank</span>
                    <span className="stat-value">#5</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Available Now</span>
                    <span className="stat-value">{stats.totalChallenges}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Completion</span>
                    <span className="stat-value">{stats.completedPercentage}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Tab */}
            {sidebarTab === "progress" && (
              <div className="tab-panel">
                <CategoryProgress
                  categoryProgress={calculateCategoryProgress}
                  loading={loading}
                />
              </div>
            )}

            {/* Recent Tab */}
            {sidebarTab === "recent" && (
              <div className="tab-panel">
                <RecentAttempts recentAttempts={recentAttempts} loading={loading} />
              </div>
            )}
          </div>
        </aside>

        {/* Right Content - Challenges */}
        <div className="practice-content">
          {/* Display Info */}
          {filteredChallengesComputed.length > 0 && (
            <div className="challenges-info">
              <p className="text-secondary">
                Showing {displayedChallenges.length} of{" "}
                {filteredChallengesComputed.length} challenges
              </p>
            </div>
          )}

          {/* Challenge Grid */}
          <ChallengeGrid
            challenges={displayedChallenges}
            loading={loading}
            onChallengeClick={handleChallengeClick}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>
      </div>

      {/* Challenge Modal */}
      {selectedChallenge && (
        <ChallengeModal
          challenge={selectedChallenge}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default Practice;
