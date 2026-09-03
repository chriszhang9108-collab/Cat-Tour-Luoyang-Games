# 猫游洛阳 · 撸猫

《猫游洛阳·撸猫》是一个面向手机竖屏的轻量 2D 互动小游戏。玩家选择橘小洛或小灰，通过轻点、慢撸、长按和连续点击观察两只猫不同的性格反馈。

当前版本是可玩的 MVP，也是后续增加正式动作素材、表情、声音、道具和新角色的底层框架。它不包含账号、服务器、付费、排行榜或第三方 AI 服务。

## 现在可以玩到什么

- 启动页 → 选择橘小洛或小灰 → 进入牡丹花海撸猫场景。
- `TAP`、`PET`、`LONG_PRESS`、`RAPID_TAP` 四类 Pointer 手势。
- 头部、左右脸颊、下巴、后背和肚子六个独立触摸区。
- 橘小洛与小灰各自独立的反馈表和隐藏情绪变化。
- 无操作 3 / 8 / 15 秒时触发不同 Idle；新触摸会立即取消 Idle。
- 单一角色实例、单一主状态、单一主动画，避免重影和残留动画。
- 低音量占位音效、背景音乐、支持设备上的轻震动和独立设置开关。
- 使用 `localStorage` 保存今日选择、互动次数、隐藏情绪和设置。
- PWA 清单、应用图标、离线 Service Worker 和 GitHub Pages 工作流。

## 技术方案

- Vite 8
- TypeScript
- 原生 HTML / CSS
- Pointer Events
- Canvas 单一角色画布
- Web Audio API
- `navigator.vibrate()` 渐进增强
- `localStorage`
- Web App Manifest + Service Worker

没有引入 React、Vue 或游戏引擎。角色配置、互动识别、反馈规则和视觉动画互相分离，后续替换素材时不需要重写整个游戏。

## 第一次运行

请先安装 Node.js 22 或更新的稳定版本，然后在本项目目录打开终端。

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

终端会显示一个本地网址，在浏览器中打开即可。开发模式不会注册 Service Worker，避免旧缓存干扰调试。

检查 TypeScript：

```bash
npm run typecheck
```

生成生产版本：

```bash
npm run build
```

构建成功后，网页文件会出现在 `dist/`。本地预览生产版本：

```bash
npm run preview
```

生产预览会注册 Service Worker，适合检查安装与离线行为。修改文件后要重新执行 `npm run build`。

## 调试模式

在网址末尾添加 `?debug=true`，例如：

```text
http://127.0.0.1:5173/?debug=true
```

调试面板会显示：

- 当前角色、CharacterView 实例数
- 当前角色状态与动画名
- `affection`、`mood`、`stimulation`
- 当前手势和 Hit Zone
- Idle 时间与 IdleManager 实例数
- 本日互动次数和存档状态

Hit Zone 也会以半透明边界显示。正式网址不加该参数时，这些信息全部隐藏。

## 项目文件分别做什么

```text
cat-tour-luoyang-pet/
├── .github/workflows/
│   └── deploy-pages.yml          # GitHub Pages 自动构建与发布
├── docs/
│   └── ARCHITECTURE.md           # 状态机、交互引擎和分阶段架构说明
├── public/
│   ├── icons/                    # PWA 普通图标与 maskable 图标
│   ├── .nojekyll                 # 告诉 GitHub Pages 不使用 Jekyll 处理
│   ├── manifest.webmanifest      # 应用名称、启动方式、主题色和图标
│   └── sw.js                     # 离线缓存与版本更新逻辑
├── src/
│   ├── app/App.ts                # 页面切换和全局服务装配
│   ├── assets/                   # 品牌、角色和背景原始素材
│   ├── components/
│   │   ├── CharacterView.ts      # 唯一角色画布和视觉主体
│   │   ├── HitZoneLayer.ts       # 独立命中区显示与计算
│   │   └── SettingsPanel.ts      # 音乐、音效、震动和换猫设置
│   ├── core/
│   │   ├── AnimationAdapter.ts   # 可替换动画后端的统一接口
│   │   ├── AnimationController.ts# 当前 CSS 动画实现
│   │   ├── CharacterStateMachine.ts # 唯一主状态与安全恢复
│   │   ├── InteractionEngine.ts  # Pointer Events 与四类手势识别
│   │   ├── InteractionSession.ts # 隐藏情绪与刺激度衰减
│   │   ├── ReactionResolver.ts   # 按优先级选择角色反馈
│   │   ├── IdleManager.ts        # 3 / 8 / 15 秒 Idle
│   │   ├── SoundManager.ts       # 音乐、音效和静音控制
│   │   ├── HapticsManager.ts     # 震动能力检测与播放
│   │   └── StorageManager.ts     # 版本化本地存档
│   ├── data/
│   │   ├── characters.ts         # 角色素材、初始情绪和 Hit Zones
│   │   ├── reactions.ts          # 两只猫的反馈和 Idle 配置
│   │   ├── interactions.ts       # 手势类型、命中区类型和阈值
│   │   └── audio.ts              # 声音与震动提示 ID
│   ├── screens/                  # 启动、选猫和撸猫三个页面
│   ├── styles/                   # 视觉变量、响应式布局和动画
│   └── main.ts                   # 应用入口和生产环境 SW 注册
├── index.html
├── package.json
└── vite.config.ts                # 使用相对 base，兼容 Pages 子路径
```

