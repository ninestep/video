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
              :value="{front:item.front,end:item.end,watermark:item.watermark,name:item.name,savePath:item.savePath,type:item.type}">
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

        <el-popconfirm
            title="确定删除此片段？"
            @onConfirm="del(scope.row)"
        >
          <el-button slot="reference" type="danger" >删除</el-button>
        </el-popconfirm>
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
      title="进度"
      :visible="loading"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      width="30%">
    <el-input
        type="textarea"
        id="scroll_text"
        :rows="10"
        :disabled="true"
        placeholder="日志内容"
        v-model="log_text">
    </el-input>
  </el-dialog>
</div>
</template>

<script>
import {nedbFind, nedbPage, nedbRemove} from '../assets/js/nedb'
import path from 'path'
import {conactVideo, secondToTimeStr, water} from '../../main/ffmpeg-helper'
import {xigua} from '../drive/xigua'

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
  computed: {
    log_text: function () {
      this.$nextTick(() => {
        setTimeout(() => {
          const textarea = document.getElementById('scroll_text')
          textarea.scrollTop = textarea.scrollHeight
        }, 13)
      })
      return this.logs.join('\n')
    }
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
      step: 1,
      plan: {},
      logs: [],
      query: {
        type: 0,
        word: '',
        hour: 0
      }
    }
  },
  methods: {
    xigua,
    secondToTimeStr,
    del: function (row) {
      nedbRemove('videoList', {_id: row._id}, path.join(this.setting.savePath, 'videoList')).then(res => {
        const index = this.tableList.indexOf(row)
        this.tableList.splice(index, 1)
      })
    },
    format: function (percentage) {
      return percentage.toFixed(2)
    },
    conact: function (row) {
      this.loading = true
      conactVideo(row.path,
        this.sendType.savePath,
        this.sendType.front,
        this.sendType.end, (progress) => {
          this.logs.push(`正在${progress.name},进度${progress.percent}%`)
        }
      ).then((res) => {
        return new Promise((resolve, reject) => {
          if (this.sendType.watermark) {
            water(res, res, this.sendType.watermark, 'rt', (progress) => {
              this.logs.push(`正在${progress.name},进度${progress.percent}%`)
            }).then((res) => {
              resolve(res)
            }).catch(error => {
              reject(error)
            })
          } else {
            resolve(res)
          }
        })
      }).then((res) => {
        return new Promise((resolve, reject) => {
          switch (this.sendType.type) {
            case 'xigua':xigua(res, `${row.title}~${row.name}`, row.desc, (event) => {
              this.logs.push(event)
            }).then(() => {
              resolve()
            }).catch((err) => {
              reject(err)
            }); break
            default:
              resolve()
          }
        })
      })
        .then(() => {
          this.loading = false
        }).catch((err) => {
          console.log(err)
          this.$message.error('失败:' + err)
          this.loading = false
        }).finally(() => {
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
