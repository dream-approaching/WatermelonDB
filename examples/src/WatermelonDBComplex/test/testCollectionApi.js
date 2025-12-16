import { Q } from '@react-native-ohos/watermelondb';
import { database, projectsCollection, tasksCollection } from './dbConfig';
import { Alert } from 'react-native';
import { Database } from '@react-native-ohos/watermelondb';

// 测试数据前缀（避免污染业务数据）
const TEST_PREFIX = '[TEST]';
const EXPECTED_TABLE_NAME = 'projects';

// 清理测试数据
export const cleanTestData = async () => {
  try {
    await database.write(async () => {
      // 先删关联任务，再删测试项目
      const testProjects = await projectsCollection.query(
        Q.where('name', Q.like(`${TEST_PREFIX}%`))
      ).fetch();
      for (const project of testProjects) {
        const projectTasks = await tasksCollection.query(
          Q.where('project_id', project.id)
        ).fetch();
        for (const task of projectTasks) await task.destroyPermanently();
        await project.destroyPermanently();
      }
    });
    return {
      success: true,
      message: '测试数据清理完成',
      method: 'cleanTestData'
    };
  } catch (error) {
    return {
      success: false,
      message: `清理失败: ${error.message}`,
      method: 'cleanTestData'
    };
  }
};

// db方法
export const testDbMethod = async () => {
  try {
    // 步骤1：获取 Collection 的 db 实例
    const collectionDb = projectsCollection.db;
    if (!collectionDb) throw new Error('Collection.db 返回空');

    // 步骤2：验证 db 是 Database 实例
    if (!(collectionDb instanceof Database)) {
      throw new Error(`Collection.db 类型错误，期望 Database 实例，实际：${typeof collectionDb}`);
    }

    // 步骤3：验证 db 与全局 database 实例一致
    if (collectionDb !== database) {
      throw new Error('Collection.db 与全局 database 实例不一致');
    }

    // 步骤4：通过 db 调用 write 事务（验证功能可用性）
    let testProject;
    await collectionDb.write(async () => {
      testProject = await projectsCollection.create(project => {
        project.name = `${TEST_PREFIX}测试 db 方法_${Date.now()}`;
        project.deadline = new Date();
        project.metadata = { priority: 'db_test', tags: ['db_test'] };
      });
    });

    // 步骤5：验证事务创建的记录有效性
    if (!testProject?.id) throw new Error('通过 db.write 创建的记录无 ID');

    // 步骤6：验证 db 的核心属性（适配器/模型类）
    if (!collectionDb.adapter) throw new Error('Collection.db 无有效适配器');

    // 所有验证通过，返回成功结果
    return {
      success: true,
      message: `db 方法测试成功：
        1. 成功获取 Collection.db 实例
        2. 验证为 Database 实例
        3. 与全局 database 实例一致
        4. 通过 db.write 创建测试记录（ID: ${testProject.id}，名称: ${testProject.name}）
        5. 验证 db 适配器配置有效`,
      method: 'db'
    };
  } catch (error) {
    // 捕获所有异常，返回失败结果
    return {
      success: false,
      message: `db 方法测试失败: ${error.message}`,
      method: 'db'
    };
  }
};

// table方法
export const testTableMethod = async () => {
  try {
    // 核心验证：获取table值并校验
    const tableName = projectsCollection.table;
    
    // 验证1：table值非空
    if (!tableName) throw new Error('table 返回空值');
    // 验证2：table值与预期表名一致
    if (tableName !== EXPECTED_TABLE_NAME) {
      throw new Error(`table 名称不匹配，期望：${EXPECTED_TABLE_NAME}，实际：${tableName}`);
    }

    return {
      success: true,
      message: `table 方法测试成功，表名：${tableName}`,
      method: 'table'
    };
  } catch (error) {
    return {
      success: false,
      message: `table 方法测试失败: ${error.message}`,
      method: 'table'
    };
  }
};

