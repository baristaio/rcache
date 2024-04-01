# rcache
The caching group manager for Redis 4.*


## Installation
```bash
npm install rcache
```

##
```javascript
const rcache = require('rcache');
const cache = new rcache.Cache({
    host: 'localhost',
    port: 6379,
    password: 'password',
    db: 0
}); 
 const group = new rcache.Group({
    cache: cache,
    name: 'group_name',
    ttl: 60 * 60 * 24   
});

group.set('key', 'value').then(() => {
    group.get('key').then((value) => {
        console.log(value); // value
    });
});

const groupKey = group.key('key');

const groupValues = group.getAll(groupKey);


```


### API 
 - getGroup(name: string): Group  - returns the group by name
 - isGroupExists(name: string): boolean - returns true if the group exists
 - getKeys(groupKey: string): Promise<string[]> - returns the keys of the group
 - 
