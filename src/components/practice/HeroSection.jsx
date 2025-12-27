import StatsCard from "../common/StatsCard";
import "./HeroSection.css";

const HeroSection = ({ stats }) => {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">CTF Practice Arena</h1>
          <p className="hero-description">
            Sharpen your cybersecurity skills in a risk-free environment
          </p>
        </div>

        <div className="hero-stats">
          <StatsCard
            icon="🎯"
            value={stats.totalChallenges}
            label="Total Challenges"
            color="primary"
          />
          <StatsCard
            icon="📁"
            value={stats.categories}
            label="Categories"
            color="secondary"
          />
          <StatsCard
            icon="✅"
            value={`${stats.completedPercentage}%`}
            label="Your Progress"
            color="success"
          />
          <StatsCard
            icon="🏆"
            value={stats.totalPoints}
            label="Total Points"
            color="warning"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
