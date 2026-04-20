import React, { useState } from 'react';
import { FaFolder, FaImage, FaLink, FaPlus, BiCloudUpload, BiFile, FaXmark } from '../../../../utils/icons';
import { apiCall } from '../../../../utils/api';

// Max resource payload size: 150 MB (matches MAX_RESOURCE_PAYLOAD_BYTES in backend .env)
const MAX_RESOURCE_MB = 150;
const buildFolderResourceFromUpload = (uploadData, fallbackFolderName) => {
  const summary = uploadData?.summary || {};
  const uploadId = uploadData?.uploadId || null;
  const baseUrl = uploadData?.baseUrl || (uploadId ? `/api/uploads/${uploadId}` : '');
  const files = Array.isArray(uploadData?.files) ? uploadData.files : [];
  const folderName = summary.rootFolderName || fallbackFolderName || 'resources';

  return {
    type: 'folder',
    name: folderName,
    url: `${baseUrl}/zip`,
    uploadId,
    verifyUrl: uploadId ? `${baseUrl}/verify` : null,
    immutable: true,
    fileCount: summary.totalFiles || files.length,
    totalBytes: summary.totalBytes || files.reduce(
      (sum, file) => sum + (Number.parseInt(file.size, 10) || 0),
      0
    ),
    manifestSha256: summary.manifestSha256 || null,
    files: files.map(file => ({
      path: file.path,
      name: file.name,
      url: file.url,
      size: file.size,
      sha256: file.sha256 || null,
    })),
  };
};

const buildUploadedFileResource = (fileInfo, detectedType) => ({
  type: detectedType,
  name: fileInfo.name,
  url: fileInfo.url,
  uploadId: fileInfo.url?.split('/')[3] || null,
  size: fileInfo.size,
  sha256: fileInfo.sha256 || null,
  immutable: true,
});

const normalizeLinkUrl = (rawValue) => {
  const trimmed = String(rawValue || '').trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const isLocalHost = ['localhost', '127.0.0.1'].includes(parsed.hostname);
    const isSameOrigin = typeof window !== 'undefined' && parsed.origin === window.location.origin;

    if (isLocalHost || isSameOrigin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return parsed.toString();
  } catch {
    if (/^(api|uploads|resources|web-exploitation)\//i.test(trimmed)) {
      return `/${trimmed}`;
    }

    return trimmed;
  }
};

