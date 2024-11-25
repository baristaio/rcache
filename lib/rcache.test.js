/* eslint-env jest */
const RCache = require('./RCache');
const { createClient } = require('redis-mock');

describe('RCache', () => {
  let redisClient;
  let rcache;

  beforeEach(() => {
    redisClient = createClient();
    rcache = new RCache(redisClient, ['groupKey'], ['entityKey'], { TTL: 3600 });
  });

  test('should throw an error if required parameters are not provided', () => {
    expect(() => new RCache()).toThrow('All parameters must be provided');
  });

  test('should generate a group body key', () => {
    const params = { groupKey: 'value' };
    const key = rcache.generateGroupBodyKey(params);
    expect(key).toBe('groupKey:value');
  });

  test('should generate a group key', () => {
    const params = { groupKey: 'value' };
    const key = rcache.getGroupKey(params);
    expect(key).toBe(':groupKey:value:group');
  });

  test('should generate an entity key', () => {
    const params = { entityKey: 'value' };
    const key = rcache.getKey(params);
    expect(key).toBe('entityKey:value');
  });

  test('should generate a key-value pair', () => {
    const params = { entityKey: 'value' };
    const keyValue = rcache.getKeyValue(params, 'someValue');
    expect(keyValue).toEqual({ key: 'entityKey:value', value: 'someValue' });
  });

  test('should check if a group key exists', async () => {
    redisClient.exists = jest.fn().mockResolvedValue(1);
    const exists = await rcache.isGroupExists('groupKey');
    expect(exists).toBe(true);
  });

  test('should check if a key exists in a group', async () => {
    redisClient.hExists = jest.fn().mockResolvedValue(1);
    const exists = await rcache.isKeyExists('groupKey', { entityKey: 'value' });
    expect(!!exists).toBe(true);
  });

  test('should set a key-value pair in a group', async () => {
    redisClient.hSet = jest.fn().mockResolvedValue(1);
    redisClient.expire = jest.fn().mockResolvedValue(1);
    await rcache.set('groupKey', { entityKey: 'value' }, 'someValue');
    expect(redisClient.hSet).toHaveBeenCalledWith('groupKey', 'entityKey:value', 'someValue');
    expect(redisClient.expire).toHaveBeenCalledWith('groupKey', 3600);
  });

  test('should set multiple entities in a group', async () => {
    redisClient.multi = jest.fn().mockReturnValue({
      hSet: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(1),
    });
    const entities = [{ key: 'entityKey:value', value: 'someValue' }];
    await rcache.setEntities('groupKey', entities);
    expect(redisClient.multi().hSet).toHaveBeenCalledWith('groupKey', 'entityKey:value', 'someValue');
    expect(redisClient.multi().expire).toHaveBeenCalledWith('groupKey', 3600);
    expect(redisClient.multi().exec).toHaveBeenCalled();
  });

  test('should return the size of a group', async () => {
    redisClient.hLen = jest.fn().mockResolvedValue(1);
    const size = await rcache.size('groupKey');
    expect(size).toBe(1);
  });

  test('should return all values in a group', async () => {
    redisClient.hVals = jest.fn().mockResolvedValue(['value1', 'value2']);
    const values = await rcache.getAll('groupKey');
    expect(values).toEqual(['value1', 'value2']);
  });

  test('should retrieve a value associated with a key within a group', async () => {
    redisClient.hGet = jest.fn().mockResolvedValue('someValue');
    const value = await rcache.get('groupKey', { entityKey: 'value' });
    expect(value).toBe('someValue');
  });

  test('should find all values in a group that match the provided entity keys', async () => {
    redisClient.hScan = jest.fn().mockResolvedValue({ cursor: 0, tuples: [{ value: 'someValue' }] });
    const values = await rcache.find('groupKey', { entityKey: 'value' });
    expect(values).toEqual(['someValue']);
  });

  test('should delete a key-value pair from a group', async () => {
    redisClient.hDel = jest.fn().mockResolvedValue(1);
    const result = await rcache.delete('groupKey', { entityKey: 'value' });
    expect(result).toBe(1);
  });
});
