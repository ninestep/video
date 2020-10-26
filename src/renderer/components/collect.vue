<template>
<div>
  <el-row v-if="videoList.length" :gutter="20" style="margin: 23px" >
    <el-col :xs="8" :sm="6" :md="4" :lg="3" :xl="3" v-for="(o, index) in videoList" :key="index" class="card">
      <el-card :body-style="{ padding: '0px' }" shadow="hover" >
        <div class="card_image">
          <img :src="o.pic" class="image" object>
        </div>
        <div class="card_body">
          <div class="new_status" v-if="o.status==='new'"></div>
          <span class="text">{{ o.name }}</span>
          <div class="bottom clearfix">
            <time class="time text">{{ o.last }}</time>
            <el-button type="text" class="button" @click="showDetail(o)">详情</el-button>
          </div>
        </div>
      </el-card>
    </el-col>
  </el-row>
  <el-drawer
      :title="detail.name"
      :visible.sync="detailShow"
      :destroy-on-close="true"
      direction="rtl">
    <el-card class="box-card el-card-define" style="overflow: auto">
      <img :src="detail.pic" class="image" :alt="detail.name">
      <h1>{{detail.name}}
        <i class="el-icon-star-on star" @click="removeDetail"></i>
      </h1>

      <p>最后更新时间：{{detail.last}}</p>
      <p>演员：{{detail.actor}}</p>
      <p>年份：{{detail.year}}</p>
      <p>区域：{{detail.area}}</p>
      <p>类型：{{detail.type}}</p>
      <p>简介：{{detail.des}}</p>
      <div class="line"></div>
      <el-tabs type="border-card">
        <el-tab-pane v-for="(item,index) in detail.dl" :label="index">
          <el-table
              :data="item"
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
                <el-button type="text" size="small" @click="play(scope.row,item)">播放</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </el-drawer>
</div>
</template>

<script>
import {getVideoList, nedbCount, nedbFind, nedbRemove, nedbUpdate} from '../assets/js/until'

export default {
  name: 'collect',
  data: function () {
    return {
      videoList: [],
      star: false,
      detail: {},
      detailShow: false,
      url: 'https://ya.kongbuya.com/api.php/provide/vod/at/xml'
    }
  },
  mounted () {
    this.getList()
  },
  methods: {
    showDetail: function (item) {
      nedbCount('collect', {id: item.id}).then(res => {
        if (res > 0) {
          this.star = true
        } else {
          this.star = false
        }
        console.log(item)
        this.$set(this, 'detail', item)
        // this.detail = item
        this.detailShow = true
      })
    },
    removeDetail: function () {
      nedbRemove('collect', {id: this.detail.id}).then(res => {
        this.detailShow = false
        this.getList()
      }).catch(err => {
        console.log(err)
      })
    },
    getList: function () {
      nedbFind('collect', {}).then(res => {
        let ids = []
        let idToLast = {}
        for (let i = 0; i < res.length; i++) {
          ids.push(res[i]['id'])
          idToLast[res[i]['id']] = res[i].last
        }
        if (ids.length <= 0) {
          return
        }
        getVideoList(this.url, 0, 0, 0, 0, ids).then(res => {
          this.loading = false
          res.list.forEach((item) => {
            const last = idToLast[item.id]
            if (item.last !== last) {
              nedbUpdate('collect', {id: item.id}, {
                id: item.id,
                name: item.name,
                last: item.last,
                pic: item.pic
              }).then(res => {
                item.status = 'new'
                this.videoList.push(item)
              })
            } else {
              item.status = 'old'
              this.videoList.push(item)
            }
          })
        }).catch(() => {
          this.loading = false
        })
      })
    },
    play: function (item, detail) {
      this.$router.push({name: 'landing-page', params: {item: item, detail: detail}})
    }
  }
}
</script>

<style scoped>

.card {
  position: relative;
  margin-bottom: 20px;
}
.new_status{
  position: absolute;
  right: 2px;
  height: 14px;
  width: 14px;
  background-color: red;
  border-radius: 50%;
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
  position:relative;
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
.loading{
  text-align: center;
}
.line{
  height: 2px;
  margin: 10px;
}
.star{
  color: #E6A23C;
  font-size: 32px;
}
</style>
