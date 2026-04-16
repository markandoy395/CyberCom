import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';

/**
 * Reset admin password to default
 */

async function resetAdminPassword() {
  try {
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);

    // Update admin password
    await query(
      'UPDATE admin SET password_hash = ? WHERE username = ?',
      [passwordHash, 'admin']
    );
  } catch (error) {
    console.error('Error resetting password:', error.message);
    process.exit(1);
  }
}

// Run
resetAdminPassword().then(() => {
  process.exit(0);
});
