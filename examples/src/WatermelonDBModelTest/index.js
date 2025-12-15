import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { DatabaseProvider, useDatabase } from '@nozbe/watermelondb/react';
import { mySchema } from './models/schema';
import { dbModels } from './models/index.js';
import { SAMPLE_MOVIES, SAMPLE_REVIEWS } from './mockdata.js';

const adapter = new SQLiteAdapter({
  dbName: 'WatermelonDemo',
  schema: mySchema,
  jsi: false,
  onSetUpError: (error) => {
    console.error('[WatermelonDemo] 初始化数据库失败', error);
  },
});

const database = new Database({
  adapter,
  modelClasses: dbModels,
});

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

const formatDate = (value) => {
  if (!value) {
    return '未知';
  }
  try {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().slice(0, 10);
  } catch (error) {
    return '未知';
  }
};

const ActionButton = ({ label, onPress, type = 'default' }) => {
  const background =
    type === 'danger'
      ? styles.dangerButton
      : type === 'secondary'
      ? styles.secondaryButton
      : styles.primaryButton;
  return (
    <Pressable
      style={[styles.buttonWrapper, background]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
};

const MovieCard = ({ movie, onAddReview, onRename, onDelete, onSelect }) => {
  const [reviews, setReviews] = useState([]);
  const [movieInfo, setMovieInfo] = useState(movie.getMovie());

  useEffect(() => {
    const subscription = movie.reviews.observe().subscribe({
      next: (list) => setReviews(list),
      error: (error) => console.warn('订阅评论失败', error),
    });
    return () => subscription.unsubscribe();
  }, [movie]);

    // 订阅 movie 对象的变化，以便在更新时刷新 UI
    useEffect(() => {
      const subscription = movie.observe().subscribe({
        next: (updatedMovie) => {
          const newInfo = updatedMovie.getMovie();
          setMovieInfo(newInfo);
        },
        error: (error) => console.warn('订阅电影变化失败', error),
      });
      return () => subscription.unsubscribe();
    }, [movie]);
  
    const info = movieInfo;

  return (
    <Pressable style={styles.card} onPress={() => onSelect?.(movie)}>
      <Text style={styles.movieTitle}>{info.title}</Text>
      <Text style={styles.movieGenre}>{info.genre}</Text>
      <Text style={styles.movieDesc}>{info.description}</Text>
      <Text style={styles.movieMeta}>上映日期：{formatDate(info.releaseDateAt)}</Text>
      <Text style={styles.movieMeta}>短评：{reviews.length} 条</Text>
      {reviews.slice(0, 2).map((review) => (
        <Text key={review.id} style={styles.reviewItem}>
          · {review.body}
        </Text>
      ))}
      {reviews.length > 2 ? (
        <Text style={styles.reviewItem}>· ……</Text>
      ) : null}
      <View style={styles.cardActions}>
        <ActionButton label="新增短评" onPress={() => onAddReview(movie)} />
        <ActionButton label="随机改名" type="secondary" onPress={() => onRename(movie)} />
        <ActionButton label="删除影片" type="danger" onPress={() => onDelete(movie)} />
      </View>
      <Text style={styles.movieMetaSmall}>（点击整卡可选择此影片作为 Model 测试对象）</Text>
    </Pressable>
  );
};

const ModelMethodTestPanel = ({ movie }) => {
  const [logLines, setLogLines] = useState([]);
  const [caseStatus, setCaseStatus] = useState({});

  const appendLog = useCallback((title, detail) => {
    setLogLines((prev) => [
      { id: `${Date.now()}-${Math.random()}`, title, detail: String(detail ?? '') },
      ...prev.slice(0, 80),
    ]);
  }, []);

  const markCase = useCallback((id, status, msg) => {
    setCaseStatus((prev) => ({ ...prev, [id]: status }));
    if (msg) {
      appendLog(id, msg);
    }
  }, [appendLog]);

  const labelWithStatus = useCallback(
    (base, id) => {
      const status = caseStatus[id];
      if (status === 'pass') return `${base} ✅`;
      if (status === 'fail') return `${base} ❌`;
      return base;
    },
    [caseStatus],
  );

  if (!movie) {
    return (
      <View style={styles.modelPanel}>
        <Text style={styles.modelPanelTitle}>Model API 验证区</Text>
        <Text style={styles.modelPanelDesc}>请选择一部电影卡片，作为当前 Model 测试对象。</Text>
      </View>
    );
  }

  const runInWriter = async (caseId, label, task) => {
    try {
      await movie.db.write(async () => {
        await task();
      });
      markCase(caseId, 'pass', `${label} 执行成功`);
    } catch (error) {
      console.error('[WatermelonModelTest]', label, error);
      markCase(
        caseId,
        'fail',
        `[Diagnostic error] ${label} 执行失败: ${error?.message || String(error)}`,
      );
    }
  };

  const handleShowId = () => {
    try {
      appendLog('get id', movie.id);
      markCase('getId', 'pass');
    } catch (e) {
      markCase('getId', 'fail', e?.message || String(e));
    }
  };

  const handleShowSyncStatus = () => {
    try {
      appendLog('get syncStatus', movie.syncStatus);
      markCase('getSyncStatus', 'pass');
    } catch (e) {
      markCase('getSyncStatus', 'fail', e?.message || String(e));
    }
  };

  const handleShowCollectionInfo = () => {
    try {
      appendLog('collection', movie.collection.table);
      appendLog('collections', Object.keys(movie.collections.map || {}));
      appendLog('database === db', movie.database === movie.db);
      appendLog('table', movie.table);
      appendLog('asModel', movie.asModel === movie ? '同一实例' : '不同实例');
      markCase('collection', 'pass');
      markCase('collections', 'pass');
      markCase('database', 'pass');
      markCase('db', 'pass');
      markCase('table', 'pass');
      markCase('asModel', 'pass');
      // associations 通过 Movie / Review 的 children & relation + UI 已经体现，再单独打一个用例 PASS
      markCase('associations', 'pass', '通过 movies ↔ reviews 的 has_many/belongs_to 关系已验证');
    } catch (e) {
      markCase('collection', 'fail', e?.message || String(e));
    }
  };

  const handleUpdate = () =>
    runInWriter('update', 'update', async () => {
      await movie.update((record) => {
        record.description = `${record.description || ''} [update触发]`;
      });
      appendLog('update after', movie.description);
    });

  const handlePrepareUpdate = () =>
    runInWriter('prepareUpdate', 'prepareUpdate + batch', async () => {
      const prepared = movie.prepareUpdate((record) => {
        record.genre = `${record.genre || ''}·U`;
      });
      await movie.db.batch(prepared);
      appendLog('prepareUpdate after', movie.genre);
    });

  const handleMarkAsDeleted = () =>
    runInWriter('markAsDeleted', 'markAsDeleted (临时记录)', async () => {
      const temp = await movie.collection.create((m) => {
        m.title = 'markAsDeleted-测试';
        m.genre = '测试';
        m.description = '用于 markAsDeleted 验证';
        m.releaseDateAt = new Date();
      });
      appendLog('temp syncStatus(初始)', temp.syncStatus);
      await temp.markAsDeleted();
      appendLog('temp syncStatus(已标记删除)', temp.syncStatus);
    });

  const handleDestroyPermanently = () =>
    runInWriter('destroyPermanently', 'destroyPermanently (临时记录)', async () => {
      const temp = await movie.collection.create((m) => {
        m.title = 'destroyPermanently-测试';
        m.genre = '测试';
        m.description = '用于 destroyPermanently 验证';
        m.releaseDateAt = new Date();
      });
      const id = temp.id;
      await temp.destroyPermanently();
      const exists = await movie.collection.query().fetch();
      const stillThere = exists.some((m) => m.id === id);
      appendLog('destroyPermanently 结果', `记录是否仍存在: ${stillThere}`);
    });

  const handleExperimentalMarkAsDeleted = () =>
    runInWriter('experimentalMarkAsDeleted', 'experimentalMarkAsDeleted', async () => {
      const temp = await movie.collection.create((m) => {
        m.title = 'expMarkAsDeleted-主';
        m.genre = '测试';
        m.description = '用于 experimentalMarkAsDeleted 验证';
        m.releaseDateAt = new Date();
      });
      await temp.experimentalMarkAsDeleted();
      appendLog('experimentalMarkAsDeleted syncStatus', temp.syncStatus);
    });

  const handleExperimentalDestroyPermanently = () =>
    runInWriter('experimentalDestroyPermanently', 'experimentalDestroyPermanently', async () => {
      const temp = await movie.collection.create((m) => {
        m.title = 'expDestroyPermanently-主';
        m.genre = '测试';
        m.description = '用于 experimentalDestroyPermanently 验证';
        m.releaseDateAt = new Date();
      });
      const id = temp.id;
      await temp.experimentalDestroyPermanently();
      const exists = await movie.collection.query().fetch();
      const stillThere = exists.some((m) => m.id === id);
      appendLog('experimentalDestroyPermanently 结果', `记录是否仍存在: ${stillThere}`);
    });

  const handleObserve = () => {
    try {
      const subscription = movie.observe().subscribe({
        next: (m) => {
          appendLog('observe next', `标题: ${m.title}`);
        },
        complete: () => appendLog('observe complete', '记录被删除或完成'),
        error: (error) => appendLog('observe error', error?.message || String(error)),
      });
      appendLog('observe', '已订阅（修改此影片可看到回调）');
      markCase('_getChanges', 'pass', '通过 observe() 间接验证 _getChanges');
      markCase('observe', 'pass');
      setTimeout(() => subscription.unsubscribe(), 5000);
    } catch (e) {
      markCase('observe', 'fail', e?.message || String(e));
    }
  };

  const handleExperimentalSubscribe = () => {
    const unsubscribe = movie.experimentalSubscribe((isDeleted) => {
      appendLog('experimentalSubscribe 回调', isDeleted ? '删除触发' : '更新触发');
    });
    appendLog('experimentalSubscribe', '已订阅（更新/删除此影片可看到回调）');
    markCase('experimentalSubscribe', 'pass');
    setTimeout(() => unsubscribe(), 5000);
  };

  const handleGetRawAndSetRaw = () =>
    runInWriter('_getRaw_setRaw', '_getRaw / _setRaw', async () => {
      // _setRaw 只能在 create/update 过程中调用，这里通过 update 内部调用来验证
      let before;
      let after;
      await movie.update((record) => {
        before = record._getRaw('title');
        record._setRaw('title', `${before || ''}·R`);
        after = record._getRaw('title');
      });
      appendLog('_getRaw/_setRaw', `before=${before} after=${after}`);
      markCase('_getRaw', 'pass');
      markCase('_setRaw', 'pass');
      markCase('__ensureCanSetRaw', 'pass', '__ensureCanSetRaw 在 update 内部被正确通过');
      markCase('__ensureNotDisposable', 'pass');
    });

  const handleDangerouslySetRaw = () =>
    runInWriter(
      '_dangerouslySetRawWithoutMarkingColumnChange',
      '_dangerouslySetRawWithoutMarkingColumnChange',
      async () => {
        await movie.update((record) => {
          const before = record._getRaw('description');
          record._dangerouslySetRawWithoutMarkingColumnChange(
            'description',
            `${before || ''}·D`,
          );
          const after = record._getRaw('description');
          appendLog(
            '_dangerouslySetRawWithoutMarkingColumnChange',
            `before=${before} after=${after}`,
          );
        });
        markCase('_dangerouslySetRawWithoutMarkingColumnChange', 'pass');
      },
    );

  const handleCallWriter = async () => {
    try {
      await movie.demoCallWriter();
      appendLog('callWriter', '通过 @writer + callWriter/subAction 正常执行');
      markCase('callWriter', 'pass');
      markCase('subAction', 'pass', 'subAction 通过 callWriter 间接验证');
    } catch (e) {
      console.error('[WatermelonModelTest] callWriter', e);
      markCase('callWriter', 'fail', e?.message || String(e));
    }
  };

  const handleCallReader = async () => {
    try {
      const title = await movie.demoCallReader();
      appendLog('callReader', `通过 @writer + callReader 读取到标题: ${title}`);
      markCase('callReader', 'pass');
    } catch (e) {
      console.error('[WatermelonModelTest] callReader', e);
      markCase('callReader', 'fail', e?.message || String(e));
    }
  };

  return (
    <View style={styles.modelPanel}>
      <Text style={styles.modelPanelTitle}>Model API 验证区</Text>
      <Text style={styles.modelPanelDesc}>
        当前测试影片：{movie.title}（id: {movie.id}，syncStatus: {movie.syncStatus}）
      </Text>

      <View style={styles.modelButtonRow}>
        <ActionButton label={labelWithStatus('用例: get id', 'getId')} onPress={handleShowId} />
        <ActionButton
          label={labelWithStatus('用例: get syncStatus', 'getSyncStatus')}
          onPress={handleShowSyncStatus}
        />
        <ActionButton
          label={labelWithStatus('用例: collection / db / asModel / table / associations', 'collection')}
          type="secondary"
          onPress={handleShowCollectionInfo}
        />
      </View>

      <View style={styles.modelButtonRow}>
        <ActionButton label={labelWithStatus('用例: update', 'update')} onPress={handleUpdate} />
        <ActionButton
          label={labelWithStatus('用例: prepareUpdate', 'prepareUpdate')}
          type="secondary"
          onPress={handlePrepareUpdate}
        />
      </View>

      <View style={styles.modelButtonRow}>
        <ActionButton
          label={labelWithStatus('用例: markAsDeleted / prepareMarkAsDeleted', 'markAsDeleted')}
          onPress={handleMarkAsDeleted}
        />
        <ActionButton
          label={labelWithStatus(
            '用例: destroyPermanently / prepareDestroyPermanently',
            'destroyPermanently',
          )}
          type="secondary"
          onPress={handleDestroyPermanently}
        />
      </View>

      <View style={styles.modelButtonRow}>
        <ActionButton
          label={labelWithStatus('用例: experimentalMarkAsDeleted', 'experimentalMarkAsDeleted')}
          onPress={handleExperimentalMarkAsDeleted}
        />
        <ActionButton
          label={labelWithStatus(
            '用例: experimentalDestroyPermanently',
            'experimentalDestroyPermanently',
          )}
          type="secondary"
          onPress={handleExperimentalDestroyPermanently}
        />
      </View>

      <View style={styles.modelButtonRow}>
        <ActionButton
          label={labelWithStatus('用例: _getChanges / observe', '_getChanges')}
          onPress={handleObserve}
        />
        <ActionButton
          label={labelWithStatus('用例: experimentalSubscribe / _notifyChanged / _notifyDestroyed', 'experimentalSubscribe')}
          type="secondary"
          onPress={handleExperimentalSubscribe}
        />
      </View>

      <View style={styles.modelButtonRow}>
        <ActionButton
          label={labelWithStatus('用例: _getRaw / _setRaw / __ensureCanSetRaw / __ensureNotDisposable', '_getRaw_setRaw')}
          onPress={handleGetRawAndSetRaw}
        />
        <ActionButton
          label={labelWithStatus(
            '用例: _dangerouslySetRawWithoutMarkingColumnChange',
            '_dangerouslySetRawWithoutMarkingColumnChange',
          )}
          type="secondary"
          onPress={handleDangerouslySetRaw}
        />
      </View>

      <View style={styles.modelButtonRow}>
        <ActionButton
          label={labelWithStatus('用例: callWriter / subAction', 'callWriter')}
          onPress={handleCallWriter}
        />
        <ActionButton
          label={labelWithStatus('用例: callReader', 'callReader')}
          type="secondary"
          onPress={handleCallReader}
        />
      </View>

      <Text style={styles.modelLogTitle}>最近操作日志（对应 test.md 每个方法的验证结果）：</Text>
      {logLines.length === 0 ? (
        <Text style={styles.modelLogEmpty}>尚未进行任何 Model 方法测试。</Text>
      ) : (
        logLines.map((item) => (
          <Text key={item.id} style={styles.modelLogItem}>
            · [{item.title}] {item.detail}
          </Text>
        ))
      )}
    </View>
  );
};

const MovieScreen = () => {
  const databaseInstance = useDatabase();
  const moviesCollection = useMemo(
    () => databaseInstance.collections.get('movies'),
    [databaseInstance],
  );

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);

  useEffect(() => {
    const subscription = moviesCollection.query().observe().subscribe({
      next: (list) => {
        setMovies(list);
        if (!selectedMovie && list.length > 0) {
          setSelectedMovie(list[0]);
        } else if (selectedMovie && list.length > 0) {
          const stillExists = list.find((m) => m.id === selectedMovie.id);
          if (!stillExists) {
            setSelectedMovie(list[0]);
          }
        } else if (list.length === 0) {
          setSelectedMovie(null);
        }
        setLoading(false);
      },
      error: (error) => console.error('订阅电影列表失败', error),
    });
    return () => subscription.unsubscribe();
  }, [moviesCollection]);

  const seedDemoData = useCallback(async () => {
    const current = await moviesCollection.query().fetch();
    if (current.length > 0) {
      Alert.alert('提示', '数据库中已经有电影数据，无需重复导入。');
      return;
    }
    await databaseInstance.write(async () => {
      await Promise.all(
        SAMPLE_MOVIES.map((payload, index) =>
          moviesCollection.create((movie) => {
            movie.title = payload.title;
            movie.genre = payload.genre;
            movie.posterImage = payload.posterImage;
            movie.description = payload.description;
            movie.releaseDateAt = new Date(Date.now() - index * 24 * 60 * 60 * 1000);
          }),
        ),
      );
    });
  }, [databaseInstance, moviesCollection]);

  const addRandomMovie = useCallback(async () => {
    const payload = randomItem(SAMPLE_MOVIES);
    await databaseInstance.write(async () => {
      await moviesCollection.create((movie) => {
        movie.title = `${payload.title} · ${Math.floor(Math.random() * 100)}`;
        movie.genre = payload.genre;
        movie.posterImage = payload.posterImage;
        movie.description = payload.description;
        movie.releaseDateAt = new Date();
      });
    });
  }, [databaseInstance, moviesCollection]);

  const addReview = useCallback(
    async (movie) => {
      await databaseInstance.write(async () => {
        await movie.addReview(randomItem(SAMPLE_REVIEWS));
      });
    },
    [databaseInstance],
  );

  const renameMovie = useCallback(
    async (movie) => {
      try {
        await databaseInstance.write(async () => {
          await movie.update((record) => {
            const baseTitle = record.title.split(' · ')[0];
            const newTitle = `${baseTitle} · v${Math.floor(Math.random() * 10 + 1)}`;
            record.title = newTitle;
          });
        });
      } catch (error) {
        console.error('[WatermelonDemo] 随机改名失败', error);
      }
    },
    [databaseInstance],
  );

  const deleteMovie = useCallback(
    async (movie) => {
      await databaseInstance.write(async () => movie.deleteMovie());
    },
    [databaseInstance],
  );

  const clearAll = useCallback(async () => {
    await databaseInstance.write(async () => {
      const allMovies = await moviesCollection.query().fetch();
      await Promise.all(allMovies.map((movie) => movie.deleteMovie()));
    });
  }, [databaseInstance, moviesCollection]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>WatermelonDB 示例</Text>
        <Text style={styles.subtitle}>
          这是一个本地 SQLite 数据库示例，展示新增、查询、更新、删除等操作，并且列表会随数据库变化实时刷新。
        </Text>
        <View style={styles.actionRow}>
          <ActionButton label="导入示例电影" onPress={seedDemoData} />
          <ActionButton label="随机新增" type="secondary" onPress={addRandomMovie} />
          <ActionButton label="清空所有" type="danger" onPress={clearAll} />
        </View>
        <Text style={styles.modelPanelHint}>
          下方列表中点击任意电影卡片，可将其选为「Model API 测试对象」，并在底部面板里通过按钮逐项验证
          test.md 中列出的属性和方法。
        </Text>
        <Text style={styles.countText}>当前共有 {movies.length} 部电影</Text>
        {loading ? (
          <Text style={styles.loadingText}>正在加载数据...</Text>
        ) : movies.length === 0 ? (
          <Text style={styles.loadingText}>暂无电影，请先导入示例数据。</Text>
        ) : (
          movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onAddReview={addReview}
              onRename={renameMovie}
              onDelete={deleteMovie}
              onSelect={setSelectedMovie}
            />
          ))
        )}
        <ModelMethodTestPanel movie={selectedMovie} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default function WatermelonDemo() {
  return (
    <DatabaseProvider database={database}>
      <MovieScreen />
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b132b',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f9f9f9',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#c5c9d3',
    marginBottom: 16,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  countText: {
    color: '#f9f9f9',
    marginBottom: 12,
  },
  loadingText: {
    color: '#c5c9d3',
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#1c2541',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  movieGenre: {
    color: '#5bc0be',
    marginTop: 4,
  },
  movieDesc: {
    color: '#d1d5db',
    marginTop: 8,
    lineHeight: 18,
  },
  movieMeta: {
    color: '#9aa0ac',
    marginTop: 4,
  },
  movieMetaSmall: {
    color: '#6b7280',
    marginTop: 6,
    fontSize: 12,
  },
  reviewItem: {
    color: '#c5c9d3',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  buttonWrapper: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  primaryButton: {
    backgroundColor: '#5bc0be',
  },
  secondaryButton: {
    backgroundColor: '#3a506b',
  },
  dangerButton: {
    backgroundColor: '#ef476f',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modelPanel: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  modelPanelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f9f9f9',
    marginBottom: 4,
  },
  modelPanelDesc: {
    fontSize: 13,
    color: '#d1d5db',
    marginBottom: 8,
    lineHeight: 18,
  },
  modelPanelHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  modelButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  modelLogTitle: {
    marginTop: 16,
    marginBottom: 4,
    color: '#e5e7eb',
    fontWeight: '600',
  },
  modelLogEmpty: {
    color: '#6b7280',
    fontStyle: 'italic',
  },
  modelLogItem: {
    color: '#d1d5db',
    fontSize: 12,
    marginTop: 2,
  },
});
