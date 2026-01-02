const { autoUpdater } = require('electron-updater');
const { app } = require('electron');
const semver = require('semver');
const Store = require('electron-store');
const store = new Store();

class AutoUpdater {
  constructor() {
    this.mainWindow = null;
    this.updateInfo = null;
    this.isChecking = false;
    this.isDownloading = false;
    this.updateDownloaded = false;
    this.autoCheckEnabled = true;
    this.updateChannel = 'stable'; // Default to stable
    this.forceUpdateAvailable = false;
    
    autoUpdater.allowPrerelease = false; // Default to false
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = true;
    
    this.setupEventHandlers();
  }

  isVersionAllowed(version) {
    const lowerVersion = version.toLowerCase();
    
    if (this.updateChannel === 'beta') {
      // Beta channel: Allow Beta and Stable, reject Alpha
      if (lowerVersion.includes('alpha')) {
        console.log('[AutoUpdater] ⚠️ Skipping Alpha update because we are on Beta channel');
        return false;
      }
    } else if (this.updateChannel === 'stable') {
      // Stable channel: Reject Alpha and Beta
      if (lowerVersion.includes('alpha') || lowerVersion.includes('beta')) {
        console.log('[AutoUpdater] ⚠️ Skipping Pre-release update because we are on Stable channel');
        return false;
      }
    }
    
    return true;
  }

  setupEventHandlers() {
    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for updates...');
      console.log('[AutoUpdater] Current version:', app.getVersion());
      console.log('[AutoUpdater] Feed URL:', autoUpdater.getFeedURL());
      console.log('[AutoUpdater] API endpoint: https://api.github.com/repos/FIREXDF/FightPlanner-4/releases');
      this.isChecking = true;
      this.sendToRenderer('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('[AutoUpdater] Update available!');
      console.log('[AutoUpdater] Available version:', info.version);
      console.log('[AutoUpdater] Current version:', app.getVersion());
      console.log('[AutoUpdater] Update channel:', this.updateChannel);
      
      if (!this.isVersionAllowed(info.version)) {
        console.log('[AutoUpdater] Update rejected by channel filter.');
        this.isChecking = false;
        this.sendToRenderer('update-not-available', {
          version: app.getVersion(),
          latestVersion: info.version,
          reason: 'channel-mismatch'
        });
        return;
      }

      console.log('[AutoUpdater] ✅ Update accepted by channel filter');
      console.log('[AutoUpdater] Release date:', info.releaseDate);
      console.log('[AutoUpdater] Full update info:', JSON.stringify(info, null, 2));
      
      this.isChecking = false;
      this.updateInfo = info;
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
        files: info.files
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('[AutoUpdater] No updates available');
      console.log('[AutoUpdater] Current version:', app.getVersion());
      console.log('[AutoUpdater] Latest version checked:', info?.version || 'unknown');
      console.log('[AutoUpdater] Update info:', JSON.stringify(info, null, 2));
      
      this.isChecking = false;
      this.sendToRenderer('update-not-available', {
        version: app.getVersion(),
        latestVersion: info?.version
      });
    });

