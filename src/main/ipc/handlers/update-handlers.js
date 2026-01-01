const autoUpdater = require('../../auto-updater');

function registerUpdateHandlers(ipcMain) {
  ipcMain.handle('check-for-updates', async () => {
    return await autoUpdater.checkForUpdates();
  });

  ipcMain.handle('download-update', async () => {
    return await autoUpdater.downloadUpdate();
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
    return { success: true };
  });

  ipcMain.handle('get-update-info', () => {
    return autoUpdater.getUpdateInfo();
  });

  ipcMain.handle('set-auto-check-enabled', (event, enabled) => {
    autoUpdater.setAutoCheckEnabled(enabled);
    return { success: true };
  });
}

module.exports = { registerUpdateHandlers };
