const activeSubmissionLocks = new Map();
let nextSubmissionSequence = 0;

const toPositiveInt = value => {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getNextSubmissionSequence = () => {
  nextSubmissionSequence = nextSubmissionSequence >= Number.MAX_SAFE_INTEGER
    ? 1
    : nextSubmissionSequence + 1;

  return nextSubmissionSequence;
};

const resolveSubmissionScope = req => {
  const teamId = req.competitionMemberId
    ? toPositiveInt(req.competitionSessionTeamId)
    : toPositiveInt(req.body?.team_id);
  const teamMemberId = req.competitionMemberId
    ? toPositiveInt(req.competitionMemberId)
    : toPositiveInt(req.body?.team_member_id ?? req.body?.user_id);
  const challengeId = toPositiveInt(req.body?.challenge_id);
  const competitionId = req.competitionMemberId
    ? toPositiveInt(req.competitionSessionCompetitionId)
    : toPositiveInt(req.body?.competition_id);

  return {
    competitionId,
    teamId,
    teamMemberId,
    challengeId,
  };
};

export const serializeSubmissionByChallenge = async (req, res, next) => {
  const scope = resolveSubmissionScope(req);

  if (!scope.teamId || !scope.teamMemberId || !scope.challengeId) {
    return next();
  }

  const lockKey = `${scope.competitionId ?? 'practice'}:${scope.teamId}:${scope.challengeId}`;
  const previousLock = activeSubmissionLocks.get(lockKey) || null;
  let releaseCurrentLock = () => {};
  const currentLock = new Promise(resolve => {
    releaseCurrentLock = resolve;
  });

  activeSubmissionLocks.set(lockKey, currentLock);

  const ordering = {
    key: lockKey,
    sequence: getNextSubmissionSequence(),
    receivedAt: new Date().toISOString(),
    waitedForLock: Boolean(previousLock),
    competitionId: scope.competitionId,
    teamId: scope.teamId,
    teamMemberId: scope.teamMemberId,
    challengeId: scope.challengeId,
  };

  if (previousLock) {
    await previousLock;
  }

  ordering.processingStartedAt = new Date().toISOString();
  req.submissionOrdering = ordering;

  let released = false;
  const release = () => {
    if (released) {
      return;
    }

    released = true;
    releaseCurrentLock();

    if (activeSubmissionLocks.get(lockKey) === currentLock) {
      activeSubmissionLocks.delete(lockKey);
    }
  };

  res.once('finish', release);
  res.once('close', release);

  return next();
};

export default serializeSubmissionByChallenge;
