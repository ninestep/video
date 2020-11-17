'use strict'
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const ffprobePath = require('@ffprobe-installer/ffprobe').path
const ffmpeg = require('fluent-ffmpeg')
ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobePath)
const process = require('child_process')
const path = require('path')
const fs = require('fs')

function findVideoInfo (reg, text) {
  let matchArr = reg.exec(text)
  let infoFound
  if (matchArr && matchArr.length > 1) {
    infoFound = matchArr[1].trim()
  }
  return infoFound
}

function transformDuration (duration) {
  if (!duration) {
    return 0
  }
  let arr = duration.split(':')
  if (arr.length === 3) {
    return parseInt(arr[0]) * 3600 + parseInt(arr[1]) * 60 + parseInt(arr[2])
  }
  return 0
}

export function secondToTimeStr (second) {
  const pad = function (num) {
    num = '' + parseInt(num)
    if (num.length === 1) {
      return '0' + num
    } else {
      return num
    }
  }

  let minute = 0
  let hour = 0
  if (second >= 60) {
    minute = second / 60
    second = second % 60
  }
  if (minute > 60) {
    hour = minute / 60
    minute = minute % 60
  }
  return pad(hour) + ':' + pad(minute) + ':' + pad(parseInt(second))
}

export function videoSupport (videoPath) {
  let p = new Promise(function (resolve, reject) {
    // eslint-disable-next-line handle-callback-err
    // let command1 = `${ffprobePath} -show_format '${videoPath}'`
    let checkResult = {
      videoCodecSupport: false,
      audioCodecSupport: false,
      duration: 0
    }
    var ffmpeg = process.spawn(ffmpegPath, [
      '-i',
      videoPath])

    ffmpeg.stderr.on('data', function (data) {
      let str = data
      let videoReg = /Video:((\w|\s)+)/ig
      let videoCodec = findVideoInfo(videoReg, str)
      let audioReg = /Audio:((\w|\s)+)/ig
      let audioCodec = findVideoInfo(audioReg, str)
      let durationReg = /Duration:((\w|:|\s)+)/ig
      let duration = findVideoInfo(durationReg, str)
      let durationSeconds = transformDuration(duration)
      console.log('videoCodec:' + videoCodec +
                ',audioCodec:' + audioCodec +
                ',duration:' + durationSeconds)
      checkResult.duration = durationSeconds

      const path = require('path')
      let extname = path.extname(videoPath)
      // mp4, webm, ogg
      if (['.mp4', '.webm', '.ogg'].indexOf(extname) >= 0) {
        if (videoCodec === 'h264' ||
                    videoCodec === 'vp8' || videoCodec === 'theora') {
          checkResult.videoCodecSupport = true
        }
        // aac, vorbis
        if (audioCodec === 'aac' ||
                    audioCodec === 'vorbis') {
          checkResult.audioCodecSupport = true
        }
      }
      resolve(checkResult)
    })
  })
  return p
}

/**
 * 视频转码
 * @param videoPath 路径
 * @param savePath 保存路径
 * @param size 分辨率例如1920*1080
 * @param vcodec 视频编码
 * @param acodec 音频编码
 * @param fps 帧数
 * @param bitRate 码率
 * @param progressFunc 进度回调函数
 * @returns {Promise<unknown>}
 */
export function trans (videoPath, savePath, size = '1920x1080',
  vcodec = 'libx264', acodec = 'aac', fps = 60, bitRate = '12288k', progressFunc = function (progress) {
    console.log(progress.name + ' Processing: ' + progress.percent + '% done')
  }) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(savePath)
      .videoBitrate(bitRate)
      .videoCodec('libx264')
      .audioBitrate('128k')
      .audioCodec(acodec)
      .size(size)
      .fps(fps)
      .on('start', function (commandLine) {
        console.log('Started: ' + commandLine)
      }).on('progress', function (progress) {
        progress.name = '视频转码'
        progressFunc(progress)
      })
      .on('error', function (err) {
        console.log('转码错误: ' + err.message)
      }).on('end', function () {
        console.log('转码成功')
        getMetaData(savePath).then(res => {
          resolve(res)
        })
      }).run()
  })
}

