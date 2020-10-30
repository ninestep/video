<template>
  <div id="wrapper" >
    <el-row type="flex" justify="center" >
      <el-col :span="18">
        <div class="video">
          <video
              id="video-container"
              class="video-js vjs-default-skin"
              controls
              preload="auto"
              style="height: 100%;width: 100%"
          >
          </video>
        </div>
      </el-col>
      <el-col :span="6">
        <el-card class="box-card" body-style="overflow: auto;height:100%;padding:0">
          <div class="box">
            <el-tabs type="border-card">
              <el-tab-pane label="源解析">
                <el-form ref="form" :model="form">
                      <el-form-item label="网址">
                        <el-input v-model="form.source" placeholder="请输入网址">
                          <el-button :loading="sourceLoading!==0" slot="append" icon="el-icon-search" type="primary" @click="search"></el-button>
                        </el-input>
                      </el-form-item>
                </el-form>
                <el-alert v-if="form.name"
                    :title="`正在播放《${form.name}》`"
                    type="success">
                </el-alert>
                <el-tabs type="border-card">
                  <el-tab-pane label="解析">
                    <el-table
                        :data="tableData"
                        :loading="sourceLoading"
                        style="width: 100%">
                      <el-table-column
                          prop="name"
                          label="名字">
                      </el-table-column>

                      <el-table-column
                          label="状态">
                        <template slot-scope="scope">
                          <i v-if="scope.row.status === 'loading'" class="el-icon-loading" style="color: #E6A23C"></i>
                          <i v-else-if="scope.row.status === 'success'" class="el-icon-success" style="color: #67C23A"></i>
                          <i v-else-if="scope.row.status === 'fail'" class="el-icon-error" style="color: #F56C6C"></i>
                          <i v-else class="el-icon-time" style="color: #409EFF"></i>
                        </template>
                      </el-table-column>
                      <el-table-column
                          fixed="right"
                          label="操作">
                        <template slot-scope="scope">
                          <el-button
                              v-if="scope.row.status==='success'"
                              :disabled="scope.row.m3u8===source"
                              @click="play(scope.row)"
                              type="text" size="small">播放</el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </el-tab-pane>
                  <el-tab-pane label="剧集"  v-if="detail.length>0">
                    <el-table
                        :data="detail"
                        style="width: 100%">
                      <el-table-column
                          prop="index"
                          label="#"
                          sortable/>
                      <el-table-column
                          prop="name"
                          label="剧集">
                      </el-table-column>
                      <el-table-column
                          fixed="right"
                          label="操作">
                        <template slot-scope="scope">
                          <el-button type="text" :disabled="form.source===scope.row.url||sourceLoading>0" size="small" @click="dlPlay(scope.row)">播放</el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </el-tab-pane>
                </el-tabs>
              </el-tab-pane>
              <el-tab-pane label="剪辑">

                <el-card class="box-card" style="padding: 0;margin-top: 20px">
                  <div slot="header" class="clearfix">
                    <span>时间</span>
                  </div>
                  <el-row :gutter="10">
                    <el-col :span="8">开始时间</el-col>
                    <el-col :span="8">结束时间</el-col>
                    <el-col :span="8">持续时间</el-col>
                    <el-col :span="8">{{ start_time }}</el-col>
                    <el-col :span="8">{{ list_form.end_time }}</el-col>
                    <el-col :span="8">{{current_time}}</el-col>
                  </el-row>
                </el-card>
                <el-card class="box-card" style="padding: 0;margin-top: 20px">
                  <div slot="header" class="clearfix">
                    <span>截断片段</span>
                  </div>
                  <el-table
                      :data="cutData"
                      style="width: 100%">
                    <el-table-column
                        label="状态">
                      <template slot-scope="scope">
                        <i v-if="scope.row.status === 'wait'" class="el-icon-time" style="color: #409EFF"></i>
                        <i v-if="scope.row.status === 'loading'" class="el-icon-loading" style="color: #E6A23C"></i>
                        <i v-if="scope.row.status === 'success'" class="el-icon-success" style="color: #67C23A"></i>
                        <i v-if="scope.row.status === 'fail'" class="el-icon-error" style="color: #F56C6C"></i>
                      </template>
                    </el-table-column>
                    <el-table-column
                        prop="start_time"
                        label="开">
                    </el-table-column>
                    <el-table-column
                        prop="end_time"
                        label="止">
                    </el-table-column>
                    <el-table-column
                        prop="name"
                        label="名">
                    </el-table-column>
                    <el-table-column
                        fixed="right"
                        label="操">
                      <template slot-scope="scope">
                        <el-button @click="del(scope.row)" type="danger" size="mini" circle icon="el-icon-delete"></el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </el-card>
              </el-tab-pane>
              <el-tab-pane label="输出">

                <el-card class="box-card" style="padding: 0;margin-top: 20px">
                  <el-form ref="cut_form" :model="form" :rules="{
                    title:[{ required: true, message: '请输入视频标题', trigger: 'blur' }],
                    desc:[{ required: true, message: '请输入视频简介', trigger: 'blur' }]
                  }" >
                    <el-form-item label="标题" prop="title">
                      <el-input v-model="form.title" placeholder="请输入视频标题">
                      </el-input>
                    </el-form-item>
                    <el-form-item label="简介" prop="desc">
                      <el-input
                          v-model="form.desc"
                                type="textarea"
                                :rows="2"
                          placeholder="请输入视频简介">
                      </el-input>
                    </el-form-item>
                    <el-form-item label="关键词">
                      <el-input
                          v-model="form.tags"
                          placeholder="请输入视频关键词用‘,’号分割">
                      </el-input>
                    </el-form-item>
                  </el-form>
                </el-card>
                <el-card class="box-card" style="padding: 0;margin-top: 20px">
                  <div slot="header" class="clearfix">
                    <span>截断片段</span>
                    <el-button style="float: right; padding: 3px 0" type="text" @click="cut">切割</el-button>
                  </div>
                  <el-table
                      :data="cutData"
                      style="width: 100%">
                    <el-table-column
                        label="状态">
                      <template slot-scope="scope">
                        <i v-if="scope.row.status === 'wait'" class="el-icon-time" style="color: #409EFF"></i>
                        <i v-if="scope.row.status === 'loading'" class="el-icon-loading" style="color: #E6A23C"></i>
                        <i v-if="scope.row.status === 'success'" class="el-icon-success" style="color: #67C23A"></i>
                        <i v-if="scope.row.status === 'fail'" class="el-icon-error" style="color: #F56C6C"></i>
                      </template>
                    </el-table-column>
                    <el-table-column
                        prop="start_time"
                        label="开">
                    </el-table-column>
                    <el-table-column
                        prop="end_time"
                        label="止">
                    </el-table-column>
                    <el-table-column
                        prop="name"
                        label="名">
                    </el-table-column>
                    <el-table-column
                        fixed="right"
                        label="操">
                      <template slot-scope="scope">
                        <el-button @click="del(scope.row)" type="danger" size="mini" circle icon="el-icon-delete"></el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </el-card>

              </el-tab-pane>
            </el-tabs>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import videojs from 'video.js'
