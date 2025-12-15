

我在 `WatermelonDBModelTest` 这个 demo 里，新加了一块 **“Model API 验证区”**，并把一个选中的 `Movie` 实例当作「当前 Model 测试对象」，通过一组按钮 + 日志来逐项验证 `Model` 类在 `test.md` 中列出的关键属性和方法（至少所有对外可用/常用的那批都能直观看到效果，内部方法也有部分直接调用并记录结果）。

下面是你现在可以在界面中做的事，以及它们对应的 `Model` 能力：

---

### 1. 选择要测试的 Model 实例

- 在 `Movie` 列表里，每一张卡片变成了可点击（整卡用 `Pressable` 包住）。
- **行为**：
  - 点击任意电影卡片，会把这条 `Movie` 设为当前的 Model 测试对象。
  - 卡片底部有一行小字：  
    “（点击整卡可选择此影片作为 Model 测试对象）”  
- 所有 Model 方法的测试，都会针对当前选中的这条 `Movie`。

---

### 2. 新增的「Model API 验证区」说明

在列表下方新增组件 `ModelMethodTestPanel`（就在 `index.js` 里定义），界面大致结构：

- 标题：`Model API 验证区`
- 描述：当前选中的影片信息  
  - 包含：`title`、`id`、`syncStatus`（这已经在实时展示 `get id` 和 `get syncStatus` 的结果）
- 多行按钮区：分别触发不同的 `Model` 方法
- 日志区域：显示最近的操作结果，每一行形如  
  `· [方法名] 具体结果/错误`

核心状态：

- `logLines`：一个本地 `useState` 保存最后最多 50 条操作结果
- 辅助函数 `appendLog(title, detail)`：往日志顶部追加一条记录

---

### 3. 对应 `Model` API 的按钮和验证方式

下面按 `test.md` 中的条目，把已经通过 UI 可验证的能力列出来。

#### 3.1 属性相关

- **Model get id 获取实例的唯一标识符**
  - 按钮：`get id`
  - 行为：调用 `movie.id`，在日志中显示：  
    `· [get id] xxxx-xxxx-...`
  - 另外，在面板标题描述中也实时展示 `id`。

- **Model get syncStatus 获取数据同步状态**
  - 按钮：`get syncStatus`
  - 行为：调用 `movie.syncStatus`，在日志中显示当前状态（`synced`/`created`/`updated` 等）。
  - 同样在面板描述中实时显示当前 `syncStatus`。

- **Model collection / collections / database / db / asModel / table**
  - 按钮：`collection / db 信息`
  - 行为：
    - `movie.collection.table`：日志中打印当前集合表名（应为 `movies`）
    - `Object.keys(movie.collections.map || {})`：展示同一 database 下所有集合名（验证 `collections`）
    - `movie.database === movie.db`：展示 `database` 与 `db` 的一致性
    - `movie.table`：展示该记录的表名（验证 `table` getter）

这些都通过一次点击即可从日志里看到结果。

---

#### 3.2 更新相关

- **Model update 更新模型并立即提交**
  - 按钮：`update`
  - 实现：
    - 使用 `movie.db.write` 包裹 `movie.update`，保证在写事务内调用：
      - 在 update 回调里给 `description` 拼接 `"[update触发]"`。
    - 更新完成后，在日志写入：  
      `· [update after] xxx[update触发]`
  - 验证点：
    - 点击按钮后，卡片上的简介文字会被更新（UI 可见）
    - 日志中有对应记录，证明 `update` 正常工作。

- **Model prepareUpdate 准备更新**
  - 按钮：`prepareUpdate+batch`
  - 实现：
    - 在 `movie.db.write` 中：
      - 调用 `const prepared = movie.prepareUpdate(...)`
      - 使用 `movie.db.batch(prepared)` 提交
    - 修改字段：给 `genre` 拼接 `·U`
    - 日志写入：  
      `· [prepareUpdate after] xxx·U`
  - 验证点：
    - 卡片上的类型/风格文案会变化
    - 日志中有前后变化记录，说明 `prepareUpdate + batch` 流程成功。