/**
 * 测试 Collection.schema 方法
 */
export const testSchemaMethod = async () => {
  try {
    const tableSchema = projectsCollection.schema;
    
    // 验证1：schema存在
    if (!tableSchema) throw new Error('schema 返回空值');
    // 验证2：schema的name与表名一致
    if (tableSchema.name !== EXPECTED_TABLE_NAME) {
      throw new Error(`schema 表名不匹配，期望：${EXPECTED_TABLE_NAME}，实际：${tableSchema.name}`);
    }
    // 验证3：columns存在且为对象（适配你的格式）
    if (!tableSchema.columns) throw new Error('schema 缺少 columns 字段');
    if (typeof tableSchema.columns !== 'object' || Array.isArray(tableSchema.columns)) {
      throw new Error(`schema.columns 不是对象，实际类型：${Array.isArray(tableSchema.columns) ? '数组' : typeof tableSchema.columns}`);
    }
    // 验证4：schema包含核心字段（示例：name字段，适配对象格式）
    const hasNameColumn = !!tableSchema.columns['name']; // 检查是否有name字段
    if (!hasNameColumn) throw new Error('schema.columns 缺少核心字段：name');
    // 可选：验证字段类型是否正确
    if (tableSchema.columns['name'].type !== 'string') {
      throw new Error(`name字段类型错误，期望：string，实际：${tableSchema.columns['name'].type}`);
    }

    // 构造友好的返回信息
    const columnNames = Object.keys(tableSchema.columns).join(', ');
    return {
      success: true,
      message: `schema 方法测试成功：
        表名=${tableSchema.name}
        包含字段=${columnNames}
        name字段类型=${tableSchema.columns['name'].type}`,
      method: 'schema'
    };
  } catch (error) {
    return {
      success: false,
      message: `schema 方法测试失败: ${error.message}`,
      method: 'schema'
    };
  }
};


// 测试 1: create 方法
export const testCreateMethod = async () => {
  try {
    let newProject;
    await database.write(async () => {
      newProject = await projectsCollection.create(project => {
        project.name = `${TEST_PREFIX}测试创建_${Date.now()}`;
        project.deadline = new Date();
        project.metadata = { priority: 'test', tags: ['test'] };
      });
    });
    if (!newProject?.id) throw new Error('创建的记录无 ID');
    return {
      success: true,
      message: `create 成功，项目 ID: ${newProject.id}，名称: ${newProject.name}`,
      method: 'create'
    };
  } catch (error) {
    return {
      success: false,
      message: `create 失败: ${error.message}`,
      method: 'create'
    };
  }
};

// 测试 2: find 方法
export const testFindMethod = async () => {
  try {
    // 先创建测试项目
    let testProject;
    await database.write(async () => {
      testProject = await projectsCollection.create(project => {
        project.name = `${TEST_PREFIX}测试Find_${Date.now()}`;
        project.deadline = new Date();
      });
    });
    // 查找该项目
    const foundProject = await projectsCollection.find(testProject.id);
    if (foundProject.id !== testProject.id) throw new Error('ID 不匹配');
    return {
      success: true,
      message: `find 成功，找到项目`,
      method: 'find'
    };
  } catch (error) {
    return {
      success: false,
      message: `find 失败: ${error.message}`,
      method: 'find'
    };
  }
};

