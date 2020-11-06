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

export function conactVideo (videoPath, savePath, frontPath = '',
  endPath = '', watermark = '',
  location = 'rt', progressFunc = function (progress) {
    console.log(progress.name + ' Processing: ' + progress.percent + '% done')
  }) {
  return new Promise((resolve, reject) => {
    let saveName = path.basename(videoPath)
    let saveVideo = path.join(savePath, saveName)
    if (watermark !== '') {
      saveVideo = path.join(__dirname, 'save.mp4')
    }
    let frames = 0
    new Promise((resolve) => {
      ffmpeg(videoPath)
        .ffprobe(0, function (err, metadata) {
          !!err && console.log('无法读取视频大小:' + err.message)
          frames += metadata.streams[0]['nb_frames']
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
      //  读取片头大小
      .then(() => {
        return new Promise((resolve) => {
          if (frontPath === '' || !frontPath || frontPath.length <= 0) {
            resolve()
          }
          ffmpeg(frontPath)
            .ffprobe(0, function (err, metadata) {
              if (err) {
                console.log('无法读取视频大小:' + err.message)
              } else {
                frames += metadata.streams[0]['nb_frames']
              }
              resolve()
            })
        })
      })
      //  读取片尾大小
      .then(() => {
        return new Promise((resolve) => {
          ffmpeg(endPath)
            .ffprobe(0, function (err, metadata) {
              if (err) {
                console.log('无法读取视频大小:' + err.message)
              } else {
                frames += metadata.streams[0]['nb_frames']
              }
              resolve()
            })
        })
      })
      //  生成连接文案吧
      .then(() => {
        return new Promise((resolve) => {
          ffmpeg(path.join(__dirname, 'input.txt'))
            .inputOptions(
              '-f', 'concat',
              '-safe', '0'
            ).outputOptions([
              '-acodec', 'copy', '-vcodec', 'copy'
            ]).on('start', function (commandLine) {
              console.log('Started: ' + commandLine)
            }).on('progress', function (progress) {
              progress.name = 'concat'
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
      })
      //  附加水印
      .then(() => {
        return new Promise(function (resolve, reject) {
          if (watermark === '') {
            resolve()
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
              ffmpeg(saveVideo)
                .videoFilters(`drawtext=fontfile=msyh.ttc:text='${watermark}':x=${locationXY[0]}:y=${locationXY[1]}:fontsize=24:fontcolor=white:shadowy=2`)
                .on('start', function (commandLine) {
                  console.log('Started: ' + commandLine)
                }).on('progress', function (progress) {
                  progressFunc('Processing: ' + progress.percent + '% done')
                })
                .on('error', function (err) {
                  console.log('文字水印添加错误: ' + err.message)
                }).on('end', function () {
                  console.log('文字水印添加成功')
                  resolve()
                }).save(path.join(savePath, saveName))
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
              ffmpeg(saveVideo)
                .input(watermark)
                .inputOptions(
                  // '-filter_complex', `overlay=${locationXY[0]}:${locationXY[1]}`
                )
                .outputOptions([
                  '-codec:a', 'copy'
                  // '-vf', `movie=${watermark} [watermark]; [in][watermark] overlay=${locationXY[0]}:${locationXY[1]}`
                ]).on('start', function (commandLine) {
                  console.log('Started: ' + commandLine)
                }).on('progress', function (progress) {
                  progress.name = 'watermark'
                  progressFunc(progress)
                })
                .on('error', function (err) {
                  console.log('水印添加错误: ' + err.message)
                }).on('end', function () {
                  console.log('水印添加成功')
                  resolve()
                }).save(path.join(savePath, saveName))
            }
          })
        })
      })
      //  正确执行
      .then(() => {
        resolve()
      })
      //  异常执行
      .catch(() => {
        reject(new Error())
      })
  })
}
