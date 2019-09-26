# sharedb-redis

Redis database adapter for [sharedb](https://github.com/share/sharedb)

`ops` are stored as `sharedb:ops:{collection}:{id}` and use the type [Sorted Set](https://redis.io/commands#sorted_set).
`snapshot` is stored as `sharedb:snapshot:{collection}:{id}` and uses the [generic](https://redis.io/commands#generic) type.

### Usage

```cli
npm require sharedb-redis
```

```js
const RedisDatabase = require('sharedb-redis')

const db = new RedisDatabase({
  host: '127.0.0.1',
  port: 6379
})

const sharedb = new Sharedb({ db })
```

### Tests

```cli
npm run test
```
