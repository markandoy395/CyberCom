import crypto from 'crypto';

/**
 * Device Tracker Service
 * Captures and manages device identification information
 */
class DeviceTracker {
  static logError(scope, error) {
    process.stderr.write(`[DeviceTracker] ${scope}: ${error.message}\n`);
  }

  /**
   * Extract device information from request headers
   */
  static extractDeviceInfo(req) {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = this.getClientIP(req);

    // Parse browser and OS from User-Agent
    const { browser, os } = this.parseUserAgent(userAgent);

    // Generate device fingerprint from multiple factors
    const deviceFingerprint = this.generateDeviceFingerprint(
      userAgent,
      ipAddress,
      req.headers['accept-language'] || ''
    );

    return {
      deviceFingerprint,
      deviceName: `${os} - ${browser}`,
      ipAddress,
      userAgent,
      browser,
      os,
      macAddress: null, // Will be populated from client-side if available
    };
  }

  /**
   * Build the device information used for login tracking and comparisons.
   */
  static buildLoginDeviceInfo(req, clientDeviceInfo = {}) {
    const deviceInfo = this.extractDeviceInfo(req);
    const deviceFingerprint = this.normalizeDeviceValue(clientDeviceInfo.deviceFingerprint);
    const deviceName = this.normalizeDeviceValue(clientDeviceInfo.deviceName);
    const browser = this.normalizeDeviceValue(clientDeviceInfo.browser);
    const os = this.normalizeDeviceValue(clientDeviceInfo.os);

    if (browser) {
      deviceInfo.browser = browser;
    }

    if (os) {
      deviceInfo.os = os;
    }

    deviceInfo.deviceName = deviceName || `${deviceInfo.os} - ${deviceInfo.browser}`;
    deviceInfo.deviceFingerprint = deviceFingerprint;
    deviceInfo.macAddress = this.resolveDeviceIdentifier(clientDeviceInfo);

    return deviceInfo;
  }

