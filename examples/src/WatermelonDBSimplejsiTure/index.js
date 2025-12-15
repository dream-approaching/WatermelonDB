import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable, // 替换 TouchableOpacity
  ScrollView,
  StyleSheet,
  Alert,
  TurboModuleRegistry,
  Platform
} from 'react-native';

// 核心接口列表（与文档保持一致）
const ALL_METHODS = [
  'initialize', 'setUpWithSchema', 'setUpWithMigrations', 'find', 'query',
  'queryAsArray', 'queryIds', 'unsafeQueryRaw', 'count', 'batch',
  'batchJSON', 'getLocal', 'unsafeLoadFromSync', 'unsafeExecuteMultiple',
  'unsafeResetDatabase', 'setLocal', 'removeLocal'
];

// 危险接口列表（需二次确认）
const DANGEROUS_METHODS = ['unsafeResetDatabase'];

// 测试用Schema（创建movies表）
const DEFAULT_SCHEMA = JSON.stringify({
  tables: [
    {
      name: 'movies',
      columns: [
        { name: 'id', type: 'string', isPrimary: true },
        { name: 'title', type: 'string' },
        { name: 'year', type: 'number' },
        { name: 'rating', type: 'number' }
      ]
    }
  ]
});

// 测试用批量插入数据
const DEFAULT_BATCH_JSON = JSON.stringify([
  {
    type: 'INSERT',
    sql: 'INSERT INTO movies (id, title, year, rating) VALUES (?, ?, ?, ?)',
    arguments: ['疯狂动物城2', 'Inception', 2016, 9.2]
  },
  {
    type: 'INSERT',
    sql: 'INSERT INTO movies (id, title, year, rating) VALUES (?, ?, ?, ?)',
    arguments: ['movie777', 'Interstellar', 2010, 8.8]
  }
], null, 2);

