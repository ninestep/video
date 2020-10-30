import axios from 'axios'
import {sourceList} from './default'
const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')
const Datastore = require('nedb')
const dbName = path.join(__dirname, 'videoEdit')
let db = new Datastore({ filename: dbName, autoload: true })
export function importDefault () {
  const lockFile = path.join(__dirname, 'run.lock')
  fs.stat(lockFile, function (err, stats) {
    if (err || !stats.isFile()) {
      console.log('init setting')
      new Promise((resolve) => {
        for (const item of sourceList) {
          nedbCount('source', {url: item.url}).then(res => {
            if (res <= 0) {
              nedbSave('source', {
                name: item.name,
                url: item.url,
                dataType: item.type,
                all: 0,
                success: 0
              })
            }
          })
        }
        resolve()
      }).then(() => {
        fs.writeFile(lockFile, new Date(), () => {
        })
      })
    }
  })
}
export async function readJson (file, base_path = path.join(__dirname, 'data/')) {
  return new Promise(function (resolve, reject) {
    const newFilePath = path.join(base_path, file).replace(/\\/g, '/')
    fs.stat(newFilePath, function (err, stats) {
      if (err || !stats.isFile()) {
        reject(new Error('file is not exits'))
      } else {
        let json = JSON.parse(fs.readFileSync(newFilePath))
        resolve(json)
      }
    })
  })
}
export function saveJson (data, file, base_path = path.join(__dirname, 'data/')) {
  return new Promise(function (resolve, reject) {
    new Promise(function (resolve) {
      const newDirPath = base_path.replace(/\\/g, '/')
      fs.stat(newDirPath, function (err, stats) {
        if (err || !stats.isDirectory()) {
          fs.mkdirSync(newDirPath)
        }
      })
      resolve()
    }).then(function () {
      const newFilePath = path.join(base_path, file).replace(/\\/g, '/')
      let newData = JSON.stringify(data, null, 4)
      fs.writeFile(newFilePath, newData, (error) => {
        if (error) {
          reject(new Error(error))
        } else {
          resolve()
        }
      })
    })
  })
}
export function getVideoList (url, page = 1, type = 0, word = '', hour = 0, ids = []) {
  return new Promise((resolve, reject) => {
    new Promise((resolve, reject) => {
      url = url + '?ac=videolist'
      if (page) {
        url = url + '&pg=' + page
      }
      if (type) {
        url = url + '&t=' + type
      }
      if (word) {
        url = url + '&wd=' + word
      }
      if (hour) {
        url = url + '&h=' + hour
      }
      if (ids.length > 0) {
        url = url + '&ids=' + ids.join(',')
      }
      resolve(url)
    }).then((url) => {
      axios.get(url).then(res => {
        const parser = new xml2js.Parser() // xml -> json
        if (res.status === 200) {
          parser.parseString(res.data, function (err, json) {
            if (err) {
              reject(err)
            } else {
              let data = {
                page: {
                  current_page: json.rss.list[0]['$'].page,
                  last_page: json.rss.list[0]['$'].pagecount,
                  page_size: json.rss.list[0]['$'].pagesize,
                  count: json.rss.list[0]['$'].recordcount
                },
                class: [],
                list: []
              }
              const videoLen = json.rss.list[0].video.length
              for (let i = 0; i < videoLen; i++) {
                const dl = json.rss.list[0].video[i].dl[0].dd
                let ddList = {}
                const dlLen = dl.length
                for (let i = 0; i < dlLen; i++) {
                  let flag = dl[i]['$'].flag
                  let text = dl[i]['_']
                  let dlList = text.split('#')
                  const dlListLen = dlList.length
                  ddList[flag] = []
                  for (let di = 0; di < dlListLen; di++) {
                    let dlInfo = dlList[di].split('$')
                    if (JSON.stringify(ddList[flag]).indexOf(dlInfo[0]) === -1) {
                      ddList[flag].push({
                        index: di,
                        name: dlInfo[0],
                        url: dlInfo[1]
                      })
                    }
                  }
                }
                data.list.push({
                  last: json.rss.list[0].video[i].last[0],
                  id: json.rss.list[0].video[i].id[0],
                  tid: json.rss.list[0].video[i].tid[0],
                  name: json.rss.list[0].video[i].name[0],
                  pic: json.rss.list[0].video[i].pic[0],
                  area: json.rss.list[0].video[i].area[0],
                  year: json.rss.list[0].video[i].year[0],
                  state: json.rss.list[0].video[i].state[0],
                  note: json.rss.list[0].video[i].note[0],
                  actor: json.rss.list[0].video[i].actor[0],
                  director: json.rss.list[0].video[i].director[0],
                  dl: ddList,
                  des: json.rss.list[0].video[i].des[0],
                  type: json.rss.list[0].video[i].type[0]
                })
              }
              console.log(data)
              resolve(data)
            }
          })
        } else {
          reject(new Error('请求失败'))
        }
      }).catch((err) => {
        reject(err)
      })
    })
  })
}

