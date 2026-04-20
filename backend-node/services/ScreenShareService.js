const MAX_FRAME_AGE_MS = 30000;
const MAX_FRAME_BUFFER_BYTES = 1536 * 1024;
const STREAM_BOUNDARY = 'cybercom-frame';
const IMAGE_DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

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
const normalizeMimeType = value => (
  SUPPORTED_IMAGE_MIME_TYPES.has(String(value || '').trim().toLowerCase())
    ? String(value).trim().toLowerCase()
    : 'image/jpeg'
);
const parseImageDataUrl = value => {
  if (!isImageDataUrl(value)) {
    return null;
  }

  const match = value.match(IMAGE_DATA_URL_PATTERN);

  if (!match) {
    return null;
  }

  try {
    const imageBuffer = Buffer.from(match[2], 'base64');

    if (!imageBuffer.length) {
      return null;
    }

    return {
      mimeType: normalizeMimeType(match[1]),
      imageBuffer,
    };
  } catch {
    return null;
  }
};
const buildImageDataUrl = session => {
  if (!session?.imageBuffer?.length) {
    return null;
  }

  if (session.imageDataUrlCache) {
    return session.imageDataUrlCache;
  }

  session.imageDataUrlCache = `data:${session.mimeType};base64,${session.imageBuffer.toString('base64')}`;

  return session.imageDataUrlCache;
};

class ScreenShareService {
  static sessions = new Map();

  static streamSubscribers = new Map();

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

  static writeStreamFrameChunk(response, session) {
    if (!session?.imageBuffer?.length || response.writableEnded || response.destroyed) {
      return;
    }

    response.write(`--${STREAM_BOUNDARY}\r\n`);
    response.write(`Content-Type: ${session.mimeType || 'image/jpeg'}\r\n`);
    response.write(`Content-Length: ${session.imageBuffer.length}\r\n`);

    if (session.lastFrameAt) {
      response.write(`X-Frame-Time: ${session.lastFrameAt.toISOString()}\r\n`);
    }

    response.write('\r\n');
    response.write(session.imageBuffer);
    response.write('\r\n');
  }

  static closeStreamSubscribers(memberId) {
    const normalizedMemberId = toIntOrNull(memberId);

    if (!normalizedMemberId) {
      return;
    }

    const subscribers = this.streamSubscribers.get(normalizedMemberId);

    if (!subscribers) {
      return;
    }

    for (const response of subscribers) {
      try {
        if (!response.writableEnded) {
          response.end();
        }
      } catch {
        // Ignore connection cleanup failures.
      }
    }

    this.streamSubscribers.delete(normalizedMemberId);
  }

  static broadcastFrame(session) {
    const subscribers = this.streamSubscribers.get(session.memberId);

    if (!subscribers?.size) {
      return;
    }

    for (const response of [...subscribers]) {
      try {
        this.writeStreamFrameChunk(response, session);
      } catch {
        subscribers.delete(response);

        try {
          response.end();
        } catch {
          // Ignore subscriber cleanup failures.
        }
      }
    }

    if (!subscribers.size) {
      this.streamSubscribers.delete(session.memberId);
    }
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
      imageBuffer: existing?.imageBuffer || null,
      imageDataUrlCache: existing?.imageDataUrlCache || null,
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

    let framePayload = null;

    if (frame.imageBuffer) {
      const imageBuffer = Buffer.isBuffer(frame.imageBuffer)
        ? frame.imageBuffer
        : Buffer.from(frame.imageBuffer);

      if (!imageBuffer.length) {
        throw new Error('frame image buffer is empty');
      }

      framePayload = {
        mimeType: normalizeMimeType(frame.mimeType),
        imageBuffer,
      };
    } else {
      framePayload = parseImageDataUrl(frame.imageDataUrl);
    }

    if (!framePayload) {
      throw new Error('frame image is required');
    }

    if (framePayload.imageBuffer.length > MAX_FRAME_BUFFER_BYTES) {
      throw new Error('frame image is too large');
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
      mimeType: framePayload.mimeType,
      imageBuffer: framePayload.imageBuffer,
      imageDataUrlCache: null,
      lastReason: null,
    };

    this.sessions.set(memberId, nextSession);
    this.broadcastFrame(nextSession);

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
    this.closeStreamSubscribers(normalizedMemberId);

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

  static openStream(memberId, response) {
    const normalizedMemberId = toIntOrNull(memberId);
    const session = this.getSession(normalizedMemberId);

    if (!normalizedMemberId) {
      return {
        success: false,
        error: 'memberId is required',
      };
    }

    if (!session) {
      return {
        success: false,
        error: 'Participant is not sharing their screen',
      };
    }

    response.status(200);
    response.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Connection': 'keep-alive',
      'Content-Type': `multipart/x-mixed-replace; boundary=${STREAM_BOUNDARY}`,
      'Expires': '0',
      'Pragma': 'no-cache',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders?.();

    const subscribers = this.streamSubscribers.get(normalizedMemberId) || new Set();
    const cleanup = () => {
      const currentSubscribers = this.streamSubscribers.get(normalizedMemberId);

      if (!currentSubscribers) {
        return;
      }

      currentSubscribers.delete(response);

      if (!currentSubscribers.size) {
        this.streamSubscribers.delete(normalizedMemberId);
      }
    };

    subscribers.add(response);
    this.streamSubscribers.set(normalizedMemberId, subscribers);

    if (session.imageBuffer?.length) {
      try {
        this.writeStreamFrameChunk(response, session);
      } catch {
        cleanup();

        return {
          success: false,
          error: 'Unable to open the live screen stream',
        };
      }
    }

    return {
      success: true,
      cleanup,
    };
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

  static getSnapshot(memberId, options = {}) {
    const { includeImageDataUrl = true } = options;
    const session = this.getSession(memberId);

    if (!session) {
      return null;
    }

    const snapshot = {
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
      isScreenSharing: true,
      isFullScreenSharing: session.displaySurface === 'monitor',
    };

    if (includeImageDataUrl) {
      snapshot.imageDataUrl = buildImageDataUrl(session);
    }

    return snapshot;
  }

  static getAllSnapshots(filters = {}) {
    const competitionId = toIntOrNull(filters.competitionId || filters.competition_id);
    const includeImageDataUrl = filters.includeImageDataUrl !== false;
    const teamMemberIds = Array.isArray(filters.memberIds)
      ? new Set(filters.memberIds.map(toIntOrNull).filter(Boolean))
      : null;
    const snapshots = [];

    for (const memberId of this.sessions.keys()) {
      const snapshot = this.getSnapshot(memberId, { includeImageDataUrl });

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
