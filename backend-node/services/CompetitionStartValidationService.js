import { query } from '../config/database.js';
import ChallengeService from './ChallengeService.js';
import CompetitionStatusService from './CompetitionStatusService.js';

const START_VALIDATION_RULES = [
  {
    id: 'hasStartDate',
    label: 'Start date configured',
    level: 'required',
    validate: ({ competition }) => Boolean(competition?.startDate),
  },
  {
    id: 'hasEndDate',
    label: 'End date configured',
    level: 'required',
    validate: ({ competition }) => Boolean(competition?.endDate),
  },
  {
    id: 'validSchedule',
    label: 'End date is after start date',
    level: 'required',
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
    id: 'hasChallenges',
    label: 'At least 1 challenge added',
    level: 'required',
    validate: ({ challenges }) => challenges.length > 0,
  },
  {
    id: 'allChallengesHaveFlags',
    label: 'All challenges have flags',
    level: 'required',
    validate: ({ challenges }) => challenges.length > 0 && challenges.every(challenge => Boolean(challenge.flag)),
  },
  {
    id: 'allChallengesHavePoints',
    label: 'All challenges have points',
    level: 'required',
    validate: ({ challenges }) => (
      challenges.length > 0
      && challenges.every(challenge => Number(challenge.points) > 0)
    ),
  },
  {
    id: 'hasTeams',
    label: 'At least 1 team registered',
    level: 'required',
    validate: ({ teams }) => teams.length > 0,
  },
  {
    id: 'maxParticipantsSet',
    label: 'Max participants set',
    level: 'recommended',
    validate: ({ competition }) => Number(competition?.maxParticipants) > 0,
  },
  {
    id: 'minChallenges',
    label: 'At least 3 challenges added',
    level: 'recommended',
    validate: ({ challenges }) => challenges.length >= 3,
  },
  {
    id: 'minTeams',
    label: 'At least 2 teams registered',
    level: 'recommended',
    validate: ({ teams }) => teams.length >= 2,
  },
];

class CompetitionStartValidationService {
  static normalizeCompetition(competitionRow) {
    if (!competitionRow) {
      return null;
    }

    return {
      id: competitionRow.id,
      startDate: competitionRow.start_date,
      endDate: competitionRow.end_date,
      maxParticipants: Number(competitionRow.max_participants) || 0,
      status: competitionRow.status || null,
    };
  }

  static buildValidation({ competition, challenges, teams }) {
    const items = START_VALIDATION_RULES.map(rule => ({
      id: rule.id,
      label: rule.label,
      level: rule.level,
      passed: rule.validate({ competition, challenges, teams }),
    }));
    const requiredItems = items.filter(item => item.level === 'required');
    const recommendedItems = items.filter(item => item.level === 'recommended');
    const failedItems = items.filter(item => !item.passed);
    const requiredFailedItems = requiredItems.filter(item => !item.passed);
    const recommendedFailedItems = recommendedItems.filter(item => !item.passed);
    const startReady = requiredFailedItems.length === 0;

    return {
      items,
      startReady,
      requiredReady: startReady,
      failedItems,
      requiredFailedItems,
      recommendedFailedItems,
    };
  }

  static async getValidation(competitionId, queryFn = query) {
    const competitionRows = await queryFn(
      'SELECT id, status, start_date, end_date, max_participants FROM competitions WHERE id = ?',
      [competitionId]
    );
    const [competitionRow] = competitionRows;

    if (!competitionRow) {
      return {
        success: false,
        error: 'Competition not found',
      };
    }

    const challengeRows = await queryFn(
      `SELECT c.*
       FROM competition_challenges cc
       INNER JOIN challenges c ON c.id = cc.challenge_id
       WHERE cc.competition_id = ?`,
      [competitionId]
    );
    const teamRows = await queryFn(
      'SELECT id FROM teams WHERE competition_id = ?',
      [competitionId]
    );

    const validation = this.buildValidation({
      competition: this.normalizeCompetition(competitionRow),
      challenges: ChallengeService.decryptChallenges(challengeRows || []),
      teams: teamRows || [],
    });

    return {
      success: true,
      competition: competitionRow,
      validation,
    };
  }

  static async assertCanStartCompetition(competitionId, queryFn = query) {
    const result = await this.getValidation(competitionId, queryFn);

    if (!result.success) {
      return result;
    }

    const normalizedCompetitionStatus = CompetitionStatusService.normalizeStatus(
      result.competition.status
    );

    if (normalizedCompetitionStatus === 'done' || normalizedCompetitionStatus === 'cancelled') {
      return {
        success: false,
        error: 'Finished competitions cannot be started again.',
        validation: result.validation,
      };
    }

    if (!result.validation.startReady) {
      const blockingItems = result.validation.requiredFailedItems.length > 0
        ? result.validation.requiredFailedItems
        : result.validation.failedItems;

      return {
        success: false,
        error: `Competition cannot be started until all required pre-competition validation items pass. Missing: ${blockingItems.map(item => item.label).join(', ')}`,
        validation: result.validation,
      };
    }

    return {
      success: true,
      competition: result.competition,
      validation: result.validation,
    };
  }
}

export default CompetitionStartValidationService;
