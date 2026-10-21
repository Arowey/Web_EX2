// ============================================================================
// 实验二：JavaScript 异步之寻宝 —— async / await 重写版
// ----------------------------------------------------------------------------
// 原版 treasure.js 使用 Promise 的 .then() 链式调用；
// 本文件用 async / await 重写整个寻宝过程，并新增 4 段情节：
//   ③ 夜观星象（串联）
//   ④ 迷雾森林（失败自动重试 withRetry）
//   ⑤ 三盏圣火（并发 Promise.all）
//   ⑥ 智取守卫（try / catch 降级方案）
// 运行方式：node treasure-async.js
// ============================================================================

/** 等待指定毫秒，用于模拟网络 / IO 耗时 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 带日志的耗时包装，让每一步的时间开销可见 */
const timed = async (label, task) => {
  const start = Date.now();
  const result = await task();
  console.log(`   ⏱  ${label} 耗时 ${Date.now() - start}ms`);
  return result;
};

// ---------------------------------------------------------------------------
// 一、宝藏地图 API（在原版基础上扩展）
// ---------------------------------------------------------------------------
class TreasureMap {
  /** ① 最初线索 */
  static getInitialClue() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('在古老的图书馆里找到了第一个线索：一张残破的羊皮卷。');
      }, 1000);
    });
  }

  /** ② 解码古文字 */
  static decodeAncientScript(clue) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!clue) {
          reject(new Error('没有线索可以解码！'));
          return; // 注意：reject 之后必须 return，否则会继续 resolve
        }
        resolve('解码成功！羊皮卷上写着：宝藏藏在沙海尽头的神庙中。');
      }, 1500);
    });
  }

  /** ③ 新情节：夜观星象，校准方位（串联在解码之后） */
  static readStarMap(location) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!location || !location.includes('神庙')) {
          reject(new Error('星象与羊皮卷对不上，方位无法确定！'));
          return;
        }
        resolve('星象确认：向东北三百里，穿过迷雾森林即可看见神庙。');
      }, 1200);
    });
  }

  /** ④ 新情节：穿越迷雾森林，有概率迷路（可重试） */
  static crossMistForest(route, attempt = 1) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 第一次进入森林有 65% 概率迷路，重试时成功率大幅提升
        const lostChance = attempt === 1 ? 0.65 : 0.15;
        if (Math.random() < lostChance) {
          reject(new Error(`浓雾遮住了去路，你在第 ${attempt} 次尝试中迷路了……`));
          return;
        }
        resolve('循着萤火虫的微光，你走出了迷雾森林，神庙就在眼前。');
      }, 1400);
    });
  }

  /** ⑤ 新情节：点亮圣火（三盏灯必须并发点亮，单盏耗时不同） */
  static lightTorch(name, ms) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`${name}之灯已点亮`);
      }, ms);
    });
  }

  /** ⑥ 潜入神庙，可能遭遇守卫（可重试） */
  static searchTemple(location) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const random = Math.random();
        if (random < 0.5) {
          reject(new Error('糟糕！遇到了神庙守卫，他举起了长矛！'));
          return;
        }
        resolve('找到了一个神秘的箱子，你抱起它悄悄退了出来。');
      }, 2000);
    });
  }

  /** ⑥-b 降级方案：声东击西引开守卫 */
  static distractGuard() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('你把一块石子扔向远处，守卫循声走开了。');
      }, 900);
    });
  }

  /** ⑦ 开箱 */
  static openTreasureBox() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('恭喜！你找到了传说中的宝藏——一枚会发光的「异步之心」。');
      }, 1000);
    });
  }
}

// ---------------------------------------------------------------------------
// 二、通用异步工具：失败重试
// ---------------------------------------------------------------------------
/**
 * @param {Function} task    返回 Promise 的任务
 * @param {number}   times   最多尝试次数
 * @param {Function} onRetry 每次失败后的回调 (error, attempt)
 */
async function withRetry(task, times = 3, onRetry = () => {}) {
  let lastError;
  for (let attempt = 1; attempt <= times; attempt++) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      onRetry(error, attempt);
      if (attempt === times) break;
      await wait(400); // 稍作休整再试
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// 三、寻宝主流程（async / await 版本）
// ---------------------------------------------------------------------------
async function findTreasure() {
  console.log('🏛  寻宝开始\n');

  // ① 图书馆：拿到第一张羊皮卷
  const clue = await timed('① 寻找线索', () => TreasureMap.getInitialClue());
  console.log('  ', clue);

  // ② 解读古文字，得到神庙坐标
  const location = await timed('② 解码古文字', () =>
    TreasureMap.decodeAncientScript(clue)
  );
  console.log('  ', location);

  // ③ 新情节：夜观星象，校准方位
  const route = await timed('③ 夜观星象', () =>
    TreasureMap.readStarMap(location)
  );
  console.log('  ', route);

  // ④ 新情节：穿越迷雾森林（迷路自动重试）
  const trail = await timed('④ 穿越迷雾森林', () =>
    withRetry(
      (attempt) => TreasureMap.crossMistForest(route, attempt),
      3,
      (error, attempt) => console.warn(`   ⚠️  第 ${attempt} 次尝试失败：${error.message}`)
    )
  );
  console.log('  ', trail);

  // ⑤ 新情节：三盏圣火必须「同时」点亮 —— Promise.all 并发执行
  const torchStart = Date.now();
  const torches = await Promise.all([
    TreasureMap.lightTorch('日', 800),
    TreasureMap.lightTorch('月', 1100),
    TreasureMap.lightTorch('星', 1400),
  ]);
  console.log('  ', torches.join('，'), '，石门轰然开启');
  console.log(`   ⏱  ⑤ 三盏圣火总耗时 ${Date.now() - torchStart}ms（并发，取最慢的 1400ms）`);

  // ⑥ 潜入神庙：先重试，全部失败则改用「声东击西」
  let box;
  try {
    box = await timed('⑥ 潜入神庙', () =>
      withRetry(() => TreasureMap.searchTemple(trail), 3, (error, attempt) =>
        console.warn(`   ⚠️  第 ${attempt} 次潜入失败：${error.message}`)
      )
    );
  } catch (error) {
    console.warn(`   ⚠️  强攻失败：${error.message}，改用声东击西`);
    await timed('⑥-b 引开守卫', () => TreasureMap.distractGuard());
    box = '你趁机抱起箱子，溜出了神庙。';
  }
  console.log('  ', box);

  // ⑦ 开箱
  const treasure = await timed('⑦ 打开宝箱', () =>
    TreasureMap.openTreasureBox(box)
  );
  console.log('  ', treasure);

  return treasure;
}

// ---------------------------------------------------------------------------
// 四、启动（顶层 await 需 ESM，这里用 .then 兼容 CommonJS）
// ---------------------------------------------------------------------------
if (typeof module !== 'undefined' && require.main === module) {
  const start = Date.now();
  findTreasure()
    .then((treasure) => {
      console.log(`\n✨ 寻宝完成，总耗时 ${Date.now() - start}ms`);
      console.log('   宝藏：', treasure);
    })
    .catch((error) => {
      console.error('\n💀 任务失败：', error.message);
    });
}

// 浏览器环境挂到全局，便于在控制台调试
if (typeof window !== 'undefined') {
  window.TreasureMap = TreasureMap;
  window.findTreasure = findTreasure;
  window.withRetry = withRetry;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TreasureMap, withRetry, findTreasure };
}
