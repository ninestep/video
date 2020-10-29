'use strict'

import { app, BrowserWindow } from 'electron'

import VideoServer from './VideoServer'
import { videoSupport } from './ffmpeg-helper'
/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

import { autoUpdater } from 'electron-updater'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    useContentSize: true,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      enableRemoteModule: true
    },
    show: false
  })
  mainWindow.maximize()
  mainWindow.show()
  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.on('resize', (e) => {
    mainWindow.webContents.send('resize')
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

autoUpdater.on('update-downloaded', () => {
  console.log('update-downloaded lats quitAndInstall')

  if (process.env.NODE_ENV === 'production') {
    dialog.showMessageBox({
      type: 'info',
      title: 'Found Updates',
      message: 'Found updates, do you want update now?',
      buttons: ['Sure', 'No']
    }, (buttonIndex) => {
      if (buttonIndex === 0) {
        const isSilent = true
        const isForceRunAfter = true
        autoUpdater.quitAndInstall(isSilent, isForceRunAfter)
      }
    })
  }
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})

const ipc = require('electron').ipcMain
const dialog = require('electron').dialog
ipc.on('open-dir-dialog', function (event) {
  dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory']
  }, function (files) {
    if (files) event.sender.send('selected-directory', files)
  })
})
ipc.on('open-file-dialog', function (event, args) {
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: args
  }, function (files) {
    if (files) event.sender.send('selected-file', files)
  })
})
ipc.on('open-video', function (event, args) {
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: args
  }, function (result) {
    if (result && result.length > 0) {
      onVideoFileSeleted(result[0])
    }
  })
})
let httpServer
let isRendererReady = false

function onVideoFileSeleted (videoFilePath) {
  videoSupport(videoFilePath).then((checkResult) => {
    mainWindow.webContents.send('selected-file', videoFilePath)
    if (checkResult.videoCodecSupport && checkResult.audioCodecSupport) {
      if (httpServer) {
        httpServer.killFfmpegCommand()
      }
      let playParams = {}
      playParams.type = 'native'
      playParams.videoSource = videoFilePath
      if (isRendererReady) {
        console.log('fileSelected=', playParams)

        mainWindow.webContents.send('fileSelected', playParams)
      } else {
        ipc.once('ipcRendererReady', (event, args) => {
          console.log('fileSelected', playParams)
          mainWindow.webContents.send('fileSelected', playParams)
          isRendererReady = true
        })
      }
    }
    if (!checkResult.videoCodecSupport || !checkResult.audioCodecSupport) {
      if (!httpServer) {
        httpServer = new VideoServer()
      }
      httpServer.videoSourceInfo = { videoSourcePath: videoFilePath, checkResult: checkResult }
      httpServer.createServer()
      console.log('createVideoServer success')
      let playParams = {}
      playParams.type = 'stream'
      playParams.videoSource = 'http://127.0.0.1:8888?startTime=0'
      playParams.duration = checkResult.duration
      if (isRendererReady) {
        console.log('fileSelected=', playParams)

        mainWindow.webContents.send('fileSelected', playParams)
      } else {
        ipc.once('ipcRendererReady', (event, args) => {
          console.log('fileSelected', playParams)
          mainWindow.webContents.send('fileSelected', playParams)
          isRendererReady = true
        })
      }
    }
  }).catch((err) => {
    console.log('video format error', err)
    const options = {
      type: 'info',
      title: 'Error',
      message: 'It is not a video file!',
      buttons: ['OK']
    }
    dialog.showMessageBox(options, function (index) {
      console.log('showMessageBox', index)
    })
  })
}
