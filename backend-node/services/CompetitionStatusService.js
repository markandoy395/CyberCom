import { query } from '../config/database.js';

const DEFAULT_STATUS = 'upcoming';
const VALID_STATUSES = new Set(['upcoming', 'active', 'paused', 'done', 'cancelled']);
const TERMINAL_STATUSES = new Set(['done', 'cancelled']);

class CompetitionStatusService {
  static normalizeStatus(status, fallback = DEFAULT_STATUS) {
    const normalizedStatus = typeof status === 'string'
      ? status.trim().toLowerCase()
      : '';

    if (VALID_STATUSES.has(normalizedStatus)) {
      return normalizedStatus;
    }

    return fallback;
  }

  static getEffectiveStatus(status, endDate) {
    const normalizedStatus = this.normalizeStatus(status);

    if (TERMINAL_STATUSES.has(normalizedStatus)) {
      return normalizedStatus;
    }

    if (!endDate) {
      return normalizedStatus;
    }

    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedEndDate.getTime())) {
      return normalizedStatus;
    }

    return parsedEndDate.getTime() <= Date.now() ? 'done' : normalizedStatus;
  }

  static async finalizeExpiredCompetitions(queryFn = query) {
    await queryFn(
      `UPDATE competitions
       SET status = 'done'
       WHERE status NOT IN ('done', 'cancelled')
         AND end_date IS NOT NULL
         AND end_date <= NOW()`
    );
  }

  static async finalizeExpiredCompetition(competitionId, queryFn = query) {
    if (!competitionId) {
      return;
    }

    await queryFn(
      `UPDATE competitions
       SET status = 'done'
       WHERE id = ?
         AND status NOT IN ('done', 'cancelled')
         AND end_date IS NOT NULL
         AND end_date <= NOW()`,
      [competitionId]
    );
  }
}

export default CompetitionStatusService;
