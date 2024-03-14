const RCache = require('../lib/RCache');
const RedisMock = require('redis-mock');

describe('RCache', () => {
    let rcache;
    let redisClient;

    beforeEach(() => {
        redisClient = RedisMock.createClient();
        redisClient.hSet = jest.fn().mockResolvedValue('testGroupKey');
        redisClient.hExists = jest.fn().mockResolvedValue(true);
        redisClient.exists = jest.fn().mockResolvedValue(true);
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
        const keyObj = { entityKey1: 'value1', entityKey2: 'value2' };
        const value = 'testValue';
        await rcache.set(groupKey, keyObj, value);
        const result = await rcache.isGroupExists(groupKey);
        expect(result).toBe(true);
    });

    test('should check if key exists in a group', async () => { 
        const groupKey = 'testGroupKey';
        const keyObj = { entityKey1: 'value1', entityKey2: 'value2' };
        const value = 'testValue';
        await rcache.set(groupKey, keyObj, value);
        const result = await rcache.isKeyExists(groupKey, keyObj);
        expect(result).toBe(true); 
        // Add more tests for the remaining methods...
    });
});
