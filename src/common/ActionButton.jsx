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
 * - variant: 'danger' (red), 'success' (green), 'primary' (blue), 'secondary' (gray), 'custom'
 * - disabled: boolean to disable the button
 * - size: 'sm' (small), 'md' (medium), 'lg' (large), 'custom'
 * - fullWidth: boolean to stretch button to the container width
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
  fullWidth = false,
  className = '',
  type = 'button',
  ...rest
}) => {
  const isLoadingState = !!isLoading;
  const buttonDisabled = disabled || isLoadingState;

  const variantClasses = {
    danger: 'action-btn-danger',
    success: 'action-btn-success',
    primary: 'action-btn-primary',
    secondary: 'action-btn-secondary',
    custom: '',
  };

  const sizeClasses = {
    sm: 'action-btn-sm',
    md: 'action-btn-md',
    lg: 'action-btn-lg',
    custom: '',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={buttonDisabled}
      aria-busy={isLoadingState}
      className={[
        'action-btn',
        variantClasses[variant] ?? variantClasses.primary,
        sizeClasses[size] ?? sizeClasses.md,
        fullWidth && 'action-btn-block',
        isLoadingState && 'action-btn-loading',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {isLoadingState ? (
        <>
          <span className="action-btn-spinner" aria-hidden="true" />
          <span className="action-btn-label">{loadingText}</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={12} aria-hidden="true" />}
          <span className="action-btn-label">{children}</span>
        </>
      )}
    </button>
  );
};

export default ActionButton;
