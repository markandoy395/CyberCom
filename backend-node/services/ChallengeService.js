import { query } from '../config/database.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import fs from 'fs';
import path from 'path';

// Maximum allowed size (in bytes) for the `resources` payload when stored in DB.
// Default: 10 MB (can be overridden via env var MAX_RESOURCE_PAYLOAD_BYTES)
const MAX_RESOURCE_PAYLOAD_BYTES = parseInt(process.env.MAX_RESOURCE_PAYLOAD_BYTES || '10485760', 10);
const uploadsDir = path.join(process.cwd(), 'uploads');

export class ChallengeService {
  static normalizeTitle(value) {
    return String(value || '').trim().toLowerCase();
  }

  static async findChallengeByTitle(title, excludeId = null) {
    const normalizedTitle = this.normalizeTitle(title);

    if (!normalizedTitle) {
      return null;
    }

    const rows = await query('SELECT id, title FROM challenges');
    const decryptedRows = this.decryptChallenges(rows);
    const normalizedExcludeId = excludeId === null || excludeId === undefined
      ? null
      : Number.parseInt(excludeId, 10);

    return decryptedRows.find(row => (
      this.normalizeTitle(row.title) === normalizedTitle
      && (normalizedExcludeId === null || Number.parseInt(row.id, 10) !== normalizedExcludeId)
    )) || null;
  }

  static getUploadMetadata(uploadId) {
    const normalizedUploadId = String(uploadId || '').trim();

    if (!normalizedUploadId) {
      return null;
    }

    const uploadDir = path.join(uploadsDir, normalizedUploadId);
    const resolvedUploadDir = path.resolve(uploadDir);
    const resolvedBaseUploadsDir = path.resolve(uploadsDir);

    if (!resolvedUploadDir.startsWith(resolvedBaseUploadsDir)) {
      return null;
    }

    const metadataPath = path.join(resolvedUploadDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    } catch {
      return null;
    }
  }

  static buildCanonicalFolderResource(resource) {
    const metadata = this.getUploadMetadata(resource?.uploadId);

    if (!metadata || !Array.isArray(metadata.files) || metadata.files.length === 0) {
      return {
        ...resource,
        immutable: true,
      };
    }

    const uploadId = String(resource.uploadId).trim();
    const baseUrl = `/api/uploads/${uploadId}`;
    const summary = metadata.summary || {};
    const canonicalFiles = metadata.files.map(file => ({
      path: file.path,
      name: file.name,
      url: file.url || `${baseUrl}/${String(file.path || '')
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`,
      size: Number.parseInt(file.size, 10) || 0,
      sha256: file.sha256 || null,
    }));
    const folderName = summary.rootFolderName
      || String(resource.name || '').replace(/\s+\(\d+\s+files\)$/i, '')
      || 'resources';

    return {
      type: 'folder',
      name: folderName,
      url: `${baseUrl}/zip`,
      uploadId,
      verifyUrl: `${baseUrl}/verify`,
      immutable: true,
      fileCount: Number.parseInt(summary.totalFiles, 10) || canonicalFiles.length,
      totalBytes: Number.parseInt(summary.totalBytes, 10) || canonicalFiles.reduce(
        (sum, file) => sum + (Number.parseInt(file.size, 10) || 0),
        0
      ),
      manifestSha256: summary.manifestSha256 || null,
      files: canonicalFiles,
    };
  }

  static normalizeResources(resources) {
    if (!Array.isArray(resources)) {
      return resources;
    }

    return resources
      .filter(resource => resource !== null && resource !== undefined)
      .map(resource => {
        if (!resource || typeof resource !== 'object' || Array.isArray(resource)) {
          return resource;
        }

        if (String(resource.type || '').trim().toLowerCase() === 'folder' && resource.uploadId) {
          return this.buildCanonicalFolderResource(resource);
        }

        return { ...resource };
      });
  }

  static decryptChallenge(challenge) {
    if (!challenge) { return challenge; }

    const decrypted = { ...challenge };
    const encryptedFields = ['title', 'description', 'flag', 'hints', 'resources'];

    for (const field of encryptedFields) {
      if (decrypted[field]) {
        try {
          const decryptedValue = decrypt(decrypted[field]);
          this.parseDecryptedValue(decryptedValue, field, decrypted);
        } catch {
          // If decryption fails, keep original value
        }
      }
    }

    // Fields that are NOT encrypted - they should already be in their correct form.
    // category_id, difficulty, points, and status stay as-is.
    if (decrypted.category_id && typeof decrypted.category_id === 'string') {
      const id = parseInt(decrypted.category_id, 10);
      if (!isNaN(id)) {
        decrypted.category_id = id;
      }
    }

    if (decrypted.points !== undefined && decrypted.points !== null) {
      const points = parseInt(decrypted.points, 10);
      if (!isNaN(points)) {
        decrypted.points = points;
      }
    }

    return decrypted;
  }

