import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiGet, API_ENDPOINTS } from "../../../utils/api";
import { CATEGORIES, CATEGORY_ID_TO_KEY } from "../../../utils/constants";
import "./ChallengeDetail.css";

const getStoredSolveStatus = (challengeId) => {
  if (typeof window === "undefined") {
    return "unsolved";
  }

  const savedAttempts = localStorage.getItem("userRecentAttempts");

  if (!savedAttempts) {
    return "unsolved";
  }

  try {
    const attempts = JSON.parse(savedAttempts);
    const solvedAttempt = attempts.find(
      (attempt) =>
        Number(attempt.challengeId) === Number(challengeId) &&
        attempt.status === "solved"
    );

    return solvedAttempt ? "solved" : "unsolved";
  } catch {
    return "unsolved";
  }
};

const normalizePracticeChallenge = (challenge) => {
  const categoryId = Number.parseInt(
    challenge.category_id ?? challenge.categoryId ?? challenge.category,
    10
  );
  const categoryMeta = CATEGORIES.find((category) => category.id === categoryId);
  const hints = Array.isArray(challenge.hints)
    ? challenge.hints
    : challenge.hint
      ? [challenge.hint]
      : [];

  return {
    ...challenge,
    categoryId,
    categoryKey: CATEGORY_ID_TO_KEY[categoryId] || "misc",
    categoryLabel: categoryMeta?.name || "Unknown Category",
    title: challenge.title || "Untitled Challenge",
    description: challenge.description || "No description provided yet.",
    fullDescription:
      challenge.fullDescription ||
      challenge.full_description ||
      challenge.description ||
      "",
    difficulty:
      typeof challenge.difficulty === "string"
        ? challenge.difficulty.toLowerCase()
        : "easy",
    status: getStoredSolveStatus(challenge.id),
    solveCount: Number(challenge.solveCount ?? challenge.solve_count ?? 0),
    personalBestTime: challenge.personalBestTime || null,
    hints,
    hint: hints[0] || "",
    tags: Array.isArray(challenge.tags) ? challenge.tags : [],
    resources: Array.isArray(challenge.resources) ? challenge.resources : [],
  };
};

const ChallengeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchChallenge = async () => {
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
        const found = practiceChallenges.find(
          (challengeItem) =>
            Number(challengeItem.id) === Number(id) &&
            (!challengeItem.status || challengeItem.status === "active")
        );

        if (isMounted) {
          setChallenge(found ? normalizePracticeChallenge(found) : null);
        }
      } catch (error) {
        console.error("Failed to load practice challenge detail", error);

        if (isMounted) {
          setChallenge(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchChallenge();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="challenge-detail-loading">
        <span className="spinner"></span>
        <p>Loading challenge...</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="challenge-detail-not-found">
        <div className="not-found-content">
          <h1>Challenge Not Found</h1>
          <p>This challenge doesn't exist or has been removed.</p>
          <Link to="/" className="btn btn-primary">
            Back to Challenges
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "solved":
        return "status-solved";
      case "in_progress":
        return "status-in-progress";
      case "unsolved":
        return "status-unsolved";
      default:
        return "";
    }
  };

  return (
    <div className="challenge-detail">
      <div className="challenge-detail-container">
        {/* Header */}
        <div className="challenge-header">
          <button
            className="back-button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            {"< Back"}
          </button>

          <div className="challenge-title-section">
            <div className="challenge-meta">
              <span
                className={`category-badge category-${challenge.categoryKey}`}
              >
                {challenge.categoryLabel}
              </span>
              <span
                className={`difficulty-badge difficulty-${challenge.difficulty}`}
              >
                {challenge.difficulty}
              </span>
              <span
                className={`status-badge ${getStatusColor(challenge.status)}`}
              >
                {challenge.status === "solved"
                  ? "Solved"
                  : challenge.status === "in_progress"
                    ? "In Progress"
                    : "Unsolved"}
              </span>
            </div>
            <h1 className="challenge-title">{challenge.title}</h1>
            <p className="challenge-description">{challenge.description}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="challenge-content-grid">
          {/* Left Column - Details */}
          <div className="challenge-main">
            {/* Full Description */}
            <section className="detail-section">
              <h2>Challenge Description</h2>
              <p>{challenge.fullDescription}</p>
            </section>

            {/* Tags */}
            {challenge.tags.length > 0 && (
              <section className="detail-section">
                <h2>Tags</h2>
                <div className="tags-list">
                  {challenge.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Hint */}
            <section className="detail-section">
              <div className="hint-header">
                <h2>Hint</h2>
                <button
                  className={`hint-toggle ${showHint ? "active" : ""}`}
                  onClick={() => setShowHint(!showHint)}
                >
                  {showHint ? "Hide Hint" : "Show Hint"}
                </button>
              </div>
              {showHint && (
                <div className="hint-content">
                  {challenge.hint || "No hint has been added for this challenge yet."}
                </div>
              )}
            </section>
          </div>

          {/* Right Column - Stats & Actions */}
          <aside className="challenge-sidebar">
            {/* Hints Card */}
            <div className="stat-card points-card">
              <div className="stat-label">Hints</div>
              <div className="stat-value">{challenge.hints.length}</div>
            </div>

            {/* Solves Card */}
            <div className="stat-card solves-card">
              <div className="stat-label">Times Solved</div>
              <div className="stat-value">{challenge.solveCount}</div>
            </div>

            {/* Personal Best (if solved) */}
            {challenge.status === "solved" && challenge.personalBestTime && (
              <div className="stat-card personal-best-card">
                <div className="stat-label">Your Best Time</div>
                <div className="stat-value">{challenge.personalBestTime}</div>
              </div>
            )}

            {/* Action Button */}
            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={() => navigate("/")}
            >
              Back to Practice
            </button>

            {/* Info Box */}
            <div className="info-box">
              <h3>Challenge Info</h3>
              <ul className="info-list">
                <li>
                  <span className="label">Difficulty:</span>
                  <span className="value capitalize">{challenge.difficulty}</span>
                </li>
                <li>
                  <span className="label">Category:</span>
                  <span className="value">{challenge.categoryLabel}</span>
                </li>
                <li>
                  <span className="label">Status:</span>
                  <span className={`value capitalize ${getStatusColor(challenge.status)}`}>
                    {challenge.status}
                  </span>
                </li>
                <li>
                  <span className="label">Resources:</span>
                  <span className="value">{challenge.resources.length}</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ChallengeDetail;
