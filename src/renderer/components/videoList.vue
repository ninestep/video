<template>
  <el-container>
    <el-header class="header">
      <el-form ref="form" :inline="true" :model="query" label-width="80px">
        <el-form-item label="栏目">
          <el-cascader
              clearable
              v-model="query.type"
              :options="classList"
              :props="{ expandTrigger: 'hover',value:'type_id',label:'type_name' }"
          ></el-cascader>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="query.word" placeholder="输入搜索关键词"></el-input>
        </el-form-item>
        <el-form-item label="更新时间">
          <el-select v-model="query.hour" clearable placeholder="请选择更新时间">
            <el-option label="不限" :value="0"/>
            <el-option v-for="hour in hourList" :label="hour+'小时'" :value="hour"/>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSubmit">查询</el-button>
        </el-form-item>
      </el-form>
    </el-header>
    <el-main style="overflow:visible" >
      <el-row v-if="videoList.length" :gutter="20"  v-infinite-scroll="getList" :infinite-scroll-disabled="loading" :infinite-scroll-distance="50" >
        <el-col :xs="8" :sm="6" :md="4" :lg="3" :xl="3" v-for="(o, index) in videoList" :key="index" class="card">
          <el-card :body-style="{ padding: '0px' }" shadow="hover" >
            <div class="card_image">
              <img :src="o.pic" class="image" object>
            </div>
            <div class="card_body">
              <span class="text">{{ o.name }}</span>
              <div class="bottom clearfix">
                <time class="time text">{{ o.last }}</time>
                <el-button type="text" class="button" @click="showDetail(o)">详情</el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <div class="loading" v-if="loading">
        <i class="el-icon-loading"></i>
      </div>
      <div class="loading" v-if="pageInfo.last_page<=pageInfo.current_page">
        <p>没有下一页</p>
      </div>
    </el-main>
    <el-drawer
        :title="detail.name"
        :visible.sync="detailShow"
        :destroy-on-close="true"
        direction="rtl">
      <el-card class="box-card el-card-define" style="overflow: auto">
        <img :src="detail.pic" class="image" :alt="detail.name">
        <h1>{{detail.name}}
          <i class="el-icon-star-on star" v-if="star" @click="removeDetail"></i>
          <i class="el-icon-star-off star" v-else @click="addDetail"></i>
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
  </el-container>
</template>

<script>
import {getVideoList, nedbCount, nedbRemove, nedbSave} from '../assets/js/until'

export default {
  name: 'videoList',
  mounted () {
    // getVideoType(this.url).then(res => {
    //   this.classList = res
    // })
    this.getList()
  },
  data: function () {
    return {
      pageInfo: {
        current_page: 0,
        last_page: 1,
        page_size: 10,
        count: 0
      },
      star: false,
      detail: {},
      detailShow: false,
      loading: false,
      hourList: [1, 2, 5, 10, 12, 24, 48, 36],
      url: 'https://ya.kongbuya.com/api.php/provide/vod/at/xml',
      videoList: [],
      classList: [
        {
          'type_id': 1,
          'type_name': '电影',
          'children': [
            {
              'type_id': 6,
              'type_name': '动作片'
            },
            {
              'type_id': 7,
              'type_name': '喜剧片'
            },
            {
              'type_id': 8,
              'type_name': '爱情片'
            },
            {
              'type_id': 9,
              'type_name': '科幻片'
            },
            {
              'type_id': 10,
              'type_name': '恐怖片'
            },
            {
              'type_id': 11,
              'type_name': '剧情片'
            },
            {
              'type_id': 12,
              'type_name': '战争片'
            },
            {
              'type_id': 20,
              'type_name': '悬疑片'
            },
            {
              'type_id': 21,
              'type_name': '冒险片'
            },
            {
              'type_id': 22,
              'type_name': '犯罪片'
            },
            {
              'type_id': 23,
              'type_name': '奇幻片'
            },
            {
              'type_id': 24,
              'type_name': '惊悚片'
            },
            {
              'type_id': 25,
              'type_name': '青春片'
            }, {
              'type_id': 40,
              'type_name': '动画片'
            },
            {
              'type_id': 41,
              'type_name': '纪录片'
            },
            {
              'type_id': 44,
              'type_name': '灾难片'
            },
            {
              'type_id': 45,
              'type_name': '古装片'
            }
          ]
        },
        {
          'type_id': 2,
          'type_name': '电视剧',
          'children': [
            {
              'type_id': 13,
              'type_name': '国产剧'
            },
            {
              'type_id': 14,
              'type_name': '港台剧'
            },
            {
              'type_id': 15,
              'type_name': '日韩剧'
            },
            {
              'type_id': 16,
              'type_name': '欧美剧'
            },
            {
              'type_id': 26,
              'type_name': '泰国剧'
            },
            {
              'type_id': 27,
              'type_name': '海外剧'
            },
            {
              'type_id': 28,
              'type_name': '其他剧'
            }
          ]
        },
        {
          'type_id': 3,
          'type_name': '综艺'
        },
        {
          'type_id': 4,
          'type_name': '动漫'
        },
        {
          'type_id': 42,
          'type_name': '蓝光资源'
        }
      ],
      query: {
        type: 0,
        word: '',
        hour: 0
      }
    }
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
    addDetail: function () {
      nedbSave('collect', {
        id: this.detail.id,
        name: this.detail.name,
        last: this.detail.last,
        pic: this.detail.pic
      }).then(res => {
        this.showDetail(this.detail)
      }).catch(err => {
        console.log(err)
      })
    },
    removeDetail: function () {
      nedbRemove('collect', {id: this.detail.id}).then(res => {
        this.showDetail(this.detail)
      }).catch(err => {
        console.log(err)
      })
    },
    getList: function () {
      /**
       * http://mahuazy.tv/help/api.html
       * ac=videolist
       t=类别ID
       pg=页码
       wd=搜索关键字
       h=几小时内的数据
       * @type {number}
       */
      if (this.loading || this.pageInfo.current_page >= this.pageInfo.last_page) {
        return false
      }
      this.loading = true
      const page = parseInt(this.pageInfo.current_page) + 1
      getVideoList(this.url, page, this.query.type, this.query.word, this.query.hour).then(res => {
        this.pageInfo = res.page
        this.loading = false
        if (page <= 1) {
          this.videoList = res.list
        } else {
          this.videoList = this.videoList.concat(res.list)
        }
      }).catch(() => {
        this.pageInfo.current_page++
        this.loading = false
      })
    },
    onSubmit: function () {
      this.pageInfo = {
        current_page: 0,
        last_page: 1,
        page_size: 10,
        count: 0
      }
      this.videoList = []
      this.getList()
    },
    play: function (item, detail) {
      this.$router.push({name: 'landing-page', params: {item: item, detail: detail}})
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
