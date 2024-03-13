const RCache = require('./RCache');
const RedisMock = require('redis-mock');

describe('RCache', () => {
    let rcache;
    let redisClient;

    beforeEach(() => {
        redisClient = RedisMock.createClient();
        rcache = new RCache(redisClient, ['groupKey1', 'groupKey2'], ['entityKey1', 'entityKey2'], { TTL: 60 });
    });

    test('should generate group body key', () => {
        const params = { groupKey1: 'value1', groupKey2: 'value2' };
        const result = rcache.generateGroupBodyKey(params);
        expect(result).toBe('groupKey1:value1groupKey2:value2');
    });

    test('should generate group key', () => {
        const params = { groupKey1: 'value1', groupKey2: 'value2' };
        const result = rcache.getGroupKey(params);
        expect(result).toBe(':groupKey1:value1groupKey2:value2:group');
    });

    test('should generate entity key', () => {
        const params = { entityKey1: 'value1', entityKey2: 'value2' };
        const result = rcache.getKey(params);
        expect(result).toBe('entityKey1:value1:entityKey2:value2');
    });

    test('should generate key-value pair', () => {
        const params = { entityKey1: 'value1', entityKey2: 'value2' };
        const value = 'testValue';
        const result = rcache.getKeyValue(params, value);
        expect(result).toEqual({ key: 'entityKey1:value1:entityKey2:value2', value: 'testValue' });
    });

    test('should check if group key exists', async () => {
        const groupKey = 'testGroupKey';
        redisClient.set(groupKey, 'testValue');
        const result = await rcache.isExist(groupKey);
        expect(result).toBe(true);
    });

    // Add more tests for the remaining methods...
});