## 游戏状态怎样工作

页面状态、手势状态、隐藏情绪和角色视觉状态是四套不同的数据，不混在一个大对象里。

1. `GameState` 决定当前是启动页、选猫页还是撸猫页。
2. `InteractionEngine` 将 Pointer Events 识别为结构化手势事件。
3. `InteractionSession` 保存当前角色的隐藏情绪。
4. `ReactionResolver` 使用角色、手势、区域和情绪，从 `reactions.ts` 选出一条反馈。
5. `CharacterStateMachine.setCharacterState()` 停止旧动画，播放新动画，并在规定时间后安全恢复 `IDLE`。

角色主状态包括 `IDLE`、`PETTING`、`HAPPY`、`VERY_HAPPY`、`CURIOUS`、`SURPRISED`、`ANNOYED`、`SLEEPY` 和 `RELAXED`。

## 怎样避免角色重影

- 每个撸猫页面只创建一个 `CharacterView`。
- 角色主体由一个 Canvas 绘制，不通过追加新图片播放反馈。
- 主动画节点同一时间只有一个 `data-animation`。
- 所有主状态只能通过 `setCharacterState()` 切换。
- 每次切换先停止旧动画并清理唯一恢复计时器。
- 状态机使用 revision token，让已经过期的回调无法覆盖新状态。
- 页面销毁时统一清理 Pointer 监听、Idle、声音、状态机和反馈计时器。

## 怎样替换角色素材

角色素材放在 `src/assets/characters/`，引用和显示参数集中在 `src/data/characters.ts`。

1. 把新图片复制到 `src/assets/characters/`。
2. 在 `characters.ts` 顶部导入图片。
3. 修改对应角色的 `assets.pet.source`。
4. 真正透明 PNG 的 `backgroundTreatment` 使用 `none`。
5. 如果仍是边缘连通的浅灰棋盘格图片，可临时使用 `connected-neutral`。
6. 打开 `?debug=true`，重新校准 Hit Zones。
7. 运行 `npm run build` 确认资源路径和类型检查都通过。

当前收到的两张正面文件扩展名实际是 JPG，图片内包含可见棋盘格，并没有 Alpha 透明通道。项目会在运行时清除与图片边缘连通的中性棋盘格。这是过渡方案；正式交付仍建议使用统一画布、真实透明背景的 PNG 或 WebP。

## 怎样修改橘小洛或小灰的反馈

打开 `src/data/reactions.ts`。`reactionTable` 中两只猫各有一组 `ReactionRule`，按 `priority` 从高到低匹配。

一条规则主要包含：

- `gestures`：可触发它的手势。
- `zones`：可触发它的身体区域。
- `minAffection` / `maxAffection`：好感条件。
- `minStimulation`：刺激度条件。
- `state`：要进入的唯一主状态。
- `animation`：交给动画适配器的动作名。
- `durationMs`：动作持续时间。
- `feedback`：玩家看到的克制文案。
- `delta`：隐藏情绪变化。
- `sound` / `haptic`：可选声音和震动提示。

修改角色性格反馈时，优先修改这里，不要在 `PetScreen.ts` 中堆角色判断。

## 怎样增加一个动作

当前动作由“反馈规则 + CSS 动画”组成。

1. 在 `src/data/reactions.ts` 新增或修改规则，并填写新的 `animation` 名称。
2. 在 `src/styles/global.css` 中为 `[data-animation="动作名"]` 增加视觉规则或关键帧。
3. 动作必须只改变现有角色节点的 `transform`、`opacity` 或局部效果，不能追加第二张角色主体。
4. 用 Debug 面板确认同一时间只有一个 State 和一个 Animation。
5. 运行 `npm run build`。

未来接入 Sprite、Rive 或 Spine 时，实现 `AnimationAdapter` 接口并替换 `AnimationController` 即可；状态机和反馈表无需整体重写。

## 怎样增加或调整 Hit Zone

Hit Zone 坐标都在 `src/data/characters.ts`，范围是 0 到 1，相对于 `CharacterView`，不依赖手机像素。

1. 在对应角色的 `createHitZones()` 参数或返回列表中增加区域。
2. 椭圆使用 `cx`、`cy` 表示中心，`rx`、`ry` 表示半径。
3. 新区域 ID 需要加入 `src/data/interactions.ts` 的 `HitZoneId`。
4. 在 `hitZoneLabels` 增加中文名称。
5. 在 `reactions.ts` 给该区域配置反馈。
6. 使用 `?debug=true` 在 390×844、393×852 和 430×932 等尺寸上检查边界。