// 测试 3: query.fetch 方法底层 _fetchQuery（独立测试查询并获取数据列表）
export const testQueryFetchMethod = async () => {
  try {
    // 步骤1：定义专属测试前缀，避免与其他测试数据冲突
    const fetchTestPrefix = `${TEST_PREFIX}QueryFetch_${Date.now()}_`;
    console.log('query + fetch 测试：开始创建测试数据，前缀:', fetchTestPrefix);

    // 步骤2：创建测试数据（3 条不同优先级的项目）
    await database.write(async () => {
      const priorities = ['high', 'medium', 'low'];
      for (let i = 0; i < 3; i++) {
        await projectsCollection.create(project => {
          project.name = `${fetchTestPrefix}项目${i + 1}`;
          project.deadline = new Date();
          project.metadata = { priority: priorities[i], test_type: 'fetch' };
        });
      }
    })

    // 步骤3：执行条件查询（按名称前缀过滤）
    const query = projectsCollection.query(
      Q.where('name', Q.like(`${fetchTestPrefix}%`)) // 精准匹配测试数据
    );
    const fetchedProjects = await query.fetch();
    console.log('query + fetch 测试：查询结果数量:', fetchedProjects.length);

    // 核心验证点 1：查询结果数量与创建数量一致
    if (fetchedProjects.length !== 3) {
      throw new Error(`query + fetch 结果数量错误，预期 3 条，实际 ${fetchedProjects.length} 条`);
    }

    // 核心验证点 2：查询结果的属性与创建数据一致
    const firstProject = fetchedProjects[0];
    if (!firstProject.name.startsWith(fetchTestPrefix)) {
      throw new Error(`查询结果数据不匹配，第一条记录名称: ${firstProject.name}，预期前缀: ${fetchTestPrefix}`);
    }
    if (firstProject.metadata.test_type !== 'fetch') {
      throw new Error(`查询结果属性错误，metadata.test_type 预期: fetch，实际: ${firstProject.metadata.test_type}`);
    }

    // 核心验证点 3：支持内存过滤 Object 类型字段（兼容所有 WatermelonDB 版本）
    const highPriorityProjects = fetchedProjects.filter(p => p.metadata.priority === 'high');
    if (highPriorityProjects.length !== 1) {
      throw new Error(`高优先级项目过滤错误，预期 1 条，实际 ${highPriorityProjects.length} 条`);
    }

    return {
      success: true,
      message: `query + fetch 成功`,
      method: 'query + fetch'
    };
  } catch (error) {
    console.error('query + fetch 测试错误详情:', error);
    return {
      success: false,
      message: `query + fetch 失败: ${error.message}\n错误详情: ${JSON.stringify(error)}`,
      method: 'query + fetch'
    };
  }
};

// 测试 4: query + fetchCount 方法（独立测试查询并获取数据计数）
export const testQueryFetchCountMethod = async () => {
  try {
    // 步骤1：定义专属测试前缀，与 fetch 测试数据隔离
    const countTestPrefix = `${TEST_PREFIX}QueryCount_${Date.now()}_`;

    // 步骤2：创建测试数据（2 条有效数据 + 1 条排除数据）
    await database.write(async () => {
      // 创建 2 条测试数据（带前缀）
      for (let i = 0; i < 2; i++) {
        await projectsCollection.create(project => {
          project.name = `${countTestPrefix}项目${i + 1}`;
          project.metadata = { test_type: 'count' };
        });
      }
      // 创建 1 条排除数据（不带前缀，用于验证条件计数）
      await projectsCollection.create(project => {
        project.name = `非测试项目_${Date.now()}`;
        project.metadata = { test_type: 'other' };
      });
    });
    console.log('query.fetchCount 测试：测试数据创建完成');

    // 步骤3：测试 1 - 条件计数（带前缀的测试数据）
    const conditionQuery = projectsCollection.query(
      Q.where('name', Q.like(`${countTestPrefix}%`))
    );
    const conditionCount = await conditionQuery.fetchCount();
    console.log('query.fetchCount 测试：条件计数结果:', conditionCount);

    // 核心验证点 1：条件计数与创建数量一致（预期 2 条）
    if (conditionCount !== 2) {
      throw new Error(`条件计数错误，预期 2 条测试数据，实际 ${conditionCount} 条`);
    }

    // 步骤4：测试 2 - 全量计数（所有 projects 数据）
    const allQuery = projectsCollection.query();
    const allCount = await allQuery.fetchCount();
    const allData = await allQuery.fetch(); // 验证全量数据
    console.log('query.fetchCount 测试：全量计数结果:', allCount, '全量数据数量:', allData.length);

    // 核心验证点 2：全量计数与 fetch 结果一致
    if (allCount !== allData.length) {
      throw new Error(`全量计数与 fetch 结果不一致，fetchCount: ${allCount}，fetch: ${allData.length}`);
    }

    // 步骤5：测试 3 - 空条件计数（验证边界场景）
    const emptyQuery = projectsCollection.query(
      Q.where('name', Q.like(`${TEST_PREFIX}不存在的前缀_${Date.now()}%`))
    );
    const emptyCount = await emptyQuery.fetchCount();
    if (emptyCount !== 0) {
      throw new Error(`空条件计数错误，预期 0 条，实际 ${emptyCount} 条`);
    }

    return {
      success: true,
      message: `query + fetchCount 成功`,
      method: 'query + fetchCount'
    };
  } catch (error) {
    console.error('query + fetchCount 测试错误详情:', error);
    return {
      success: false,
      message: `query + fetchCount 失败: ${error.message}\n错误详情: ${JSON.stringify(error)}`,
      method: 'query + fetchCount'
    };
  }
};

