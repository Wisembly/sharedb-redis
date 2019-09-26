const DB = require('sharedb').DB
const Redis = require('redis')

function RedisDB (options = {}) {
  DB.call(this, options)
  this.closed = false

  this.client = options.client || Redis.createClient(options)
}

module.exports = RedisDB

RedisDB.prototype = Object.create(DB.prototype)

RedisDB.prototype.close = function(callback) {
  this.client.quit()
  this.closed = true

  callback && callback()
}

RedisDB.prototype.commit = function(collection, id, op, snapshot, options, callback) {
  const script = `
    local op = redis.call("zrangebyscore", KEYS[1], ARGV[1], ARGV[1])

    -- If a version (score) already exists, do not duplicate it
    if #op ~= 0
    then
      return redis.status_reply("Duplicated score")
    end

    -- Add the op to the collection
    redis.call("zadd", KEYS[1], ARGV[1], ARGV[2])

    -- Save the snapshot
    redis.call("set", KEYS[2], ARGV[3])

    return redis.status_reply("OK")
  `

  this.client.eval(
    script, // The lua script above
    2, // The following 2 keys
    `sharedb:ops:${collection}:${id}`, // KEYS[1] Ops collection key
    `sharedb:snapshot:${collection}:${id}`, // KEYS[2] Snapshot key
    op.v || 0, // ARGV[1] The op version (special case for the create)
    JSON.stringify(op), // ARGV[2] The op
    JSON.stringify(snapshot), // ARGV[3] The snapshot
    function (err, res) {

      if (err) return callback(err)

      if (res === 'Duplicated score') {
        return callback(null, false)
      }

      if (res === 'OK') {
        return callback(null, true)
      }

      return callback(err)
    }
  )
}

RedisDB.prototype.getSnapshot = function(collection, id, fields, options, callback) {
  this.client.get(`sharedb:snapshot:${collection}:${id}`, (err, res) => {
    if (err) return callback(err)

    // an empty document must be initialized with a single \n
    // see https://github.com/quilljs/quill/issues/1558#issuecomment-312715578
    let snapshot = {
      id: id,
      v: 0,
      type: null,
      data: [{"insert":"\n"}],
      m: undefined
    }

    try {
        if (res) snapshot = JSON.parse(res)
    } catch (err) {
        return callback(err)
    }

    return callback(null, snapshot)
  })
}

// Get operations between [from, to) noninclusively. (Ie, the range should
// contain start but not end).
//
// If end is null, this function should return all operations from start onwards.
//
// The operations that getOps returns don't need to have a version: field.
// The version will be inferred from the parameters if it is missing.
//
// Callback should be called as callback(error, [list of ops])
RedisDB.prototype.getOps = function(collection, id, from, to, options, callback) {
  this.client.zrangebyscore(
    `sharedb:ops:${collection}:${id}`,
    from,
    '(' + (null === to ? '+inf' : to),
    (err, res) => {
      if (err) return callback(err)

      try {
          res = res.map((raw) => { return JSON.parse(raw) })
      } catch (err) {
          callback(err)
          return
      }

      callback(null, res)
    }
  )
}

RedisDB.prototype.replace = function(collection, id, snapshot) {
  return this.clear(collection, id)
        .then(() => { return this._addSnapshot(collection, id, snapshot) })
}

RedisDB.prototype._addSnapshot = function(collection, id, snapshot) {
  return new Promise((resolve, reject) => {
    this.client.set(`sharedb:snapshot:${collection}:${id}`, JSON.stringify(snapshot), 'EX', this.ttl, (err, res) => {
      if (err) return reject(err)

      return resolve(res)
    })
  })
}


RedisDB.prototype.clear = function(collection, id) {
  return new Promise((resolve, reject) => {
    this.client.del(`sharedb:ops:${collection}:${id}`, (err, res) => {
      if (err) return reject(err)
      this.client.del(`sharedb:snapshot:${collection}:${id}`, (err, res) => {
          if (err) return reject(err)
          return resolve(res)
      })
    })
  })
}