    autoUpdater.on('error', (error) => {
      console.error('[AutoUpdater] Error occurred:', error);
      console.error('[AutoUpdater] Error message:', error.message);
      console.error('[AutoUpdater] Error stack:', error.stack);
      
      this.isChecking = false;
      this.isDownloading = false;
      this.sendToRenderer('update-error', {
        message: error.message
      });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      console.log('[AutoUpdater] Download progress:', progressObj.percent.toFixed(2) + '%');
      console.log('[AutoUpdater] Downloaded:', (progressObj.transferred / 1024 / 1024).toFixed(2), 'MB');
      console.log('[AutoUpdater] Total:', (progressObj.total / 1024 / 1024).toFixed(2), 'MB');
      console.log('[AutoUpdater] Speed:', (progressObj.bytesPerSecond / 1024 / 1024).toFixed(2), 'MB/s');
      
      this.sendToRenderer('update-download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[AutoUpdater] Update downloaded successfully!');
      console.log('[AutoUpdater] Version:', info.version);
      console.log('[AutoUpdater] Release date:', info.releaseDate);
      
      this.isDownloading = false;
      this.updateDownloaded = true;
      this.sendToRenderer('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      });
    });
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  sendToRenderer(channel, data = {}) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  async checkForUpdates() {
    if (this.isChecking) {
      console.log('[AutoUpdater] Already checking for updates, skipping...');
      return { success: false, checking: true };
    }

    try {
      console.log('[AutoUpdater] ========================================');
      console.log('[AutoUpdater] Starting manual update check...');
      console.log('[AutoUpdater] Current app version:', app.getVersion());
      console.log('[AutoUpdater] Update channel:', this.updateChannel);
      console.log('[AutoUpdater] Allow prerelease:', autoUpdater.allowPrerelease);
      console.log('[AutoUpdater] Repository: FIREXDF/FightPlanner-4');
      console.log('[AutoUpdater] Provider: GitHub Releases');
      
      const feedURL = autoUpdater.getFeedURL();
      console.log('[AutoUpdater] Feed URL:', feedURL);
      console.log('[AutoUpdater] Checking URL: https://api.github.com/repos/FIREXDF/FightPlanner-4/releases');
      console.log('[AutoUpdater] ========================================');
      
      let currentVersion = app.getVersion();

      // Force update check if enabled
      if (this.forceUpdateAvailable) {
        console.log('[AutoUpdater] Force update available is ENABLED. Trick: Setting current version to 0.0.0 to force update found.');
        autoUpdater.currentVersion = semver.parse('0.0.0');
        currentVersion = '0.0.0';
        
        // Ensure we don't skip alpha if we are forced
        // But we still respect the channel logic unless we want to force EVERYTHING.
        // For now, let's just force the version check.
      } else {
        // Chek for fake version override
        const fakeVersion = store.get('developer.fakeVersion');
        if (fakeVersion) {
          console.log(`[AutoUpdater] ⚠️ USING FAKE VERSION OVERRIDE: ${fakeVersion} (Real: ${currentVersion})`);
          // Force electron-updater to use our fake version
          autoUpdater.currentVersion = semver.parse(fakeVersion);
          currentVersion = fakeVersion;
        }
      }
      
      const result = await autoUpdater.checkForUpdates();
      
      console.log('[AutoUpdater] ========================================');
      console.log('[AutoUpdater] Raw check result:', result);
      console.log('[AutoUpdater] Result type:', typeof result);
      console.log('[AutoUpdater] Result is null:', result === null);
      
      if (result === null) {
        console.log('[AutoUpdater] ⚠️  Result is NULL - This usually means:');
        console.log('[AutoUpdater]   1. No GitHub releases found');
        console.log('[AutoUpdater]   2. Current version is already the latest');
        console.log('[AutoUpdater]   3. Network/connection issue');
        console.log('[AutoUpdater] ========================================');
        return { success: true, updateInfo: null, noRelease: true };
      }
      
      if (result && result.updateInfo) {
        console.log('[AutoUpdater] ✅ Update info found:');
        console.log('[AutoUpdater]   Version:', result.updateInfo.version);
        console.log('[AutoUpdater]   Release date:', result.updateInfo.releaseDate);
        
        
        // Check if version is actually newer
        // const currentVersion = app.getVersion(); // Already set above
        if (semver.lte(result.updateInfo.version, currentVersion)) {
           console.log('[AutoUpdater] ℹ️ Found version', result.updateInfo.version, 'is not newer than current', currentVersion);
           return { success: true, updateInfo: null, noRelease: true };
        }

        // Apply channel filtering to manual check result as well
        if (!this.isVersionAllowed(result.updateInfo.version)) {
          console.log('[AutoUpdater] ⚠️ Update rejected by channel filter (manual check)');
          return { success: true, updateInfo: null, filtered: true };
        }
      }
      console.log('[AutoUpdater] ========================================');
      
      return { success: true, updateInfo: result?.updateInfo };
    } catch (error) {
      console.error('[AutoUpdater] ========================================');
      console.error('[AutoUpdater] ❌ Error checking for updates:', error);
      console.error('[AutoUpdater] Error message:', error.message);
      console.error('[AutoUpdater] Error stack:', error.stack);
      console.error('[AutoUpdater] ========================================');
      return { success: false, error: error.message };
    }
  }

  async downloadUpdate() {
    try {
      console.log('[AutoUpdater] Starting download...');
      this.isDownloading = true;
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('[AutoUpdater] Error downloading update:', error);
      this.isDownloading = false;
      return { success: false, error: error.message };
    }
  }

  quitAndInstall() {
    console.log('[AutoUpdater] Quitting and installing update...');
    autoUpdater.quitAndInstall(false, true);
  }

  checkForUpdatesOnStartup() {
    console.log('[AutoUpdater] Scheduling startup update check in 5 seconds...');
    setTimeout(async () => {
      console.log('[AutoUpdater] Running startup update check...');
      await this.checkForUpdates();
    }, 5000);
  }

  setAutoCheckEnabled(enabled) {
    this.autoCheckEnabled = enabled;
  }

  setUpdateChannel(channel) {
    console.log('[AutoUpdater] Setting update channel to:', channel);
    this.updateChannel = channel;
    
    if (channel === 'stable') {
      autoUpdater.allowPrerelease = false;
      console.log('[AutoUpdater] Disabled prerelease (stable channel)');
    } else {
      // For both Alpha and Beta, we enable prerelease
      // Filtering for Beta (to exclude Alpha) is done in update-available event
      autoUpdater.allowPrerelease = true;
      console.log('[AutoUpdater] Enabled prerelease (alpha/beta channel)');
    }
  }

  getUpdateChannel() {
    return this.updateChannel;
  }

  getUpdateInfo() {
    return this.updateInfo;
  }

  setForceUpdateAvailable(value) {
    this.forceUpdateAvailable = value;
    console.log(`[AutoUpdater] Force update available set to: ${value}`);
  }

  getForceUpdateAvailable() {
    return this.forceUpdateAvailable;
  }

  simulateUpdate() {
    console.log('[AutoUpdater] Simulating update available...');
    const dummyUpdateInfo = {
      version: '9.9.9-simulator',
      releaseNotes: '<h2>Simulation Update</h2><p>This is a simulated update to test the UI.</p><ul><li>Feature 1</li><li>Feature 2</li></ul>',
      releaseDate: new Date().toISOString(),
      files: []
    };
    
    this.updateInfo = dummyUpdateInfo;
    this.sendToRenderer('update-available', dummyUpdateInfo);
    return { success: true };
  }
}

const autoUpdaterInstance = new AutoUpdater();

module.exports = autoUpdaterInstance;
