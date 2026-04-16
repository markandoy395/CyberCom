import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import archiver from 'archiver';

const router = new express.Router();

// Use memory storage and write files to disk ourselves so we can preserve
// the original relative paths provided by the browser (webkitRelativePath).
const upload = multer({ storage: multer.memoryStorage() });

const baseUploadsDir = path.join(process.cwd(), 'uploads');
const buildUploadSummary = files => {
  const normalizedFiles = Array.isArray(files) ? files : [];
  const totalFiles = normalizedFiles.length;
  const totalBytes = normalizedFiles.reduce(
    (sum, file) => sum + (Number.parseInt(file.size, 10) || 0),
    0
  );
  const topLevelNames = new Set(
    normalizedFiles
      .map(file => String(file.path || '').split('/')[0])
      .filter(Boolean)
  );
  const rootFolderName = topLevelNames.size === 1
    ? Array.from(topLevelNames)[0]
    : null;
  const manifestPayload = normalizedFiles
    .map(file => `${file.path}\u0000${file.size}\u0000${file.sha256}`)
    .sort()
    .join('\n');
  const manifestSha256 = crypto
    .createHash('sha256')
    .update(manifestPayload)
    .digest('hex');

  return {
    totalFiles,
    totalBytes,
    rootFolderName,
    manifestSha256,
  };
};

