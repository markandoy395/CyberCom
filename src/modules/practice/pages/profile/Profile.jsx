import { useState, useEffect } from "react";
import { BiCloudUpload, BiTrophy, BiAward, BiFlag, BiTrendingUp } from "../../../../utils/icons";
import { FaCrown, FaCircleCheck } from "../../../../utils/icons";
import styles from "./Profile.module.css";

// Default placeholder SVG as data URI
const DEFAULT_PROFILE_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect fill='%23e0e0e0' width='150' height='150'/%3E%3Ctext x='50%25' y='50%25' font-size='14' fill='%23999' text-anchor='middle' dy='.3em'%3EProfile%3C/text%3E%3C/svg%3E";

export const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(DEFAULT_PROFILE_IMAGE);
  const [userStats, setUserStats] = useState({
    totalPoints: 0,
    challengesSolved: 0,
    completionRate: 0,
    currentRank: 0,
    solvedChallenges: [],
    attemptedChallenges: [],
  });

  // Sample user data - replace with actual data from auth/API
  const [userData, setUserData] = useState({
    fullname: "John Doe",
    email: "john.doe@example.com",
    contactNumber: "+1-555-0123",
    role: "User",
  });

  const [formData, setFormData] = useState({
    fullname: "John Doe",
    email: "john.doe@example.com",
    contactNumber: "+1-555-0123",
    role: "User",
  });

  // Fetch user statistics from localStorage on component mount
  useEffect(() => {
    const fetchUserStats = () => {
      const userFromStorage = JSON.parse(localStorage.getItem("user"));
      const allChallenges = JSON.parse(localStorage.getItem("challenges") || "[]");
      
      if (userFromStorage) {
        // Get user's solved challenges
        const solvedChallengeIds = userFromStorage.solvedChallenges || [];
        const solvedChallenges = allChallenges.filter(ch => 
          solvedChallengeIds.includes(ch.id)
        );
        
        // Get attempted challenges
        const attemptedIds = userFromStorage.attemptedChallenges || [];
        const attemptedChallenges = allChallenges.filter(ch =>
          attemptedIds.includes(ch.id) && !solvedChallengeIds.includes(ch.id)
        );

        const totalPoints = userFromStorage.totalPoints || 0;
        const challengesSolved = solvedChallengeIds.length;
        const totalChallenges = allChallenges.length;
        const completionRate = totalChallenges > 0 ? Math.round((challengesSolved / totalChallenges) * 100) : 0;

        setUserStats({
          totalPoints,
          challengesSolved,
          completionRate,
          currentRank: userFromStorage.rank || 0,
          solvedChallenges: solvedChallenges.sort((a, b) => b.points - a.points),
          attemptedChallenges: attemptedChallenges,
        });

        const updatedUserData = {
          fullname: userFromStorage.username || "John Doe",
          email: userFromStorage.email || "john.doe@example.com",
          contactNumber: userFromStorage.phone || "+1-555-0123",
          role: userFromStorage.role || "User",
        };

        setUserData(updatedUserData);
        setFormData(updatedUserData);

        // Load profile image from localStorage if it exists
        if (userFromStorage.profileImage) {
          setProfileImage(userFromStorage.profileImage);
        }
      }
    };

    fetchUserStats();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSave = () => {
    setUserData(formData);
    setIsEditing(false);
    // TODO: Send update to backend
  };

  const handleCancel = () => {
    setFormData(userData);
    setIsEditing(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result;
        setProfileImage(imageData);
        // Save profile image to localStorage
        const user = JSON.parse(localStorage.getItem("user"));
        if (user) {
          user.profileImage = imageData;
          localStorage.setItem("user", JSON.stringify(user));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getDifficultyBadge = (difficulty) => {
    return (
      <span className={`${styles.difficultyBadge} ${styles[`difficulty-${difficulty?.toLowerCase()}`]}`}>
        {difficulty}
      </span>
    );
  };

  return (
    <div className="container mt-3">
      {/* Profile Section */}
      <div className={`card ${styles.profileContainer}`}>
        <div className={styles.profileContent}>
          {/* Profile Card - Left Side */}
          <div className={styles.profileCard}>
            <div className={styles.profileImageWrapper}>
              <img src={profileImage} alt="Profile" className={styles.profileImage} />
              {isEditing && (
                <label htmlFor="profileImageInput" className={styles.uploadOverlay}>
                  <BiCloudUpload size={32} />
                  <span>Click to Upload</span>
                </label>
              )}
              <input
                id="profileImageInput"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </div>
            <h2 className={styles.profileName}>{userData.fullname}</h2>
            <p className={styles.profileEmail}>{userData.email}</p>
            
            {/* Action Buttons */}
            <div className={styles.actionButtons}>
              {isEditing ? (
                <>
                  <button onClick={handleSave} className="btn btn-primary">
                    Save Changes
                  </button>
                  <button onClick={handleCancel} className="btn btn-secondary">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="btn btn-primary">
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Editable Fields - Center & Right */}
          <div className={styles.editableSection}>
            <div className={styles.fieldsContainer}>
              {/* Fullname */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Fullname</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="fullname"
                    value={formData.fullname}
                    onChange={handleInputChange}
                    className={styles.fieldInput}
                  />
                ) : (
                  <div className={styles.fieldValue}>{userData.fullname}</div>
                )}
              </div>

              {/* Contact Number */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Contact Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    className={styles.fieldInput}
                  />
                ) : (
                  <div className={styles.fieldValue}>{userData.contactNumber}</div>
                )}
              </div>

              {/* Email Address */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Email Address</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={styles.fieldInput}
                  />
                ) : (
                  <div className={styles.fieldValue}>{userData.email}</div>
                )}
              </div>

              {/* Role */}
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Role</label>
                {isEditing ? (
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className={styles.fieldInput}
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                ) : (
                  <div className={styles.fieldValue}>{userData.role}</div>
                )}
              </div>
            </div>

            {/* Upload Image Button - Right Side */}
            <div className={styles.uploadButtonContainer}>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className={styles.statisticsSection}>
        <h2 className="text-h2 mb-4">Your Statistics</h2>
        <div className={styles.statsGrid}>
          <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            {BiAward({ size: 32, style: { color: '#3b82f6', marginBottom: '0.5rem' } })}
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{userStats.totalPoints}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Points</div>
          </div>
          <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            {BiFlag({ size: 32, style: { color: '#22c55e', marginBottom: '0.5rem' } })}
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{userStats.challengesSolved}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Challenges Solved</div>
          </div>
          <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            {BiTrendingUp({ size: 32, style: { color: '#f59e0b', marginBottom: '0.5rem' } })}
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{`${userStats.completionRate}%`}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Completion Rate</div>
          </div>
          <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            {FaCrown({ size: 32, style: { color: '#ec4899', marginBottom: '0.5rem' } })}
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{userStats.currentRank > 0 ? `#${userStats.currentRank}` : "N/A"}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Your Rank</div>
          </div>
        </div>
      </div>

      {/* Completed Challenges Section */}
      <div className={styles.challengesSection}>
        <h2 className="text-h2 mb-4">Completed Challenges</h2>
        {userStats.solvedChallenges.length > 0 ? (
          <div className={styles.challengesList}>
            <table className={styles.challengesTable}>
              <thead>
                <tr>
                  <th>Challenge Name</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th>Points</th>
                  <th>Solved</th>
                </tr>
              </thead>
              <tbody>
                {userStats.solvedChallenges.map((challenge) => (
                  <tr key={challenge.id} className={styles.solvedRow}>
                    <td className={styles.challengeName}>{challenge.name}</td>
                    <td>
                      <span className={styles.categoryBadge}>{challenge.category}</span>
                    </td>
                    <td>{getDifficultyBadge(challenge.difficulty)}</td>
                    <td className={styles.points}>+{challenge.points} pts</td>
                    <td className={styles.solvedIndicator}><FaCircleCheck /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p className="text-muted">No challenges solved yet. Start solving challenges!</p>
          </div>
        )}
      </div>

      {/* Attempted Challenges Section */}
      <div className={styles.challengesSection}>
        <h2 className="text-h2 mb-4">In Progress Challenges</h2>
        {userStats.attemptedChallenges.length > 0 ? (
          <div className={styles.challengesList}>
            <table className={styles.challengesTable}>
              <thead>
                <tr>
                  <th>Challenge Name</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th>Points</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {userStats.attemptedChallenges.map((challenge) => (
                  <tr key={challenge.id} className={styles.attemptedRow}>
                    <td className={styles.challengeName}>{challenge.name}</td>
                    <td>
                      <span className={styles.categoryBadge}>{challenge.category}</span>
                    </td>
                    <td>{getDifficultyBadge(challenge.difficulty)}</td>
                    <td className={styles.points}>{challenge.points} pts</td>
                    <td>
                      <span className={styles.inProgressBadge}>In Progress</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p className="text-muted">No attempts yet. Try a challenge!</p>
          </div>
        )}
      </div>
    </div>
  );
};
