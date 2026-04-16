import { memo } from "react";
import { FaLink, FaFolder, FaImage, BiFile } from "../../../../utils/icons";
import { downloadFile } from "../../../../utils/helpers";

const ChallengeResources = memo(({ attachments }) => {
  const renderResourceIcon = (type) => {
    switch(type) {
      case 'file':
        return <BiFile style={{ fontSize: '18px', color: '#3b82f6' }} />;
      case 'folder':
        return <FaFolder style={{ fontSize: '18px', color: '#f59e0b' }} />;
      case 'image':
        return <FaImage style={{ fontSize: '18px', color: '#ec4899' }} />;
      case 'link':
        return <FaLink style={{ fontSize: '18px', color: '#10b981' }} />;
      default:
        return <BiFile style={{ fontSize: '18px', color: '#6b7280' }} />;
    }
  };

  return (
    <div className="modal-section">
      <h3 className="modal-section-title">Resources</h3>
      <div className="resources-container">
        {attachments && attachments.length > 0 ? (
          <div className="resources-list">
            {attachments.map((attachment, index) => (
              <div key={index} className="resource-item">
                <div className="resource-info">
                  <span className="resource-icon">{renderResourceIcon(attachment.type)}</span>
                  <span className="resource-name">{attachment.name}</span>
                </div>
                {attachment.type === "file" && (
                  <button 
                    onClick={() => downloadFile(attachment.url, attachment.name)}
                    className="resource-download-btn"
                    title={`Download ${attachment.name}`}
                  >
                    ↓
                  </button>
                )}
                {attachment.type === "folder" && (
                  <button 
                    onClick={() => downloadFile(attachment.url, `${attachment.name}.zip`)}
                    className="resource-download-btn"
                    title={`Download ${attachment.name}`}
                  >
                    ↓
                  </button>
                )}
                {attachment.type === "link" && (
                  <a 
                    href={attachment.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="resource-download-btn"
                    title={`Open ${attachment.name}`}
                  >
                    ↗
                  </a>
                )}
                {attachment.type === "image" && (
                  <button 
                    onClick={() => downloadFile(attachment.url, attachment.name)}
                    className="resource-download-btn"
                    title={`Download ${attachment.name}`}
                  >
                    ↓
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-resources">No resources available</p>
        )}
      </div>
    </div>
  );
});

ChallengeResources.displayName = 'ChallengeResources';

export default ChallengeResources;