/**
 * 增加水印
 * @param videoPath 视频路径
 * @param savePath 保存路径
 * @param watermark 水印路径
 * @param location 位置
 * @param progressFunc 进度回调
 * @returns {Promise<unknown>}
 */
export function water (videoPath, savePath, watermark = '', location = 'rt', progressFunc = function (progress) {
  console.log(progress.name + ' Processing: ' + progress.percent + '% done')
}) {
  return new Promise((resolve, reject) => {
    if (watermark === '') {
      reject(new Error('未传入水印路径'))
    }
    let unLink = false
    if (videoPath === savePath) {
      let pathInfo = path.parse(videoPath)
      videoPath = path.join(pathInfo.dir, pathInfo.name + '~' + pathInfo.ext)
      fs.renameSync(savePath, videoPath)
      unLink = true
    }
    let locationXY = [10, 10]
    fs.access(watermark, (err) => {
      if (err) {
        if (location === 'rt') {
          locationXY = ['(w-text_w)-10', 10]
        }
        if (location === 'lt') {
          locationXY = [10, 10]
        }
        if (location === 'rb') {
          locationXY = ['(w-text_w)-10', '(h-text_h)-10']
        }
        if (location === 'lb') {
          locationXY = [10, 'h-10']
        }
        if (location === 'c') {
          locationXY = ['(w-text_w)/2', '(h-text_h)/2']
        }
        ffmpeg(videoPath)
          .videoFilters(`drawtext=fontfile=msyh.ttc:text='${watermark}':x=${locationXY[0]}:y=${locationXY[1]}:fontsize=24:fontcolor=white:shadowy=2`)
          .on('start', function (commandLine) {
            console.log('Started: ' + commandLine)
          }).on('progress', function (progress) {
            progress.name = '添加水印'
            progressFunc(progress)
          })
          .on('error', function (err) {
            console.log('文字水印添加错误: ' + err.message)
          }).on('end', function () {
            console.log('文字水印添加成功')
            resolve()
          }).save(savePath)
      } else {
        if (location === 'rt') {
          locationXY = ['main_w-overlay_w-10', 10]
        }
        if (location === 'lt') {
          locationXY = [10, 10]
        }
        if (location === 'rb') {
          locationXY = ['main_w-overlay_w-10', 'main_h-overlay_h-10']
        }
        if (location === 'lb') {
          locationXY = [10, 'main_h-overlay_h-10']
        }
        if (location === 'c') {
          locationXY = ['main_w/2-overlay_w/2', 'main_h/2-overlay_h/2']
        }
        ffmpeg(videoPath)
          .input(watermark)
          .inputOptions(
            '-filter_complex', `overlay=${locationXY[0]}:${locationXY[1]}`
          )
          .on('start', function (commandLine) {
            console.log('Started: ' + commandLine)
          })
          .on('progress', function (progress) {
            progress.name = '添加水印'
            progressFunc(progress)
          })
          .on('error', function (err) {
            console.log('水印添加错误: ' + err.message)
            reject(err)
          })
          .on('end', function () {
            console.log('水印添加成功')
            if (unLink) {
              fs.unlinkSync(videoPath)
            }
            resolve(savePath)
          })
          .save(savePath)
      }
    })
  })
}

/**
 * 剪辑视频
 * @param videoPath 视频地址
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @param outDir 输出文件
 * @param name 名字
 * @returns {Promise<unknown>}
 */
export function cutVideo (videoPath, startTime, endTime, outDir, name = null) {
  return new Promise(function (resolve, reject) {
    new Promise(function (resolve, reject) {
      fs.stat(outDir, function (err, stats) {
        if (err || !stats.isDirectory()) {
          fs.mkdirSync(outDir)
        }
      })
      resolve()
    }).then(function () {
      ffmpeg().input(videoPath)
        .setStartTime(secondToTimeStr(startTime))
        .setDuration(parseInt(endTime - startTime + ''))
        .output(path.join(outDir, name + '.mp4'))
        .audioBitrate('128k')
        .videoCodec('libx264')
        .on('start', function (commandLine) {
          console.log('Started: ' + commandLine)
        })
        .on('end', function (err) {
          if (!err) {
            resolve('success')
          } else {
            reject(new Error(err))
          }
        })
        .on('error', function (err) {
          console.log(err)
          reject(new Error(err))
        }).run()
    }).catch((err) => {
      console.log(err)
      reject(new Error(err))
    })
  })
}

