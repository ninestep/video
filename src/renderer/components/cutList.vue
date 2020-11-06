<template>
<div>
  <el-table
      ref="table"
      :data="tableList"
      v-loading="loading"
      row-key="_id"
      style="width: 100%">
    <el-table-column type="expand">
      <template slot-scope="props" v-if="props.row.progress">
        <el-row :gutter="10">
         <el-col :span="20"><el-progress :percentage="props.row.progress.percent" :format="format"/></el-col>
         <el-col :span="4">{{props.row.progress.name}}</el-col>
        </el-row>
      </template>
    </el-table-column>
    <el-table-column
        prop="title"
        label="影片名"/>
    <el-table-column
        prop="name"
        label="片段名"/>
    <el-table-column
        prop="startTime"
        label="开始时间点">
      <template slot-scope="scope">
        {{secondToTimeStr(scope.row.startTime)}}
      </template>
    </el-table-column>
    <el-table-column
        prop="startTime"
        label="发布类型">
      <template slot-scope="scope">
        <el-select v-model="sendType" placeholder="请选择" value-key="name">
          <el-option
              v-for="(item,index) in setting.release"
              :key="index"
              :label="item.name"
              :value="{front:item.front,end:item.end,watermark:item.watermark,name:item.name}">
          </el-option>
        </el-select>
      </template>
    </el-table-column>
    <el-table-column
        prop="endTime"
        label="结束时间点">
      <template slot-scope="scope">
        {{secondToTimeStr(scope.row.endTime)}}
      </template>
    </el-table-column>
    <el-table-column
        label="操作"
    >
      <template slot-scope="scope">
        <el-button type="primary" @click="conact(scope.row)">发布</el-button>
        <el-button type="danger">删除</el-button>
      </template>
    </el-table-column>
  </el-table>
  <el-pagination
      class="page"
      background
      layout="prev, pager, next"
      :total="pageInfo.last_page">
  </el-pagination>
</div>
</template>

<script>
import {nedbFind, nedbPage} from '../assets/js/until'
import path from 'path'
import {conactVideo, secondToTimeStr} from '../../main/ffmpeg-helper'

export default {
  name: 'cutList',
  mounted () {
    nedbFind('setting', {}).then(res => {
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
      sendType: '',
      loading: '',
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
    secondToTimeStr,
    format: function (percentage) {
      return percentage.toFixed(2)
    },
    conact: function (row) {
      this.loading = true
      conactVideo(row.path,
        this.setting.savePath,
        this.sendType.front,
        this.sendType.end,
        this.sendType.watermark, 'rt', (progress) => {
          this.$refs.table.toggleRowExpansion(row, true)
          this.$set(row, 'progress', progress)
        }
      ).then(() => {
        this.$refs.table.toggleRowExpansion(row, false)
        this.loading = false
      })
    },
    showDetail: function () {},
    getList: function () {
      let page = this.pageInfo.current_page + 1
      nedbPage('videoList', {}, {create_time: -1}, page, this.pageInfo.page_size, path.join(this.setting.savePath, 'videoList')).then(res => {
        this.tableList = res.rows
      })
    }
  }
}
</script>

<style>
.page{
  float: right;
}
</style>
