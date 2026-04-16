/**
 * Device Fingerprinting Utility
 * Captures device information on client-side to send with login
 */

class DeviceFingerprintGenerator {
  /**
   * Generate canvas-based fingerprint for unique device identification
   */
  static generateCanvasFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('CyberCom', 2, 15);

    // Convert canvas to data URL and create hash
    const dataUrl = canvas.toDataURL();
    let hash = 0;

    for (let i = 0; i < dataUrl.length; i++) {
      const char = dataUrl.charCodeAt(i);

      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return `canvas_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Get localStorage persistent device ID
   */
  static getPersistentDeviceId() {
    let id = localStorage.getItem('cybercom_device_id');

    if (!id) {
      id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('cybercom_device_id', id);
    }

    return id;
  }

  /**
   * Collect comprehensive device information
   */
  static async collectDeviceInfo() {
    const persistentId = this.getPersistentDeviceId();
    const canvasFingerprint = this.generateCanvasFingerprint();

    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      deviceMemory: navigator.deviceMemory || 'unknown',
      maxTouchPoints: navigator.maxTouchPoints || 0,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      colorDepth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      persistentId,
      canvasFingerprint,
      timestamp: new Date().toISOString()
    };

    // Try to get MAC address, but use canvas fingerprint as fallback
    try {
      const macAddress = await this.getMacAddress();

      if (macAddress) {
        deviceInfo.macAddress = macAddress;
      } else {
        // Browsers rarely expose a real MAC address. Keep it null and let the
        // server use the stable persistentId/deviceFingerprint instead.
        deviceInfo.macAddress = null;
      }
    } catch {
      deviceInfo.macAddress = null;
    }

    deviceInfo.deviceFingerprint = this.createFingerprint(deviceInfo);

    return deviceInfo;
  }

  /**
   * Attempt to get MAC address (not reliably available in most browsers)
   */
  static async getMacAddress() {
    try {
      // This only works in certain scenarios with elevated permissions
      // Most browsers block this for security/privacy reasons
      if (navigator.getNetworkInformation) {
        const connection = navigator.getNetworkInformation();

        return connection.macAddress || null;
      }

      // Alternative: Try WebRTC if available
      if (typeof RTCPeerConnection !== 'undefined') {
        return await this.getMacAddressFromWebRTC();
      }
    } catch {
    }

    return null;
  }

  /**
   * Extract a usable IP address from an ICE candidate when browsers expose one.
   */
  static extractIpAddressFromIceCandidate(candidate) {
    if (!candidate) {
      return null;
    }

    const directAddress = this.normalizeIceAddress(candidate.address);

    if (directAddress) {
      return directAddress;
    }

    const candidateString = typeof candidate.candidate === 'string'
      ? candidate.candidate.trim()
      : '';

    if (!candidateString) {
      return null;
    }

    const parts = candidateString.split(/\s+/);

    if (parts.length < 5) {
      return null;
    }

    return this.normalizeIceAddress(parts[4]);
  }

  static normalizeIceAddress(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    if (this.isIPv4Address(normalized) || this.isIPv6Address(normalized)) {
      return normalized;
    }

    return null;
  }

  static isIPv4Address(value) {
    const octets = value.split('.');

    if (octets.length !== 4) {
      return false;
    }

    return octets.every((octet) => {
      if (!/^\d{1,3}$/.test(octet)) {
        return false;
      }

      const parsedOctet = Number(octet);

      return parsedOctet >= 0 && parsedOctet <= 255;
    });
  }

  static isIPv6Address(value) {
    if (!value.includes(':') || !/^[a-fA-F0-9:]+$/.test(value)) {
      return false;
    }

    const blocks = value.split('::');

    if (blocks.length > 2) {
      return false;
    }

    const isValidSegmentList = segments => segments.every(segment => (
      segment.length > 0
      && segment.length <= 4
      && /^[a-fA-F0-9]+$/.test(segment)
    ));

    const leftSegments = blocks[0] ? blocks[0].split(':') : [];
    const rightSegments = blocks[1] ? blocks[1].split(':') : [];

    if (!isValidSegmentList(leftSegments) || !isValidSegmentList(rightSegments)) {
      return false;
    }

    if (blocks.length === 1) {
      return leftSegments.length === 8;
    }

    return (leftSegments.length + rightSegments.length) < 8;
  }

  /**
   * Extract MAC from WebRTC (if available)
   */
  static async getMacAddressFromWebRTC() {
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      let isResolved = false;

      const finish = (value) => {
        if (isResolved) {
          return;
        }

        isResolved = true;
        clearTimeout(timeoutId);
        pc.onicecandidate = null;
        pc.close();
        resolve(value);
      };

      const timeoutId = setTimeout(() => {
        finish(null);
      }, 1500);

      pc.createDataChannel('');
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(() => {
          finish(null);
        });

      pc.onicecandidate = (ice) => {
        const candidate = ice?.candidate;

        if (!candidate) {
          finish(null);
          return;
        }

        const ipAddress = this.extractIpAddressFromIceCandidate(candidate);

        if (ipAddress) {
          finish(ipAddress);
        }
      };
    });
  }

  /**
   * Create a device fingerprint hash for transmission
   */
  static createFingerprint(deviceInfo) {
    const fingerprintString = `${deviceInfo.userAgent}|${deviceInfo.platform}
    |${deviceInfo.screenResolution}|${deviceInfo.persistentId}`;

    // Simple hash (in production, use crypto library)
    let hash = 0;

    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i);

      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16);
  }
}

export default DeviceFingerprintGenerator;