/**
 * 获取视频信息
 * @param videoPath 视频路径
 * @returns {Promise<unknown>}
 */
export function getMetaData (videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .ffprobe(0, function (err, metadata) {
        if (err) {
          reject(err)
        } else {
          console.log(metadata)
          resolve({
            frames: metadata.streams[0]['nb_frames'],
            height: metadata.streams[0]['height'],
            width: metadata.streams[0]['width'],
            bitRate: metadata.streams[0]['bit_rate'],
            videoCodec: metadata.streams[0]['codec_name'],
            audioCodec: metadata.streams[1]['codec_name']
          })
        }
      })
  })
}

/**
 * 连接视频
 * @param videoPath 视频路径
 * @param savePath 保存路径
 * @param frontPath 片头
 * @param endPath 片尾
 * @param progressFunc 进度回调
 * @returns {Promise<unknown>}
 */
export function conactVideo (videoPath, savePath, frontPath = '', endPath = '', progressFunc = function (progress) {
  console.log(progress.name + ' Processing: ' + progress.percent + '% done')
}) {
  return new Promise((resolve, reject) => {
    let saveName = path.basename(videoPath)
    let saveVideo = path.join(savePath, saveName)
    let frames = 1
    let height = 1080
    let width = 1920
    let videoCodec = 'libx264'
    let audioCodec = 'aac'
    let bitRate = '12288k'
    getMetaData(videoPath)
      .then(res => {
        height = res['height']
        width = res['width']
        videoCodec = res['videoCodec']
        audioCodec = res['audioCodec']
        bitRate = res['bitRate']
        frames += res['frames']
      })
      .then(() => {
        return new Promise((resolve) => {
          if (frontPath) {
            trans(frontPath, path.join(__dirname, 'frontPath.mp4'), `${width}x${height}`, videoCodec, audioCodec, 60, bitRate, progressFunc)
              .then((res) => {
                frontPath = path.join(__dirname, 'frontPath.mp4')
                frames += res['frames']
                resolve()
              })
              .catch(err => {
                reject(err)
              })
          } else {
            resolve()
          }
        })
      })
      .then(() => {
        return new Promise((resolve) => {
          if (endPath) {
            trans(endPath, path.join(__dirname, 'endPath.mp4'), `${width}x${height}`, videoCodec, audioCodec, 60, bitRate, progressFunc)
              .then((res) => {
                endPath = path.join(__dirname, 'endPath.mp4')
                frames += res['frames']
                resolve()
              }).catch(err => {
                reject(err)
              })
          } else {
            resolve()
          }
        })
      })
      .then(() => {
        return new Promise((resolve) => {
          var out = fs.createWriteStream(path.join(__dirname, 'input.txt'), 'utf8')
          let fileContent = ''
          if (frontPath !== '') {
            fileContent = `file '${frontPath}'`
          }
          if (fileContent === '') {
            fileContent = `file '${videoPath}'`
          } else {
            fileContent += `\nfile '${videoPath}'`
          }
          if (endPath !== '') {
            fileContent += `\nfile '${endPath}'`
          }
          out.write(fileContent)
          out.end()
          out.on('ready', function () {
            console.log('创建文本成功')
            resolve()
          })
        })
      })
      .then(() => {
        return new Promise((resolve) => {
          ffmpeg(path.join(__dirname, 'input.txt'))
            .inputOptions(
              '-f', 'concat',
              '-safe', '0'
            ).outputOptions([
              '-acodec', 'aac', '-vcodec', 'libx264'
            ]).fps(60).on('start', function (commandLine) {
              console.log('Started: ' + commandLine)
            }).on('progress', function (progress) {
              progress.name = '拼接视频'
              progress.percent = (progress.frames / frames * 100)
              progressFunc(progress)
            })
            .on('error', function (err) {
              console.log('合并视频发生错误: ' + err.message)
            }).on('end', function () {
              console.log('合并视频成功')
              resolve()
            }).save(saveVideo)
        })
      }).then(() => {
        resolve(saveVideo)
      }).catch(error => {
        reject(error)
      })
  })
}