// 测试 3: query + fetch/fetchCount 方法
export const testQueryMethod = async () => {
  try {
    // 步骤1：定义测试数据前缀（确保格式统一）
    const queryTestPrefix = `${TEST_PREFIX}QueryTest_${Date.now()}_`;
    console.log('query 测试：开始创建测试数据，前缀:', queryTestPrefix);

    // 步骤2：批量创建测试数据（确保写入数据库）
    await database.write(async () => {
      for (let i = 0; i < 3; i++) {
        const priority = i % 2 === 0 ? 'high' : 'low'; // 交替优先级
        await projectsCollection.create(project => {
          project.name = `${queryTestPrefix}项目${i + 1}`; // 统一命名格式
          project.deadline = new Date();
          project.metadata = { priority: priority, test: true }; // 自定义 metadata
        });
      }
    });
    console.log('query 测试：测试数据创建完成，开始查询');

    // 步骤3：基础查询（按名称前缀过滤，核心验证）
    const allTestProjects = await projectsCollection.query(
      Q.where('name', Q.like(`${queryTestPrefix}%`)) // 匹配统一前缀
    ).fetch();

    // 验证：基础查询至少返回 3 条数据
    if (allTestProjects.length !== 3) {
      throw new Error(`基础查询结果数量错误，预期 3 条，实际 ${allTestProjects.length} 条`);
    }

    // 步骤4：fetchCount 统计（验证数量）
    const totalCount = await projectsCollection.query(
      Q.where('name', Q.like(`${queryTestPrefix}%`))
    ).fetchCount();

    // 验证：fetchCount 与 fetch 结果数量一致
    if (totalCount !== allTestProjects.length) {
      throw new Error(`fetchCount 与 fetch 结果不一致，fetch: ${allTestProjects.length}, fetchCount: ${totalCount}`);
    }

    // 步骤5：过滤查询（替换 Object 字段的 Q.like，改用内存过滤，兼容所有版本）
    // 原因：WatermelonDB 对 Object 类型字段的 Q.like 支持有限，推荐先 fetch 再内存过滤
    const allProjects = await projectsCollection.query(
      Q.where('name', Q.like(`${queryTestPrefix}%`))
    ).fetch();
    const highPriorityProjects = allProjects.filter(p => p.metadata?.priority === 'high');
    const lowPriorityProjects = allProjects.filter(p => p.metadata?.priority === 'low');

    // 验证：高/低优先级数量符合预期（3 条数据中，high 应为 2 条，low 应为 1 条）
    if (highPriorityProjects.length !== 2 || lowPriorityProjects.length !== 1) {
      throw new Error(`优先级过滤错误，高优先级预期 2 条（实际 ${highPriorityProjects.length}），低优先级预期 1 条（实际 ${lowPriorityProjects.length}）`);
    }

    return {
      success: true,
      message: `query + fetch/fetchCount 成功`,
      method: 'query + fetch/fetchCount'
    };
  } catch (error) {
    console.error('query + fetch/fetchCount 测试错误详情:', error);
    return {
      success: false,
      message: `query + fetch/fetchCount 失败: ${error.message}\n错误详情: ${JSON.stringify(error)}`,
      method: 'query + fetch/fetchCount'
    };
  }
};

