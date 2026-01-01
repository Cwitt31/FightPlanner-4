const { autoUpdater } = require('electron-updater');
const { app, BrowserWindow } = require('electron');

class AutoUpdater {
  constructor() {
    this.mainWindow = null;
    this.updateInfo = null;
    this.isChecking = false;
    this.autoCheckEnabled = true;
    
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    autoUpdater.on('checking-for-update', () => {
      this.isChecking = true;
      this.sendToRenderer('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
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
      this.isChecking = false;
      this.sendToRenderer('update-not-available', {
        version: info.version
      });
    });

    autoUpdater.on('error', (error) => {
      this.isChecking = false;
      this.sendToRenderer('update-error', {
        message: error.message,
        stack: error.stack
      });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.sendToRenderer('update-download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.sendToRenderer('update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes,
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
      return { checking: true };
    }

    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, updateInfo: result?.updateInfo };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { success: false, error: error.message };
    }
  }

  async downloadUpdate() {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('Error downloading update:', error);
      return { success: false, error: error.message };
    }
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall(false, true);
  }

  async checkForUpdatesOnStartup() {
    if (!this.autoCheckEnabled) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (app.isReady()) {
      this.checkForUpdates();
    }
  }

  setAutoCheckEnabled(enabled) {
    this.autoCheckEnabled = enabled;
  }

  getUpdateInfo() {
    return this.updateInfo;
  }
}

const autoUpdaterInstance = new AutoUpdater();

module.exports = autoUpdaterInstance;
