/**
 * Access PIN Utility
 * Generates unique access PINs for team members
 */

/**
 * Generate a unique 6-digit PIN
 * @returns {string} 6-digit PIN code
 */
export const generateAccessPin = () => String(Math.floor(Math.random() * 900000) + 100000);

/**
 * Generate a human-friendly PIN with letters (e.g., ABC-123)
 * @returns {string} PIN in format XXX-YYY (letters-numbers)
 */
export const generateFriendlyPin = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';

  let pin = '';
  for (let i = 0; i < 3; i++) {
    pin += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  pin += '-';
  for (let i = 0; i < 3; i++) {
    pin += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  return pin;
};

export default {
  generateAccessPin,
  generateFriendlyPin,
};
