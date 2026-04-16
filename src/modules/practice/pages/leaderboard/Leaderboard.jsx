import { useState, useEffect, useRef, useMemo } from "react";
import { BiSearch } from "../../../../utils/icons";
import styles from "./Leaderboard.module.css";

export const Leaderboard = () => {
  const [timePeriod, setTimePeriod] = useState("alltime"); // alltime, week, month
  const [searchQuery, setSearchQuery] = useState("");
  const [rankChanges, setRankChanges] = useState({}); // Track rank movements
  const previousPlayersRef = useRef([]);
  const animationTimeoutRef = useRef(null);

  // Memoize mockLeaderboardData to prevent recalculation on every render
  const mockLeaderboardData = useMemo(() => [
    { username: "HackMaster", solves: 38 },
    { username: "CyberNinja", solves: 42 },
    { username: "CodeBreaker", solves: 35 },
    { username: "SecurityPro", solves: 32 },
    { username: "BugHunter", solves: 30 },
    { username: "StackOverflow", solves: 28 },
    { username: "PythonMaster", solves: 27 },
    { username: "SQLinjector", solves: 25 },
    { username: "CryptoKnight", solves: 24 },
    { username: "ForensicsGuy", solves: 23 },
    { username: "WebWarrior", solves: 22 },
    { username: "BinaryBoss", solves: 21 },
    { username: "NetNinja", solves: 20 },
    { username: "DataDancer", solves: 19 },
    { username: "ShellShock", solves: 18 },
  ], []);

  // Memoize currentUser to prevent recalculation on every render
  const currentUser = useMemo(() => ({
    username: "YourUsername",
    solves: 17,
  }), []);

  // Memoize allPlayers to prevent recalculation on every render
  const allPlayers = useMemo(() => {
    const allPlayersData = [...mockLeaderboardData, currentUser];
    
    // Sort by solves
    const sortedPlayers = allPlayersData.sort((a, b) => {
      return b.solves - a.solves;
    });

    // Add ranks
    return sortedPlayers.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
  }, [mockLeaderboardData, currentUser]);

  // Memoize filteredPlayers
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) {
      return allPlayers;
    }
    return allPlayers.filter((player) =>
      player.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allPlayers, searchQuery]);

  const currentUserData = useMemo(() => {
    return filteredPlayers.find(
      (p) => p.username === currentUser.username
    );
  }, [filteredPlayers, currentUser.username]);

  // Track rank changes and apply animations - compares FULL player list
  useEffect(() => {
    const newRankChanges = {};
    
    // Compare full player list to detect actual rank changes
    allPlayers.forEach((player) => {
      const prevPlayer = previousPlayersRef.current.find(
        (p) => p.username === player.username
      );
      
      if (prevPlayer && prevPlayer.rank !== player.rank) {
        const movement = prevPlayer.rank - player.rank; // positive = rank up, negative = rank down
        newRankChanges[player.username] = movement;
      }
    });
    
    // Update ref with full player list
    previousPlayersRef.current = JSON.parse(JSON.stringify(allPlayers));
    
    // Only update if rank changes detected
    if (Object.keys(newRankChanges).length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRankChanges(newRankChanges);
      
      // Clear animation state after animation completes
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      animationTimeoutRef.current = setTimeout(() => {
        setRankChanges({});
      }, 800);
    }
    
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [allPlayers]);

  return (
    <div className="container mt-3">
      <div className={`card ${styles.leaderboardContainer}`}>
        {/* Header */}
        <div className={styles.headerSection}>
          <h1 className="text-h2">Global Leaderboard</h1>
          <p className={styles.subtitle}>Top CTF Players Worldwide</p>
        </div>

        {/* Filters Section */}
        <div className={styles.filtersSection}>
          {/* Time Period Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Time Period:</label>
            <div className={styles.filterButtons}>
              <button
                className={`${styles.filterBtn} ${timePeriod === "alltime" ? styles.active : ""}`}
                onClick={() => setTimePeriod("alltime")}
              >
                All Time
              </button>
              <button
                className={`${styles.filterBtn} ${timePeriod === "week" ? styles.active : ""}`}
                onClick={() => setTimePeriod("week")}
              >
                This Week
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className={styles.searchBox}>
            <BiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.leaderboardTable}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Challenges Solved</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player, index) => {
                const rankChange = rankChanges[player.username];
                const isMoving = rankChange !== undefined && rankChange !== 0;
                const movingUp = rankChange > 0;
                
                return (
                <tr
                  key={player.username}
                  className={`${styles.tableRow} ${
                    player.username === currentUser.username
                      ? styles.currentUserRow
                      : ""
                  } ${player.rank <= 3 ? styles[`topRank${player.rank}`] : ""} ${
                    isMoving ? (movingUp ? styles.rankIncrease : styles.rankDecrease) : ""
                  }`}
                  style={{
                    animationDelay: `${index * 0.05}s`,
                  }}
                >
                  <td className={styles.rankCell}>
                    <div className={styles.rankBadgeWrapper}>
                      <span className={styles.rankBadge}>
                        {player.rank <= 3
                          ? ["🥇", "🥈", "🥉"][player.rank - 1]
                          : `#${player.rank}`}
                      </span>
                      {isMoving && (
                        <span className={styles.rankIndicator}>
                          {movingUp ? "▲" : "▼"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={styles.playerCell}>
                    <div className={styles.playerName}>
                      {player.username}
                      {player.username === currentUser.username && (
                        <span className={styles.youBadge}>YOU</span>
                      )}
                    </div>
                  </td>
                  <td className={styles.solvesCell}>
                    <span className={styles.solves}>{player.solves}</span>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>

        {/* Stats Card */}
        {currentUserData && (
          <div className={styles.statsCard}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Your Rank:</span>
              <span className={styles.statValue}>#{currentUserData.rank}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Challenges Solved:</span>
              <span className={styles.statValue}>{currentUserData.solves}</span>
            </div>
          </div>
        )}

        {/* No results message */}
        {filteredPlayers.length === 0 && (
          <div className={styles.noResults}>
            <p>No players found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
};