import 'videojs-contrib-hls'
import 'video.js/dist/video-js.css'
import '../assets/js/StreamPlayTech.js'
import {cutVideo, secondToTimeStr, videoSupport} from '../../main/ffmpeg-helper'
import {nedbFind, nedbSave, nedbUpdate} from '../assets/js/until'
import VideoServer from '../../main/VideoServer'
import path from 'path'

const ipc = require('electron').ipcRenderer
// import {readJson} from '../assets/js/until'
export default {
  name: 'landing-page',
  components: {
    videojs
  },
  data: function () {
    return {
      form: {
        source: '',
        export: '',
        name: '',
        title: '',
        desc: '',
        tags: ''
      },
      replay: false,
      source: '',
      list_form: {
        start_time: 0,
        end_time: 0
      },
      setting: {},
      sourceLoading: 0,
      height: 500,
      current_time: 0,
      tableData: [],
      cutData: [],
      timer: null,
      detail: [],
      player: null,
      httpServer: null,
      videoSiteList: [
        'iqiyi.com',
        'mgtv.com',
        'pptv.com',
        'qq.com',
        'sohu.com',
        'le.com',
        'miguvideo.com',
        'fun.tv',
        'youku.com'
      ]
    }
  },
  computed: {
    start_time: function () {
      return secondToTimeStr(this.list_form.start_time)
    }
  },
  destroyed () {
    clearInterval(this.timer)
    this.player.dispose()
  },
  async mounted () {
    nedbFind('setting', {}).then(res => {
      if (res.length <= 0 || !res[0]['savePath']) {
        this.$message.error('请先到配置中心设置切片存储路径，否则无法切片')
      } else {
        this.setting = res[0]
      }
    })
    if (this.$route.params.detail) {
      this.detail = this.$route.params.detail
    }
    if (this.$route.params.info) {
      this.form.title = this.$route.params.info.name
      this.form.desc = this.$route.params.info.des
    }
    await this.getVideo()
    let _ = this
    if (this.$route.params.item) {
      this.dlPlay(this.$route.params.item)
    }
    ipc.on('resize', function () {
      const vid = document.getElementById('my-video')
      if (vid) {
        const size = _.getWindowSize()
        // vid.style.width = width + 'px'
        vid.style.height = size[1] + 'px'
        this.height = size[1] + 'px'
      }
    })
  },
  methods: {
    getSource: function () {
      return new Promise((resolve, reject) => {
        nedbFind('source', {}, {success: -1, all: 1}).then(res => {
          if (res.length <= 0) {
            this.$message.error('解析源为空，请添加后重试')
            reject(new Error('解析源为空，请添加后重试'))
          }
          this.tableData = res
          resolve(res)
        }).catch(err => {
          reject(err)
        })
      })
    },
    play: function (item) {
      console.log(item)
      try {
        this.source = item.m3u8
        if (item.playType) {
          this.type = item.playType
          this.player.src({src: item.m3u8, type: item.playType})
        } else {
          this.player.src({src: item.m3u8})
        }
        this.player.play()
      } catch (e) {
        console.log(e)
      }
    },
    async dlPlay (item) {
      this.form.source = item.url
      this.form.name = item.name
      this.relpay = true
      this.search()
    },
    isVideoSite: function (url) {
      for (const domain of this.videoSiteList) {
        if (url.indexOf(domain) >= 0) {
          return true
        }
      }
      return false
    },
    search () {
      if (this.isVideoSite(this.form.source.toLowerCase())) {
        let _ = this
        this.getSource().then(async () => {
          this.sourceLoading += 1
          this.tableData.forEach((item, index) => {
            this.$set(item, 'status', 'loading')
            this.$http.get(item.url + this.form.source).then(res => {
              if (res.data.url) {
                _.$set(item, 'status', 'success')
                _.$set(item, 'm3u8', res.data.url)
                if (_.player.readyState() === 0 || _.replay) {
                  _.replay = false
                  _.play(item)
                }
                nedbUpdate('source', {'_id': item['_id']}, {all: item.all + 1, success: item.success + 1})
              } else {
                _.$set(item, 'status', 'fail')
                nedbUpdate('source', {'_id': item['_id']}, {all: item.all + 1})
              }
            })
          })
        }).catch(() => {
          this.$message.error('解析网站读取失败')
        }).finally(() => {
          this.sourceLoading = 0
        })
      } else {
        this.play({
          m3u8: this.form.source
        })
      }
    },
    async getVideo () {
      let _ = this
      if (this.player !== null) {
        return false
      }
      const vid = document.getElementById('video-container')
      if (vid) {
        const size = _.getWindowSize()
        // vid.style.width = width + 'px'
        vid.style.height = size[1] - 60 + 'px'
        this.height = size[1] + 'px'
      }
      this.player = videojs(
        'video-container',
        {
          bigPlayButton: false,
          textTrackDisplay: false,
          posterImage: true,
          errorDisplay: false,
          controlBar: true,
          playbackRates: [0.5, 1, 1.5, 2, 3]
        },
        function () {
          document.onkeydown = (event) => {
            if (event.code === 'KeyZ') {
              if (_.player) {
                if (_.player.paused()) {
                  _.player.play()
                } else {
                  _.player.pause()
                }
              }
              return false
            }
            if (event.code === 'KeyC') {
              const time = _.player.currentTime()
              const time1 = _.player.currentTime()
              if (_.list_form.start_time === 0) {
                _.list_form.start_time = time
              } else {
                const startTime = _.list_form.start_time
                _.list_form.end_time = time
                _.$prompt('请输入名字', '提示', {
                  confirmButtonText: '确定',
                  cancelButtonText: '取消'
                }).then(({ value }) => {
                  _.cutData.push({
                    start_time: startTime,
                    end_time: time,
                    name: value,
                    status: 'wait'
                  })
                }).catch(() => {
                  _.$message({
                    type: 'info',
                    message: '取消输入'
                  })
                })
                _.list_form = {
                  start_time: time1,
                  end_time: 0
                }
              }
            }
          }
          this.on('playing', function () {
            if (_.timer !== null) {
              clearInterval(_.timer)
            }
            _.timer = setInterval(function () {
              const currentTime = _.player.currentTime()
              _.current_time = secondToTimeStr(parseInt((currentTime - _.list_form.start_time + '')))
              _.list_form.end_time = secondToTimeStr(currentTime)
            }, 100)
          })
          this.on('pause', function () {
            clearInterval(_.timer)
          })
          this.on('ended', function () {
            clearInterval(_.timer)
          })
          this.on('error', function () {
            _.player.pause()
            if (!_.type) {
              _.play({m3u8: _.source, playType: 'video/mp4'})
            } else if (_.type === 'video/mp4') {
              _.play({m3u8: _.source, playType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'})
            } else if (_.type === 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"') {
              _.play({m3u8: _.source, playType: 'application/x-mpegURL'})
            } else {
              videoSupport(_.source).then((checkResult) => {
                if (!checkResult.videoCodecSupport || !checkResult.audioCodecSupport) {
                  if (!_.httpServer) {
                    _.httpServer = new VideoServer()
                  }
                  _.httpServer.videoSourceInfo = { videoSourcePath: _.source, checkResult: checkResult }
                  _.httpServer.createServer()
                  console.log('createVideoServer success')
                  let playParams = {}
                  playParams.type = 'stream'
                  playParams.videoSource = 'http://127.0.0.1:8888?startTime=0'
                  playParams.duration = checkResult.duration
                  _.play({m3u8: 'http://127.0.0.1:8888?startTime=0', playType: 'video/mp4'})
                }
              })
            }
          })
        }
      )
    },
    getWindowSize: function () {
      const { offsetWidth, offsetHeight } = document.documentElement
      const { innerHeight } = window // innerHeight will be blank in Windows system
      return [
        offsetWidth,
        innerHeight > offsetHeight ? offsetHeight : innerHeight
      ]
    },
    cut: function () {
      this.$refs['cut_form'].validate((valid) => {
        if (valid) {
          this.cutData.forEach((item) => {
            if (item.status === 'wait') {
              item.status = 'loading'
              cutVideo(this.source, item.start_time, item.end_time, path.join(this.setting.savePath, this.form.title), item.name)
                .then(res => {
                  nedbSave('videoList', {
                    title: this.form.title,
                    name: item.name,
                    startTime: item.start_time,
                    endTime: item.end_time,
                    desc: this.form.desc,
                    tags: this.form.tags,
                    path: path.join(this.setting.savePath, this.form.title, item.name, '.mp4'),
                    create_time: Date.parse(new Date())
                  }, path.join(this.setting.savePath, 'videoList'))
                  item.status = 'success'
                }).catch((e) => {
                  item.status = 'fail'
                })
            }
          })
        } else {
          return false
        }
      })
    },
    chooseDir: function () {
      ipc.send('open-dir-dialog')
    },
    del: function (item) {
      const index = this.tableData.indexOf(item)
      this.tableData.splice(index, 1)
    }
  }
}
</script>

<style>
  @import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro');
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body { font-family: 'Source Sans Pro', sans-serif; }

</style>
