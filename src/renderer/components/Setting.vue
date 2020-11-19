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

    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span>其他配置</span>
        <el-button v-if="editStatus"  style="float: right;" type="success" @click="saveSetting">保存</el-button>
        <el-button v-else style="float: right;" type="success" @click="setEditStatus">编辑</el-button>
      </div>
      <el-form ref="form" :model="form" label-width="180px">
        <el-form-item label="切片存储路径">
          <el-input placeholder="请选择切片存储路径" :disabled="!editStatus" v-model="form.savePath">
            <el-button type="primary" slot="append" @click="chooseDir('savePath',-1)" :disabled="!editStatus">选择</el-button>
          </el-input>
        </el-form-item>
        <el-form-item label="发布配置">
          <el-tabs type="border-card">
            <el-tab-pane v-for="(type,index) in form.release" :key="index" :label="type.name">
                <el-form-item label="片头路径">
                  <el-input placeholder="请选择片头路径" clearable :disabled="!editStatus" v-model="type.front">
                    <el-button type="primary" slot="append" @click="chooseFile('release',index,'front')" :disabled="!editStatus">选择</el-button>
                  </el-input>
                </el-form-item>
                <el-form-item label="片尾路径">
                  <el-input placeholder="请选择片尾路径" clearable :disabled="!editStatus" v-model="type.end">
                    <el-button type="primary" slot="append" @click="chooseFile('release',index,'end')" :disabled="!editStatus">选择</el-button>
                  </el-input>
                </el-form-item>
                <el-form-item label="水印路径">
                  <el-input placeholder="请选择水印路径" clearable :disabled="!editStatus" v-model="type.watermark">
                    <el-button type="primary" slot="append" @click="chooseFile('release',index,'watermark',[
                          { name: '水印', extensions: ['jpg','png','bmp'] }
                        ])" :disabled="!editStatus">选择</el-button>
                  </el-input>
                </el-form-item>
                <el-form-item label="保存路径">
                  <el-input placeholder="请选择保存路径" :disabled="!editStatus" v-model="type.savePath">
                    <el-button type="primary" slot="append" @click="chooseDir('release',index,'savePath')" :disabled="!editStatus">选择</el-button>
                  </el-input>
                </el-form-item>
            </el-tab-pane>
          </el-tabs>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import {readJson} from '../assets/js/until'
import {nedbCount, nedbFind, nedbRemove, nedbSave, nedbUpdate} from '../assets/js/nedb'
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
      form: {
        savePath: '',
        release: [
          {
            type: 'toutiao',
            name: '头条'
          },
          {
            type: 'douyin',
            name: '抖音'
          },
          {
            type: 'xigua',
            name: '西瓜'
          }
        ]
      },
      editStatus: false,
      tableData: []
    }
  },
  mounted () {
    this.getSource()
    nedbFind('setting', {}).then(res => {
      if (res.length > 0) {
        this.form = res[0]
        console.log(this.form)
        if (this.form.release === undefined || this.form.release.length <= 0) {
          this.form.release = [
            {
              type: 'toutiao',
              name: '头条'
            },
            {
              type: 'douyin',
              name: '抖音'
            },

            {
              type: 'xigua',
              name: '西瓜'
            }
          ]
        }
      }
    })
  },
  methods: {
    changeType: function (tab, event) {
      console.log(tab, event)
    },
    chooseFile: function (item, index = -1, key = '', args = [
      { name: '视频', extensions: ['mp4'] }
    ]) {
      let _ = this
      ipc.once('selected-file', function (event, path) {
        if (path.filePaths.length >= 1) {
          if (index === -1) {
            _.$set(_['form'], item, path.filePaths[0])
          } else {
            _.$set(_['form'][item][index], key, path.filePaths[0])
          }
        }
      })
      ipc.send('open-file-dialog', args)
    },
    chooseDir: function (item, index = -1, key = '') {
      let _ = this
      ipc.once('selected-directory', function (event, path) {
        if (path.filePaths.length >= 1) {
          if (index === -1) {
            _.$set(_['form'], item, path.filePaths[0])
          } else {
            _.$set(_['form'][item][index], key, path.filePaths[0])
          }
        }
      })
      ipc.send('open-dir-dialog')
    },
    setEditStatus: function () {
      this.editStatus = true
    },
    saveSetting: function () {
      if (this.form._id) {
        const _id = this.form._id
        delete this.form._id
        nedbUpdate('setting', {_id: _id}, this.form).then(res => {
          this.editStatus = false
        }).catch((err) => {
          this.$message.error(err)
        })
      } else {
        nedbSave('setting', this.form).then(res => {
          this.editStatus = false
        }).catch((err) => {
          this.$message.error(err)
        })
      }
    },
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
.box-card{
  margin-bottom: 20px;
}
</style>