export function getVideoType (url) {
  return new Promise((resolve, reject) => {
    const parser = new xml2js.Parser() // xml -> json
    axios.get(url).then(res => {
      if (res.status === 200) {
        parser.parseString(res.data, function (err, json) {
          if (err) {
            reject(err)
          } else {
            let data = []
            let classLen = json.rss.class[0].ty.length
            for (let i = 0; i < classLen; i++) {
              data.push({
                id: json.rss.class[0].ty[i]['$'].id,
                name: json.rss.class[0].ty[i]['_']
              })
            }
            resolve(data)
          }
        })
      } else {
        reject(new Error('请求失败'))
      }
    })
  })
}

export function setNeDb (path = '') {
  if (path) {
    db = new Datastore({ filename: path, autoload: true })
  } else {
    db = new Datastore({ filename: dbName, autoload: true })
  }
}

export function nedbSave (type, data, path = '') {
  setNeDb(path)
  return new Promise((resolve, reject) => {
    db.insert({type: type, ...data}, (err, newDoc) => {
      if (err) {
        reject(err)
      } else {
        resolve(newDoc)
      }
    })
  })
}

export function nedbFind (type, map, sort, path = '') {
  setNeDb(path)
  return new Promise((resolve, reject) => {
    db.find({ type: type, ...map }).sort(sort).exec(function (err, docs) {
      if (err) {
        reject(err)
      } else {
        resolve(docs)
      }
    })
  })
}

export function nedbRemove (type, map, path = '') {
  setNeDb(path)
  return new Promise((resolve, reject) => {
    db.remove({ type: type, ...map }, {}, function (err, docs) {
      if (err) {
        reject(err)
      } else {
        resolve(docs)
      }
    })
  })
}
export function nedbCount (type, map, path = '') {
  setNeDb(path)
  return new Promise((resolve, reject) => {
    db.count({ type: type, ...map }, function (err, docs) {
      if (err) {
        reject(err)
      } else {
        resolve(docs)
      }
    })
  })
}
export function nedbUpdate (type, map, data, path = '') {
  setNeDb(path)
  return new Promise((resolve, reject) => {
    db.update({ type: type, ...map }, { $set: {...data} }, { }, function (err, docs) {
      if (err) {
        reject(err)
      } else {
        resolve(docs)
      }
    })
  })
}
export function nedbPage (type, map, sort = {_id: -1}, page = 1, size = 15, path = '') {
  setNeDb(path)
  return new Promise((resolve, reject) => {
    const start = (parseInt(page) - 1) * size
    db.find({type: type, ...map}).sort(sort).skip(start).limit(size).exec(function (err, docs) {
      if (err) {
        reject(err)
      } else {
        resolve({
          page: page,
          size: size,
          rows: docs
        })
      }
    })
  })
}