  static decryptChallenges(challenges = []) {
    return challenges.map(challenge => this.decryptChallenge(challenge));
  }

  static parseDecryptedValue(value, field, target) {
    if (field === 'points') {
      const pointsInt = parseInt(value, 10);
      target[field] = isNaN(pointsInt) ? value : pointsInt;
    } else if (field === 'hints' || field === 'resources') {
      this.parseJsonField(value, target, field);
    } else {
      target[field] = value;
    }
  }

  static parseJsonField(value, target, field) {
    try {
      if (value.startsWith('[') || value.startsWith('{')) {
        target[field] = JSON.parse(value);

        return;
      }
    } catch {
      // Parse failed, use original value
    }

    target[field] = value;
  }

  static normalizeCollectionValue(value) {
    return Array.isArray(value) ? JSON.stringify(value) : String(value);
  }

  static encryptFieldValue(key, value) {
    if (value === null || value === undefined) {
      return value;
    }

    const nonEncryptedFields = ['category_id', 'difficulty', 'points', 'status', 'id', 'created_at', 'updated_at'];

    if (nonEncryptedFields.includes(key)) {
      if (key === 'category_id') {
        return parseInt(value, 10);
      }

      if (key === 'points') {
        const normalizedPoints = parseInt(value, 10);

        return isNaN(normalizedPoints) ? value : normalizedPoints;
      }

      return value;
    }

    try {
      let valueToEncrypt = value;

      if (key === 'title' || key === 'description' || key === 'flag') {
        if (typeof value !== 'string') {
          valueToEncrypt = String(value);
        }

        if (valueToEncrypt.trim() === '') {
          return '';
        }
      } else if (key === 'hint' || key === 'hints') {
        valueToEncrypt = this.normalizeCollectionValue(value);
      } else if (key === 'resources') {
        valueToEncrypt = this.normalizeCollectionValue(value);
      } else {
        valueToEncrypt = String(value);
      }

      const encrypted = encrypt(valueToEncrypt);

      return encrypted || valueToEncrypt;
    } catch {
      return value;
    }
  }