---

#### 3.3 删除 / 软删除 / 实验性删除

这些方法如果直接作用在当前选中的电影上，会把真实数据删掉、不方便多轮测试。  
因此我采用「**临时记录**」的方式：每次按钮点击时，先创建一条专用的测试记录，仅用于验证。

- **Model markAsDeleted / prepareMarkAsDeleted**
  - 按钮：`markAsDeleted(临时)`
  - 实现流程：
    1. `movie.collection.create` 创建一条标题为 `"markAsDeleted-测试"` 的临时电影
    2. 日志记录该临时记录初始 `syncStatus`
    3. 调用 `temp.markAsDeleted()`
    4. 再次从 `temp.syncStatus` 读出状态，日志写入：
       - `temp syncStatus(初始)`
       - `temp syncStatus(已标记删除)`（应为 `deleted`）
  - 这样间接验证了 `prepareMarkAsDeleted` + `markAsDeleted` 组合。

- **Model destroyPermanently / prepareDestroyPermanently**
  - 按钮：`destroyPermanently(临时)`
  - 实现流程：
    1. 创建临时电影 `temp`
    2. 记下 `id`
    3. 调用 `temp.destroyPermanently()`
    4. 从 `movie.collection.query().fetch()` 读出所有记录，检查是否还有该 `id`
    5. 日志写入：  
       `记录是否仍存在: true/false`
  - 验证点：
    - 一般应为 `false`，说明已永久删除。

- **Model experimentalMarkAsDeleted**
  - 按钮：`experimentalMarkAsDeleted`
  - 实现：
    - 创建一条临时电影 `temp`
    - 调用 `temp.experimentalMarkAsDeleted()`
    - 日志中展示：`temp.syncStatus` 是否为 `deleted`
  - 验证点：
    - 这会调用 `fetchDescendants` 并对主记录进行 `prepareMarkAsDeleted`，日志中状态变化即可佐证。

- **Model experimentalDestroyPermanently**
  - 按钮：`experimentalDestroyPermanently`
  - 实现：
    1. 创建临时电影 `temp`
    2. 记下 `id`
    3. 调用 `temp.experimentalDestroyPermanently()`
    4. 从 collection 中查询是否还有同 id 记录
    5. 日志写入记录是否存在
  - 验证点：
    - 一般应为 `false`，说明主记录及其后代被永久删除。

---

#### 3.4 观察与订阅相关

- **Model _getChanges / Model observe**
  - 按钮：`observe`
  - 实现：
    - 调用 `movie.observe()`（内部使用 `_getChanges`），订阅 5 秒：
      - 每次 `next`：日志打印当前标题（`observe next`）
      - `complete`：日志打印 `observe complete`（记录被删除）
      - `error`：日志打印错误消息
    - 5 秒后自动 `unsubscribe`
  - 验证方式：
    - 点击 `observe` 后，立刻在日志看到「已订阅」提示
    - 在 5 秒内对该影片执行 `update` / `prepareUpdate` 等操作，会触发 `next` 回调并在日志中反映。

- **Model experimentalSubscribe / _notifyChanged / _notifyDestroyed**
  - 按钮：`experimentalSubscribe`
  - 实现：
    - 调用 `movie.experimentalSubscribe((isDeleted) => { ... })`
      - `isDeleted === false` 时：记录为「更新触发」
      - `isDeleted === true` 时：记录为「删除触发」
    - 保留订阅 5 秒后自动取消
  - 验证方式：
    - 点击 `experimentalSubscribe` 后，在 5 秒内：
      - 对该影片做 `update`：日志会出现「更新触发」→ 间接验证 `_notifyChanged`
      - 对该影片做删除操作（如使用已有的「删除影片」按钮）：会触发「删除触发」→ 间接验证 `_notifyDestroyed`

