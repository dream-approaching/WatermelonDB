import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  Alert,
  SafeAreaView
} from 'react-native';
import {
  Database,
  Model,
  tableSchema,
  appSchema,
  Q
} from '@react-native-ohos/watermelondb';
import { field, relation } from "@react-native-ohos/watermelondb/src/decorators";
import SQLiteAdapter from '@react-native-ohos/watermelondb/adapters/sqlite';

// ===================== 1. 数据库Schema定义 =====================
// 用户表Schema
const userTableSchema = tableSchema({
  name: 'users',
  columns: [
    { name: 'name', type: 'string' },
    { name: 'phone', type: 'string' }
  ]
});

// 个人资料表Schema（关联用户表）
const profileTableSchema = tableSchema({
  name: 'profiles',
  columns: [
    { name: 'bio', type: 'string' },
    { name: 'age', type: 'number' },
    { name: 'user_id', type: 'string' } // 关联用户ID的外键
  ]
});

// 应用Schema
const appSchemaConfig = appSchema({
  version: 1,
  tables: [userTableSchema, profileTableSchema]
});

// ===================== 2. 鸿蒙适配的数据库适配器 =====================
const adapter = new SQLiteAdapter({
  dbName: 'RelationTestDB_Harmony',
  schema: appSchemaConfig,
  jsi: false, // 鸿蒙RN禁用JSI
  onSetUpError: (error) => {
    console.error('数据库初始化失败:', error);
    Alert.alert('错误', `数据库配置异常: ${error.message}`);
  },
  // 鸿蒙特定SQLite配置
  sqliteConfig: {
    name: 'RelationTestDB_Harmony.db',
    location: 'default',
    allowFileUriScheme: true
  }
});

// ===================== 3. 关联模型定义 =====================
// 用户模型（一对一生成Profile）
class User extends Model {
  static table = 'users';

  @field('name') name;
  @field('phone') phone;
  // 关联Profile模型（一对一）
  // @relation('profiles', 'user_id') profile;

  static associations = {
    profiles: { type: 'has_many', foreignKey: 'user_id' }
  };
}

// 资料模型（属于User）
class Profile extends Model {
  static table = 'profiles';

  @field('bio') bio;
  @field('age') age;
  // 关联User模型
  @relation('users', 'user_id') user;

  static associations = {
    users: { type: 'belongs_to', key: 'user_id' }
  };
}

// ===================== 4. 数据库实例初始化 =====================
const database = new Database({
  adapter,
  modelClasses: [User, Profile]
});

// 获取集合引用
const usersCollection = database.collections.get('users');
const profilesCollection = database.collections.get('profiles');

