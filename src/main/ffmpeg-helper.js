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
export function timeStrToSecond (e) {
  let time = e
  let len = time.split(':')
  if (len.length === 3) {
    let hour = time.split(':')[0]
    let min = time.split(':')[1]
    let sec = time.split(':')[2]
    return Number(hour * 3600) + Number(min * 60) + Number(sec)
  }
  if (len.length === 2) {
    let min = time.split(':')[0]
    let sec = time.split(':')[1]
    return Number(min * 60) + Number(sec)
  }
  if (len.length === 1) {
    let sec = time.split(':')[0]
    return Number(sec)
  }

  // var hour = time.split(':')[0];
  // var min = time.split(':')[1];
  // var sec = time.split(':')[2];
  // return  Number(hour*3600) + Number(min*60) + Number(sec);
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
    fs.access(watermark, async (err) => {
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
            resolve(savePath)
          }).save(savePath)
      } else {
        if (location === 'rt') {
          locationXY = ['main_w-overlay_w', 0]
        }
        if (location === 'lt') {
          locationXY = [0, 0]
        }
        if (location === 'rb') {
          locationXY = ['main_w-overlay_w', 'main_h-overlay_h']
        }
        if (location === 'lb') {
          locationXY = [0, 'main_h-overlay_h']
        }
        if (location === 'c') {
          locationXY = ['main_w/2-overlay_w/2', 'main_h/2-overlay_h/2']
        }
        let videoInfo = await getMetaData(videoPath)
        ffmpeg(videoPath)
          .input(watermark)
          .inputOptions(
            '-filter_complex', `[1:v]scale=${videoInfo.height * 0.1}*a:${videoInfo.height * 0.1}[ovrl],[0:v][ovrl]overlay=${locationXY[0]}:${locationXY[1]}`
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
 * @param progressFunc
 * @returns {Promise<unknown>}
 */
export function cutVideo (videoPath, startTime, endTime, outDir, name = null, progressFunc = function (progress) {
  console.log(progress.name + ' Processing: ' + progress.percent + '% done')
}) {
  return new Promise(function (resolve, reject) {
    new Promise(function (resolve, reject) {
      fs.stat(outDir, function (err, stats) {
        if (err || !stats.isDirectory()) {
          fs.mkdirSync(outDir)
        }
      })
      resolve()
    }).then(function () {
      let firstStartTimeStr = secondToTimeStr(0)
      let startTimeStr = secondToTimeStr(startTime)
      let endTimeStr = secondToTimeStr(endTime)
      if (startTime >= 10) {
        firstStartTimeStr = secondToTimeStr(startTime - 10)
        startTimeStr = secondToTimeStr(10)
        endTimeStr = endTime - startTime
      }
      ffmpeg().input(videoPath)
        .setStartTime(firstStartTimeStr)
        .outputOption(['-ss', startTimeStr, '-t', endTimeStr, '-c:v', 'libx264', '-c:a', 'aac', ' -strict', 'experimental'])
        .format('mp4')
        .output(path.join(outDir, name + '.mp4'))
        .on('start', function (commandLine) {
          console.log('Started: ' + commandLine)
        })
        .on('progress', function (progress) {
          progress.name = '剪切视频'
          progressFunc(progress)
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
      reject(new Error(err))
    })
  })
}
export function m3u8ToMp4 (url, filePath, progressFunc = function (progress) {
  console.log(progress.name + ' Processing: ' + progress.percent + '% done')
}) {
  return new Promise((resolve, reject) => {
    // 设置文件的保存路径，此时默认弹出的 save dialog 将被覆盖
    try {
      let stats = fs.statSync(filePath)// 如果文件已存在读取文件信息
      if (stats.size > 100) { // 如果文件已经存在并且已经下载按成则跳过该文件
        resolve(filePath)
      }
    } catch (err) {
    }
    ffmpeg(url)
      .format('mp4')
      .output(filePath)
      .videoCodec('copy')
      .audioCodec('copy')
      .on('start', function (commandLine) {
        console.log('Started: ' + commandLine)
      })
      .on('progress', function (progress) {
        progress.name = 'm3u8转mp4'
        progressFunc(progress)
      })
      .on('error', function (err) {
        console.log('m3u8转mp4发生错误: ' + err.message)
        reject(err)
      })
      .on('end', function () {
        console.log('m3u8转mp4成功')
        resolve(filePath)
      })
      .run()
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
          resolve({
            frames: metadata.streams[0]['nb_frames'],
            height: metadata.streams[0]['height'],
            width: metadata.streams[0]['width'],
            duration: metadata.streams[0]['duration'],
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
    if (!frontPath && !endPath) {
      fs.copyFile(videoPath, saveVideo, function (err) {
        if (err) {
          reject(err)
        } else {
          resolve(saveVideo)
        }
      })
    }
    let duration = 0
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
      })
      .then(() => {
        return new Promise((resolve) => {
          if (frontPath) {
            trans(frontPath, path.join(__dirname, 'frontPath.mp4'), `${width}x${height}`, videoCodec, audioCodec, 60, bitRate, progressFunc)
              .then((res) => {
                frontPath = path.join(__dirname, 'frontPath.mp4')
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
        return new Promise(async (resolve) => {
          let metaData = await getMetaData(videoPath)
          duration = metaData['duration']
          console.log(`duration:${duration}`)
          let query = ffmpeg(videoPath)
          let outputOption = [
            '-acodec',
            'aac',
            '-vcodec',
            'libx264',
            '-filter_complex'
          ]
          if (frontPath) {
            metaData = await getMetaData(frontPath)
            duration += metaData['duration']
            query = query.input(frontPath)
          }
          if (endPath) {
            query = query.input(endPath)
            metaData = await getMetaData(endPath)
            duration += metaData['duration']
          }
          if (frontPath && endPath) {
            outputOption.push('[0:0] [0:1] [1:0] [1:1] [2:0] [2:1] concat=n=3:v=1:a=1 [v] [a]')
          } else {
            outputOption.push('[0:0] [0:1] [1:0] [1:1]  concat=n=2:v=1:a=1 [v] [a]')
          }
          outputOption.push('-map')
          outputOption.push('[v]')
          outputOption.push('-map')
          outputOption.push('[a]')
          query.outputOptions(outputOption).fps(60).on('start', function (commandLine) {
            console.log('Started: ' + commandLine)
          })
            .on('progress', function (progress) {
              progress.name = '拼接视频'
              progress.percent = (timeStrToSecond(progress.timemark) / duration * 100)
              progressFunc(progress)
            })
            .on('error', function (err) {
              console.log('合并视频发生错误: ' + err.message)
              reject(new Error('合并视频发生错误: ' + err.message))
            }).on('end', function () {
              console.log('合并视频成功')
              resolve()
            }).save(saveVideo)
        })
      })
      .then(() => {
        resolve(saveVideo)
      }).catch(error => {
        reject(error)
      })
  })
}