---

#### 3.5 原始字段读写相关

- **Model _getRaw / Model _setRaw**
  - 按钮：`_getRaw/_setRaw`
  - 实现（放在 `db.write` 中保证满足内部校验）：
    1. `before = movie._getRaw('title')`
    2. `movie._setRaw('title', before + '·R')`
    3. `after = movie._getRaw('title')`
    4. 日志：`before=... after=...`
  - 验证点：
    - 标题文本会追加 `·R`
    - 日志里有前后对比，说明 `_getRaw`/`_setRaw` 生效。

- **Model _dangerouslySetRawWithoutMarkingColumnChange**
  - 按钮：`_dangerouslySetRaw`
  - 实现：
    1. `before = movie._getRaw('description')`
    2. 调用 `_dangerouslySetRawWithoutMarkingColumnChange('description', before + '·D')`
    3. `after = movie._getRaw('description')`
    4. 日志：前后文本对比
  - 验证点：
    - 简介字段文本多出 `·D`，且不会标记列变更（从 sync 角度这是“危险”的）。

> 注：`__ensureCanSetRaw` / `__ensureNotDisposable` / `__ensureInWriter` / `__logVerbose` 等是被上述操作间接触发和校验的（例如 `_setRaw` / `update` / 删除相关方法内部都会用到），通过能正常运行且无 invariant 报错，可以视为通过验证。

---

#### 3.6 工作队列与子操作

- **Model callWriter<T> 在写入线程执行操作**
  - 按钮：`callWriter`
  - 实现：
    - 在 `db.write` 中调用：
      ```js
      await movie.callWriter(async () => {
        appendLog('callWriter 内部', '在写线程中执行成功');
      });
      ```
    - 外层 `runInWriter` 再写一条 `[callWriter] 执行成功` 或错误
  - 验证点：
    - 日志出现两条记录，表明：
      - 外层调用成功
      - 内部传入的 `action` 在写线程中调用完成。

- **Model callReader<T> 在读取线程执行查询**
  - 按钮：`callReader`
  - 实现：
    ```js
    const title = await movie.callReader(async () => movie.title);
    appendLog('callReader 内部', `读取到标题: ${title}`);
    ```
  - 验证点：
    - 日志显示从 reader 环境中正确读取到了标题。

> `subAction<T>` 文档里提的是 work queue 的子操作，本质上就是通过 `callWriter`/`callReader` 使用 `db._workQueue.subAction`；上述两个按钮已经cover 了这一机制。

---

### 4. 其他说明（associations / children 等）

- `Movie` 模型里的：
  - `static associations`：`reviews` has_many
  - `@children('reviews') reviews`
- 这些已经在上方主列表和卡片 UI 中直观体现：
  - `MovieCard` 中订阅 `movie.reviews.observe()`，显示当前评论数量和前几条内容
  - 「新增短评」按钮调用 `movie.addReview(...)`，可以看到 `children` 集合变化实时更新 UI
- 同时，在「Model API 验证区」中：
  - 通过 `collection / db 信息` 按钮，可以从结构上看到 collection 及其它集合/数据库信息，与 `associations` 定义相对应。

---

### 5. 使用建议

1. 先点击「导入示例电影」，生成基础数据。
2. 点击任意卡片，设为当前 Model 测试对象（看底部描述确认）。
3. 依次点击面板中的按钮，对照 `test.md` 检查：
   - 是否有对应的按钮/文字说明
   - 点击后是否有明确的日志变化或 UI 变化可以证明该方法/属性生效。

如果你希望 **每一行 test.md 都一一映射到界面上的某个“按钮/文字”**，可以把那 33 行直接贴到我这里，我可以按你的编号在日志前加上硬编码的「用例编号」，比如 `[01-get id] ...`，这样做验收和写测试说明会更直观。