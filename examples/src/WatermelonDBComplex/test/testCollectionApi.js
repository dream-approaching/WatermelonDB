import { Q } from '@react-native-ohos/watermelondb';
import { database, projectsCollection, tasksCollection } from './dbConfig';
import { Alert } from 'react-native';

// 测试结果结构说明：{ success: boolean, message: string, method: string }

// 测试数据前缀（避免污染业务数据）
const TEST_PREFIX = '[TEST]';

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
const testDbMethod = async () => {
  try {
    // 测试点1：获取 Collection 的 db 实例
    const collectionDb = tasksCollection.db;
    setTestResult(prev => `${prev}✅ 获取 Collection.db 实例成功\n`);

    // 测试点2：验证返回值是 Database 实例
    if (collectionDb instanceof Database) {
      setTestResult(prev => `${prev}✅ Collection.db 是 Database 实例\n`);
    } else {
      throw new Error('Collection.db 不是 Database 实例');
    }

    // 测试点3：验证 db 与初始化的 database 实例一致
    if (collectionDb === database) {
      setTestResult(prev => `${prev}✅ Collection.db 与全局 database 实例一致\n`);
    } else {
      throw new Error('Collection.db 与全局 database 实例不一致');
    }

    // 测试点4：通过 db 调用 Database 的核心方法（write 事务）
    await collectionDb.write(async () => {
      // 临时创建一条测试记录（验证 db 的 write 能力）
      const testTask = await tasksCollection.create(task => {
        task.name = `测试 db 方法_${Date.now()}`;
        task.is_completed = false;
      });
      setTestResult(prev => `${prev}✅ 通过 db.write 创建测试记录成功，ID：${testTask.id}\n`);
    });

    // 测试点5：验证 db 的适配器/模型类配置
    if (collectionDb.adapter) {
      setTestResult(prev => `${prev}✅ Collection.db 包含有效适配器\n`);
    }
    if (collectionDb.modelClasses.includes(Task)) {
      setTestResult(prev => `${prev}✅ Collection.db 已注册 Task 模型\n`);
    }

    setTestResult(prev => `${prev}\n🎉 Collection.db 方法测试全部通过！`);
  } catch (error) {
    setTestResult(prev => `${prev}\n❌ 测试失败：${error.message}`);
    console.error('Collection.db 测试报错：', error);
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

// 测试 3: query + fetch 方法（独立测试查询并获取数据列表）
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
    });
    console.log('query + fetch 测试：测试数据创建完成');

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
    console.log('query + fetchCount 测试：开始创建测试数据，前缀:', countTestPrefix);

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
    console.log('query + fetchCount 测试：测试数据创建完成');

    // 步骤3：测试 1 - 条件计数（带前缀的测试数据）
    const conditionQuery = projectsCollection.query(
      Q.where('name', Q.like(`${countTestPrefix}%`))
    );
    const conditionCount = await conditionQuery.fetchCount();
    console.log('query + fetchCount 测试：条件计数结果:', conditionCount);

    // 核心验证点 1：条件计数与创建数量一致（预期 2 条）
    if (conditionCount !== 2) {
      throw new Error(`条件计数错误，预期 2 条测试数据，实际 ${conditionCount} 条`);
    }

    // 步骤4：测试 2 - 全量计数（所有 projects 数据）
    const allQuery = projectsCollection.query();
    const allCount = await allQuery.fetchCount();
    const allData = await allQuery.fetch(); // 验证全量数据
    console.log('query + fetchCount 测试：全量计数结果:', allCount, '全量数据数量:', allData.length);

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