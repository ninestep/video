<template>
  <el-container>
  </el-container>
</template>

<script>
import {nedbFind, nedbPage} from '../assets/js/until'
import path from 'path'

export default {
  name: 'videoList',
  mounted () {
    nedbFind('setting', {}).then(res => {
      console.log(res)
      if (res.length <= 0 || !res[0]['savePath']) {
        this.$message.error('请先到配置中心设置切片存储路径，否则无法切片')
      } else {
        this.setting = res[0]
        this.getList()
      }
    })
  },
  data: function () {
    return {
      pageInfo: {
        current_page: 0,
        last_page: 1,
        page_size: 10,
        count: 0
      },
      tableList: [],
      setting: {},
      query: {
        type: 0,
        word: '',
        hour: 0
      }
    }
  },
  methods: {
    getList: function () {
      let page = this.pageInfo.current_page + 1
      nedbPage('videoList', {}, {create_time: -1}, page, this.pageInfo.page_size, path.join(this.setting.savePath, 'videoList')).then(res => {
        console.log(res)
        this.tableList = res.rows
      })
    }
  }
}
</script>

<style scoped>
.header {
  padding: 10px;
}

.card {
  margin-bottom: 20px;
}

.card_image {
  width: 100%;
  height: 200px;
}

.button {
  padding: 0;
  float: right;
}

.card_body {
  position: relative;
  width: 100%;
  height: 100px;
  padding: 14px;
}

.image {
  width: 100%;
  height: auto;
  max-height: 100%;
  object-fit: contain;
}

.time {

  font-size: 13px;
  color: #999;
  bottom: 0;
}

.bottom {
  position: absolute;
  bottom: 14px;
  float: right;
  margin-top: 13px;
  line-height: 12px;
}

.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}

.clearfix:after {
  clear: both
}

.loading {
  text-align: center;
}

.line {
  height: 2px;
  margin: 10px;
}

.star {
  color: #E6A23C;
  font-size: 32px;
}
</style>