const ResourceUploader = ({ formData, setFormData }) => {
  const [resourceType, setResourceType] = useState('');
  const [isUploadFolder, setIsUploadFolder] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Initialize resources array if it doesn't exist
  const resources = Array.isArray(formData.resources) ? formData.resources : [];

  const [_uploading, setUploading] = useState(false);

  const handleAddFileResource = (resource) => {
    if (resource) {
      setFormData({
        ...formData,
        resources: [...resources, resource]
      });
      setResourceType('');
      setIsUploadFolder(false);
    }
  };

  const handleAddImageResource = (resource) => {
    if (resource) {
      setFormData({
        ...formData,
        resources: [...resources, resource]
      });
      setResourceType('');
    }
  };

  const handleAddLink = () => {
    const normalizedUrl = normalizeLinkUrl(linkInput);

    if (normalizedUrl) {
      const newResource = {
        type: 'link',
        name: normalizedUrl.split('/').filter(Boolean).pop() || normalizedUrl,
        url: normalizedUrl
      };
      setFormData({
        ...formData,
        resources: [...resources, newResource]
      });
      setLinkInput('');
      setResourceType('');
    }
  };

  const handleRemoveResource = (index) => {
    setFormData({
      ...formData,
      resources: resources.filter((_, i) => i !== index)
    });
  };

  const getResourceIcon = (type) => {
    switch(type) {
      case 'file': return '📄';
      case 'folder': return '📁';
      case 'image': return '🖼️';
      case 'link': return '🔗';
      default: return '📦';
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // Determine if this is a folder drop (has webkitGetAsEntry)
    const entries = Array.from(e.dataTransfer.items || [])
      .filter(item => item.kind === 'file')
      .map(item => item.webkitGetAsEntry?.());

    const hasFolder = entries.some(entry => entry?.isDirectory);

    if (hasFolder) {
      // Handle folder drop
      const folderFiles = [];
      for (const item of e.dataTransfer.items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry?.isDirectory) {
            await traverseFolder(entry, folderFiles);
          }
        }
      }

      if (folderFiles.length > 0) {
        await uploadFolderFiles(folderFiles);
      }
    } else {
      // Handle regular file drop
      const fileArray = Array.from(files);
      await uploadFiles(fileArray);
    }
  };

  const traverseFolder = async (entry, fileList) => {
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => {
        entry.file(resolve, reject);
      });
      fileList.push({ file, path: entry.fullPath });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      for (const childEntry of entries) {
        await traverseFolder(childEntry, fileList);
      }
    }
  };

  const uploadFolderFiles = async (folderFiles) => {
    if (folderFiles.length === 0) return;

    try {
      setUploading(true);
      const form = new FormData();
      let folderName = '';

      for (const { file, path } of folderFiles) {
        form.append('files', file, path);
        if (!folderName) {
          folderName = path.split('/')[0];
        }
      }

      const resp = await apiCall('/uploads', {
        method: 'POST',
        body: form,
      });
      const data = await resp.json();
      setUploading(false);

      if (!data || !data.success) {
        alert(data?.error || 'Upload failed');
        return;
      }

      const folderResource = {
        ...buildFolderResourceFromUpload(data, folderName),
      };

      handleAddFileResource(folderResource);
    } catch (err) {
      setUploading(false);
      alert('Upload error: ' + err.message);
    }
  };

  const uploadFiles = async (fileArray) => {
    if (fileArray.length === 0) return;

    try {
      setUploading(true);
      const form = new FormData();

      for (const file of fileArray) {
        form.append('files', file, file.name);
      }

      const resp = await apiCall('/uploads', {
        method: 'POST',
        body: form,
      });
      const data = await resp.json();
      setUploading(false);

      if (!data || !data.success) {
        alert(data?.error || 'Upload failed');
        return;
      }

      // Add each file as a separate resource
      for (const fileInfo of data.files) {
        const file = fileArray.find(f => f.name === fileInfo.name);
        const mime = file?.type || '';
        let detectedType = 'file';
        if (mime.startsWith('image/')) detectedType = 'image';
        else if (mime.startsWith('audio/')) detectedType = 'audio';
        else if (mime.startsWith('video/')) detectedType = 'video';

        const newResource = {
          ...buildUploadedFileResource(fileInfo, detectedType),
        };

        setFormData(prev => ({
          ...prev,
          resources: [...(Array.isArray(prev.resources) ? prev.resources : []), newResource]
        }));
      }
    } catch (err) {
      setUploading(false);
      alert('Upload error: ' + err.message);
    }
  };

  return (
    <div className="form-group resources-section">
      <label className="resources-label">
        <span>Resources</span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}> (Add images, files, folders, and links)</span>
        <span style={{ fontSize: '11px', color: '#059669', fontWeight: '600', marginLeft: '8px' }}>
          Max: {MAX_RESOURCE_MB} MB total
        </span>
      </label>

      {/* Drag and Drop Zone */}
      <div
        className={`resource-drag-drop-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: dragActive ? '2px dashed var(--primary-accent)' : '2px dashed var(--border-color)',
          backgroundColor: dragActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>
          📥
        </div>
        <div style={{ color: 'var(--text-primary)', fontWeight: '600', marginBottom: '4px' }}>
          Drag and Drop Files or Folders
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Drop files and folders here to add them as resources
        </div>
      </div>

      {/* Add Resource Controls */}
      {!resourceType && (
        <div className="resource-type-selector">
          <button
            type="button"
            className="resource-type-btn"
            onClick={() => setResourceType('file')}
          >
            <FaFolder style={{ fontSize: '18px' }} />
            <span>Add File/Folder</span>
          </button>
          <button
            type="button"
            className="resource-type-btn"
            onClick={() => setResourceType('image')}
          >
            <FaImage style={{ fontSize: '18px' }} />
            <span>Add Image</span>
          </button>
          <button
            type="button"
            className="resource-type-btn"
            onClick={() => setResourceType('link')}
          >
            <FaLink style={{ fontSize: '18px' }} />
            <span>Add Link</span>
          </button>
        </div>
      )}

      {/* File/Folder Upload */}
      {resourceType === 'file' && (
        <div className="resource-content-box">
          <div className="upload-icon-container">
            <BiCloudUpload style={{ fontSize: '32px', color: 'var(--primary-accent)' }} />
          </div>
          <div className="upload-section">
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={isUploadFolder}
                  onChange={(e) => setIsUploadFolder(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Upload as folder
              </label>
            </div>
            <label className="upload-label">
              <input
                type="file"
                {...(isUploadFolder && { webkitdirectory: 'true', directory: 'true' })}
                onChange={async (e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  if (!files.length) return;

                  // Use FormData (multipart) for server upload so multer receives webkitRelativePath
                  const form = new FormData();
                  for (const file of files) {
                    const relative = isUploadFolder ? (file.webkitRelativePath || file.name) : file.name;
                    form.append('files', file, relative);
                  }

                  setUploading(true);
                  const resp = await apiCall('/uploads', {
                    method: 'POST',
                    body: form,
                  });
                  const data = await resp.json();
                  setUploading(false);

                  if (!data || !data.success) {
                    alert(data?.error || 'Upload failed');
                    return;
                  }

                  if (isUploadFolder) {
                    const firstFilePath = files[0].webkitRelativePath || files[0].name;
                    const folderName = firstFilePath.split('/')[0];
                    const folderResource = buildFolderResourceFromUpload(data, folderName);

                    handleAddFileResource(folderResource);
                  } else {
                    const fileInfo = data.files[0];
                    const mime = files[0].type || '';
                    let detectedType = 'file';
                    if (mime.startsWith('image/')) detectedType = 'image';
                    else if (mime.startsWith('audio/')) detectedType = 'audio';
                    else if (mime.startsWith('video/')) detectedType = 'video';

                    const newResource = buildUploadedFileResource(fileInfo, detectedType);

                    handleAddFileResource(newResource);
                  }
                }}
                style={{ display: 'none' }}
                accept={!isUploadFolder ? '*/*' : undefined}
              />
              <span className="upload-text" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                {isUploadFolder ? (
                  <><FaFolder /> Click to upload folder or drag and drop</>
                ) : (
                  <><BiFile /> Click to upload file or drag and drop</>
                )}
              </span>
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setResourceType(''); setIsUploadFolder(false); }}
              style={{ marginTop: '12px', width: '100%' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Image Upload */}
      {resourceType === 'image' && (
        <div className="resource-content-box">
          <div className="upload-icon-container">
            <BiCloudUpload style={{ fontSize: '32px', color: 'var(--primary-accent)' }} />
          </div>
          <div className="upload-section">
            <label className="upload-label">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  // Use multipart FormData for images as well
                  const form = new FormData();
                  form.append('files', file, file.name);
                  setUploading(true);
                  const resp = await apiCall('/uploads', {
                    method: 'POST',
                    body: form,
                  });
                  const data = await resp.json();
                  setUploading(false);

                  if (!data || !data.success) {
                    alert(data?.error || 'Upload failed');
                    return;
                  }

                  const fileInfo = data.files[0];
                  const newResource = {
                    type: 'image',
                    name: fileInfo.name,
                    url: fileInfo.url,
                  };

                  handleAddImageResource(newResource);
                }}
                style={{ display: 'none' }}
              />
              <span className="upload-text">🖼️ Click to upload image or drag and drop</span>
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setResourceType('')}
              style={{ marginTop: '12px', width: '100%' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Links Input */}
      {resourceType === 'link' && (
        <div className="resource-content-box">
              <div className="links-section">
            <div className="link-input-row">
              <input
                type="url"
                className="form-input link-input"
                placeholder="https://example.com/resource.zip"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddLink();
                  }
                }}
              />
              <button type="button" className="btn btn-primary add-link-btn" onClick={handleAddLink}>
                <FaPlus style={{ marginRight: '6px' }} /> Add
              </button>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
                  onClick={() => setResourceType('')}
              style={{ marginTop: '12px', width: '100%' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Resources List */}
      {resources.length > 0 && (
        <div className="resources-list">
          <p className="resources-title">📦 Added Resources ({resources.length}):</p>
          <ul className="resources-ul">
            {resources.map((resource, idx) => (
              <li key={idx} className="resource-item">
                {resource.type === 'image' && resource.url && resource.url.startsWith('data:image') ? (
                  <>
                    <img 
                      src={resource.url} 
                      alt={resource.name}
                      style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '4px', 
                        objectFit: 'cover',
                        marginRight: '8px'
                      }} 
                    />
                    <span className="resource-name" title={resource.name}>
                      {resource.name.length > 50 ? resource.name.substring(0, 50) + '...' : resource.name}
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '16px', marginRight: '8px' }}>
                      {getResourceIcon(resource.type)}
                    </span>
                    <span className="resource-name" title={resource.name}>
                      {resource.type === 'folder'
                        ? `${resource.name}${resource.fileCount ? ` (${resource.fileCount} files)` : ''}`
                        : (resource.name.length > 50 ? resource.name.substring(0, 50) + '...' : resource.name)}
                    </span>
                  </>
                )}
                <span className="resource-type-badge">{resource.type}</span>
                {resource.type === 'folder' && resource.immutable && (
                  <span
                    className="resource-type-badge"
                    title="Folder contents are preserved exactly as uploaded"
                  >
                    locked
                  </span>
                )}
                <button
                  type="button"
                  className="remove-resource-btn"
                  onClick={() => handleRemoveResource(idx)}
                >
                  <FaXmark />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ResourceUploader;
