<template>
  <div>
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span>源配置</span>
        <el-button style="float: right;" type="success" @click="showSource">增加</el-button>
        <el-button style="float: right;margin-right: 10px" type="primary" @click="importSource">导入</el-button>
      </div>
      <el-table
          :data="tableData"
          style="width: 100%">
        <el-table-column
            prop="name"
            label="名字">
        </el-table-column>
        <el-table-column
            prop="url"
            label="地址">
        </el-table-column>
        <el-table-column
            prop="all"
            sortable="true"
            label="总次数">
        </el-table-column>
        <el-table-column
            prop="success"
            sortable="true"
            label="成功次数">
        </el-table-column>
        <el-table-column
            prop="success"
            sortable="true"
            label="成功率">
          <template slot-scope="scope">
            {{((scope.row.success/scope.row.all)*100).toFixed(2)}}%
          </template>
        </el-table-column>
        <el-table-column
            label="操作">
          <template slot-scope="scope">
            <el-popconfirm
                title="确定删除此源？"
                @onConfirm="delSource(scope.row)"
            >
              <el-button slot="reference" type="danger" size="small">删除</el-button>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-drawer
        title="修改源"
        :visible.sync="sourceDrawer"
        direction="rtl">
      <el-card class="box-card">
        <div slot="header" class="clearfix" style="text-align: right">
          <el-button type="success" @click="saveSource">确定</el-button>
        </div>
        <el-form ref="sourceForm" :model="sourceForm" label-width="80px">
            <el-form-item label="名字" prop="name" :rules="[{ required: true, message: '请输入源网站名字', trigger: 'blur' },]">
              <el-input v-model="sourceForm.name" placeholder="请输入源网站名字"></el-input>
            </el-form-item>
            <el-form-item label="网址" prop="url" :rules="[{ required: true, message: '请输入源网站地址', trigger: 'blur' },]">
              <el-input v-model="sourceForm.url" placeholder="请输入源网站地址"></el-input>
            </el-form-item>
        </el-form>
      </el-card>
    </el-drawer>
  </div>
</template>

<script>
import {nedbCount, nedbFind, nedbRemove, nedbSave, readJson} from '../assets/js/until'
import path from 'path'
const ipc = require('electron').ipcRenderer
export default {
  name: 'Setting',
  data: function () {
    return {
      sourceDrawer: false,
      sourceForm: {
        name: '',
        url: '',
        method: 'get'
      },
      tableData: []
    }
  },
  mounted () {
    this.getSource()
  },
  methods: {
    getSource: function () {
      nedbFind('source', {}).then(res => {
        this.tableData = res
      }).catch(err => {
        console.log(err)
      })
    },
    showSource: function () {
      this.sourceDrawer = true
    },
    importSource: function () {
      let _ = this
      ipc.on('selected-file', function (event, param) {
        if (param.length > 0) {
          const pathInfo = path.parse(param[0])
          readJson(pathInfo.base, pathInfo.dir).then(res => {
            res.forEach((item, index) => {
              _.addSource++
              nedbCount('source', {url: item.url}).then(res => {
                if (res <= 0) {
                  nedbSave('source', {
                    name: item.name,
                    url: item.url,
                    all: 0,
                    success: 0
                  }).then(() => {
                    _.getSource()
                  })
                }
              })
            })
          })
        }
      })
      ipc.send('open-file-dialog', [
        { name: 'json', extensions: ['json'] }
      ]
      )
    },
    saveSource: function () {
      this.$refs.sourceForm.validate((valid) => {
        if (valid) {
          nedbSave('source', {
            name: this.sourceForm.name,
            url: this.sourceForm.url
          }).then(() => {
            this.tableData.push({
              name: this.sourceForm.name,
              url: this.sourceForm.url,
              all: 0,
              success: 0
            })

            this.sourceDrawer = false
            this.sourceForm = {
              name: '',
              url: ''
            }
          }).catch((err) => {
            console.log(err)
          })
        } else {
          return false
        }
      })
    },
    delSource: function (row) {
      console.log(row)
      nedbRemove('source', {_id: row._id}).then(() => {
        this.getSource()
      })
    }
  }
}
</script>

<style scoped>

</style>
