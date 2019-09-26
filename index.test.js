const RedisDB = require('./index')

describe('Instantiation tests', () => {
  test('Instanciate RedisDB using an existing a Redis client', () => {
    const client = {}
    const sharedbRedis = new RedisDB({ client })

    expect(sharedbRedis.client).toBe(client)
  })
})

describe('close method', () => {
  test('close the adapter', () => {
    const client = {
      quit: jest.fn()
    }
    const sharedbRedis = new RedisDB({ client })

    sharedbRedis.close()

    expect(client.quit.mock.calls.length).toBe(1)
    expect(sharedbRedis.closed).toBeTruthy()
  })
})

describe('commit method', () => {
  test('client\'s eval returns an error', () => {
    const client = {
      eval: jest.fn((script, keys, opsKey, snapshotKey, version, op, snapshot, callback) => {
        expect(keys).toBe(2)
        expect(opsKey).toBe('sharedb:ops:foo:42')
        expect(snapshotKey).toBe('sharedb:snapshot:foo:42')
        expect(version).toBe(0)

        callback('something happened', null)
      })
    }

    const sharedbRedis = new RedisDB({ client })

    const callback = (value) => {
      // Assert that the commit() callback is called with the eval error
      expect(value).toBe('something happened')
    }

    sharedbRedis.commit('foo', 42, {}, {}, {}, callback)
    expect(client.eval.mock.calls.length).toBe(1)
  })

  test('client\'s eval returns a duplicated score', () => {
    const client = {
      eval: jest.fn((script, keys, opsKey, snapshotKey, version, op, snapshot, callback) => {
        expect(keys).toBe(2)
        expect(opsKey).toBe('sharedb:ops:foo:42')
        expect(snapshotKey).toBe('sharedb:snapshot:foo:42')
        expect(version).toBe(0)

        callback(null, 'Duplicated score')
      })
    }

    const sharedbRedis = new RedisDB({ client })

    const callback = (err, succeeded) => {
      expect(err).toBeNull()
      expect(succeeded).toBeFalsy()
    }

    sharedbRedis.commit('foo', 42, {}, {}, {}, callback)
    expect(client.eval.mock.calls.length).toBe(1)
  })

  test('client\'s eval returns OK', () => {
    const client = {
      eval: jest.fn((script, keys, opsKey, snapshotKey, version, op, snapshot, callback) => {
        expect(keys).toBe(2)
        expect(opsKey).toBe('sharedb:ops:foo:42')
        expect(snapshotKey).toBe('sharedb:snapshot:foo:42')
        expect(version).toBe(0)

        callback(null, 'OK')
      })
    }

    const sharedbRedis = new RedisDB({ client })

    const callback = (err, succeeded) => {
      expect(err).toBeNull()
      expect(succeeded).toBeTruthy()
    }

    sharedbRedis.commit('foo', 42, {}, {}, {}, callback)
    expect(client.eval.mock.calls.length).toBe(1)
  })
})

describe('getSnapshot method', () => {
  test('client returns an error', () => {
    const client = {
      get: jest.fn((key, callback) => {
        expect(key).toBe('sharedb:snapshot:foo:42')
        callback('something happened', null)
      })
    }

    const sharedbRedis = new RedisDB({ client })

    const callback = (err, succeeded) => {
      expect(err).toBe('something happened')
    }

    sharedbRedis.getSnapshot('foo', 42, {}, {}, callback)
  })

  test('client returns data', () => {
    const client = {
      get: jest.fn((key, callback) => {
        expect(key).toBe('sharedb:snapshot:foo:42')
        callback(null, '{"foo":"bar"}')
      })
    }

    const sharedbRedis = new RedisDB({ client })

    const callback = (err, succeeded) => {
      expect(err).toBeNull()
      expect(succeeded).toStrictEqual({ foo: 'bar' })
    }

    sharedbRedis.getSnapshot('foo', 42, {}, {}, callback)
  })

  test('client returns no data', () => {
    const client = {
      get: jest.fn((key, callback) => {
        expect(key).toBe('sharedb:snapshot:foo:42')
        callback(null, '')
      })
    }

    const sharedbRedis = new RedisDB({ client })

    const callback = (err, succeeded) => {
      expect(err).toBeNull()
      expect(succeeded.id).toBe(42)
      expect(succeeded.v).toBe(0)
    }

    sharedbRedis.getSnapshot('foo', 42, {}, {}, callback)
  })
})

describe('getOps method', () => {
  test('client returns an error', () => {
    const client = {
      zrangebyscore: jest.fn((key, from, to, callback) => {
        expect(key).toBe('sharedb:ops:foo:42')
        expect(from).toBe('001')
        expect(to).toBe('(002')
        callback('something happened', null)
      })
    }

    const sharedbRedis = new RedisDB({ client })

    const callback = (err, succeeded) => {
      expect(err).toBe('something happened')
    }

    sharedbRedis.getOps('foo', 42, '001', '002', {}, callback)
  })

  test('client returns data', () => {
    const client = {
      zrangebyscore: jest.fn((key, from, to, callback) => {
        expect(key).toBe('sharedb:ops:foo:42')
        expect(from).toBe('001')
        expect(to).toBe('(002')
        callback(null, ['{"foo":"bar"}'])
      })
    }

    const sharedbRedis = new RedisDB({ client })

    const callback = (err, succeeded) => {
      expect(err).toBeNull()
      expect(succeeded).toStrictEqual([{ foo: 'bar' }])
    }

    sharedbRedis.getOps('foo', 42, '001', '002', {}, callback)
  })

  test('client returns data using default "to"', () => {
    const client = {
      zrangebyscore: jest.fn((key, from, to, callback) => {
        expect(key).toBe('sharedb:ops:foo:42')
        expect(from).toBe('001')
        expect(to).toBe('(+inf')
        callback(null, ['{"foo":"bar"}'])
      })
    }

    const sharedbRedis = new RedisDB({ client })

    const callback = (err, succeeded) => {
      expect(err).toBeNull()
      expect(succeeded).toStrictEqual([{ foo: 'bar' }])
    }

    sharedbRedis.getOps('foo', 42, '001', null, {}, callback)
  })
})

describe('', () => {

})




