import { apiGet, API_ENDPOINTS } from "../../../../utils/api";

export const PRE_COMPETITION_VALIDATION_RULES = [
  {
    id: "hasStartDate",
    label: "Start date configured",
    category: "Core Setup",
    level: "required",
    validate: ({ competition }) => Boolean(competition?.startDate),
  },
  {
    id: "hasEndDate",
    label: "End date configured",
    category: "Core Setup",
    level: "required",
    validate: ({ competition }) => Boolean(competition?.endDate),
  },
  {
    id: "validSchedule",
    label: "End date is after start date",
    category: "Core Setup",
    level: "required",
    validate: ({ competition }) => {
      const startDate = competition?.startDate ? new Date(competition.startDate) : null;
      const endDate = competition?.endDate ? new Date(competition.endDate) : null;

      if (!startDate || !endDate) {
        return false;
      }

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return false;
      }

      return startDate < endDate;
    },
  },
  {
    id: "hasChallenges",
    label: "At least 1 challenge added",
    category: "Challenges",
    level: "required",
    validate: ({ challenges }) => challenges.length > 0,
  },
  {
    id: "allChallengesHaveFlags",
    label: "All challenges have flags",
    category: "Challenges",
    level: "required",
    validate: ({ challenges }) => (
      challenges.length > 0
      && challenges.every(challenge => Boolean(challenge.hasFlag ?? challenge.flag))
    ),
  },
  {
    id: "allChallengesHavePoints",
    label: "All challenges have points",
    category: "Challenges",
    level: "required",
    validate: ({ challenges }) => (
      challenges.length > 0
      && challenges.every(challenge => Number(challenge.points) > 0)
    ),
  },
  {
    id: "hasTeams",
    label: "At least 1 team registered",
    category: "Teams",
    level: "required",
    validate: ({ teams }) => teams.length > 0,
  },
  {
    id: "maxParticipantsSet",
    label: "Max participants set",
    category: "Core Setup",
    level: "recommended",
    validate: ({ competition }) => Number(competition?.maxParticipants) > 0,
  },
  {
    id: "minChallenges",
    label: "At least 3 challenges added",
    category: "Challenges",
    level: "recommended",
    validate: ({ challenges }) => challenges.length >= 3,
  },
  {
    id: "minTeams",
    label: "At least 2 teams registered",
    category: "Teams",
    level: "recommended",
    validate: ({ teams }) => teams.length >= 2,
  },
];

export const buildPreCompetitionValidation = ({ competition, challenges, teams }) => {
  const items = PRE_COMPETITION_VALIDATION_RULES.map(rule => ({
    id: rule.id,
    label: rule.label,
    category: rule.category,
    level: rule.level,
    passed: rule.validate({ competition, challenges, teams }),
  }));

  const requiredItems = items.filter(item => item.level === "required");
  const recommendedItems = items.filter(item => item.level === "recommended");
  const failedItems = items.filter(item => !item.passed);
  const requiredFailedItems = requiredItems.filter(item => !item.passed);
  const recommendedFailedItems = recommendedItems.filter(item => !item.passed);
  const startReady = requiredFailedItems.length === 0;

  return {
    items,
    startReady,
    competitionReady: startReady,
    requiredReady: requiredFailedItems.length === 0,
    failedItems,
    requiredFailedItems,
    recommendedFailedItems,
    totalCount: items.length,
    passedCount: items.filter(item => item.passed).length,
    requiredCount: requiredItems.length,
    requiredPassedCount: requiredItems.filter(item => item.passed).length,
    recommendedCount: recommendedItems.length,
    recommendedPassedCount: recommendedItems.filter(item => item.passed).length,
    challengeCount: challenges.length,
    teamCount: teams.length,
  };
};

export const fetchPreCompetitionValidation = async (
  competition,
  apiGetFn = apiGet,
) => {
  if (!competition?.id) {
    throw new Error("Competition ID is required to validate readiness.");
  }

  const challengesRes = await apiGetFn(API_ENDPOINTS.COMPETITIONS_CHALLENGES(competition.id));
  const teamsRes = await apiGetFn(API_ENDPOINTS.COMPETITIONS_TEAMS(competition.id));

  const challenges = Array.isArray(challengesRes.data) ? challengesRes.data : [];
  const teams = Array.isArray(teamsRes.data) ? teamsRes.data : [];

  return buildPreCompetitionValidation({
    competition,
    challenges,
    teams,
  });
};
