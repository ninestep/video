'use strict'

import {app, BrowserWindow} from 'electron'

import VideoServer from './VideoServer'
import {videoSupport} from './ffmpeg-helper'
import path from 'path'
import fs from 'fs'
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

app.on('ready', () => {
  createWindow()
})

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

const ipc = require('electron').ipcMain
const dialog = require('electron').dialog
ipc.on('open-dir-dialog', function (event) {
  dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory']
  }).then(files => { if (files) mainWindow.webContents.send('selected-directory', files) })
})
ipc.on('open-file-dialog', function (event, args) {
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: args
  }).then(files => {
    if (files) mainWindow.webContents.send('selected-file', files)
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
autoUpdater.on('checking-for-update', function () {
  sendUpdate({type: 'checking'})
})
autoUpdater.on('update-available', function (info) {
  sendUpdate({type: 'available', info: info})
})
autoUpdater.on('update-not-available', function (info) {
  sendUpdate({type: 'not-available'})
})
autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})
autoUpdater.on('download-progress', info => {
  sendUpdate({type: 'download-progress', info: info})
})
autoUpdater.on('error', message => {
  sendUpdate({type: 'error', info: message})
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
ipc.on('update', () => {
  autoUpdater.autoDownload = false
  if (process.env.NODE_ENV === 'production') { autoUpdater.checkForUpdates() }
})
ipc.on('download-update', () => {
  autoUpdater.downloadUpdate()
})
function sendUpdate (args) {
  mainWindow.webContents.send('update', args)
}
ipc.on('download-file', (event, args) => {
  mainWindow.webContents.downloadURL(args.url)
  mainWindow.webContents.session.on('will-download', (e, item) => {
    // 获取文件的总大小
    const totalBytes = item.getTotalBytes()

    // 设置文件的保存路径，此时默认弹出的 save dialog 将被覆盖
    let filePath = path.join(app.getPath('downloads'), item.getFilename())
    if (args.savePath) {
      filePath = args.savePath
    }
    try {
      let stats = fs.statSync(filePath)// 如果文件已存在读取文件信息
      if (totalBytes === stats.size) { // 如果文件已经存在并且已经下载按成则跳过该文件
        item.cancel()
        mainWindow.webContents.send('download-file-done', filePath)
      }
    } catch (err) {

    }
    item.setSavePath(filePath)

    // 监听下载过程，计算并设置进度条进度
    item.on('updated', () => {
      mainWindow.setProgressBar(item.getReceivedBytes() / totalBytes)
      mainWindow.webContents.send('download-file-progress', (item.getReceivedBytes() / totalBytes * 100) + '%')
    })

    // 监听下载结束事件
    item.on('done', (e, state) => {
      // 如果窗口还在的话，去掉进度条
      if (!mainWindow.isDestroyed()) {
        mainWindow.setProgressBar(-1)
      }

      // 下载被取消或中断了
      if (state === 'interrupted') {
        mainWindow.webContents.send('download-file-error', `文件 ${item.getFilename()} 因为某些原因被中断下载`)
      }

      // 下载完成，让 dock 上的下载目录Q弹一下下
      if (state === 'completed') {
        mainWindow.webContents.send('download-file-done', filePath)
      }
    })
  })
})