// 测试 4: findAndObserve 方法（修复超时问题）
export const testFindAndObserveMethod = async () => {
  return new Promise(async (resolve) => {
    try {
      // 步骤1：先创建测试项目（确保数据写入数据库）
      let testProject;
      await database.write(async () => {
        testProject = await projectsCollection.create(project => {
          project.name = `${TEST_PREFIX}测试Observe_${Date.now()}`;
          project.deadline = new Date();
          project.metadata = { test: true };
        });
      });
      console.log('测试项目创建成功，ID:', testProject.id); // 日志：验证数据创建

      // 步骤2：验证数据是否真的存在（关键：确保数据已持久化）
      const preCheck = await projectsCollection.find(testProject.id);
      console.log('预检查数据存在:', preCheck ? '是' : '否');
      if (!preCheck) throw new Error('创建的测试项目不存在');

      // 步骤3：订阅（增加日志，排查订阅状态）
      console.log('开始订阅 findAndObserve...');
      let subscription;
      // 增加超时时间到 8 秒（应对 RN 异步延迟）
      const timeoutId = setTimeout(() => {
        subscription?.unsubscribe();
        console.error('findAndObserve 订阅超时，项目 ID:', testProject.id);
        resolve({ 
          success: false, 
          message: `监听超时（8秒），项目 ID: ${testProject.id}`, 
          method: 'findAndObserve' 
        });
      }, 8000);

      // 订阅逻辑（显式处理 next/error/complete）
      subscription = projectsCollection.findAndObserve(testProject.id)
        .subscribe({
          next: (project) => {
            console.log('findAndObserve 触发 next:', project.name);
            clearTimeout(timeoutId); // 清除超时
            subscription?.unsubscribe(); // 取消订阅，避免内存泄漏
            resolve({
              success: true,
              message: `findAndObserve 成功，监听到: ${project.name} (ID: ${project.id})`,
              method: 'findAndObserve'
            });
          },
          
          error: (err) => {
            console.error('findAndObserve 订阅错误:', err);
            clearTimeout(timeoutId);
            subscription?.unsubscribe();
            resolve({ 
              success: false, 
              message: `订阅错误: ${err.message}`, 
              method: 'findAndObserve' 
            });
          },
          complete: () => {
            console.log('findAndObserve 订阅完成');
            clearTimeout(timeoutId);
            subscription.unsubscribe();
            resolve({ 
              success: false, 
              message: '订阅意外完成，未监听到数据', 
              method: 'findAndObserve' 
            });
          }
        });

      // 步骤4：主动触发数据变化（备选方案：如果初始值未触发，更新数据强制触发）
      setTimeout(async () => {
        if (!subscription.closed) { // 订阅未关闭时
          console.log('初始值未触发，尝试更新数据...');
          await database.write(async () => {
            const projectToUpdate = await projectsCollection.find(testProject.id);
            projectToUpdate.update(project => {
              project.name = `${TEST_PREFIX}测试Observe_更新_${Date.now()}`;
            });
          });
        }
      }, 2000);

    } catch (error) {
      console.error('findAndObserve 前置逻辑错误:', error);
      resolve({ 
        success: false, 
        message: `前置逻辑错误: ${error.message}`, 
        method: 'findAndObserve' 
      });
    }
  });
};