  static prepareCreateField(key, value) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }

    return this.encryptFieldValue(key, value);
  }

  static async getChallenges(filters = {}) {
    try {
      let sql = 'SELECT * FROM challenges WHERE 1=1';
      const params = [];

      if (filters.category_id) {
        sql += ' AND category_id = ?';
        params.push(filters.category_id);
      }

      if (filters.difficulty) {
        sql += ' AND difficulty = ?';
        params.push(filters.difficulty);
      }

      if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
      }

      sql += ' ORDER BY created_at DESC';

      const results = await query(sql, params);

      return { success: true, data: this.decryptChallenges(results) };
    } catch (error) {
      // Log error with limited payload details to help debugging without exposing sensitive fields
      try {
        console.error('[ChallengeService.createChallenge] Error creating challenge', {
          message: error?.message,
          stack: error?.stack,
          payload: {
            title: data?.title,
            category_id: data?.category_id,
            difficulty: data?.difficulty,
            points: data?.points,
          },
        });
      } catch (logErr) {
        console.error('[ChallengeService.createChallenge] Failed to log error details', logErr);
      }

      return { success: false, error: error.message };
    }
  }

  static async getChallengeById(id) {
    try {
      const results = await query('SELECT * FROM challenges WHERE id = ?', [id]);

      if (results.length === 0) {
        return { success: false, error: 'Challenge not found' };
      }

      // Decrypt sensitive fields
      const decrypted = this.decryptChallenge(results[0]);

      return { success: true, data: decrypted };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async createChallenge(data) {
    try {
      const {
        title,
        description,
        hint,
        hints,
        category_id,
        difficulty,
        points,
        flag,
        resources,
        status = 'active',
      } = data;

      if (!title || !category_id || !difficulty || !points || !flag) {
        const missing = 'title, category_id, difficulty, points, flag';

        return { success: false, error: `Missing required fields: ${missing}` };
      }

      const duplicateChallenge = await this.findChallengeByTitle(title);

      if (duplicateChallenge) {
        return {
          success: false,
          error: 'A challenge with this title already exists.',
          status: 409,
        };
      }

      const normalizedCategoryId = parseInt(category_id, 10);

      if (isNaN(normalizedCategoryId) || normalizedCategoryId < 1) {
        return { success: false, error: 'Invalid category selected' };
      }

      const existingCategories = await query(
        'SELECT id FROM categories WHERE id = ? LIMIT 1',
        [normalizedCategoryId]
      );

      if (!existingCategories.length) {
        return {
          success: false,
          error: 'Selected category does not exist. Reinsert the categories table data before creating challenges.',
        };
      }

      const hintValue = hint || (hints ? this.normalizeCollectionValue(hints) : null);
      const normalizedResources = this.normalizeResources(resources);
      const resourcesValue = normalizedResources
        ? this.normalizeCollectionValue(normalizedResources)
        : null;

      // Prevent attempting to encrypt/store extremely large resource payloads
      // which can cause DB/driver failures. Return a clear error (413).
      if (resourcesValue && Buffer.byteLength(resourcesValue, 'utf8') > MAX_RESOURCE_PAYLOAD_BYTES) {
        return { success: false, error: 'Resources payload too large. Please upload smaller folders or use the file upload endpoint.', status: 413 };
      }
      const params = [
        this.prepareCreateField('title', title),
        this.prepareCreateField('description', description),
        this.prepareCreateField('hints', hintValue),
        normalizedCategoryId,
        difficulty !== undefined ? difficulty : null,
        this.prepareCreateField('points', points),
        this.prepareCreateField('flag', flag),
        this.prepareCreateField('resources', resourcesValue),
        status !== undefined ? status : 'active',
      ];

      const result = await query(
        'INSERT INTO challenges (title, description, hints, category_id, difficulty, points, flag, resources, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        params
      );

      return {
        success: true,
        challenge: {
          id: result.insertId,
          title,
          category_id,
          difficulty,
          points,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateChallenge(id, data) {
    try {
      if (data && data.title !== undefined) {
        const duplicateChallenge = await this.findChallengeByTitle(data.title, id);

        if (duplicateChallenge) {
          return {
            success: false,
            error: 'A challenge with this title already exists.',
            status: 409,
          };
        }
      }

      // If resources are being updated, validate size before any DB work
      if (data && data.resources !== undefined && data.resources !== null) {
        data.resources = this.normalizeResources(data.resources);
        const normalized = Array.isArray(data.resources) ? JSON.stringify(data.resources) : String(data.resources);
        if (Buffer.byteLength(normalized, 'utf8') > MAX_RESOURCE_PAYLOAD_BYTES) {
          return { success: false, error: 'Resources payload too large. Please upload smaller folders or use the file upload endpoint.', status: 413 };
        }
      }

      const fields = [];
      const values = [];

      for (const [key, value] of Object.entries(data)) {
        if (value === undefined) {
          continue;
        }

        const encryptedValue = this.encryptFieldValue(key, value);

        fields.push(`${key} = ?`);
        values.push(encryptedValue || null);
      }

      if (fields.length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      values.push(id);

      const sqlQuery = `UPDATE challenges SET ${fields.join(', ')} WHERE id = ?`;

      const result = await query(sqlQuery, values);

      if (data.status === 'under_maintenance') {
        try {
          await query(
            'DELETE FROM competition_challenges WHERE challenge_id = ?',
            [id]
          );
        } catch {
          // Continue when challenge cleanup fails after the update succeeds.
        }
      }

      return { success: true, updated: result.affectedRows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteChallenge(id) {
    try {
      const result = await query('DELETE FROM challenges WHERE id = ?', [id]);

      return { success: true, deleted: result.affectedRows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getChallengesByCategory(categoryId) {
    try {
      const results = await query(
        'SELECT * FROM challenges WHERE category_id = ? AND status = ?',
        [categoryId, 'active']
      );

      return { success: true, data: this.decryptChallenges(results) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getChallengesByDifficulty(difficulty) {
    try {
      const results = await query(
        'SELECT * FROM challenges WHERE difficulty = ? AND status = ?',
        [difficulty, 'active']
      );

      return { success: true, data: this.decryptChallenges(results) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default ChallengeService;
