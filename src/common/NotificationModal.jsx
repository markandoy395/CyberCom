import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import './NotificationModal.css';
import { 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaInfoCircle, 
  FaTimesCircle
} from 'react-icons/fa';

/**
 * Reusable Notification Modal Component
 * Displays different types of notifications: success, error, warning, info
 * Supports auto-dismiss, custom positions, and manual dismiss
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object|null} props.notification - Notification object or null to hide
 * @param {string} props.notification.type - Type: 'success', 'error', 'warning', 'info'
 * @param {string} props.notification.title - Notification title
 * @param {string} props.notification.message - Notification message
 * @param {Function} props.onDismiss - Callback when notification is dismissed
 * @param {number} [props.duration=4000] - Auto-dismiss duration in ms (null to disable)
 * @param {string} [props.position='bottom-right'] - Position: 'center', 'top-center', 'top-right', 'bottom-right'
 * @param {boolean} [props.showCloseButton=true] - Show close button
 * @param {Function} [props.onAction] - Callback for action button
 * @param {string} [props.actionLabel] - Label for action button
 * 
 * @example
 * const [notification, setNotification] = useState(null);
 * 
 * return (
 *   <>
 *     <NotificationModal 
 *       notification={notification}
 *       onDismiss={() => setNotification(null)}
 *       duration={4000}
 *       position="top-right"
 *     />
 *     <button onClick={() => setNotification({
 *       type: 'success',
 *       title: 'Success!',
 *       message: 'Your action was successful'
 *     })}>
 *       Show Success
 *     </button>
 *   </>
 * );
 */
const NotificationModal = ({
  notification,
  onDismiss,
  duration = 4000,
  position = 'top-right',
  onAction = null,
  actionLabel = null,
}) => {
  // Auto-dismiss notification after specified duration
  useEffect(() => {
    if (notification && duration) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [notification, duration, onDismiss]);

  if (!notification) return null;

  // Get icon for notification type
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <FaCheckCircle className="notification-icon success" />;
      case 'error':
        return <FaTimesCircle className="notification-icon error" />;
      case 'warning':
        return <FaExclamationCircle className="notification-icon warning" />;
      case 'info':
        return <FaInfoCircle className="notification-icon info" />;
      default:
        return <FaInfoCircle className="notification-icon info" />;
    }
  };

  const notificationContent = (
    <div className={`notification-modal notification-${notification.type} notification-${position}`}>
      <div className="notification-icon-wrapper">
        {getIcon()}
      </div>

      <div className="notification-content">
        {notification.title && (
          <h3 className="notification-title">{notification.title}</h3>
        )}
        {notification.message && (
          <p className="notification-message">{notification.message}</p>
        )}

        {(onAction) && (
          <div className="notification-actions">
            {onAction && actionLabel && (
              <button 
                className="notification-action-btn"
                onClick={() => {
                  onAction();
                  onDismiss?.();
                }}
              >
                {actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render via portal at document.body level
  return ReactDOM.createPortal(notificationContent, document.body);
};

export default NotificationModal;
