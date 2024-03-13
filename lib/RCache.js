/**
 * RCache
 * @class
 * @param {RedisClient} redisClient - The Redis client instance.
 * @param {string[]} groupKey - An array of strings to group pattern name.
 * @param {string[]} entityKey - An array of strings.
 * @param {object} [options] - Optional configuration options.
 * @param {number} [options.TTL=3600] - The time-to-live value in seconds for the cache entries.
 * @param {string} [options.prefix=''] - The prefix to be added to the cache keys.
 * @param {string} [options.suffix='group'] - The suffix to be added to the cache keys.
 * @param {string} [options.entityPrefix=''] - The prefix to be added to the entity keys.
 * @param {string} [options.entitySuffix=''] - The suffix to be added to the entity keys.
 * @param {number} [options.scanCount=100] - The number of entries to scan per iteration when searching for keys.
 * @param {function} [options.onError] - The error callback function.
 */
class RCache {
    constructor(redisClient, groupKey, entityKey, options) {
        if (!redisClient || !groupKey || !entityKey) {
            throw new Error('All parameters must be provided');
        }

        this.options = Object.assign({},  {
            TTL:  60 * 60, // 1 hour
            prefix: '',
            suffix: 'group',
            entityPrefix:'',
            entitySuffix: '',
            scanCount:  100
        }, options);


        this.client = redisClient;
        this.entityKey = entityKey;
        this.groupKeys = groupKey;

        this.client.on('error', function (err) {
            if (typeof this.options.onError === 'function') {
                return this.options.onError(err);
            }
            throw new Error(err);
        });
    };

    /**
     * Generates a group body key based on the provided parameters.
     * @param {Object} params - The parameters to generate the key from.
     * @throws {Error} If the number of parameters does not match the number of group keys.
     * @returns {string} The generated group body key.
     */
    generateGroupBodyKey(params) {
        if (this.groupKeys.length !== Object.keys(params).length) {
            throw new Error('Invalid number of parameters');
        }

        return this.groupKeys.reduce((total, key) => {
            return `${total}${key}:${params[key]}`;
        }, '');
    }

    /**
     * Generates a group key based on the provided parameters.
     * @param {Object} params - The parameters to generate the key from.
     * @returns {string} The generated group key.
     */
    getGroupKey(params) {
        const body = this.generateGroupBodyKey(params);
        return `${this.options.prefix}:${body}:${this.options.suffix}`;
    }

    /**
     * Generates a key for an entity based on the provided parameters.
     * @param {Object} entityParams - The parameters to generate the key from.
     * @returns {string} The generated entity key.
     */
    getKey(entityParams) {
        const value = this.options.entityPrefix ? [this.options.entityPrefix]:[];
        const body = this.entityKey.reduce((total, key) => {
            const keyValue = entityParams[key] || '*';
            total.push(`${key}:${keyValue}`);
            return total;
        }, [...value]);

        if (this.options.entitySuffix) {
            body.push(this.options.entitySuffix);
        }
        return body.join(':');
    }

    /**
     * Generates a key-value pair for an entity.
     * @param {Object} entityKeyObj - The object to generate the key from.
     * @param {any} value - The value to pair with the key.
     * @returns {Object} The generated key-value pair.
     */    
    getKeyValue(entityKeyObj, value) {
        return {
            key:this.getKey(entityKeyObj),
            value: value
        };
    }

    /**
     * Checks if a group key exists.
     * @param {string} groupKey - The group key to check.
     * @returns {Promise<boolean>} A promise that resolves to true if the key exists, false otherwise.
     */
    async isExist(groupKey) {
        const v = await this.client.exists(groupKey);
        return !!v;
    }
    
    
    async set(groupKey, entityKeys, entityValue) {
        const { key, value} = this.getKeyValue(entityKeys, entityValue);
        await this.client.hSet(groupKey, key,  value);
        return this.client.expire(groupKey, this.options.TTL);
    }

    async setEntities(groupKey, entities) {
        const multi = this.client.multi();
        entities.forEach(entity => {
            multi.hSet(groupKey, entity.key, entity.value);
        });
        multi.expire(groupKey, this.options.TTL);
        return multi.exec();
    }

    async size(groupKey) {
        return this.client.hLen(groupKey);
    }

    /**
     * return all values in a group.
     * @param groupKey:  name of the group
     * @returns all values in a group
     */
    async getAll(groupKey) {
        return this.client.hVals(groupKey)
    }

    /**
     * Retrieves the value associated with a given key within a group.
     * @param {string} groupKey - The group key.
     * @param {Object} keyObj - The key object.
     * @returns {Promise<any>} The value associated with the key.
     */
    async get(groupKey, keyObj) {
        const key = this.getKey(keyObj)
        return this.client.hGet(groupKey, key);
    }

    /**
     * Finds all values in a group that match the provided entity keys.
     * @param {string} groupKey - The group key.
     * @param {Object} entityKeys - The entity keys to match.
     * @returns {Promise<Array<any>>} The matching values.
     */
    async find(groupKey, entityKeys) {
        const pattern = this.getKey(entityKeys);
        const result = [];
        let cursor = 0;
        do {
          const res = await this.client.hScan(groupKey, cursor, { MATCH:pattern, COUNT: this.options.scanCount});
          if (res?.tuples?.length) {
                result.push(...res.tuples.map(item=> item.value));
            }
            cursor = res.cursor;
        } while (cursor !== 0);
        return result;
    }

    /**
     * Deletes a key-value pair from a group.
     * @param {string} groupKey - The group key.
     * @param {Object} entityKeyObj - The entity key object.
     * @returns {Promise<number>} The number of keys removed.
     */
    async delete(groupKey, entityKeyObj) {
        const key = this.getKey(groupKey, entityKeyObj);
        return this.client.hDel(groupKey, key);
    }
}

module.exports = RCache;
