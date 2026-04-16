const MAX_HISTORY_ENTRIES = 200;
const DEDUPE_WINDOW_MS = 1500;

const TYPE_DEFAULTS = {
  login: {
    title: 'Joined competition',
    severity: 'success',
  },
  logout: {
    title: 'Left competition',
    severity: 'info',
  },
  focus_lost: {
    title: 'Left competition window',
    severity: 'warning',
  },
  focus_regained: {
    title: 'Returned to competition window',
    severity: 'success',
  },
  challenge_opened: {
    title: 'Opened challenge',
    severity: 'info',
  },
  challenge_closed: {
    title: 'Returned to challenge list',
    severity: 'info',
  },
  window_blur: {
    title: 'Window lost focus',
    severity: 'warning',
  },
  window_focus: {
    title: 'Window focused',
    severity: 'info',
  },
  tab_hidden: {
    title: 'Tab hidden',
    severity: 'warning',
  },
  tab_visible: {
    title: 'Tab visible',
    severity: 'info',
  },
  copy: {
    title: 'Copied content',
    severity: 'warning',
  },
  paste: {
    title: 'Pasted content',
    severity: 'warning',
  },
  submission_correct: {
    title: 'Submitted correct flag',
    severity: 'success',
  },
  submission_incorrect: {
    title: 'Submitted incorrect flag',
    severity: 'warning',
  },
  submission_blocked: {
    title: 'Submission blocked',
    severity: 'warning',
  },
  presence_timeout: {
    title: 'Participant went offline',
    severity: 'warning',
  },
  rule_violation: {
    title: 'Rule violation enforced',
    severity: 'warning',
  },
};

const toIntOrNull = value => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : null;
};

const now = () => new Date();
const buildId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

class LiveMonitorActivityService {
  static recordEvent(event = {}) {
    const memberId = toIntOrNull(event.memberId || event.teamMemberId);

    if (!memberId) {
      return null;
    }

    const defaults = TYPE_DEFAULTS[event.type] || {};
    const occurredAt = event.occurredAt ? new Date(event.occurredAt) : now();
    const normalizedOccurredAt = Number.isNaN(occurredAt.getTime()) ? now() : occurredAt;
    const entry = {
      id: buildId(),
      type: event.type || 'info',
      title: event.title || defaults.title || 'Participant activity',
      description: event.description || '',
      severity: event.severity || defaults.severity || 'info',
      occurredAt: normalizedOccurredAt,
      memberId,
      teamId: toIntOrNull(event.teamId),
      competitionId: toIntOrNull(event.competitionId),
      metadata: event.metadata || null,
    };
    const entries = this.history.get(memberId) || [];
    const [lastEntry] = entries;

    if (
      lastEntry
      && lastEntry.type === entry.type
      && lastEntry.description === entry.description
      && Math.abs(new Date(lastEntry.occurredAt).getTime() - normalizedOccurredAt.getTime()) <= DEDUPE_WINDOW_MS
    ) {
      return lastEntry;
    }

    entries.unshift(entry);

    if (entries.length > MAX_HISTORY_ENTRIES) {
      entries.length = MAX_HISTORY_ENTRIES;
    }

    this.history.set(memberId, entries);

    return entry;
  }

  static getHistory(memberId, limit = 100) {
    const normalizedMemberId = toIntOrNull(memberId);

    if (!normalizedMemberId) {
      return [];
    }

    const safeLimit = Math.max(1, Math.min(toIntOrNull(limit) || 100, MAX_HISTORY_ENTRIES));

    return (this.history.get(normalizedMemberId) || []).slice(0, safeLimit);
  }
}

LiveMonitorActivityService.history = new Map();

export default LiveMonitorActivityService;
