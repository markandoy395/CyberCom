import express from 'express';
import { exec, spawn } from 'child_process';
import os from 'os';

const router = new express.Router();

/**
 * POST /api/open-powershell
 * Opens PowerShell terminal on the user's machine
 * NOTE: This only works when user has necessary permissions
 */
router.post('/open-powershell', (req, res) => {
  try {
    const platform = os.platform();

    // Determine the appropriate command based on OS
    if (platform === 'win32') {
      // Windows: Open Git Bash in C:\ (system root)
      try {
        // Most reliable method: Use cmd.exe to start git bash
        // Git Bash usually adds bash.exe to PATH, so this should work
        const child = spawn('cmd.exe', ['/c', 'start', 'bash.exe'], {
          detached: true,
          stdio: 'ignore',
          shell: false,
          cwd: 'C:\\'
        });

        child.unref();

        res.json({
          success: true,
          message: 'Git Bash is opening in C:\\...',
          os: 'windows'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Git Bash not found. Please ensure Git is installed with bash.exe in PATH.',
          os: 'windows',
          details: error.message
        });
      }
    } else if (platform === 'darwin') {
      // macOS: Use Terminal
      exec('open -a Terminal', error => {
        if (error) {
          return res.status(500).json({
            success: false,
            error: 'Failed to open Terminal',
            os: 'macos'
          });
        }
        res.json({
          success: true,
          message: 'Terminal is opening...',
          os: 'macos'
        });
      });
    } else if (platform === 'linux') {
      // Linux: Use available terminal emulator
      const terminals = ['gnome-terminal', 'xterm', 'konsole', 'xfce4-terminal'];
      let opened = false;

      for (const terminal of terminals) {
        exec(`which ${terminal}`, error => {
          if (!error && !opened) {
            opened = true;
            spawn(terminal, [], {
              detached: true,
              stdio: 'ignore'
            }).unref();
          }
        });
      }

      if (opened) {
        res.json({
          success: true,
          message: 'Terminal is opening...',
          os: 'linux'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'No terminal emulator found',
          os: 'linux'
        });
      }
    } else {
      res.status(400).json({
        success: false,
        error: `Unsupported operating system: ${platform}`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to open PowerShell',
      details: error.toString()
    });
  }
});

export default router;
