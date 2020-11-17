<template>
<div>
  <el-table
      ref="table"
      :data="tableList"
      v-loading="loading"
      row-key="_id"
      style="width: 100%">
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
              :value="{front:item.front,end:item.end,watermark:item.watermark,name:item.name,savePath:item.savePath}">
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
  <el-dialog
      title="提示"
      :visible="loading"
      width="30%">
        <el-row :gutter="10">
          <el-col :span="20"><el-progress :percentage="plan.percent" :format="format"/></el-col>
          <el-col :span="4">{{plan.name}}</el-col>
        </el-row>
  </el-dialog>
</div>
</template>

<script>
import {nedbFind, nedbPage} from '../assets/js/until'
import path from 'path'
import {conactVideo, secondToTimeStr, water} from '../../main/ffmpeg-helper'

export default {
  name: 'cutList',
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
      sendType: {},
      loading: false,
      tableList: [],
      setting: {},
      plan: {},
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
        this.sendType.savePath,
        this.sendType.front,
        this.sendType.end, (progress) => {
          this.plan = progress
        }
      ).then((res) => {
        if (this.sendType.watermark) {
          water(res, res, this.sendType.watermark, 'rt', (progress) => {
            this.plan = progress
          }).then((res) => {
            this.loading = false
          })
        } else {
          this.loading = false
        }
      }).catch((err) => {
        console.log(err)
        this.$message.error('失败:' + err)
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
