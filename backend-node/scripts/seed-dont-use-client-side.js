import { closePool, query } from '../config/database.js';
import ChallengeService from '../services/ChallengeService.js';

const CHALLENGE_TITLE = "Don't Use Client Side";
const CHALLENGE_FLAG = 'CyberCom{cl13nt_s1d3_l0g1c_l34ks}';
const CHALLENGE_RESOURCE_URL = '/web-exploitation/dont-use-client-side.html';

const challengePayload = {
  title: CHALLENGE_TITLE,
  description:
    'Can you break into this super secure portal? Open the portal resource, inspect the client-side password checks, reconstruct the correct input, and submit that static flag here.',
  hints: [
    'Never trust the client.',
    'Open the page source or developer tools and read the verify() function.',
    'The password is assembled from fixed substring checks in an unusual order.',
  ],
  category_id: 1,
  difficulty: 'easy',
  points: 100,
  flag: CHALLENGE_FLAG,
  resources: [
    {
      type: 'link',
      name: 'Challenge Portal',
      url: CHALLENGE_RESOURCE_URL,
    },
  ],
  status: 'active',
};

const ensurePracticeChallengesTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS practice_challenges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      challenge_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_practice_challenge (challenge_id),
      KEY idx_practice_challenges_created_at (created_at),
      CONSTRAINT fk_practice_challenges_challenge
        FOREIGN KEY (challenge_id) REFERENCES challenges(id)
        ON DELETE CASCADE
    )
  `);
};

const matchesResourceUrl = resources => {
  if (!Array.isArray(resources)) {
    return false;
  }

  return resources.some(resource => resource?.url === CHALLENGE_RESOURCE_URL);
};

const findExistingChallenge = async () => {
  const rows = await query('SELECT id, title, resources FROM challenges');
  const decryptedRows = rows.map(row => ChallengeService.decryptChallenge(row));

  return (
    decryptedRows.find(row => row.title === CHALLENGE_TITLE)
    || decryptedRows.find(row => matchesResourceUrl(row.resources))
    || null
  );
};

const ensurePracticeAssignment = async challengeId => {
  await query(
    `INSERT INTO practice_challenges (challenge_id)
     VALUES (?)
     ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
    [challengeId]
  );
};

async function main() {
  try {
    await ensurePracticeChallengesTable();

    const existingChallenge = await findExistingChallenge();

    if (existingChallenge) {
      const updateResult = await ChallengeService.updateChallenge(
        existingChallenge.id,
        challengePayload
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update existing challenge.');
      }

      await ensurePracticeAssignment(existingChallenge.id);
      console.log(
        `Updated practice challenge "${CHALLENGE_TITLE}" (ID ${existingChallenge.id}).`
      );
      return;
    }

    const createResult = await ChallengeService.createChallenge(challengePayload);

    if (!createResult.success) {
      throw new Error(createResult.error || 'Failed to create challenge.');
    }

    const challengeId = createResult.challenge?.id;

    if (!challengeId) {
      throw new Error('Challenge was created but no challenge ID was returned.');
    }

    await ensurePracticeAssignment(challengeId);
    console.log(`Created practice challenge "${CHALLENGE_TITLE}" (ID ${challengeId}).`);
  } catch (error) {
    console.error(`Failed to seed "${CHALLENGE_TITLE}": ${error.message}`);
    process.exitCode = 1;
  } finally {
    await closePool().catch(closeError => {
      console.error(`Failed to close database pool: ${closeError.message}`);
      process.exitCode = 1;
    });
  }
}

main();
