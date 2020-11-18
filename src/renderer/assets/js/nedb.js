const Datastore = require('nedb')
const path = require('path')
const dbName = path.join(__dirname, 'videoEdit')
let db = new Datastore({ filename: dbName, autoload: true })

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
