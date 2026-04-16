/**
 * NotificationModal - USAGE EXAMPLES
 * 
 * A reusable popup notification component that:
 * - Supports multiple types: success, error, warning, info
 * - Uses elegant icons for each type
 * - Auto-dismisses after specified duration (default: 4s)
 * - Appears on the top-right of screen by default
 * - Overlays all other modals
 * - No close button - dismisses automatically
 * 
 * ============ BASIC USAGE ============
 */

import { useState } from 'react';
import NotificationModal from './NotificationModal';

export default function ExampleComponent() {
  const [notification, setNotification] = useState(null);

  // Example 1: Show success notification (auto-dismisses in 4 seconds)
  const showSuccess = () => {
    setNotification({
      type: 'success',
      title: 'Success!',
      message: 'Your action has been completed successfully.',
    });
  };

  // Example 2: Show error notification
  const showError = () => {
    setNotification({
      type: 'error',
      title: 'Error',
      message: 'Something went wrong. Please try again.',
    });
  };

  // Example 3: Show warning notification
  const showWarning = () => {
    setNotification({
      type: 'warning',
      title: 'Warning',
      message: 'Please review this important information.',
    });
  };

  // Example 4: Show info notification
  const showInfo = () => {
    setNotification({
      type: 'info',
      title: 'Information',
      message: 'Here is some useful information for you.',
    });
  };

  // Example 5: Notification with action button
  const showWithAction = () => {
    setNotification({
      type: 'success',
      title: 'Submission Failed',
      message: 'Your submission needs review. Click "Review" to check details.',
    });
  };

  // Example 6: Different position (default is top-right)
  const showTopRightNotification = () => {
    setNotification({
      type: 'info',
      title: 'Processing',
      message: 'Your request is being processed...',
    });
  };

  return (
    <>
      {/* Notification Modal Component - Auto-dismisses in 4 seconds */}
      <NotificationModal
        notification={notification}
        onDismiss={() => setNotification(null)}
        duration={4000}
        position="bottom-right"
      />

      {/* Example Buttons */}
      <div style={{ padding: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={showSuccess}>Show Success</button>
        <button onClick={showError}>Show Error</button>
        <button onClick={showWarning}>Show Warning</button>
        <button onClick={showInfo}>Show Info</button>
        <button onClick={showWithAction}>Show with Action</button>
        <button onClick={showTopRightNotification}>Show at Top Right</button>
      </div>
    </>
  );
}

/**
 * ============ ADVANCED USAGE ============
 */

// Usage with custom duration
const showAutoDismiss = () => {
  setNotification({
    type: 'success',
    title: 'Quick Alert',
    message: 'This will disappear in 2 seconds',
  });
};
// Render with duration={2000}

// Usage with longer auto-dismiss
const showLongDismiss = () => {
  setNotification({
    type: 'info',
    title: 'Important',
    message: 'This will dismiss in 6 seconds',
  });
};
// Render with duration={6000}

// Usage with different positions
const positions = {
  center: 'center',
  topCenter: 'top-center',
  topRight: 'top-right',
  bottomRight: 'bottom-right',  // DEFAULT
  topLeft: 'top-left',
  bottomLeft: 'bottom-left',
};

/**
 * ============ API ============
 */

/**
 * Props:
 * 
 * @param {Object|null} notification - Notification object or null
 *   - type: 'success' | 'error' | 'warning' | 'info'
 *   - title: string (optional)
 *   - message: string
 * 
 * @param {Function} onDismiss - Callback when notification is dismissed
 * 
 * @param {number} duration - Auto-dismiss timeout in milliseconds
 *   - Default: 4000 (4 seconds)
 *   - Set to null or 0 to disable auto-dismiss
 *   - Notification automatically dismisses after this duration
 * 
 * @param {string} position - Notification position
 *   - Default: 'bottom-right' (right side of screen)
 *   - Options: 'center', 'top-center', 'top-right', 'bottom-right', 'top-left', 'bottom-left'
 * 
 * @param {Function} onAction - Callback for action button (optional)
 * 
 * @param {string} actionLabel - Label for action button (optional)
 *   - Only shows if onAction is provided
 * 
 * Features:
 *   - Uses elegant icons (checkmark, X, warning, info)
 *   - Auto-dismisses without user action
 *   - No close button - dismisses automatically
 *   - Overlays all other modals (z-index: 99999)
 *   - Smooth slide-in animation from the right
 *   - Color-coded by type (green/red/orange/blue)
 */

/**
 * ============ INTEGRATION IN YOUR FORM/MODULE ============
 */

// In your component file:
// import NotificationModal from './common/NotificationModal';
//
// function MyForm() {
//   const [notification, setNotification] = useState(null);
//
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const response = await fetch('/api/submit', { method: 'POST', body: data });
//       if (response.ok) {
//         // Notification will auto-dismiss after 4 seconds
//         setNotification({
//           type: 'success',
//           title: 'Success',
//           message: 'Your submission was accepted!',
//         });
//       }
//     } catch (error) {
//       setNotification({
//         type: 'error',
//         title: 'Error',
//         message: error.message,
//       });
//     }
//   };
//
//   return (
//     <>
//       <NotificationModal
//         notification={notification}
//         onDismiss={() => setNotification(null)}
//         duration={4000}
//         position="bottom-right"
//       />
//       <form onSubmit={handleSubmit}>
//         {/* form fields */}
//       </form>
//     </>
//   );
// }
