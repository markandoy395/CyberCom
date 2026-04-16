import React from 'react';
import './ActionButton.css';

/**
 * Reusable action button with loading state, icon support, and animations
 * 
 * Props:
 * - onClick: function to call when clicked
 * - isLoading: boolean or challengeId (the ID of the item being processed)
 * - icon: icon component to display
 * - loadingText: text to show during loading (default: "Loading...")
 * - children: button text
 * - variant: 'danger' (red), 'success' (green), 'primary' (blue), 'secondary' (gray)
 * - disabled: boolean to disable the button
 * - size: 'sm' (small), 'md' (medium), 'lg' (large)
 * - className: additional CSS classes
 * - ...rest: other HTML button attributes
 */
const ActionButton = ({
  onClick,
  isLoading,
  icon: Icon,
  loadingText = 'Loading...',
  children,
  variant = 'primary',
  disabled = false,
  size = 'md',
  className = '',
  ...rest
}) => {
  const isLoadingState = !!isLoading;
  const buttonDisabled = disabled || isLoadingState;

  const variantClasses = {
    danger: 'action-btn-danger',
    success: 'action-btn-success',
    primary: 'action-btn-primary',
    secondary: 'action-btn-secondary'
  };

  const sizeClasses = {
    sm: 'action-btn-sm',
    md: 'action-btn-md',
    lg: 'action-btn-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={buttonDisabled}
      className={[
        'action-btn',
        variantClasses[variant] || variantClasses.primary,
        sizeClasses[size] || sizeClasses.md,
        isLoadingState && 'action-btn-loading',
        className
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {isLoadingState ? (
        <>
          <span className="action-btn-spinner">⟳</span>
          {loadingText}
        </>
      ) : (
        <>
          {Icon && <Icon size={12} />}
          {children}
        </>
      )}
    </button>
  );
};

export default ActionButton;
