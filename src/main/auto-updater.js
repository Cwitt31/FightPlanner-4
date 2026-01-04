const { autoUpdater } = require('electron-updater')
const { app } = require('electron')
const semver = require('semver')
const Store = require('electron-store')
const store = new Store()

class AutoUpdater {
  constructor() {
    this.mainWindow = null
    this.updateInfo = null
    this.isChecking = false
    this.isDownloading = false
    this.updateDownloaded = false
    this.autoCheckEnabled = true
    this.updateChannel = store.get('updateChannel', 'stable')
    this.forceUpdateAvailable = store.get('developer.forceUpdateAvailable', false)

    autoUpdater.requestHeaders = { 'Cache-Control': 'no-cache' }
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    this.setUpdateChannel(this.updateChannel)
    this.setupEventHandlers()
  }

  setupEventHandlers() {
    autoUpdater.on('checking-for-update', () => {
      this.isChecking = true
      this.sendToRenderer('update-checking')
    })

    autoUpdater.on('update-available', (info) => {
      this.isChecking = false
      this.updateInfo = info
      this.sendToRenderer('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
        files: info.files
      })
    })

    autoUpdater.on('update-not-available', (info) => {
      this.isChecking = false
      this.sendToRenderer('update-not-available', {
        version: app.getVersion(),
        latestVersion: info?.version
      })
    })

    autoUpdater.on('error', (error) => {
      this.isChecking = false
      this.isDownloading = false
      this.sendToRenderer('update-error', {
        message: error.message
      })
    })

    autoUpdater.on('download-progress', (progressObj) => {
      this.sendToRenderer('update-download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.isDownloading = false
      this.updateDownloaded = true
      this.sendToRenderer('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      })
    })
  }

  setMainWindow(window) {
    this.mainWindow = window
  }

  sendToRenderer(channel, data = {}) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  async checkForUpdates() {
    if (this.isChecking) {
      return { success: false, checking: true }
    }

    try {
      const result = await autoUpdater.checkForUpdates()
      if (result && result.updateInfo) {
        this.updateInfo = result.updateInfo
      } else if (!this.updateInfo || !this.updateInfo.version.includes('simulator')) {
        this.updateInfo = null
      }
      return { success: true, updateInfo: result?.updateInfo }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async downloadUpdate() {
    try {
      if (this.updateInfo && this.updateInfo.version && this.updateInfo.version.includes('simulator')) {
        this.isDownloading = true
        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          if (progress > 100) {
            clearInterval(interval)
            this.isDownloading = false
            this.updateDownloaded = true
            this.sendToRenderer('update-downloaded', {
              version: this.updateInfo.version,
              releaseDate: this.updateInfo.releaseDate
            })
          } else {
            this.sendToRenderer('update-download-progress', {
              percent: progress,
              transferred: progress * 1024 * 1024,
              total: 100 * 1024 * 1024,
              bytesPerSecond: 10 * 1024 * 1024
            })
          }
        }, 500)
        return { success: true }
      }

      if (!this.updateInfo) {
        return { success: false, error: 'Please check for updates first' }
      }

      this.isDownloading = true
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (error) {
      this.isDownloading = false
      return { success: false, error: error.message }
    }
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall(false, true)
  }

  checkForUpdatesOnStartup() {
    setTimeout(async () => {
      await this.checkForUpdates()
    }, 5000)
  }

  setAutoCheckEnabled(enabled) {
    this.autoCheckEnabled = enabled
  }

  setUpdateChannel(channel) {
    this.updateChannel = channel
    store.set('updateChannel', channel)

    if (channel === 'stable') {
      autoUpdater.allowPrerelease = false
    } else {
      autoUpdater.allowPrerelease = true
    }
  }

  getUpdateChannel() {
    return this.updateChannel
  }

  getUpdateInfo() {
    return this.updateInfo
  }

  setForceUpdateAvailable(value) {
    this.forceUpdateAvailable = value
    store.set('developer.forceUpdateAvailable', value)
  }

  getForceUpdateAvailable() {
    return this.forceUpdateAvailable
  }

  simulateUpdate() {
    const dummyUpdateInfo = {
      version: '9.9.9-simulator',
      releaseNotes: '<h2>Simulation Update</h2><p>This is a simulated update to test the UI.</p><ul><li>Feature 1</li><li>Feature 2</li></ul>',
      releaseDate: new Date().toISOString(),
      files: []
    }
    
    this.updateInfo = dummyUpdateInfo
    this.sendToRenderer('update-available', dummyUpdateInfo)
    return { success: true }
  }
}

const autoUpdaterInstance = new AutoUpdater()

module.exports = autoUpdaterInstance
