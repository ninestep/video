<template>
  <div id="app">
    <el-container style="height: 100vh;width: 100vw">
      <el-header style="padding: 0">
        <el-menu
            :default-active="default_active"
            @select="handleSelect"
            class="el-menu"
            mode="horizontal"
            background-color="#545c64"
            text-color="#fff"
            active-text-color="#ffd04b">
          <el-menu-item index="/">视频列表</el-menu-item>
          <el-menu-item index="/collect">收藏夹</el-menu-item>
          <el-menu-item index="/landing">处理中心</el-menu-item>
          <el-menu-item index="/cutList">切片列表</el-menu-item>
          <el-menu-item index="/setting">配置中心</el-menu-item>
        </el-menu>
      </el-header>
      <el-main class="main" ref="main" style="padding: 0">
        <router-view></router-view>
      </el-main>
      <el-footer>
        <el-progress class="update_progress" :text-inside="true" :stroke-width="26" :percentage="percent"
                     v-if="close===false"></el-progress>
      </el-footer>
    </el-container>
    <el-dialog
        :title="versionInfo.version"
        :visible.sync="dialogVisible"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        :show-close="false"
        width="30%">
      <div class="update_info">
        <span v-html="versionInfo.releaseNotes"></span>
      </div>
      <span slot="footer" class="update_footer" v-if="close">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="downloadUpdate">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {importDefault} from './assets/js/until'
import {ipcRenderer} from 'electron'

export default {
  name: 'video_edit',
  data: function () {
    return {
      ipc: ipcRenderer,
      dialogVisible: false,
      close: true,
      percent: 0,
      versionInfo: {},
      mainStyle: {}
    }
  },
  computed: {
    default_active: function () {
      return this.$route.path
    }
  },
  mounted: function () {
    importDefault()
    const [width, height] = this.getWindowSize()
    this.$set(this.mainStyle, 'width', width)
    this.$set(this.mainStyle, 'height', height)
    this.ipc.on('update', (event, args) => {
      this.$notify.closeAll()
      switch (args.type) {
        case 'checking':
          this.$notify.info('正在检查更新')
          break
        case 'not-available':
          this.$notify.info('没有更新')
          break
        case 'available':
          this.versionInfo = args.info
          this.$notify.info('有更新')
          this.dialogVisible = true
          break
        case 'download-progress':
          this.percent = args.info.percent.toFixed(2)
          break
        case 'error':
          this.dialogVisible = false
          this.$notify.error('更新失败，请稍后重试')
          break
      }
    })
    this.ipc.send('update')
  },
  methods: {
    downloadUpdate: function () {
      this.ipc.send('download-update')
      this.close = false
      this.dialogVisible = false
      this.$notify.info('开始下载，请关注底部进度条')
    },
    getWindowSize: function () {
      const {offsetWidth, offsetHeight} = document.documentElement
      const {innerHeight} = window // innerHeight will be blank in Windows system
      return [
        offsetWidth,
        innerHeight > offsetHeight ? offsetHeight : innerHeight
      ]
    },
    handleSelect: function (e) {
      this.$router.push(e)
    }
  }
}
</script>

<style>
.update_info {
  padding: 32px;
}

.update_progress {
  padding-top: 30px;
}

/* CSS */
.app-header {
  padding: 0;
}

/*1.显示滚动条：当内容超出容器的时候，可以拖动：*/
.el-drawer__body {
  overflow: auto;
  /* overflow-x: auto; */
}

/*2.隐藏滚动条，太丑了*/
.el-drawer__container ::-webkit-scrollbar {
  display: none;
}

.main {
  height: calc(100 vh-60px);
  padding: 0;
}
</style>