// ===================== 5. 主应用组件 =====================
const WatermerlonDBRelation = () => {
  // 状态管理
  const [users, setUsers] = useState([]); // 所有用户
  const [selectedUser, setSelectedUser] = useState(null); // 选中的用户
  const [observedProfile, setObservedProfile] = useState(null); // 监听中的资料
  const [logList, setLogList] = useState([]); // 操作日志
  const [newUserName, setNewUserName] = useState(''); // 新用户名
  const [newUserPhone, setNewUserPhone] = useState(''); // 新用户电话
  const [newProfileBio, setNewProfileBio] = useState(''); // 新资料简介
  const [newProfileAge, setNewProfileAge] = useState(''); // 新资料年龄

  // 监听订阅引用（用于取消监听）
  const profileSubscription = useRef(null);

  // ===================== 工具方法 =====================
  // 日志记录（保留最近15条）
  // 自定义时间格式化函数（替代 toLocaleTimeString，无任何原生依赖）
  const formatTime = (date = new Date()) => {
      // 获取时分秒，并补零（保证格式：HH:MM:SS）
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      // 拼接成和 toLocaleTimeString() 一致的格式（如 14:35:28）
      return `${hours}:${minutes}:${seconds}`;
  };
  const log = (message) => {
    // ✅ 用时间戳+随机数生成唯一ID，避免重复
    const uniqueId = Date.now() + Math.floor(Math.random() * 10000);
    const newLog = { id: uniqueId, time: formatTime(), message };
    setLogList(prev => [newLog, ...prev.slice(0, 14)]);
    console.log(`[${newLog.time}] ${message}`);
  };

  // 加载所有用户
  const loadUsers = async () => {
    try {
      const allUsers = await usersCollection.query().fetch();
      setUsers(allUsers);
      log('用户列表加载完成，共' + allUsers.length + '个用户');
    } catch (error) {
      log('加载用户失败: ' + error.message);
    }
  };

  // ===================== 生命周期 =====================
  useEffect(() => {
    // 初始化加载用户
    loadUsers();

    // 组件卸载时取消监听
    return () => {
      if (profileSubscription.current) {
        profileSubscription.current.unsubscribe();
        log('取消Profile监听');
      }
    };
  }, []);

  // ===================== 核心方法测试 - 业务逻辑 =====================
  /**
   * 1. 创建用户（基础数据准备）
   */
  const createUser = async () => {
    if (!newUserName || !newUserPhone) {
      Alert.alert('提示', '请输入用户名和手机号');
      return;
    }

    try {
      await database.write(async () => {
        await usersCollection.create(user => {
          user.name = newUserName;
          user.phone = newUserPhone;
        });
      });
      log(`创建用户成功: ${newUserName} (${newUserPhone})`);
      setNewUserName('');
      setNewUserPhone('');
      loadUsers();
    } catch (error) {
      log('创建用户失败: ' + error.message);
    }
  };

  /**
   * 2. 创建Profile并关联用户（使用set(record)方法）
   */
  const createAndLinkProfile = async () => {
    if (!selectedUser || !newProfileBio || !newProfileAge) {
      Alert.alert('提示', '请选择用户并填写资料信息');
      return;
    }

    try {
      await database.write(async () => {
        // 创建Profile并关联用户（set(record)核心方法）
        const newProfile = await profilesCollection.create(profile => {
          profile.bio = newProfileBio;
          profile.age = parseInt(newProfileAge, 10);
          profile.user.set(selectedUser); // 关键：set(record)关联用户
          log(`使用set(record)关联用户: ${selectedUser.name}`);
        });

        // 使用then()方法链式处理关联数据
        newProfile.user.then(linkedUser => {
          log(`使用then()获取关联用户: ${linkedUser.name} (ID: ${linkedUser.id})`);
        });
        log(`Profile 写入的 user_id: ${newProfile.user.id}`);
      });

      await loadUsers();
      setSelectedUser(users.find(u => u.id === selectedUser.id));

      log(`创建Profile成功: ${newProfileBio} (年龄: ${newProfileAge})`);
      setNewProfileBio('');
      setNewProfileAge('');
    } catch (error) {
      log('创建Profile失败: ' + error.message);
    }
  };

  /**
   * 3. 获取关联ID + 异步获取关联实例（get id() + fetch()）
   */
  const getRelationData = async () => {
    if (!selectedUser) {
      Alert.alert('提示', '请先选择用户');
      return;
    }

    try {
      // ✅ 方案1：只打印关键字段，避免循环序列化
      log(`当前选中用户: ${selectedUser.name} (ID: ${selectedUser.id})`);

      // 一对多场景：查询所有关联的Profile
      const allUserProfiles = await profilesCollection.query(
        Q.where('user_id', selectedUser.id)
      ).fetch();
      
      log(`该用户关联的Profile总数: ${allUserProfiles.length}`);
      if (allUserProfiles.length === 0) {
        log('该用户暂无关联的Profile');
        return;
      }
  
      // 遍历打印所有Profile的ID和信息
      allUserProfiles.forEach((profile, index) => {
        log(`第${index+1}条Profile - ID: ${profile.id}, 简介: ${profile.bio}, 年龄: ${profile.age}`);
      });
  
      // 选第一条作为当前观察的Profile
      setObservedProfile(allUserProfiles[0]);
      log(`默认观察第一条Profile: ${allUserProfiles[0].bio}`);

      // // get id()：获取关联Profile的ID
      // const profileId = selectedUser.profile.id;
      // log(`使用get id()获取关联Profile ID: ${profileId || '无关联ID'}`);

      // if (!profileId) {
      //   // 调试3：手动查询 Profile 表中该用户的关联记录
      //   const userProfiles = await profilesCollection.query(
      //     Q.where('user_id', selectedUser.id)
      //   ).fetch();
      //   log(`Profile 表中关联该用户的记录数: ${userProfiles.length}`);
      //   if (userProfiles.length > 0) {
      //     log(`手动查询到的 Profile ID: ${userProfiles[0].id}`);
      //   }
      //   return;
      // }

      // // fetch()：异步获取完整关联实例
      // const profile = await selectedUser.profile.fetch();
      // log(`使用fetch()获取关联Profile: 简介=${profile.bio}, 年龄=${profile.age}`);
      // setObservedProfile(profile);
    } catch (error) {
      log('获取关联数据失败: ' + error.message);
    }
  };

  /**
   * 4. 解除关联（使用set id(newId)方法，设置为null）
   */
  const unlinkProfile = async () => {
    if (!selectedUser) {
      Alert.alert('提示', '请先选择用户');
      return;
    }

    try {
      await database.write(async () => {
        // 关键：修改Profile实例的user_id为null（解除关联）
        await observedProfile.update(profile => {
          // 方式1：通过set id(null)修改关联ID
          profile.user.id = null;
          // 方式2：等价写法（直接修改外键字段）
          // profile._raw.user_id = null;
          log(`解除Profile#${observedProfile.id}与User#${selectedUser.id}的关联`);
        });
      });
      await loadUsers();
      setObservedProfile(null);
      log(`解除关联成功`);
    } catch (error) {
      log('解除关联失败: ' + error.message);
    }
  };

  /**
   * 5. 监听关联Profile变化（observe()核心方法）
   */
  const observeProfileChange = async () => {
    if (!selectedUser) {
      Alert.alert('提示', '请先选择用户');
      return;
    }

    // 取消之前的监听
    if (profileSubscription.current) {
      profileSubscription.current.unsubscribe();
      log('取消之前的Profile监听');
    }

    try {
      // observe()：监听关联Profile变化
      const observable = profilesCollection.query(Q.where('user_id', selectedUser.id)).observe(); // 监听查询结果的变化（新增/修改/删除）
      profileSubscription.current = observable.subscribe({
        next: (userProfiles) => {
          // userProfiles 是数组（该用户的所有Profile）
          log(`监听到用户${selectedUser.name}的Profile变化，共${userProfiles.length}条`);
          if (userProfiles.length > 0) {
            // 可选：默认选中第一条Profile展示
            setObservedProfile(userProfiles[0]);
            log(`当前最新Profile: 简介=${userProfiles[0].bio}, 年龄=${userProfiles[0].age}`);
          } else {
            setObservedProfile(null);
            log('该用户已无关联的Profile');
          }
        },
        error: (error) => {
          log(`Profile监听异常: ${error.message}`);
        },
        complete: () => {
          log('Profile监听结束');
        }
      });

      log(`开始监听用户[${selectedUser.name}]的Profile变化`);
    } catch (error) {
      log('启动监听失败: ' + error.message);
    }
  };

  /**
   * 6. 更新当前监听的Profile（用于测试observe()的响应式）
   */
  const updateObservedProfile = async () => {
    if (!observedProfile) {
      Alert.alert('提示', '暂无监听中的Profile');
      return;
    }

    try {
      await database.write(async () => {
        await observedProfile.update(profile => {
          profile.bio = `${observedProfile.bio} [更新于${formatTime()}]`;
          profile.age = observedProfile.age + 1;
        });
      });
      log('更新Profile成功（可查看observe()是否触发）');
    } catch (error) {
      log('更新Profile失败: ' + error.message);
    }
  };

  // ===================== UI渲染 =====================
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
        {/* 标题 */}
        <Text style={styles.title}>WatermelonDB Relation核心方法测试（鸿蒙RN）</Text>

        {/* 1. 创建用户区域 */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>🔹 步骤1：创建用户</Text>
          <TextInput
            style={styles.input}
            placeholder="输入用户名"
            value={newUserName}
            onChangeText={setNewUserName}
          />
          <TextInput
            style={styles.input}
            placeholder="输入手机号"
            value={newUserPhone}
            onChangeText={setNewUserPhone}
            keyboardType="phone-pad"
          />
          <Button
            title="创建用户"
            onPress={createUser}
            style={styles.btn}
          />

          {/* 用户选择区 */}
          <View style={styles.selectArea}>
            <Text style={styles.label}>已创建用户（点击选择）：</Text>
            <View style={styles.userList}>
              {users.length === 0 ? (
                <Text style={styles.emptyText}>暂无用户，请先创建</Text>
              ) : (
                users.map(user => (
                  <Button
                    key={user.id}
                    title={user.name}
                    onPress={() => {
                      setSelectedUser(user);
                      log(`选中用户: ${user.name} (ID: ${user.id})`);
                    }}
                    color={selectedUser?.id === user.id ? '#1890ff' : '#666'}
                  />
                ))
              )}
            </View>
          </View>
        </View>

        {/* 2. 创建关联Profile区域 */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>🔹 步骤2：创建并关联Profile</Text>
          <TextInput
            style={styles.input}
            placeholder="输入个人简介"
            value={newProfileBio}
            onChangeText={setNewProfileBio}
          />
          <TextInput
            style={styles.input}
            placeholder="输入年龄"
            value={newProfileAge}
            onChangeText={setNewProfileAge}
            keyboardType="numeric"
          />
          <Button
            title="创建并关联Profile（set(record)）"
            onPress={createAndLinkProfile}
            disabled={!selectedUser}
            style={styles.btn}
          />
        </View>

        {/* 3. 关联操作区域（get/set id + fetch） */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>🔹 步骤3：关联数据操作</Text>
          <Button
            title="获取关联ID + fetch()实例"
            onPress={getRelationData}
            disabled={!selectedUser}
            style={styles.btn}
          />
          <Button
            title="解除关联（set id(null)）"
            onPress={unlinkProfile}
            disabled={!selectedUser}
            color="#ff4d4f"
            style={styles.btn}
          />
        </View>

        {/* 4. 监听区域（observe()） */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>🔹 步骤4：监听关联变化（observe()）</Text>
          <Button
            title="启动Profile监听"
            onPress={observeProfileChange}
            disabled={!selectedUser}
            style={styles.btn}
          />
          <Button
            title="更新当前Profile（测试observe）"
            onPress={updateObservedProfile}
            disabled={!observedProfile}
            style={styles.btn}
          />

          {/* 当前监听的Profile信息 */}
          {observedProfile && (
            <View style={styles.profileCard}>
              <Text style={styles.cardTitle}>当前监听的Profile：</Text>
              <Text>ID: {observedProfile.id}</Text>
              <Text>简介: {observedProfile.bio}</Text>
              <Text>年龄: {observedProfile.age}</Text>
              <Text>关联用户ID: {observedProfile.user.id}</Text>
            </View>
          )}
        </View>

        {/* 5. 操作日志区域 */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>🔹 操作日志</Text>
          <View style={styles.logContainer}>
            {logList.length === 0 ? (
              <Text style={styles.emptyText}>暂无操作日志</Text>
            ) : (
              logList.map(log => (
                <Text key={log.id} style={styles.logItem}>
                  [{log.time}] {log.message}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ===================== 样式定义 =====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1890ff',
  },
  input: {
    height: 44,
    borderColor: '#e5e5e5',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  btn: {
    marginBottom: 8,
  },
  selectArea: {
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  userList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#1890ff',
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 6,
  },
  logContainer: {
    maxHeight: 200,
    overflow: 'auto',
    backgroundColor: '#fafafa',
    borderRadius: 6,
    padding: 12,
  },
  logItem: {
    fontSize: 12,
    lineHeight: 18,
    color: '#333',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 8,
  },
});

export default WatermerlonDBRelation;