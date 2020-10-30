<template>
  <div id="app">
    <el-container  style="height: 100vh;width: 100vw">
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
    </el-container>

  </div>
</template>

<script>
  import {importDefault} from './assets/js/until'

  export default {
    name: 'video_edit',
    data: function () {
      return {
        mainStyle: {
        }
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
    },
    methods: {

      getWindowSize: function () {
        const { offsetWidth, offsetHeight } = document.documentElement
        const { innerHeight } = window // innerHeight will be blank in Windows system
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
  /* CSS */
  .app-header{
    padding: 0;
  }
  /*1.显示滚动条：当内容超出容器的时候，可以拖动：*/
  .el-drawer__body {
    overflow: auto;
    /* overflow-x: auto; */
  }

  /*2.隐藏滚动条，太丑了*/
  .el-drawer__container ::-webkit-scrollbar{
    display: none;
  }
  .main{
    height: calc(100vh-60px);
    padding: 0;
  }
</style>