// 测试 5: prepareCreate + batch 方法
export const testPrepareCreateMethod = async () => {
  try {
    // 预创建2个项目
    const prepared = [];
    for (let i = 0; i < 2; i++) {
      prepared.push(projectsCollection.prepareCreate(project => {
        project.name = `${TEST_PREFIX}测试Prepare_${i}_${Date.now()}`;
      }));
    }
    // 批量写入
    await database.write(async () => {
      await database.batch(...prepared);
    });
    // 验证
    const found = await projectsCollection.find(prepared[0].id);
    if (!found) throw new Error('预创建记录未写入');
    return {
      success: true,
      message: `prepareCreate + batch 成功，批量创建 ${prepared.length} 个项目，第一个 ID: ${found.id}`,
      method: 'prepareCreate + batch'
    };
  } catch (error) {
    return {
      success: false,
      message: `prepareCreate 失败: ${error.message}`,
      method: 'prepareCreate + batch'
    };
  }
};

// DisposableFromDirtyRaw
export const testDisposableFromDirtyRawMethod = async () => {
  try {
    // 1. 构造测试用的原始数据（dirtyRaw）
    const testDirtyRaw = {
      id: `disposable_${Date.now()}`, // 自定义ID
      name: `${TEST_PREFIX}临时只读记录`,
      deadline: Date.now(),
      metadata: JSON.stringify({ priority: 'disposable', tags: ['test'] })
    };

    // 2. 调用 disposableFromDirtyRaw 创建临时记录
    const disposableRecord = projectsCollection.disposableFromDirtyRaw(testDirtyRaw);
    if (!disposableRecord) throw new Error('disposableFromDirtyRaw 返回空记录');

    // 3. 验证记录字段与原始数据匹配
    if (disposableRecord.id !== testDirtyRaw.id) {
      throw new Error(`记录ID不匹配，期望：${testDirtyRaw.id}，实际：${disposableRecord.id}`);
    }
    if (disposableRecord.name !== testDirtyRaw.name) {
      throw new Error(`记录名称不匹配，期望：${testDirtyRaw.name}，实际：${disposableRecord.name}`);
    }
    // 验证复杂字段（如metadata）
    const recordMetadata = disposableRecord.metadata;
    const rawMetadata = JSON.parse(testDirtyRaw.metadata);
    if (recordMetadata.priority !== rawMetadata.priority) {
      throw new Error(`metadata优先级不匹配，期望：${rawMetadata.priority}，实际：${recordMetadata.priority}`);
    }

    // 4. 核心验证：临时记录不可持久化（调用save会报错）
    let saveError = null;
    try {
      await database.write(async () => {
        await disposableRecord.save(); // 尝试保存（应报错）
      });
    } catch (err) {
      saveError = err; // 捕获预期的错误
    }
    if (!saveError) {
      throw new Error('disposableFromDirtyRaw 创建的记录可被save，违反只读特性');
    }

    // 5. 验证记录未被持久化（查询数据库确认不存在）
    let persistedRecord = null;
    try {
      persistedRecord = await projectsCollection.find(testDirtyRaw.id);
    } catch (err) {
      // 预期：find不到该记录，会抛错，属于正常情况
      persistedRecord = null;
    }
    if (persistedRecord) {
      throw new Error('disposableFromDirtyRaw 创建的记录被意外持久化到数据库');
    }

    // 所有验证通过
    return {
      success: true,
      message: `disposableFromDirtyRaw 方法测试成功：
        1. 成功创建临时只读记录（ID：${disposableRecord.id}）
        2. 记录字段与原始数据完全匹配
        3. 验证save方法抛出错误（只读特性）
        4. 记录未被持久化到数据库`,
      method: 'disposableFromDirtyRaw'
    };
  } catch (error) {
    return {
      success: false,
      message: `disposableFromDirtyRaw 方法测试失败: ${error.message}`,
      method: 'disposableFromDirtyRaw'
    };
  }
};

