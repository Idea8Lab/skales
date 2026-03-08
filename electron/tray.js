'use strict';

const { Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');

let tray = null;

/**
 * createTray
 *
 * @param {() => BrowserWindow | null} getMainWindow  — getter for the main window
 * @param {Electron.App}               app             — Electron app instance
 * @param {() => number}               getPort         — getter for the active server port
 * @returns {Tray}
 */
function createTray(getMainWindow, app, getPort) {
  // macOS: Use template image for proper menu bar rendering
  const iconName = process.platform === 'darwin' ? 'tray-iconTemplate.png' : 'tray-icon.png';
  const iconPath = path.join(__dirname, 'icons', iconName);
  
  const icon = nativeImage.createFromPath(iconPath);

  // On macOS, mark the icon as a "template image" so the OS handles light/dark
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip('Skales — AI Agent');

  // Build (and refresh) the context menu
  function buildMenu() {
    const win = getMainWindow();
    const isVisible = win && win.isVisible();

    return Menu.buildFromTemplate([
      {
        label: isVisible ? 'Hide Skales' : 'Open Skales',
        click: () => {
          const w = getMainWindow();
          if (!w) return;
          if (w.isVisible()) {
            w.hide();
          } else {
            w.show();
            w.focus();
          }
          // Rebuild menu so the label flips
          tray.setContextMenu(buildMenu());
        }
      },
      { type: 'separator' },
      {
        label: '● Status: Running',
        enabled: false,
        // Green dot in the label acts as a visual indicator
      },
      {
        label: 'Open in Browser',
        click: () => shell.openExternal(`http://localhost:${getPort ? getPort() : 3000}`)
      },
      { type: 'separator' },
      {
        label: 'Quit Skales',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);
  }

  tray.setContextMenu(buildMenu());

  // Refresh menu when right-clicked (so label stays in sync)
  tray.on('right-click', () => {
    tray.setContextMenu(buildMenu());
    tray.popUpContextMenu();
  });

  // Single left-click on Windows/Linux toggles window visibility
  tray.on('click', () => {
    if (process.platform === 'darwin') return; // macOS uses right-click / context menu
    const w = getMainWindow();
    if (!w) return;
    if (w.isVisible()) {
      w.hide();
    } else {
      w.show();
      w.focus();
    }
    tray.setContextMenu(buildMenu());
  });

  // Double-click always opens the window
  tray.on('double-click', () => {
    const w = getMainWindow();
    if (!w) return;
    w.show();
    w.focus();
  });

  return tray;
}

module.exports = { createTray };