  /**
   * Parse User-Agent to extract browser and OS
   */
  static parseUserAgent(userAgent) {
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect OS
    if (/Windows NT 10.0/.test(userAgent)) {
      os = 'Windows 10';
    } else if (/Windows NT 11.0/.test(userAgent)) {
      os = 'Windows 11';
    } else if (/Windows NT 6.3/.test(userAgent)) {
      os = 'Windows 8.1';
    } else if (/Mac OS X/.test(userAgent)) {
      const version = /Mac OS X ([\d._]+)/.exec(userAgent);
      os = version ? `macOS ${version[1]}` : 'macOS';
    } else if (/X11/.test(userAgent)) {
      os = 'Linux';
    } else if (/Android/.test(userAgent)) {
      const version = /Android ([\d.]+)/.exec(userAgent);
      os = version ? `Android ${version[1]}` : 'Android';
    }

    // Detect Browser
    if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent)) {
      const version = /Chrome\/([\d.]+)/.exec(userAgent);
      browser = version ? `Chrome ${version[1]}` : 'Chrome';
    } else if (/Safari\//.test(userAgent) && !/Chrome/.test(userAgent)) {
      const version = /Version\/([\d.]+)/.exec(userAgent);
      browser = version ? `Safari ${version[1]}` : 'Safari';
    } else if (/Firefox\//.test(userAgent)) {
      const version = /Firefox\/([\d.]+)/.exec(userAgent);
      browser = version ? `Firefox ${version[1]}` : 'Firefox';
    } else if (/Edg\//.test(userAgent)) {
      const version = /Edg\/([\d.]+)/.exec(userAgent);
      browser = version ? `Edge ${version[1]}` : 'Edge';
    }

    return { browser, os };
  }

  /**
   * Generate a unique device fingerprint
   */
  static generateDeviceFingerprint(userAgent, ipAddress, language) {
    const fingerprintData = `${userAgent}|${ipAddress}|${language}`;

    return crypto
      .createHash('sha256')
      .update(fingerprintData)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Normalize device values for safe comparisons.
   */
  static normalizeDeviceValue(value) {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = String(value).trim();

    if (!normalized) {
      return null;
    }

    const lowerValue = normalized.toLowerCase();

    if (['unknown', 'null', 'undefined', 'n/a'].includes(lowerValue)) {
      return null;
    }

    return normalized;
  }

  /**
   * Resolve the strongest available client-side device identifier.
   */
  static resolveDeviceIdentifier(clientDeviceInfo = {}) {
    return (
      this.normalizeDeviceValue(clientDeviceInfo.macAddress)
      || this.normalizeDeviceValue(clientDeviceInfo.persistentId)
      || this.normalizeDeviceValue(clientDeviceInfo.deviceFingerprint)
      || this.normalizeDeviceValue(clientDeviceInfo.canvasFingerprint)
      || null
    );
  }

  /**
   * Normalize device data from requests or stored login history rows.
   */
  static buildComparableDeviceInfo(deviceInfo = {}) {
    return {
      deviceFingerprint: this.normalizeDeviceValue(deviceInfo.deviceFingerprint),
      macAddress: this.resolveDeviceIdentifier(deviceInfo),
    };
  }

  static getCompetitionDeviceKey(deviceInfo = {}) {
    const comparable = this.buildComparableDeviceInfo(deviceInfo);

    return comparable.macAddress || comparable.deviceFingerprint || null;
  }

  static getCompetitionLockName(competitionId, deviceInfo = {}) {
    const deviceKey = this.getCompetitionDeviceKey(deviceInfo) || 'unknown-device';
    const hash = crypto
      .createHash('sha1')
      .update(`${competitionId}|${deviceKey}`)
      .digest('hex')
      .substring(0, 40);

    return `competition-login-${hash}`;
  }

  static getCompetitionTeamLockName(competitionId, teamId) {
    const hash = crypto
      .createHash('sha1')
      .update(`${competitionId}|team|${teamId}`)
      .digest('hex')
      .substring(0, 40);

    return `competition-team-login-${hash}`;
  }

  static getDeviceMatchQuery(deviceInfo = {}) {
    const comparable = this.buildComparableDeviceInfo(deviceInfo);
    const clauses = [];
    const params = [];

    if (comparable.macAddress) {
      clauses.push('mac_address = ?');
      params.push(comparable.macAddress);
    }

    if (comparable.deviceFingerprint) {
      clauses.push('device_fingerprint = ?');
      params.push(comparable.deviceFingerprint);
    }

    if (!clauses.length) {
      return null;
    }

    return {
      clause: `(${clauses.join(' OR ')})`,
      params,
    };
  }

  static getIdentityColumn(userType = 'team_member') {
    return userType === 'admin' ? 'admin_id' : 'team_member_id';
  }

  static getIdentityValues(userType = 'team_member', userId = null) {
    return {
      adminId: userType === 'admin' ? userId : null,
      teamMemberId: userType === 'team_member' ? userId : null,
    };
  }

  static getSessionDeviceInfo(session = {}) {
    return {
      deviceFingerprint: session.device_fingerprint,
      macAddress: session.mac_address,
    };
  }

  static async getCompetitionDeviceOwner(competitionId, deviceInfo, queryFn) {
    try {
      const deviceMatch = this.getDeviceMatchQuery(deviceInfo);

      if (!competitionId || !deviceMatch) {
        return null;
      }

      const result = await queryFn(
        `SELECT id, team_member_id, username, competition_id, login_time, logout_time, is_active
         FROM login_history
         WHERE competition_id = ?
         AND user_type = 'team_member'
         AND login_status = 'success'
         AND is_active = 1
         AND logout_time IS NULL
         AND ${deviceMatch.clause}
         ORDER BY login_time DESC, id DESC
         LIMIT 1`,
        [competitionId, ...deviceMatch.params]
      );

      return result[0] || null;
    } catch (error) {
      this.logError('getCompetitionDeviceOwner error', error);

      return null;
    }
  }

  /**
   * Determine whether two device records represent the same device.
   * Only use strong client-side identifiers for enforcement to avoid collapsing
   * multiple lab machines that share the same browser/OS/network profile.
   */
  static isSameDevice(currentDeviceInfo, storedDeviceInfo) {
    const current = this.buildComparableDeviceInfo(currentDeviceInfo);
    const stored = this.buildComparableDeviceInfo(storedDeviceInfo);

    if (current.macAddress && stored.macAddress && current.macAddress === stored.macAddress) {
      return true;
    }

    if (
      current.deviceFingerprint
      && stored.deviceFingerprint
      && current.deviceFingerprint === stored.deviceFingerprint
    ) {
      return true;
    }

    return false;
  }

  /**
   * Find active sessions currently using the same device.
   */
  static async findActiveSessionsOnSameDevice(deviceInfo, options = {}, queryFn) {
    const {
      excludeUserId = null,
      userId = null,
      competitionId = null,
      userType = 'team_member',
    } = options;

    try {
      const identityColumn = this.getIdentityColumn(userType);
      const params = [];
      let sql = `SELECT id, admin_id, team_member_id, username, device_fingerprint, device_name,
        ip_address, user_agent, browser, os, mac_address, competition_id, login_time
         FROM login_history
         WHERE is_active = 1
         AND logout_time IS NULL
         AND login_status = 'success'`;

      if (competitionId !== null && competitionId !== undefined) {
        sql += ' AND competition_id = ?';
        params.push(competitionId);
      }

      if (userType) {
        sql += ' AND user_type = ?';
        params.push(userType);
      }

      if (userId !== null && userId !== undefined) {
        sql += ` AND ${identityColumn} = ?`;
        params.push(userId);
      }

      if (excludeUserId !== null && excludeUserId !== undefined) {
        sql += ` AND ${identityColumn} != ?`;
        params.push(excludeUserId);
      }

      const result = await queryFn(sql, params);

      return result.filter(session => this.isSameDevice(deviceInfo, this.getSessionDeviceInfo(session)));
    } catch (error) {
      this.logError('findActiveSessionsOnSameDevice error', error);

      return [];
    }
  }

  /**
   * Find active competition sessions for a team.
   */
  static async findActiveSessionsForTeam(teamId, options = {}, queryFn) {
    const { competitionId = null } = options;

    try {
      if (!teamId) {
        return [];
      }

      const params = [teamId];
      let sql = `SELECT lh.id, lh.team_member_id, lh.username, lh.device_fingerprint, lh.device_name,
        lh.ip_address, lh.user_agent, lh.browser, lh.os, lh.mac_address, lh.competition_id, lh.login_time
         FROM login_history lh
         INNER JOIN team_members tm ON tm.id = lh.team_member_id
         WHERE tm.team_id = ?
         AND lh.user_type = 'team_member'
         AND lh.is_active = 1
         AND lh.logout_time IS NULL
         AND lh.login_status = 'success'`;

      if (competitionId !== null && competitionId !== undefined) {
        sql += ' AND lh.competition_id = ?';
        params.push(competitionId);
      }

      sql += ' ORDER BY lh.login_time DESC, lh.id DESC';

      return await queryFn(sql, params);
    } catch (error) {
      this.logError('findActiveSessionsForTeam error', error);

      return [];
    }
  }

  /**
   * Get client IP address from request
   */
  static getClientIP(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0].trim()
      || req.headers['x-real-ip']
      || req.connection.remoteAddress
      || req.socket.remoteAddress
      || req.ip
      || 'Unknown'
    );
  }

  /**
   * Check if user has active sessions on different devices
   * @param {number} userId - The user ID to check
   * @param {object} currentDeviceInfo - Current device information
   * @param {function} queryFn - Database query function
   * @param {object} options - Additional query filters
   * @returns {Array} Active sessions on other devices
   */
  static async checkMultipleDeviceLogins(userId, currentDeviceInfo, queryFn, options = {}) {
    const { competitionId = null, userType = 'team_member' } = options;

    try {
      const identityColumn = this.getIdentityColumn(userType);
      const params = [userId];
      let sql = `SELECT id, competition_id, device_fingerprint, device_name,
        ip_address, login_time, user_agent, browser, os, mac_address
         FROM login_history
         WHERE ${identityColumn} = ?
         AND is_active = 1
         AND logout_time IS NULL
         AND login_status = 'success'`;

      if (competitionId !== null && competitionId !== undefined) {
        sql += ' AND competition_id = ?';
        params.push(competitionId);
      }

      const activeSessions = await queryFn(sql, params);

      return activeSessions.filter(
        session => !this.isSameDevice(currentDeviceInfo, this.getSessionDeviceInfo(session))
      );
    } catch (error) {
      this.logError('checkMultipleDeviceLogins error', error);

      return [];
    }
  }

  /**
   * Log a login attempt
   */
  static async logAttempt(attemptData) {
    try {
      const {
        userId = null,
        username = null,
        userType,
        competitionId = null,
        deviceInfo = {},
        sessionToken = null,
        loginStatus = 'failed',
        failureReason = null,
        isActive = false,
        queryFn,
      } = attemptData;
      const comparableDevice = this.buildComparableDeviceInfo(deviceInfo);
      const deviceMatch = competitionId ? this.getDeviceMatchQuery(deviceInfo) : null;
      const identity = this.getIdentityValues(userType, userId);

      const logoutTime = isActive ? null : new Date();

      if (deviceMatch && loginStatus !== 'success') {
        const existingAttempts = await queryFn(
          `SELECT id
           FROM login_history
           WHERE competition_id = ?
           AND username <=> ?
           AND login_status = ?
           AND failure_reason <=> ?
           AND is_active = 0
           AND ${deviceMatch.clause}
           ORDER BY id DESC
           LIMIT 1`,
          [competitionId, username, loginStatus, failureReason, ...deviceMatch.params]
        );

        if (existingAttempts.length > 0) {
          const [existingAttempt] = existingAttempts;

          await queryFn(
            `UPDATE login_history
             SET admin_id = ?, team_member_id = ?, user_type = ?, device_fingerprint = ?, device_name = ?,
             ip_address = ?, user_agent = ?, browser = ?, os = ?, mac_address = ?,
             session_token = NULL, login_status = ?, failure_reason = ?, is_active = 0,
             login_time = NOW(), logout_time = NOW()
             WHERE id = ?`,
            [
              identity.adminId,
              identity.teamMemberId,
              userType,
              comparableDevice.deviceFingerprint,
              deviceInfo.deviceName,
              deviceInfo.ipAddress,
              deviceInfo.userAgent,
              deviceInfo.browser,
              deviceInfo.os,
              comparableDevice.macAddress,
              loginStatus,
              failureReason,
              existingAttempt.id,
            ]
          );

          return { insertId: existingAttempt.id, affectedRows: 1 };
        }
      }

      if (deviceMatch && loginStatus === 'success') {
        const existingLogins = await queryFn(
          `SELECT id
           FROM login_history
           WHERE competition_id = ?
           AND login_status = 'success'
           AND ${deviceMatch.clause}
           ORDER BY id DESC
           LIMIT 1`,
          [competitionId, ...deviceMatch.params]
        );

        if (existingLogins.length > 0) {
          const [existingLogin] = existingLogins;

          await queryFn(
            `UPDATE login_history
             SET admin_id = ?, team_member_id = ?, username = ?, user_type = ?, device_fingerprint = ?,
             device_name = ?, ip_address = ?, user_agent = ?, browser = ?, os = ?,
             mac_address = ?, session_token = ?, login_status = ?, failure_reason = ?,
             is_active = ?, login_time = NOW(), logout_time = NULL
             WHERE id = ?`,
            [
              identity.adminId,
              identity.teamMemberId,
              username,
              userType,
              comparableDevice.deviceFingerprint,
              deviceInfo.deviceName,
              deviceInfo.ipAddress,
              deviceInfo.userAgent,
              deviceInfo.browser,
              deviceInfo.os,
              comparableDevice.macAddress,
              sessionToken,
              loginStatus,
              failureReason,
              isActive ? 1 : 0,
              existingLogin.id,
            ]
          );

          await queryFn(
            `DELETE FROM login_history
             WHERE competition_id = ?
             AND login_status = 'success'
             AND ${deviceMatch.clause}
             AND id != ?`,
            [competitionId, ...deviceMatch.params, existingLogin.id]
          );

          return { insertId: existingLogin.id, affectedRows: 1 };
        }
      }

      const result = await queryFn(
        `INSERT INTO login_history
        (admin_id, team_member_id, username, user_type, competition_id, device_fingerprint,
        device_name, ip_address, user_agent, browser, os, mac_address,
        session_token, login_status, failure_reason, is_active, logout_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          identity.adminId,
          identity.teamMemberId,
          username,
          userType,
          competitionId,
          comparableDevice.deviceFingerprint,
          deviceInfo.deviceName,
          deviceInfo.ipAddress,
          deviceInfo.userAgent,
          deviceInfo.browser,
          deviceInfo.os,
          comparableDevice.macAddress,
          sessionToken,
          loginStatus,
          failureReason,
          isActive ? 1 : 0,
          logoutTime,
        ]
      );

      if (deviceMatch && loginStatus === 'success') {
        await queryFn(
          `DELETE FROM login_history
           WHERE competition_id = ?
           AND login_status = 'success'
           AND ${deviceMatch.clause}
           AND id != ?`,
          [competitionId, ...deviceMatch.params, result.insertId]
        );
      }

      return result;
    } catch (error) {
      this.logError('logAttempt error', error);

      return null;
    }
  }

  /**
   * Log a successful login event
   */
  static logLogin(userId, username, userType, deviceInfo, loginData) {
    const { sessionToken, competitionId = null, queryFn } = loginData;

    return this.logAttempt({
      userId,
      username,
      userType,
      competitionId,
      deviceInfo,
      sessionToken,
      loginStatus: 'success',
      isActive: true,
      queryFn,
    });
  }

  /**
   * Log a logout event
   */
  static async logLogout(sessionToken, queryFn) {
    try {
      await queryFn(
        `UPDATE login_history
         SET logout_time = NOW(), is_active = 0
         WHERE session_token = ?`,
        [sessionToken]
      );
    } catch (error) {
      this.logError('logLogout error', error);
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getActiveSessions(userId, queryFn) {
    try {
      const result = await queryFn(
        `SELECT id, competition_id, device_fingerprint, device_name, ip_address,
        user_agent, browser, os, mac_address, login_status, login_time
         FROM login_history
         WHERE team_member_id = ?
         AND is_active = 1
         AND logout_time IS NULL
         ORDER BY login_time DESC`,
        [userId]
      );

      return result;
    } catch (error) {
      this.logError('getActiveSessions error', error);

      return [];
    }
  }

  /**
   * Get the currently active session for a competition token
   */
  static async getActiveSessionByToken(sessionToken, queryFn) {
    try {
      if (!sessionToken) {
        return null;
      }

      const result = await queryFn(
        `SELECT id, team_member_id, competition_id, username, login_time
         FROM login_history
         WHERE session_token = ?
         AND is_active = 1
         AND logout_time IS NULL
         LIMIT 1`,
        [sessionToken]
      );

      return result[0] || null;
    } catch (error) {
      this.logError('getActiveSessionByToken error', error);
      throw error;
    }
  }

  /**
   * Terminate a session (force logout from another device)
   */
  static async terminateSession(sessionId, queryFn) {
    try {
      await queryFn(
        `UPDATE login_history
         SET logout_time = NOW(), is_active = 0
         WHERE id = ?`,
        [sessionId]
      );

      return { success: true };
    } catch (error) {
      this.logError('terminateSession error', error);

      return { success: false, error: error.message };
    }
  }

  /**
   * Get login history for a user
   */
  static async getUserLoginHistory(userId, limit = 50, queryFn) {
    try {
      const result = await queryFn(
        `SELECT id, competition_id, device_fingerprint, device_name, ip_address,
        user_agent, browser, os, mac_address, login_status, failure_reason,
        login_time, logout_time, is_active
         FROM login_history
         WHERE team_member_id = ?
         ORDER BY login_time DESC
         LIMIT ?`,
        [userId, limit]
      );

      return result;
    } catch (error) {
      this.logError('getUserLoginHistory error', error);

      return [];
    }
  }
}

export default DeviceTracker;