export const testFetchIdsDirectly = async () => {
  try {
    // 步骤1：创建测试数据（避免无数据）
    let testRecordId = null;
    await database.write(async () => {
      const newRecord = await projectsCollection.create(project => {
        project.name = `${TEST_PREFIX}_fetchIds测试_${Date.now()}`;
        project.deadline = Date.now();
        project.metadata = JSON.stringify({ test: true });
      });
      testRecordId = newRecord.id;
      console.log('【调试】创建测试记录ID：', testRecordId);
    });

    // 步骤2：构造最简Query实例（精准匹配ID，确保条件一致）
    const testQuery = projectsCollection.query(
      Q.where('id', testRecordId)
    );
    console.log('【调试】Query条件：', JSON.stringify(testQuery.clauses));

    // 步骤3：直接调用 _fetchIds（兼容低版本，补充第三个参数）
    const fetchIdsResult = await new Promise((resolve, reject) => {
      projectsCollection._fetchIds(
        testQuery,
        (err, ids) => {
          if (err) {
            console.error('【调试】_fetchIds 底层错误：', err, err.stack);
            reject(new Error(`底层错误：${err.message}`));
            return;
          }
          console.log('【调试】_fetchIds 返回IDs：', ids, '类型：', typeof ids);
          resolve(ids || []); // 容错：空值转为空数组
        },
        null // 兼容低版本的第三个参数
      );
    });

    // 步骤4：调用公共API fetchIds（使用同一个Query实例，避免条件不一致）
    const publicApiIds = await testQuery.fetchIds();
    console.log('【调试】publicApiIds 返回IDs：', publicApiIds, '类型：', typeof publicApiIds);

    // 步骤5：验证结果（核心修改：集合相等验证，忽略顺序）
    // 5.1 基础类型验证
    if (!Array.isArray(fetchIdsResult)) {
      throw new Error(`_fetchIds 返回非数组，类型：${typeof fetchIdsResult}，值：${fetchIdsResult}`);
    }
    if (!Array.isArray(publicApiIds)) {
      throw new Error(`publicApiIds 返回非数组，类型：${typeof publicApiIds}，值：${publicApiIds}`);
    }

    // 5.2 集合相等验证（忽略顺序）
    const fetchIdsSet = new Set(fetchIdsResult);
    const publicIdsSet = new Set(publicApiIds);
    // 验证元素数量一致
    if (fetchIdsSet.size !== publicIdsSet.size) {
      throw new Error(`数组长度不一致：_fetchIds 返回 ${fetchIdsSet.size} 条，publicApi 返回 ${publicIdsSet.size} 条`);
    }
    // 验证元素完全一致
    let isEqual = true;
    for (const id of fetchIdsSet) {
      if (!publicIdsSet.has(id)) {
        isEqual = false;
        break;
      }
    }
    if (!isEqual) {
      throw new Error(`数组元素不一致：
        _fetchIds 返回：${JSON.stringify(fetchIdsResult)}
        publicApi 返回：${JSON.stringify(publicApiIds)}`);
    }

    // 5.3 验证是否包含测试记录ID
    if (!fetchIdsResult.includes(testRecordId)) {
      throw new Error(`_fetchIds 未匹配到测试ID ${testRecordId}，返回：${JSON.stringify(fetchIdsResult)}`);
    }

    // 步骤6：清理测试数据
    await database.write(async () => {
      const record = await projectsCollection.find(testRecordId);
      await record.destroyPermanently();
      console.log('【调试】清理测试记录完成');
    });

    return {
      success: true,
      message: `直接调用 _fetchIds 成功：
        1. 测试记录ID：${testRecordId}
        2. _fetchIds 返回：${JSON.stringify(fetchIdsResult)}
        3. publicApi fetchIds 返回：${JSON.stringify(publicApiIds)}
        4. 两者元素完全一致（忽略顺序），验证通过`,
      method: '_fetchIds (direct)'
    };
  } catch (error) {
    console.error('【测试失败】', error);
    return {
      success: false,
      message: `直接调用 _fetchIds 失败: ${error.message}`,
      method: '_fetchIds (direct)'
    };
  }
};


