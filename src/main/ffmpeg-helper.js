'use strict'
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const ffmpeg = require('fluent-ffmpeg')
ffmpeg.setFfmpegPath(ffmpegPath)
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
