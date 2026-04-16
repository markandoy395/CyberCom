import React from "react";
import {
  BiSearch,
  BiLock,
  BiGlobe,
  BiFile,
  BiPlay,
  BiHelpCircle,
} from "./icons.js";

// Map icon names to icon components
const iconMap = {
  BiSearch,
  BiLock,
  BiGlobe,
  BiFile,
  BiPlay,
  BiHelpCircle,
};

export const getIconComponent = (iconName, size = 20) => {
  const IconComponent = iconMap[iconName];
  return IconComponent ? React.createElement(IconComponent, { size }) : null;
};

// Download file utility
export const downloadFile = async (url, filename) => {
  try {
    let blob;

    // Handle data URLs (base64)
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const bstr = atob(parts[1]);
      const n = bstr.length;
      const u8arr = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }
      blob = new Blob([u8arr], { type: mimeType });
    } else {
      // Handle regular URLs
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const contentType = response.headers.get('content-type') || '';

      // If server returned JSON metadata (e.g. upload listing), follow the zipUrl
      if (contentType.includes('application/json')) {
        // Parse metadata JSON
        const data = await response.json();
        // Prefer explicit zipUrl, otherwise construct from baseUrl
        const zipUrl = data && data.zipUrl ? data.zipUrl : (data && data.baseUrl ? `${data.baseUrl}/zip` : null);
        if (zipUrl) {
          const zipResp = await fetch(zipUrl);
          if (!zipResp.ok) throw new Error('Download failed');
          blob = await zipResp.blob();
        } else {
          // No zip available; download the JSON as a file
          blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        }
      } else {
        // Regular file response (could be media). Get blob, then optionally verify checksum header.
        const expectedSha = response.headers.get('x-content-sha256') || response.headers.get('X-Content-SHA256');
        const fileBlob = await response.blob();

        if (expectedSha && window.crypto && window.crypto.subtle) {
          const ab = await fileBlob.arrayBuffer();
          const hashBuf = await window.crypto.subtle.digest('SHA-256', ab);
          const hashArray = Array.from(new Uint8Array(hashBuf));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          if (hashHex !== expectedSha) {
            // Integrity failure
            alert('Downloaded file checksum mismatch — file may be corrupted or modified. Download aborted.');
            return;
          }
        }

        blob = fileBlob;
      }
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    // Handle error silently
  }
};