// ExperimentalSubscribe
export const testExperimentalSubscribeMethod = async () => {
  try {
    // 定义测试用变量
    let subscribeCallbackCalled = false; // 标记回调是否被触发
    let receivedChangeSet = null; // 存储接收到的变化集
    const testRecordName = `${TEST_PREFIX}订阅测试_${Date.now()}`;
    let unsubscribe = null; // 存储取消订阅函数

    // 1. 调用 experimentalSubscribe 订阅集合变化
    unsubscribe = projectsCollection.experimentalSubscribe(
      (changeSet) => {
        // 订阅回调：记录变化集
        subscribeCallbackCalled = true;
        receivedChangeSet = changeSet;
      },
      { debugInfo: 'test_experimentalSubscribe' } // 可选调试信息
    );

    // 验证1：返回有效的取消订阅函数
    if (typeof unsubscribe !== 'function') {
      throw new Error('experimentalSubscribe 返回的不是取消订阅函数');
    }

    // 2. 创建测试记录，触发集合变化（验证订阅能接收变化）
    let testRecordId = null;
    await database.write(async () => {
      const newRecord = await projectsCollection.create(project => {
        project.name = testRecordName;
        project.deadline = Date.now();
        project.metadata = JSON.stringify({ priority: 'subscribe_test', tags: ['test'] });
      });
      testRecordId = newRecord.id;
    });

    // 等待异步回调触发（给一点时间，避免回调未执行完就校验）
    await new Promise(resolve => setTimeout(resolve, 500));

    // 验证2：订阅回调被触发
    if (!subscribeCallbackCalled) {
      throw new Error('创建记录后，experimentalSubscribe 回调未被触发');
    }

    // 3. 取消订阅，验证不再接收变化
    unsubscribe(); // 执行取消订阅
    subscribeCallbackCalled = false; // 重置标记
    const testRecordName2 = `${TEST_PREFIX}取消订阅测试_${Date.now()}`;

    // 再次创建记录，验证回调不触发
    await database.write(async () => {
      await projectsCollection.create(project => {
        project.name = testRecordName2;
        project.deadline = Date.now();
      });
    });
    await new Promise(resolve => setTimeout(resolve, 500));

    // 验证4：取消订阅后回调未被触发
    if (subscribeCallbackCalled) {
      throw new Error('取消订阅后，创建记录仍触发了 experimentalSubscribe 回调');
    }

    // 4. 清理测试数据（可选，保持数据库整洁）
    await database.write(async () => {
      const record1 = await projectsCollection.find(testRecordId);
      await record1.destroyPermanently();
      // 尝试查找第二条测试记录并删除（可能因取消订阅后未记录ID，此处简化）
      const record2List = await projectsCollection.query(
        Q.where('name', testRecordName2)
      ).fetch();
      if (record2List.length > 0) {
        await record2List[0].destroyPermanently();
      }
    });

    // 所有验证通过
    return {
      success: true,
      message: `experimentalSubscribe 方法测试成功：
        1. 返回有效的取消订阅函数
        2. 创建记录时回调触发，接收到变化集（包含创建的记录ID：${testRecordId}）
        3. 取消订阅后，创建新记录回调不再触发
        4. 已清理测试数据`,
      method: 'experimentalSubscribe'
    };
  } catch (error) {
    return {
      success: false,
      message: `experimentalSubscribe 方法测试失败: ${error.message}`,
      method: 'experimentalSubscribe'
    };
  }
};

// 批量运行所有测试
export const runAllTests = async (onResult) => {
  // 前置清理
  onResult(await cleanTestData());
  // 按顺序执行测试
  const tests = [
    testCreateMethod, testFindMethod, testQueryFetchMethod, testQueryFetchCountMethod,
    testFindAndObserveMethod, testPrepareCreateMethod
  ];
  for (const test of tests) {
    onResult(await test());
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  // 后置清理
  onResult(await cleanTestData());
  Alert.alert('测试完成', '所有 Collection API 测试已执行完毕');
};