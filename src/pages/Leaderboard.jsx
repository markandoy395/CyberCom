export const Leaderboard = () => {
  const mockLeaderboard = [
    { rank: 1, username: "CyberNinja", score: 9850, solves: 42 },
    { rank: 2, username: "HackMaster", score: 8900, solves: 38 },
    { rank: 3, username: "CodeBreaker", score: 8200, solves: 35 },
    { rank: 4, username: "SecurityPro", score: 7500, solves: 32 },
    { rank: 5, username: "BugHunter", score: 7200, solves: 30 },
  ];

  return (
    <div className="container mt-3">
      <div className="card">
        <h1 className="text-primary mb-2">Leaderboard</h1>
        <div className="leaderboard">
          {mockLeaderboard.map((player) => (
            <div
              key={player.rank}
              className={`leaderboard-row ${
                player.rank <= 3 ? `rank-${player.rank}` : ""
              }`}
            >
              <span className="leaderboard-rank">
                {player.rank <= 3
                  ? ["🥇", "🥈", "🥉"][player.rank - 1]
                  : player.rank}
              </span>
              <span className="leaderboard-username">{player.username}</span>
              <span className="text-muted">{player.solves} solves</span>
              <span className="leaderboard-score">{player.score} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