当前正面素材没有可见尾巴，因此尾巴区域暂未启用；尾巴反馈规则仍保留。收到含尾巴的正面素材后，为角色传入 `tailX` 即可恢复。

## 怎样增加第三个角色

当前存档结构为了严格校验两只猫，增加第三个角色还需要少量类型和存档迁移，而不仅是复制页面。

1. 在 `src/assets/characters/` 添加新角色素材。
2. 在 `characters.ts` 扩展 `CharacterId`，并向 `characters` 数组添加一份配置。
3. 在 `reactions.ts` 添加新角色的 reaction rules 和 3 / 8 / 15 秒 Idle。
4. 在 `StorageManager.ts` 的默认存档与规范化逻辑中加入新角色。
5. 如果存档字段发生变化，提高 `SCHEMA_VERSION`，并决定迁移旧存档还是安全回退。
6. 为新角色补齐选猫卡视觉和至少四种手势的回归测试。

页面、InteractionEngine、状态机、设置和 PWA 不需要复制一套。

## 本地存档

存档键是：

```text
cat-tour-luoyang.pet.save
```

保存内容包括 `schemaVersion`、设置、`lastPlayedDate`、`selectedCat`、`dailyInteractions`、预留的连续陪伴字段，以及两只猫各自的情绪和总互动次数。

新的一天会清空“今日选择”和每日互动次数，并把刺激度恢复为 0。浏览器禁止本地存储时，游戏会退回当前页面生命周期内的内存数据，不阻断游玩。

## PWA 与离线说明

- PWA 只在生产构建中注册，开发服务器不会注册。
- 第一次联网打开后，Service Worker 会缓存入口、构建资源、清单和图标。
- 页面导航优先尝试网络，离线时回退到缓存入口。
- 同源静态资源使用缓存优先策略。
- iOS 可通过 Safari 的“分享 → 添加到主屏幕”安装；Android 浏览器通常会显示安装入口。
- PWA 安装和 Service Worker 在公网需要 HTTPS，GitHub Pages 已提供 HTTPS。

发布新版本时，如果需要强制刷新旧离线缓存，请修改 `public/sw.js` 中的缓存版本号。

## 部署到 GitHub Pages

项目已经包含 `.github/workflows/deploy-pages.yml`，推送到 `main` 分支时会自动安装依赖、构建并发布 `dist/`。

第一次发布：

1. 在 GitHub 新建一个空仓库。
2. 把本项目提交并推送到仓库的 `main` 分支。
3. 打开仓库的 **Settings → Pages**。
4. 在 **Build and deployment** 中把 Source 设为 **GitHub Actions**。
5. 打开 **Actions** 页面，等待“部署到 GitHub Pages”工作流完成。
6. 回到 Pages 设置页获取公开网址。

项目使用 `base: './'`，资源、PWA 清单和 Service Worker 都使用相对或 scope 派生路径，不需要把仓库名写死在代码里。以后每次推送 `main` 都会重新发布，也可以在 Actions 页面手动运行工作流。

## 移动端检查清单

每次更换素材或修改手势后，至少检查：

- 390×844、393×852、430×932 三种竖屏尺寸。
- 手机横屏和恢复竖屏。
- 快速连续点击 20 次。
- 缓慢滑动过程中抬手。
- 在不同触摸区之间连续移动。
- Idle 刚开始时立即触摸。
- 连续切换两只猫并返回。
- 刷新后今日选择、情绪和设置仍在。
- 切到后台再回来，输入、音频和 Idle 能安全恢复。
- 连续互动，确认 CharacterView 始终为 1、IdleTimer 始终为 1。
- 页面没有横向滚动，角色 Canvas 与 Hit Zone 尺寸一致。

## 当前 TODO

- `TODO_ASSET`：两只猫需要真实透明背景、统一画布的正式正面素材。
- `TODO_ASSET`：当前正面素材没有可见尾巴，尾巴 Hit Zone 暂停启用。
- `TODO_ASSET`：补正式 `purr.mp3`、轻触音效和庭院背景音乐。
- 目前动作主要是 CSS transform 占位效果，尚未加入正式表情层或序列帧。
- 尚未加入自动化端到端测试；当前使用 TypeScript、生产构建和移动视口手动回归。
- PWA 离线更新策略目前是 MVP 版本，正式运营前应增加更明确的新版本提示。

## 下一阶段最值得增加什么

优先补一套同画布尺寸的透明角色正面图，并为闭眼、害羞、警惕和不耐烦制作少量局部表情层。它能在不改变状态机和 InteractionEngine 的前提下，显著放大两只猫的性格差异。之后再补正式呼噜声和一组克制的光点反馈。

更完整的底层设计见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。
