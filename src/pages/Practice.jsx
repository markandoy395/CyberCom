import { useState, useEffect, useMemo } from "react";
import HeroSection from "../components/practice/HeroSection";
import ChallengeFilters from "../components/practice/ChallengeFilters";
import ChallengeGrid from "../components/practice/ChallengeGrid";
import Sidebar from "../components/practice/Sidebar";
import "./Practice.css";

// Mock data - replace with actual API calls
const mockChallenges = [
  {
    id: 1,
    title: "Hidden Message",
    description:
      "Find the hidden message in this image file using forensic techniques.",
    category: "forensics",
    difficulty: "easy",
    points: 100,
    status: "solved",
    solveCount: 45,
    personalBestTime: "5m 23s",
  },
  {
    id: 2,
    title: "Caesar Shift",
    description:
      "Decrypt this message that has been encrypted with a Caesar cipher.",
    category: "crypto",
    difficulty: "easy",
    points: 100,
    status: "unsolved",
    solveCount: 38,
  },
  {
    id: 3,
    title: "SQL Injection",
    description: "Exploit this vulnerable login form to gain admin access.",
    category: "web",
    difficulty: "medium",
    points: 200,
    status: "in_progress",
    solveCount: 22,
  },
  {
    id: 4,
    title: "Buffer Overflow",
    description:
      "Exploit a buffer overflow vulnerability to execute arbitrary code.",
    category: "binary",
    difficulty: "hard",
    points: 300,
    status: "unsolved",
    solveCount: 8,
  },
  {
    id: 5,
    title: "Crackme",
    description: "Reverse engineer this binary to find the correct password.",
    category: "reverse",
    difficulty: "medium",
    points: 200,
    status: "unsolved",
    solveCount: 15,
  },
  {
    id: 6,
    title: "Mystery Box",
    description: "A miscellaneous challenge that tests various skills.",
    category: "misc",
    difficulty: "easy",
    points: 100,
    status: "solved",
    solveCount: 52,
    personalBestTime: "3m 45s",
  },
];

const mockUserData = {
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
      challengeId: 3,
      name: "SQL Injection",
      status: "in_progress",
      timeAgo: "5 hours ago",
    },
    {
      id: 3,
      challengeId: 2,
      name: "Caesar Shift",
      status: "unsolved",
      timeAgo: "1 day ago",
    },
  ],
  recommendations: [
    { id: 7, name: "XSS Attack", difficulty: "easy", icon: "🌐" },
    { id: 8, name: "RSA Encryption", difficulty: "medium", icon: "🔐" },
    { id: 9, name: "Memory Analysis", difficulty: "hard", icon: "🔍" },
  ],
  categoryProgress: {
    forensics: 75,
    crypto: 50,
    web: 30,
    binary: 10,
    reverse: 20,
    misc: 60,
  },
  badges: [
    {
      id: 1,
      type: "first-blood",
      icon: "🩸",
      description: "First to solve a challenge",
    },
    {
      id: 2,
      type: "speed-demon",
      icon: "⚡",
      description: "Solved in under 5 minutes",
    },
  ],
};

const Practice = () => {
  const [challenges, setChallenges] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Load challenges
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setChallenges(mockChallenges);
      setLoading(false);
    }, 500);
  }, []);

  // Filter challenges
  const filteredChallenges = useMemo(() => {
    let filtered = challenges;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((c) => c.category === selectedCategory);
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
          c.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [selectedCategory, selectedDifficulty, searchQuery, challenges]);

  // Calculate stats
  const stats = {
    totalChallenges: challenges.length,
    categories: 6,
    completedPercentage:
      Math.round(
        (challenges.filter((c) => c.status === "solved").length /
          challenges.length) *
          100
      ) || 0,
    totalPoints: challenges
      .filter((c) => c.status === "solved")
      .reduce((sum, c) => sum + c.points, 0),
  };

  return (
    <div className="practice-page">
      {/* Hero Section */}
      <HeroSection stats={stats} />

      {/* Main Content */}
      <div className="practice-container">
        <div className="practice-content">
          {/* Filters */}
          <ChallengeFilters
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedDifficulty={selectedDifficulty}
            setSelectedDifficulty={setSelectedDifficulty}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* Challenge Grid */}
          <ChallengeGrid challenges={filteredChallenges} loading={loading} />
        </div>

        {/* Sidebar */}
        <Sidebar userData={mockUserData} />
      </div>
    </div>
  );
};

export default Practice;