const WatermelonDBSimplejsiTure = () => {
  // 核心状态
  const [loading, setLoading] = useState(false);
  const [adapter, setAdapter] = useState(null); // 缓存适配器实例
  const [logs, setLogs] = useState([]);
  const [testDataResult, setTestDataResult] = useState(null); // 存储测试数据查询结果
  const scrollViewRef = useRef(null);
  const mainScrollRef = useRef(null); // 主滚动视图ref

  // 通用配置参数
  const [dbName, setDbName] = useState('WatermelonJisTrueDemo');
  const [dbVersion, setDbVersion] = useState('1');
  const [tableName, setTableName] = useState('movies');
  const [findId, setFindId] = useState('movie1');
  const [sql, setSql] = useState('SELECT * FROM movies');
  const [sqlArray, setSqlArray] = useState('SELECT * FROM movies LIMIT 1');
  const [countSql, setCountSql] = useState('SELECT COUNT(*) FROM movies');
  const [batchJson, setBatchJson] = useState(DEFAULT_BATCH_JSON);
  const [localKey, setLocalKey] = useState('app_config');
  const [localValue, setLocalValue] = useState(JSON.stringify({ theme: 'dark', fontSize: 18 }));
  const [schemaJson, setSchemaJson] = useState(DEFAULT_SCHEMA);
  const [migrationFromVersion, setMigrationFromVersion] = useState('1');
  const [migrationToVersion, setMigrationToVersion] = useState('2');
  // 新增：测试数据录入
  const [newMovieId, setNewMovieId] = useState('movie3');
  const [newMovieTitle, setNewMovieTitle] = useState('The Matrix');
  const [newMovieYear, setNewMovieYear] = useState('1999');
  const [newMovieRating, setNewMovieRating] = useState('9.1');

  useEffect(() => {
    const WMDatabaseJSIBridge = TurboModuleRegistry.getEnforcing('WMDatabaseJSIBridge');
    console.log('jjtest result;', WMDatabaseJSIBridge.myInstall());
  }, []);
  // 添加日志
  const addLog = useCallback((type, message) => {
    const now = new Date();
    const timestamp = formatTime(now);
    setLogs(prev => [...prev, { type, message: `[${timestamp}] ${message}` }]);
    // 自动滚动到最新日志
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);
  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };
  // 清空日志
  const clearLogs = useCallback(() => {
    setLogs([]);
    setTestDataResult(null); // 同时清空测试数据结果
  }, []);

  // 创建适配器
  const createAdapter = useCallback(async () => {
    try {
      if (typeof global.nativeWatermelonCreateAdapter !== 'function') {
        throw new Error('nativeWatermelonCreateAdapter 全局函数不存在');
      }
      const newAdapter = global.nativeWatermelonCreateAdapter(`/${dbName}.db`, false);
      setAdapter(newAdapter);
      addLog('success', '✅ 适配器创建成功');
      return newAdapter;
    } catch (error) {
      addLog('error', '❌ 适配器创建失败: ${error.message}');
      throw error;
    }
  }, [addLog, dbName]);

  // 检查适配器是否存在
  const checkAdapter = useCallback(() => {
    if (!adapter) {
      addLog('error', '❌ 适配器未初始化，请先创建适配器');
      return false;
    }
    return true;
  }, [adapter, addLog]);

  // ========== 新增：数据库初始化1（创建表） ==========
  const initTestDatabase = useCallback(async () => {
    
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', '🚀 开始初始化测试数据库（创建表+插入测试数据）...');
      // 1. 初始化数据库
      await adapter.initialize(dbName, parseInt(dbVersion));
      addLog('success', '✅ 数据库初始化完成');

      // 2. 设置Schema（创建movies表）
      await adapter.setUpWithSchema(
          dbName, JSON.parse(DEFAULT_SCHEMA) , parseInt(dbVersion)
      );
      addLog('success', '✅ movies表创建成功');
    } catch (error) {
      addLog('error', `❌ 测试数据库初始化失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, dbName, dbVersion, schemaJson, batchJson, addLog]);

// ========== 新增：数据库初始化2（插入测试数据） ==========
  const initTestData = useCallback(async () => {
    
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      // 3. 批量插入测试数据
      const operations = JSON.parse(batchJson);
      await adapter.batch(operations);
      addLog('success', '✅ 测试数据插入完成');
      // 4. 查询验证数据
      const result = await adapter.query('SELECT * FROM movies');
      setTestDataResult(result);
      addLog('success', `✅ 查到${result?.length || 0} 条数据`);
    } catch (error) {
      addLog('error', `❌ 测试数据插入失败`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, dbName, batchJson, addLog]);

  // ========== 新增：插入单条测试数据 ==========
  const insertTestData = useCallback(async () => {
    if (!checkAdapter()) return;
    if (!newMovieId || !newMovieTitle) {
      Alert.alert('错误', '电影ID和标题不能为空');
      return;
    }
    setLoading(true);
    try {
      const batchOps = [
        {
          type: 'INSERT',
          sql: 'INSERT INTO movies (id, title, year, rating) VALUES (?, ?, ?, ?)',
          arguments: [newMovieId, newMovieTitle, parseInt(newMovieYear), parseFloat(newMovieRating)]
        }
      ];
      console.log(batchOps)
      await adapter.batch(batchOps);
      addLog('success', '✅ 单条测试数据插入成功');
      
      // 查询更新后的数据
      const result = await adapter.query('SELECT * FROM movies LIMIT 1');
      setTestDataResult(result);
    } catch (error) {
      addLog('error', `❌ 插入测试数据失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, newMovieId, newMovieTitle, newMovieYear, newMovieRating, addLog]);

  // ========== 新增：更新测试数据 ==========
  const updateTestData = useCallback(async () => {
    if (!checkAdapter()) return;
    if (!findId) {
      Alert.alert('错误', '请输入要更新的电影ID');
      return;
    }
    setLoading(true);
    try {
      addLog('info', `🔧 更新测试数据：ID=${findId}, 新标题=${newMovieTitle}`);
      const batchOps = [
        {
          type: 'UPDATE',
          sql: 'UPDATE movies SET title = ?, year = ?, rating = ? WHERE id = ?',
          arguments: [ newMovieTitle, parseInt(newMovieYear), parseFloat(newMovieRating), newMovieId]
        }
      ];
      await adapter.batch(batchOps);
      addLog('success', '✅ 测试数据更新成功');
      
      // 查询更新后的数据
      const result = await adapter.query('SELECT * FROM movies');
      setTestDataResult(result);
    } catch (error) {
      addLog('error', `❌ 更新测试数据失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, findId, newMovieTitle, newMovieYear, newMovieRating, addLog]);

  // ========== 新增：删除测试数据 ==========
  const deleteTestData = useCallback(async () => {
    if (!checkAdapter()) return;
    if (!findId) {
      Alert.alert('错误', '请输入要删除的电影ID');
      return;
    }
    setLoading(true);
    try {
      addLog('info', `🔧 删除测试数据：ID=${newMovieId}`);
      const batchOps = [
        {
          type: 'DELETE',
          sql: 'DELETE FROM movies WHERE id = ?',
          arguments: [ newMovieId]
        }
      ];
      addLog('success', `${newMovieId}`);
      await adapter.batch(batchOps);
      addLog('success', '✅ 测试数据删除成功');
      
      // 查询更新后的数据
      const result = await adapter.query('SELECT * FROM movies');
      setTestDataResult(result);
    } catch (error) {
      addLog('error', `❌ 删除测试数据失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, findId, addLog]);

  // ========== 单个接口测试函数（增强：返回实际数据） ==========
  // 1. 初始化数据库
  const testInitialize = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 initialize 方法，参数：dbName=${dbName}, version=${dbVersion}`);
      const result = adapter.initialize(dbName, parseInt(dbVersion));
      addLog('success', `✅ initialize 调用成功，返回: ${JSON.stringify(result || 'null')}`);
    } catch (error) {
      console.log(`❌ initialize 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, dbName, dbVersion, addLog]);

  // 2. 设置Schema
  const testSetUpWithSchema = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 setUpWithSchema 方法，参数：dbName=${dbName}, schema=${schemaJson.substring(0, 50)}...`);
      const schema = JSON.parse(schemaJson);
      const result = adapter.setUpWithSchema(dbName, schema, parseInt(dbVersion));
      addLog('success', `✅ setUpWithSchema 调用成功，返回: ${JSON.stringify(result || 'null')}`);
    } catch (error) {
      addLog('error', `❌ setUpWithSchema 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, dbName, schemaJson, dbVersion, addLog]);

  // 3. 按ID查询（增强：展示查询结果）
  const testFind = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 find 方法，参数：table=${tableName}, id=${findId}`);
      const result = adapter.find(tableName, findId);
      setTestDataResult([result]); // 存入结果展示区
      addLog('success', `✅ find 调用成功，返回: ${JSON.stringify(result || 'null')}`);
    } catch (error) {
      addLog('error', `❌ find 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, tableName, findId, addLog]);

  // 4. 普通查询（增强：展示查询结果）
  const testQuery = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 query 方法，参数：table=${tableName}, sql=${sql}`);
      const result = adapter.query('SELECT * FROM movies');
      setTestDataResult(result); // 存入结果展示区
      addLog('success', `✅ query 调用成功，返回: ${JSON.stringify(result || 'null')}`);
    } catch (error) {
      addLog('error', `❌ query 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, tableName, sql, addLog]);

  // 5. 计数查询（增强：展示计数结果）
  const testCount = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 count 方法，参数：table=${tableName}, sql=${countSql}`);
      const result = adapter.count(countSql, []);
      setTestDataResult([{ count: result }]); // 存入结果展示区
      addLog('success', `✅ count 调用成功，返回: ${result}`);
    } catch (error) {
      addLog('error', `❌ count 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, tableName, countSql, addLog]);

  // 6. 批量操作（增强：操作后查询验证）
  const testBatch = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 batch 方法，参数：operations=${batchJson.substring(0, 50)}...`);
      const operations = JSON.parse(batchJson);
      const result = adapter.batch(operations);
      addLog('success', `✅ batch 调用成功，返回: ${JSON.stringify(result || 'null')}`);
      
      // 操作后查询验证
      const verifyResult = await adapter.query('SELECT * FROM movies');
      setTestDataResult(verifyResult);
      addLog('info', `✅ 批量操作验证：当前数据共 ${verifyResult?.length || 0} 条`);
    } catch (error) {
      addLog('error', `❌ batch 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, batchJson, addLog]);

  // 7. 本地存储（增强：验证存储结果）
  const testSetLocal = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 setLocal 方法，参数：key=${localKey}, value=${localValue}`);
      const result = adapter.setLocal(localKey, localValue);
      addLog('success', `✅ setLocal 调用成功，返回: ${JSON.stringify(result || 'null')}`);
      
      // 验证存储结果
      const getResult = adapter.getLocal(localKey);
      setTestDataResult([{ localKey, localValue: getResult }]);
      addLog('info', `✅ 本地存储验证：读取到 ${localKey} = ${getResult}`);
    } catch (error) {
      addLog('error', `❌ setLocal 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, localKey, localValue, addLog]);

  // 其他接口测试函数
  const testSetUpWithMigrations = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 setUpWithMigrations 方法，参数：from=${migrationFromVersion}, to=${migrationToVersion}`);
      const result = adapter.setUpWithMigrations(
        dbName,
        schemaJson,
        parseInt(migrationFromVersion),
        parseInt(migrationToVersion)
      );
      addLog('success', `✅ setUpWithMigrations 调用成功，返回: ${JSON.stringify(result || 'null')}`);
    } catch (error) {
      addLog('error', `❌ setUpWithMigrations 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, dbName, schemaJson, migrationFromVersion, migrationToVersion, addLog]);

  const testQueryAsArray = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 queryAsArray 方法，参数：table=${tableName}, sql=${sql}`);
      const result = adapter.queryAsArray(tableName, setSqlArray);
      setTestDataResult(result);
      addLog('success', `✅ queryAsArray 调用成功，返回: ${JSON.stringify(result || 'null')}`);
    } catch (error) {
      addLog('error', `❌ queryAsArray 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, tableName, sql, addLog]);

  // 返回查询结果的第一列值数组
  const testQueryIds = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 queryIds 方法，参数：table=${tableName}, sql=${sql}`);
      const result = adapter.queryIds(sql, { arguments: [] });
      setTestDataResult([{ ids: result }]);
      addLog('success', `✅ queryIds 调用成功，返回: ${JSON.stringify(result || 'null')}`);
    } catch (error) {
      addLog('error', `❌ queryIds 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, tableName, sql, addLog]);

  const testUnsafeQueryRaw = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 unsafeQueryRaw 方法，参数：sql=${sql}`);
      const result = adapter.unsafeQueryRaw('SELECT * FROM movies LIMIT 1');
      setTestDataResult(result);
      addLog('success', `✅ unsafeQueryRaw 调用成功，返回: ${JSON.stringify(result || 'null')}`);
    } catch (error) {
      addLog('error', `❌ unsafeQueryRaw 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, sql, addLog]);

  const testBatchJSON = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      const DEFAULT_BATCH_JSON = JSON.stringify([
        {
          type: 'INSERT',
          sql: 'INSERT INTO movies (id, title, year, rating) VALUES (?, ?, ?, ?)',
          arguments: [findId, 'Inception2', 2011, 8.9]
        }
      ]);
      const result = adapter.batchJSON(DEFAULT_BATCH_JSON);
      addLog('success', `✅ batchJSON 调用成功，返回: ${JSON.stringify(result || 'null')}`);
      
      // 验证结果
      const verifyResult = await adapter.query('SELECT * FROM movies');
      setTestDataResult(verifyResult);
    } catch (error) {
      addLog('error', `❌ batchJSON 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, batchJson, addLog]);

  const testGetLocal = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 getLocal 方法，参数：key=${localKey}`);
      const result = adapter.getLocal(localKey);
      setTestDataResult([{ localKey, localValue: result }]);
      addLog('success', `✅ getLocal 调用成功，返回: ${result}`);
    } catch (error) {
      addLog('error', `❌ getLocal 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, localKey, addLog]);

  const testRemoveLocal = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 removeLocal 方法，参数：key=${localKey}`);
      const result = adapter.removeLocal(localKey);
      addLog('success', `✅ removeLocal 调用成功，返回: ${JSON.stringify(result || 'null')}`);
      
      // 验证结果
      const getResult = adapter.getLocal(localKey);
      setTestDataResult([{ localKey, localValue: getResult || '已删除' }]);
    } catch (error) {
      addLog('error', `❌ removeLocal 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, localKey, addLog]);

  const testUnsafeLoadFromSync = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 unsafeLoadFromSync 方法`);
      const syncData = { 
        tables: [{ name: 'movies', rows: [{ id: 'movie4', title: 'Dune', year: 2021, rating: 8.3 }] }],
        changes: [] 
      }; // 测试同步数据
      const result = adapter.unsafeLoadFromSync(syncData);
      addLog('success', `✅ unsafeLoadFromSync 调用成功，返回: ${JSON.stringify(result || 'null')}`);
      
      // 验证结果
      const verifyResult = await adapter.query('movies', 'SELECT * FROM movies');
      setTestDataResult(verifyResult);
    } catch (error) {
      addLog('error', `❌ unsafeLoadFromSync 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, addLog]);

  const testUnsafeExecuteMultiple = useCallback(async () => {
    if (!checkAdapter()) return;
    setLoading(true);
    try {
      addLog('info', `🔧 调用 unsafeExecuteMultiple 方法，参数：sql=[${sql}]`);
      const result = adapter.unsafeExecuteMultiple([sql]);
      setTestDataResult(result);
      addLog('success', `✅ unsafeExecuteMultiple 调用成功，返回: ${JSON.stringify(result || 'null')}`);
    } catch (error) {
      addLog('error', `❌ unsafeExecuteMultiple 调用失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [checkAdapter, adapter, sql, addLog]);

  const testUnsafeResetDatabase = useCallback(async () => {
    Alert.alert(
      '警告',
      '确认要重置数据库吗？此操作会清空所有数据！',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: async () => {
            if (!checkAdapter()) return;
            setLoading(true);
            try {
              addLog('warn', `🔧 调用 unsafeResetDatabase 方法（危险操作）`);
              const result = adapter.unsafeResetDatabase();
              setTestDataResult(null); // 清空结果
              addLog('success', `✅ unsafeResetDatabase 调用成功，返回: ${JSON.stringify(result || 'null')}`);
            } catch (error) {
              addLog('error', `❌ unsafeResetDatabase 调用失败: ${error.message}`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }, [checkAdapter, adapter, addLog]);

  // ========== 一键全量测试（增强：带实际数据操作） ==========
  const testAllMethods = useCallback(async () => {
    setLoading(true);
    clearLogs();
    addLog('info', '🚀 开始执行全量接口测试（带实际数据操作）...');

    try {
      // 1. 创建适配器
      const adapter = await createAdapter();
      if (!adapter) throw new Error('适配器创建失败，终止全量测试');

      // 2. 初始化数据库+创建表+插入测试数据
      await initTestDatabase();
      await initTestData();

      // 3. 遍历测试所有方法
      const methodMap = {
        initialize: testInitialize,
        setUpWithSchema: testSetUpWithSchema,
        setUpWithMigrations: () => addLog('warn', '⚠️ 跳过 setUpWithMigrations（无迁移脚本）'),
        find: testFind,
        query: testQuery,
        queryAsArray: testQueryAsArray,
        queryIds: testQueryIds,
        unsafeQueryRaw: testUnsafeQueryRaw,
        count: testCount,
        batch: testBatch,
        batchJSON: testBatchJSON,
        getLocal: testGetLocal,
        setLocal: testSetLocal,
        removeLocal: testRemoveLocal,
        unsafeLoadFromSync: testUnsafeLoadFromSync,
        unsafeExecuteMultiple: testUnsafeExecuteMultiple,
        unsafeResetDatabase: () => addLog('warn', '⚠️ 跳过 unsafeResetDatabase 危险操作')
      };

      for (const method of ALL_METHODS) {
        if (methodMap[method]) {
          await new Promise(resolve => {
            setTimeout(async () => {
              await methodMap[method]();
              resolve();
            }, 300); // 间隔300ms，避免操作过快
          });
        } else {
          addLog('error', `❌ 未找到 ${method} 测试方法`);
        }
      }

      addLog('success', '🎉 全量接口测试执行完成！');
    } catch (error) {
      addLog('error', `❌ 全量测试失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    createAdapter, initTestDatabase, initTestData, testInitialize, testSetUpWithSchema,
    testFind, testQuery, testQueryAsArray, testQueryIds, testUnsafeQueryRaw,
    testCount, testBatch, testBatchJSON, testGetLocal, testSetLocal, testRemoveLocal,
    testUnsafeLoadFromSync, testUnsafeExecuteMultiple, clearLogs, addLog
  ]);

  // ========== 渲染辅助函数 ==========
  // 渲染日志
  const renderLogItem = (log, index) => {
    let logStyle;
    switch (log.type) {
      case 'success':
        logStyle = styles.logSuccess;
        break;
      case 'error':
        logStyle = styles.logError;
        break;
      case 'warn':
        logStyle = styles.logWarn;
        break;
      case 'info':
        logStyle = styles.logInfo;
        break;
      default:
        logStyle = styles.logDefault;
    }
    return (
      <Text key={index} style={[styles.logItem, logStyle]}>
        {log.message}
      </Text>
    );
  };

  // 渲染测试数据结果
  const renderTestDataResult = () => {
    if (!testDataResult) {
      return <Text style={styles.emptyResultText}>暂无数据结果，请执行数据操作接口</Text>;
    }
    if (testDataResult.length === 0) {
      return <Text style={styles.emptyResultText}>查询结果为空</Text>;
    }
    return (
      <ScrollView style={styles.dataResultScroll}>
        {testDataResult.map((item, index) => (
          <Text key={index} style={styles.dataResultItem}>
            {JSON.stringify(item, null, 2)}
          </Text>
        ))}
      </ScrollView>
    );
  };

  // ========== UI 渲染 ==========
  return (
    // 移除 KeyboardAvoidingView，改用 View + ScrollView 布局
    <View style={styles.container}>
      <ScrollView 
        ref={mainScrollRef}
        style={styles.pageScroll} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent} // 增加内边距避免内容被遮挡
        keyboardDismissMode="on-drag" // 拖动时关闭键盘
        keyboardShouldPersistTaps="handled" // 点击按钮不关闭键盘
      >
        {/* 标题 */}
        <Text style={styles.title}>WatermelonDB Jsi:true 数据库测试</Text>

        {/* 1. 基础配置区（新增初始化测试数据库按钮） */}
        <View style={styles.module}>
          <Text style={styles.moduleTitle}>1. 基础配置 & 数据库初始化</Text>
          <TextInput
            style={styles.input}
            placeholder="数据库名称"
            value={dbName}
            onChangeText={setDbName}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="数据库版本"
            value={dbVersion}
            onChangeText={setDbVersion}
            keyboardType="numeric"
            editable={!loading}
          />
          <View style={styles.btnGroup}>
            {/* 替换 TouchableOpacity 为 Pressable */}
            <Pressable
              style={({ pressed }) => [
                styles.btn, 
                styles.btnPrimary, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed // 按下状态样式
              ]}
              onPress={createAdapter}
              disabled={loading}
            >
              <Text style={styles.btnText}>创建适配器</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btn, 
                styles.btnSuccess, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]}
              onPress={initTestDatabase}
              disabled={loading}
            >
              <Text style={styles.btnText}>初始化</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btn, 
                styles.btnWarning, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]}
              onPress={initTestData}
              disabled={loading}
            >
              <Text style={styles.btnText}>插入默认数据</Text>
            </Pressable>
          </View>
        </View>

        {/* 2. 测试数据录入区（新增） */}
        <View style={styles.module}>
          <Text style={styles.moduleTitle}>2. 测试数据录入</Text>
          <TextInput
            style={styles.input}
            placeholder="电影ID"
            value={newMovieId}
            onChangeText={setNewMovieId}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="电影标题"
            value={newMovieTitle}
            onChangeText={setNewMovieTitle}
            editable={!loading}
          />
          <View style={styles.rowInput}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="上映年份"
              value={newMovieYear}
              onChangeText={setNewMovieYear}
              keyboardType="numeric"
              editable={!loading}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="评分"
              value={newMovieRating}
              onChangeText={setNewMovieRating}
              keyboardType="numeric"
              editable={!loading}
            />
          </View>
          <View style={styles.btnGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.btn, 
                styles.btnPrimary, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]}
              onPress={insertTestData}
              disabled={loading}
            >
              <Text style={styles.btnText}>插入数据</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btn, 
                styles.btnDefault, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]}
              onPress={updateTestData}
              disabled={loading}
            >
              <Text style={styles.btnText}>更新数据</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btn, 
                styles.btnDanger, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]}
              onPress={deleteTestData}
              disabled={loading}
            >
              <Text style={styles.btnText}>删除数据</Text>
            </Pressable>
          </View>
        </View>

        {/* 3. 核心接口测试区 */}
        <View style={styles.module}>
          <Text style={styles.moduleTitle}>3. 核心接口测试</Text>
          <TextInput
            style={styles.input}
            placeholder="查询ID"
            value={findId}
            onChangeText={setFindId}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="SQL语句"
            value={sql}
            onChangeText={setSql}
            editable={!loading}
          />
          <View style={styles.btnGroup}>
            <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                styles.btnCommon, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]} 
              onPress={testFind} 
              disabled={loading}
            >
              <Text style={styles.btnText}>find</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                styles.btnCommon, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]} 
              onPress={testQuery} 
              disabled={loading}
            >
              <Text style={styles.btnText}>query</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                styles.btnCommon, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]} 
              onPress={testCount} 
              disabled={loading}
            >
              <Text style={styles.btnText}>count</Text>
            </Pressable>
          </View>
          <View style={styles.btnGroup}>
            <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                styles.btnCommon, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]} 
              onPress={testBatchJSON} 
              disabled={loading}
            >
              <Text style={styles.btnText}>batchJSON</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                styles.btnCommon, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]} 
              onPress={testSetUpWithMigrations} 
              disabled={loading}
            >
              <Text style={styles.btnText}>setUpWithMigration</Text>
            </Pressable>
          </View>
          <View style={styles.btnGroup}>
            {/* <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                styles.btnCommon, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]} 
              onPress={testBatch} 
              disabled={loading}
            >
              <Text style={styles.btnText}>batch</Text>
            </Pressable> */}
            <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                styles.btnCommon, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]} 
              onPress={testSetLocal} 
              disabled={loading}
            >
              <Text style={styles.btnText}>setLocal</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                styles.btnCommon, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]} 
              onPress={testGetLocal} 
              disabled={loading}
            >
              <Text style={styles.btnText}>getLocal</Text>
            </Pressable>
          </View>
          <View style={styles.btnGroup}>
            <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                styles.btnCommon, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]} 
              onPress={testRemoveLocal} 
              disabled={loading}
            >
              <Text style={styles.btnText}>RemoveLocal</Text>
            </Pressable>
          </View>
          <View style={styles.btnGroup}>
            <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                styles.btnCommon, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]} 
              onPress={testQueryIds} 
              disabled={loading}
            >
              <Text style={styles.btnText}>testQueryIds</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                styles.btnCommon, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]} 
              onPress={testQueryAsArray} 
              disabled={loading}
            >
              <Text style={styles.btnText}>QueryAsArray</Text>
            </Pressable>
          </View>
          <View style={styles.btnGroup}>
            <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                styles.btnCommon, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]} 
              onPress={testUnsafeQueryRaw} 
              disabled={loading}
            >
              <Text style={styles.btnText}>UnsafeQueryRaw</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                styles.btnCommon, 
                styles.smallBtn, 
                loading && styles.btnDisabled,
                pressed && !loading && styles.btnPressed
              ]} 
              onPress={testUnsafeResetDatabase} 
              disabled={loading}
            >
              <Text style={styles.btnText}>unsafeReset</Text>
            </Pressable>
          </View>
        </View>

        {/* 4. 数据结果展示区（新增） */}
        <View style={styles.module}>
          <Text style={styles.moduleTitle}>4. 数据结果展示</Text>
          <View style={styles.dataResultContainer}>
            {renderTestDataResult()}
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.btn, 
            styles.btnWarning, 
            loading && styles.btnDisabled,
            pressed && !loading && styles.btnPressed
          ]}
          onPress={testAllMethods}
          disabled={loading}
        >
          <Text style={styles.btnText}>全量测试</Text>
        </Pressable>
        {/* 5. 日志展示区 */}
        <View style={styles.module}>
          <Text style={styles.moduleTitle}>5. 测试日志</Text>
          <Pressable
            style={styles.clearBtn}
            onPress={clearLogs}
            disabled={loading}
          >
            <Text style={styles.clearBtnText}>清空日志</Text>
          </Pressable>
          <ScrollView
            ref={scrollViewRef}
            style={styles.logContainer}
            showsVerticalScrollIndicator={true}
          >
            {logs.length === 0 ? (
              <Text style={styles.emptyLogText}>暂无测试日志，开始测试吧～</Text>
            ) : (
              logs.map(renderLogItem)
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

// 样式定义
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  pageScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60, // 增加底部内边距，避免输入框被键盘遮挡
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  module: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    fontSize: 14,
    color: '#333',
  },
  rowInput: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  halfInput: {
    flex: 1,
    marginBottom: 0,
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  btnGroupWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  btn: {
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  smallBtn: {
    flex: 1,
    padding: 8,
  },
  btnPrimary: {
    backgroundColor: '#1677ff',
  },
  btnSuccess: {
    backgroundColor: '#52c41a',
  },
  btnWarning: {
    backgroundColor: '#faad14',
  },
  btnDefault: {
    backgroundColor: '#666666ff',
  },
  btnCommon: {
    backgroundColor: '#37b9f5ff',
  },
  btnDanger: {
    backgroundColor: '#ff4d4f',
  },
  btnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  btnPressed: {
    opacity: 0.8, // 按下时的透明度效果
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  clearBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  clearBtnText: {
    color: '#1677ff',
    fontSize: 12,
  },
  logContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4,
    padding: 8,
    minHeight: 150,
    backgroundColor: '#f9f9f9',
  },
  logItem: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  logSuccess: {
    color: '#52c41a',
  },
  logError: {
    color: '#ff4d4f',
  },
  logWarn: {
    color: '#faad14',
  },
  logInfo: {
    color: '#1890ff',
  },
  logDefault: {
    color: '#333',
  },
  emptyLogText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  // 数据结果样式
  dataResultContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4,
    padding: 10,
    minHeight: 150,
    backgroundColor: '#f9f9f9',
  },
  dataResultScroll: {
    flex: 1,
  },
  dataResultItem: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginBottom: 8,
  },
  emptyResultText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default WatermelonDBSimplejsiTure;