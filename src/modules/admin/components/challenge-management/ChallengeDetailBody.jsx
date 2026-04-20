import { useMemo, useState } from 'react';
import { FaEye, FaEyeSlash, FaLink } from '../../../../utils/icons';
import { downloadFile } from '../../../../utils/helpers';

const MASKED_FLAG = '****************';

const isNavigableLink = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();

  return (
    trimmed.startsWith('/')
    || trimmed.startsWith('http://')
    || trimmed.startsWith('https://')
  );
};

/**
 * Challenge Detail Modal Body - displays description, flag, hints, and resources
 */
const ChallengeDetailBody = ({ challenge }) => {
  const [showFlag, setShowFlag] = useState(false);
  const rawHints = challenge.hints ?? challenge.hint;
  const visibleFlag = typeof challenge.flag === 'string' && challenge.flag.trim()
    ? challenge.flag
    : 'Flag unavailable for this challenge view.';

  // Parse hints from LONGTEXT
  const hints = useMemo(() => {
    if (!rawHints) {
      return [];
    }

    if (typeof rawHints === 'string') {
      return rawHints.split('\n').filter(hint => hint.trim());
    }

    return Array.isArray(rawHints) ? rawHints : [];
  }, [rawHints]);

  // Parse resources from LONGTEXT - handle both string and object formats
  const resources = useMemo(() => {
    if (!challenge.resources) {
      return [];
    }

    let parsed = challenge.resources;

    // If it's a string, try to parse as JSON first
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        // Not JSON, treat as newline-separated strings
        return parsed.split('\n').filter(resource => resource.trim());
      }
    }

    // Handle array of resources (new object format)
    if (Array.isArray(parsed)) {
      return parsed.filter(resource => resource !== null && resource !== undefined);
    }

    // Handle single object resource
    if (typeof parsed === 'object' && parsed !== null) {
      return [parsed];
    }

    return [];
  }, [challenge.resources]);

  return (
    <div className="modal-body">
      {/* Points */}
      <div className="info-bar">
        <div className="info-item">
          <span className="label">Points:</span>
          <span className="value">{challenge.points}</span>
        </div>
      </div>

      {/* Description Section */}
      <div className="modal-section description-section">
        <h3 className="section-title">Description</h3>
        <p className="description-text">{challenge.description}</p>
      </div>

      {/* Flag Section */}
      <div className="modal-section">
        <h3 className="section-title">Flag</h3>
        <div className="flag-container">
          <code className={`flag-value ${showFlag ? 'visible' : 'hidden'}`}>
            {showFlag ? visibleFlag : MASKED_FLAG}
          </code>
          <button
            className="btn-toggle-flag"
            onClick={() => setShowFlag(current => !current)}
            title={showFlag ? 'Hide flag' : 'Show flag'}
          >
            {showFlag ? <FaEye size={16} /> : <FaEyeSlash size={16} />}
          </button>
        </div>
      </div>

      {/* Hints and Resources Container */}
      <div className="hints-resources-container">
        {/* Hints Section */}
        {hints.length > 0 && (
          <div className="hints-column">
            <h3 className="section-title">Hints</h3>
            <div className="hints-grid">
              {hints.map((hint, index) => (
                <div key={index} className="hint-box" title={hint}>
                  {index + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources Section */}
        {resources.length > 0 && (
          <div className="resources-column">
            <h3 className="section-title">Resources</h3>
            <div className="resources-list">
              {resources.map((resource, index) => {
                // Handle object resource format (new)
                if (typeof resource === 'object' && resource !== null) {
                  const { type, name, url } = resource;
                  const isLink = type === 'link' && isNavigableLink(url);

                  // Inline audio player
                  if (type === 'audio' && url) {
                    return (
                      <div key={index} className="resource-audio" style={{ marginBottom: '8px' }}>
                        <audio controls style={{ width: '100%' }}>
                          <source src={url} />
                          Your browser does not support the audio element.
                        </audio>
                        <div style={{ marginTop: '6px' }}>
                          <button
                            className="resource-download-btn"
                            onClick={() => downloadFile(url, name || `audio_${index + 1}`)}
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Inline video player
                  if (type === 'video' && url) {
                    return (
                      <div key={index} className="resource-video" style={{ marginBottom: '8px' }}>
                        <video controls style={{ maxWidth: '100%' }}>
                          <source src={url} />
                          Your browser does not support the video element.
                        </video>
                        <div style={{ marginTop: '6px' }}>
                          <button
                            className="resource-download-btn"
                            onClick={() => downloadFile(url, name || `video_${index + 1}`)}
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const isDownloadable = (type === 'file' || type === 'folder' || type === 'image') && url;

                  if (isDownloadable) {
                    // Download button for files, folders, and images
                    const downloadFilename = type === 'folder'
                      ? `${name || `folder_${index + 1}`}.zip`
                      : (name || `${type}_${index + 1}`);

                    return (
                      <button
                        key={index}
                        onClick={() => downloadFile(url, downloadFilename)}
                        className="resource-download-btn"
                        title={`Download ${name || type}`}
                      >
                        {name || `${type} ${index + 1}`}
                      </button>
                    );
                  }

                  if (isLink) {
                    // Link for external URLs
                    return (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-link"
                        title={`Visit ${name || 'link'}`}
                      >
                        <span style={{ marginRight: '6px' }}>
                          <FaLink size={14} />
                        </span>
                        {name || url}
                      </a>
                    );
                  }

                  // Unknown type or no URL
                  return (
                    <div key={index} className="resource-link resource-unavailable">
                      {name || `Resource ${index + 1}`}
                    </div>
                  );
                }

                // Handle string resource format (old, for backward compatibility)
                const isLink = typeof resource === 'string' && isNavigableLink(resource);
                return (
                  <a
                    key={index}
                    href={isLink ? resource : '#'}
                    target={isLink ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="resource-link"
                    title={isLink ? 'Visit link' : 'Resource'}
                  >
                    <FaLink size={14} className="link-icon" />
                    {isLink ? `Link ${index + 1}` : resource}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallengeDetailBody;
