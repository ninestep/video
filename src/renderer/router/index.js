import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'video',
      component: require('@/components/videoList').default
    },
    {
      path: '/collect',
      name: 'collect',
      component: require('@/components/collect').default
    },
    {
      path: '/landing',
      name: 'landing-page',
      component: require('@/components/LandingPage').default
    },
    {
      path: '/setting',
      name: 'setting-page',
      component: require('@/components/Setting').default
    },
    {
      path: '/cutList',
      name: 'cut-list',
      component: require('@/components/cutList').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
