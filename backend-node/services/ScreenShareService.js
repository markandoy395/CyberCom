const MAX_FRAME_AGE_MS = 30000;
const MAX_IMAGE_DATA_URL_LENGTH = 5 * 1024 * 1024;

const toIntOrNull = value => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : null;
};

const now = () => new Date();
const isImageDataUrl = value => (
  typeof value === 'string'
  && value.startsWith('data:image/')
  && value.includes(';base64,')
);
const normalizeTimestamp = value => {
  if (!value) {
    return now();
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? now() : parsed;
};

class ScreenShareService {
  static sessions = new Map();

  static getSession(memberId) {
    const normalizedMemberId = toIntOrNull(memberId);

    if (!normalizedMemberId) {
      return null;
    }

    const session = this.sessions.get(normalizedMemberId);

    if (!session) {
      return null;
    }

    if (!session.lastFrameAt) {
      return session;
    }

    if (Date.now() - session.lastFrameAt.getTime() <= MAX_FRAME_AGE_MS) {
      return session;
    }

    this.stopSession(normalizedMemberId, 'stale-frame');

    return null;
  }

  static startSession(state = {}) {
    const memberId = toIntOrNull(state.memberId);
    const teamId = toIntOrNull(state.teamId);
    const competitionId = toIntOrNull(state.competitionId);
    const displaySurface = typeof state.displaySurface === 'string' ? state.displaySurface : null;
    const sourceLabel = typeof state.sourceLabel === 'string' ? state.sourceLabel.trim() : null;

    if (!memberId) {
      throw new Error('memberId is required');
    }

    if (displaySurface !== 'monitor') {
      throw new Error('Full-screen monitor sharing is required');
    }

    const existing = this.sessions.get(memberId);
    const startedAt = existing?.startedAt || now();
    const session = {
      memberId,
      teamId,
      competitionId,
      startedAt,
      updatedAt: now(),
      lastFrameAt: existing?.lastFrameAt || null,
      displaySurface,
      sourceLabel,
      width: existing?.width || null,
      height: existing?.height || null,
      mimeType: existing?.mimeType || 'image/jpeg',
      imageDataUrl: existing?.imageDataUrl || null,
      lastReason: null,
    };

    this.sessions.set(memberId, session);

    return this.getPublicState(session);
  }

  static recordFrame(frame = {}) {
    const memberId = toIntOrNull(frame.memberId);

    if (!memberId) {
      throw new Error('memberId is required');
    }

    if (!isImageDataUrl(frame.imageDataUrl)) {
      throw new Error('imageDataUrl must be a valid base64 image data URL');
    }

    if (frame.imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
      throw new Error('imageDataUrl is too large');
    }

    const session = this.sessions.get(memberId) || {};
    const nextSession = {
      memberId,
      teamId: toIntOrNull(frame.teamId) || session.teamId || null,
      competitionId: toIntOrNull(frame.competitionId) || session.competitionId || null,
      startedAt: session.startedAt || now(),
      updatedAt: now(),
      lastFrameAt: normalizeTimestamp(frame.capturedAt),
      displaySurface: frame.displaySurface || session.displaySurface || 'monitor',
      sourceLabel: frame.sourceLabel || session.sourceLabel || null,
      width: toIntOrNull(frame.width) || null,
      height: toIntOrNull(frame.height) || null,
      mimeType: frame.mimeType || 'image/jpeg',
      imageDataUrl: frame.imageDataUrl,
      lastReason: null,
    };

    this.sessions.set(memberId, nextSession);

    return this.getSnapshot(memberId);
  }

  static stopSession(memberId, reason = 'stopped') {
    const normalizedMemberId = toIntOrNull(memberId);

    if (!normalizedMemberId) {
      return { success: false, error: 'memberId is required' };
    }

    const session = this.sessions.get(normalizedMemberId);

    if (session) {
      session.lastReason = reason;
    }

    this.sessions.delete(normalizedMemberId);

    return { success: true };
  }

  static stopSessions(memberIds = [], reason = 'stopped') {
    memberIds
      .map(toIntOrNull)
      .filter(Boolean)
      .forEach(memberId => this.stopSession(memberId, reason));

    return { success: true };
  }

  static pruneToActiveMembers(memberIds = []) {
    const activeIds = new Set(
      memberIds
        .map(toIntOrNull)
        .filter(Boolean)
    );

    for (const memberId of this.sessions.keys()) {
      if (!activeIds.has(memberId)) {
        this.stopSession(memberId, 'participant-offline');
      }
    }
  }

  static getPublicState(session) {
    if (!session) {
      return {
        isScreenSharing: false,
        isFullScreenSharing: false,
        screenShareStartedAt: null,
        lastScreenFrameAt: null,
        screenShareDisplaySurface: null,
      };
    }

    return {
      isScreenSharing: true,
      isFullScreenSharing: session.displaySurface === 'monitor',
      screenShareStartedAt: session.startedAt,
      lastScreenFrameAt: session.lastFrameAt,
      screenShareDisplaySurface: session.displaySurface || null,
    };
  }

  static getParticipantState(memberId) {
    return this.getPublicState(this.getSession(memberId));
  }

  static attachParticipantState(participants = []) {
    return participants.map(participant => ({
      ...participant,
      ...this.getParticipantState(participant.teamMemberId || participant.memberId || participant.id),
    }));
  }

  static getSnapshot(memberId) {
    const session = this.getSession(memberId);

    if (!session) {
      return null;
    }

    return {
      memberId: session.memberId,
      teamId: session.teamId,
      competitionId: session.competitionId,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
      lastFrameAt: session.lastFrameAt,
      displaySurface: session.displaySurface || null,
      sourceLabel: session.sourceLabel || null,
      width: session.width,
      height: session.height,
      mimeType: session.mimeType,
      imageDataUrl: session.imageDataUrl,
      isScreenSharing: true,
      isFullScreenSharing: session.displaySurface === 'monitor',
    };
  }

  static getAllSnapshots(filters = {}) {
    const competitionId = toIntOrNull(filters.competitionId || filters.competition_id);
    const teamMemberIds = Array.isArray(filters.memberIds)
      ? new Set(filters.memberIds.map(toIntOrNull).filter(Boolean))
      : null;
    const snapshots = [];

    for (const memberId of this.sessions.keys()) {
      const snapshot = this.getSnapshot(memberId);

      if (!snapshot) {
        continue;
      }

      if (competitionId && snapshot.competitionId !== competitionId) {
        continue;
      }

      if (teamMemberIds && !teamMemberIds.has(snapshot.memberId)) {
        continue;
      }

      snapshots.push(snapshot);
    }

    return snapshots.sort((left, right) => {
      const leftTime = new Date(left.lastFrameAt || left.startedAt || 0).getTime();
      const rightTime = new Date(right.lastFrameAt || right.startedAt || 0).getTime();

      return rightTime - leftTime;
    });
  }
}

export default ScreenShareService;