router.post('/uploads', upload.array('files'), async (req, res) => {
  try {
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const uploadId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const uploadDir = path.join(baseUploadsDir, uploadId);

    fs.mkdirSync(uploadDir, { recursive: true });

    const savedFiles = [];

    for (const file of files) {
      // Normalize forward slashes and prevent path traversal
      const originalName = (file.originalname || file.filename || file.name).replace(/\\/g, '/');
      const safeRelative = path.posix.normalize(originalName).replace(/^([\.]{1,2}\/)+/, '');
      const targetPath = path.join(uploadDir, safeRelative);
      const targetDir = path.dirname(targetPath);
      fs.mkdirSync(targetDir, { recursive: true });
      // Write the raw bytes unchanged
      fs.writeFileSync(targetPath, file.buffer);

      // Compute SHA-256 of the saved bytes for integrity checks
      const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
      const stat = fs.statSync(targetPath);

      const urlSegments = safeRelative.split('/').map(encodeURIComponent).join('/');
      const fileUrl = `/api/uploads/${uploadId}/${urlSegments}`;

      savedFiles.push({ path: safeRelative, name: originalName, url: fileUrl, size: stat.size, sha256 });
    }

    const baseUrl = `/api/uploads/${uploadId}`;
    const summary = buildUploadSummary(savedFiles);

    // Persist metadata for later verification
    try {
      const metadata = { uploadId, createdAt: Date.now(), summary, files: savedFiles };
      fs.writeFileSync(path.join(uploadDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    } catch (metaErr) {
      console.warn('[Uploads] failed to write metadata.json', metaErr);
    }

    return res.json({ success: true, uploadId, baseUrl, summary, files: savedFiles });
  } catch (err) {
    console.error('[Uploads] Error saving files', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

  // List files and directories for an uploadId (metadata)
  router.get('/uploads/:uploadId', (req, res) => {
    try {
      const uploadId = req.params.uploadId;
      const uploadDir = path.join(baseUploadsDir, uploadId);
      const resolvedUploadDir = path.resolve(uploadDir);

      if (!fs.existsSync(resolvedUploadDir)) {
        return res.status(404).json({ success: false, error: 'Upload not found' });
      }

      const metadataPath = path.join(resolvedUploadDir, 'metadata.json');

      // Prefer returning saved metadata (includes sha256) when available
      if (fs.existsSync(metadataPath)) {
        try {
          const raw = fs.readFileSync(metadataPath, 'utf8');
          const parsed = JSON.parse(raw);
          const filesWithUrl = (parsed.files || []).map(f => ({ ...f, url: f.url || `/api/uploads/${uploadId}/${encodeURIComponent(f.path)}` }));
          return res.json({
            success: true,
            uploadId,
            summary: parsed.summary || buildUploadSummary(filesWithUrl),
            files: filesWithUrl,
            zipUrl: `/api/uploads/${uploadId}/zip`,
          });
        } catch (e) {
          console.warn('[Uploads] failed to read metadata.json, falling back to directory walk', e);
        }
      }

      const MAX_ENTRIES = parseInt(process.env.UPLOAD_LIST_MAX_ENTRIES || '10000', 10);
      const entries = [];
      let count = 0;
      let truncated = false;

      function walk(dir, base = '') {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (count >= MAX_ENTRIES) { truncated = true; return; }
          const rel = base ? path.posix.join(base, item.name) : item.name;
          const full = path.join(dir, item.name);
          const stat = fs.statSync(full);
          if (item.isDirectory()) {
            entries.push({ path: rel + '/', name: item.name, isDirectory: true });
            count++;
            walk(full, rel);
          } else {
            const urlSegments = rel.split('/').map(encodeURIComponent).join('/');
            const fileUrl = `/api/uploads/${uploadId}/${urlSegments}`;
            entries.push({ path: rel, name: item.name, isDirectory: false, size: stat.size, url: fileUrl });
            count++;
          }
          if (count >= MAX_ENTRIES) { truncated = true; return; }
        }
      }

      walk(resolvedUploadDir, '');

      return res.json({
        success: true,
        uploadId,
        summary: buildUploadSummary(entries.filter(entry => !entry.isDirectory)),
        files: entries,
        truncated,
        zipUrl: `/api/uploads/${uploadId}/zip`,
      });
    } catch (err) {
      console.error('[Uploads] List error', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Verify stored files against recorded checksums
  router.get('/uploads/:uploadId/verify', async (req, res) => {
    try {
      const uploadId = req.params.uploadId;
      const uploadDir = path.join(baseUploadsDir, uploadId);
      const metadataPath = path.join(uploadDir, 'metadata.json');

      if (!fs.existsSync(metadataPath)) {
        return res.status(404).json({ success: false, error: 'Metadata not found' });
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const results = [];

      for (const fileEntry of metadata.files || []) {
        const filePath = path.join(uploadDir, fileEntry.path);
        if (!fs.existsSync(filePath)) {
          results.push({ path: fileEntry.path, ok: false, reason: 'missing' });
          continue;
        }

        const actualSha = await new Promise((resolve, reject) => {
          const h = crypto.createHash('sha256');
          const rs = fs.createReadStream(filePath);
          rs.on('data', (chunk) => h.update(chunk));
          rs.on('end', () => resolve(h.digest('hex')));
          rs.on('error', reject);
        });

        const ok = actualSha === fileEntry.sha256;
        results.push({ path: fileEntry.path, ok, expected: fileEntry.sha256, actual: actualSha });
      }

      const failed = results.filter(r => !r.ok);
      return res.json({ success: failed.length === 0, uploadId, results, failedCount: failed.length });
    } catch (err) {
      console.error('[Uploads] Verify error', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

// Streaming ZIP download for directories or single files.
async function streamZipForPath(req, res, relPath = '') {
  try {
    const uploadId = req.params.uploadId;
    const uploadDir = path.join(baseUploadsDir, uploadId);
    const safeRel = path.posix.normalize(relPath).replace(/^([\.]{1,2}\/)+/, '');
    const targetPath = path.join(uploadDir, safeRel);
    const resolved = path.resolve(targetPath);

    if (!resolved.startsWith(path.resolve(uploadDir))) {
      return res.status(400).json({ success: false, error: 'Invalid path' });
    }

    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ success: false, error: 'Path not found' });
    }

    const stat = fs.statSync(resolved);
    const baseName = safeRel || uploadId;
    const archiveName = `${baseName}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('error', err => {
      console.error('[Uploads] Archive error', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Archive error' });
      } else {
        try { res.end(); } catch (e) {}
      }
    });

    res.on('close', () => {
      try { archive.abort(); } catch (e) {}
    });

    archive.pipe(res);

    if (stat.isFile()) {
      archive.append(fs.createReadStream(resolved), { name: path.basename(resolved) });
    } else {
      // Append directory contents into archive root
      archive.directory(resolved, false);
    }

    await archive.finalize();
    return;
  } catch (err) {
    console.error('[Uploads] Zip download error', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: err.message });
    }
    return res.end();
  }
}

// Route for root of uploadId (zip entire upload)
router.get('/uploads/:uploadId/zip', (req, res) => {
  return void streamZipForPath(req, res, '');
});

// Route for nested paths to ZIP
router.get('/uploads/:uploadId/zip/*', (req, res) => {
  const rel = req.params[0] || '';
  return void streamZipForPath(req, res, rel);
});

// Serve uploaded files. The wildcard captures the relative path.
router.get('/uploads/:uploadId/*', (req, res) => {
  try {
    const uploadId = req.params.uploadId;
    const relPath = req.params[0] || '';
    console.log(`[Uploads] GET ${uploadId} /${relPath} Range=${req.headers.range}`);
    try {
      const dbgPath = path.join(process.cwd(), 'uploads_debug.log');
      fs.appendFileSync(dbgPath, `${new Date().toISOString()} GET ${uploadId}/${relPath} Range=${req.headers.range} HEADERS:${JSON.stringify(req.headers)}\n`);
    } catch (e) {
      // ignore logging errors
    }
    const uploadDir = path.join(baseUploadsDir, uploadId);
    const safeRel = path.posix.normalize(relPath).replace(/^([\.]{1,2}\/)+/, '');
    const filePath = path.join(uploadDir, safeRel);

    // Ensure file is inside uploadDir
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(uploadDir))) {
      return res.status(400).json({ success: false, error: 'Invalid path' });
    }

    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return res.status(400).json({ success: false, error: 'Requested path is a directory - use /api/uploads/:uploadId/zip/<path> to download as ZIP' });
    }

    // Try to read stored metadata to include checksum header
    let metadataSha = null;
    try {
      const metadataPath = path.join(uploadDir, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        const parsed = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        const found = (parsed.files || []).find(f => f.path === safeRel || f.path === `./${safeRel}` || f.path === `/${safeRel}`);
        if (found && found.sha256) metadataSha = found.sha256;
      }
    } catch (e) {
      // ignore metadata errors
    }

    return streamFileWithRange(req, res, resolved, metadataSha);
  } catch (err) {
    console.error('[Uploads] Serve error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

function getMimeType(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  switch (ext) {
    case '.mp4': return 'video/mp4';
    case '.webm': return 'video/webm';
    case '.ogv': return 'video/ogg';
    case '.mov': return 'video/quicktime';
    case '.mkv': return 'video/x-matroska';
    case '.mp3': return 'audio/mpeg';
    case '.wav': return 'audio/wav';
    case '.m4a': return 'audio/mp4';
    case '.ogg': return 'audio/ogg';
    case '.flac': return 'audio/flac';
    case '.aac': return 'audio/aac';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

function streamFileWithRange(req, res, filePath, contentSha = null) {
  try {
    const stat = fs.statSync(filePath);
    const total = stat.size;
    const range = req.headers.range;
    const contentType = getMimeType(filePath);

    if (range) {
      const m = range.match(/bytes=(\d+)-(\d*)/);
      if (m) {
        const start = parseInt(m[1], 10);
        let end = m[2] ? parseInt(m[2], 10) : total - 1;
        if (isNaN(end) || end > total - 1) end = total - 1;
        if (start >= total) {
          res.status(416).set('Content-Range', `bytes */${total}`).end();
          return;
        }
        const chunkSize = (end - start) + 1;
        const headers = {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
        };
        if (contentSha) headers['X-Content-SHA256'] = contentSha;
        res.writeHead(206, headers);

        const stream = fs.createReadStream(filePath, { start, end });
        stream.on('error', err => {
          console.error('[Uploads] Stream error', err);
          try { res.end(); } catch (e) {}
        });
        stream.pipe(res);
        return;
      }
    }

    // No range requested — send entire file
    const headers = {
      'Content-Length': String(total),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    };
    if (contentSha) headers['X-Content-SHA256'] = contentSha;
    res.writeHead(200, headers);
    const stream = fs.createReadStream(filePath);
    stream.on('error', err => {
      console.error('[Uploads] Stream error', err);
      try { res.end(); } catch (e) {}
    });
    stream.pipe(res);
  } catch (err) {
    console.error('[Uploads] streamFileWithRange error', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      try { res.end(); } catch (e) {}
    }
  }
}
export default router;
