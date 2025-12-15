# Todo
Done associations 定义模型与其他数据表之间的关联关系映射.
Model prepareMarkAsDeleted 标记为删除状态。
Model _getChanges 获取模型变更观察对象。
Model prepareDestroyPermanently 准备永久销毁但不执行。
Model callWriter<T> 在写入线程执行操作。
Model callReader<T>  在读取线程执行查询。
Model subAction<T> 在事务中执行子操作。
Model prepareCreate 准备创建模型。
Model _prepareCreateFromDirtyRaw 从脏数据创建模型。
Model _disposableFromDirtyRaw 创建一次性模型。
Model _notifyChanged 内部通知模型变更。
Model _notifyDestroyed 内部通知模型销毁。
Model _getRaw 内部获取原始字段值。
Model _setRaw 内部设置字段值并标记变更。
Model _dangerouslySetRawWithoutMarkingColumnChange 内部不安全设置字段值。
Model __ensureCanSetRaw 内部确保可设置原始值。
Model __ensureNotDisposable 内部确保非一次性实例。


# Done
Done get asModel  返回自身实例。
Done get id 获取实例的唯一标识符。
Done get syncStatus 获取数据同步状态。
Done update 更新模型并立即提交。
Done prepareUpdate 准备更新。
Done experimentalSubscribe 实验性订阅模型变更。
Done markAsDeleted 删除模型并提交。
Done destroyPermanently 永久删除模型记录。
Done experimentalMarkAsDeleted 软删除功能。
Done experimentalDestroyPermanently 永久删除功能。
Done observe 监听模型数据变化。
Done collection 获取所属数据集合。
Done get collections 获取所有集合映射。
Done get database获取数据库实例。
Done get db获取数据库实例。
Done get table 获取对应数据表名。