# 《猫游洛阳·撸猫》PHASE 0 架构方案

## 1. 结论

项目采用用户指定的技术路线：Vite + TypeScript + 原生 HTML/CSS + Pointer Events。

工作区根目录是品牌素材库，已有“猫游洛阳官网”静态站，但没有独立的撸猫游戏工程，也没有可复用的 Vite 工程。新项目因此放在独立目录 `cat-tour-luoyang-pet/`，不修改旧官网。

现有官网里的角色正面图属于旧版本；本项目以用户提供的橘小洛 2.0、小灰 2.0 三视图为绝对角色参考。PHASE 1 只用 CSS 视窗裁切显示三视图中的正面，不重绘、不生成新角色。正式透明 PNG 到位后，只替换角色配置中的资源地址和裁切参数。

## 2. 推荐目录

```text
cat-tour-luoyang-pet/
├── docs/
│   └── ARCHITECTURE.md
├── public/
│   ├── icons/                       # PHASE 5 已完成
│   ├── manifest.webmanifest         # PHASE 5 已完成
│   └── sw.js                        # PHASE 5 已完成
├── src/
│   ├── app/
│   │   └── App.ts
│   ├── core/
│   │   ├── GameState.ts
│   │   ├── CharacterStateMachine.ts # PHASE 3 已完成
│   │   ├── AnimationController.ts    # PHASE 3 CSS 适配器
│   │   ├── InteractionSession.ts     # PHASE 3 隐藏情绪
│   │   ├── ReactionResolver.ts       # PHASE 3 规则匹配
│   │   ├── InteractionEngine.ts     # PHASE 2
│   │   ├── IdleManager.ts           # PHASE 3 已完成
│   │   ├── AnimationAdapter.ts      # PHASE 3 已完成
│   │   ├── SoundManager.ts          # PHASE 4 已完成
│   │   ├── HapticsManager.ts        # PHASE 4 已完成
│   │   └── StorageManager.ts        # PHASE 4 已完成
│   ├── data/
│   │   ├── characters.ts
│   │   ├── interactions.ts          # PHASE 2
│   │   ├── reactions.ts             # PHASE 3 已完成
│   │   └── audio.ts                 # PHASE 4 提示 ID
│   ├── screens/
│   │   ├── StartScreen.ts
│   │   ├── CharacterSelectScreen.ts
│   │   └── PetScreen.ts
│   ├── components/
│   │   ├── CharacterView.ts         # PHASE 2
│   │   ├── HitZoneLayer.ts          # PHASE 2
│   │   ├── FeedbackLayer.ts         # PHASE 3
│   │   └── SettingsPanel.ts         # PHASE 4 已完成
│   ├── assets/
│   │   ├── brand/
│   │   ├── characters/
│   │   ├── backgrounds/
│   │   ├── sounds/
│   │   └── ui/
│   ├── styles/
│   │   ├── tokens.css
│   │   └── global.css
│   └── main.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

原则：某个 Phase 未使用的文件不提前创建空壳，避免形成看似完整、实际不可验证的代码。

## 3. 状态分层

不要用一个“大状态”同时表示页面、情绪、手势和动画。它们分成四层：

1. `GameState`：页面、当前角色、每日记录与设置。
2. `InteractionSession`：`affection`、`mood`、`stimulation` 等隐藏数值。
3. `GestureState`：当前 pointer 会话与最终识别出的手势。
4. `CharacterStateMachine`：唯一主视觉状态。

### CharacterStateMachine

主状态：

```text
IDLE
PETTING
HAPPY
VERY_HAPPY
CURIOUS
SURPRISED
ANNOYED
SLEEPY
RELAXED
```

统一入口：

```ts
setCharacterState(nextState, options)
```

每次切换必须按顺序做：

```text
使旧 transition token 失效
→ 清除唯一恢复计时器
→ animationAdapter.stop()
→ 移除旧状态 class / 表情层
→ 写入新状态
→ animationAdapter.play(animationKey)
→ 到时仅在 token 仍匹配时恢复 IDLE
```

只保留一个 `currentState`、一个恢复计时器、一个 animation adapter。用户触摸优先级高于 Idle；新的主反馈会打断旧反馈。视觉特效属于 `FeedbackLayer`，不能创建第二个角色主体。

## 4. InteractionEngine

`InteractionEngine` 只负责把 Pointer Events 转换成结构化交互，不直接决定猫的性格反馈。

### 输入会话

每次 `pointerdown` 创建一个会话：

- `pointerId`
- 起点、最近点、路径总长
- 开始时间、最后时间
- 速度采样
- 命中的 hit zone 采样
- long-press 计时器
- 是否已经触发 long press

角色舞台只接受一个主要 pointer。使用 `setPointerCapture()`，并统一处理 `pointercancel`、`lostpointercapture`、`visibilitychange`。

### 手势判定顺序

```text
LONG_PRESS（约 600ms，移动仍在容差内）
→ RAPID_TAP（短窗口内达到点击阈值）
→ PET / STROKE（路径足够长、持续时间足够、平均速度较慢）
→ TAP（短时、小位移）
→ 取消/未知
```

建议初始阈值，后续通过手机实测调整：

- Tap 最大移动：12px
- Tap 最大时长：280ms
- Long press：600ms
- Stroke 最小路径：24px
- Stroke 最小时长：180ms
- Stroke 平均速度上限：0.55px/ms
- Rapid tap：900ms 内 4 次，触发后短暂冷却

最终输出统一事件：

```ts
interface InteractionEvent {
  gesture: 'TAP' | 'PET' | 'LONG_PRESS' | 'RAPID_TAP';
  zone: HitZoneId;
  durationMs: number;
  distancePx: number;
  velocityPxPerMs: number;
  pointerType: string;
}
```

`ReactionResolver` 再用 `characterId + gesture + zone + hiddenStats + recentHistory` 从配置表选择反应。

## 5. 角色配置

角色视觉、数值起点、碰撞区域和反馈规则分开，但通过角色 ID 关联：

```ts
interface CharacterDefinition {
  id: string;
  name: string;
  tagline: string;
  assets: {
    base: string;
    expressions?: Record<string, string>;
    spriteSheets?: Record<string, SpriteSheetConfig>;
  };
  initialStats: {
    affection: number;
    mood: number;
    stimulation: number;
  };
  hitZones: Record<HitZoneId, HitZoneShape[]>;
  thresholds: {
    warmingUp: number;
    trusting: number;
    rareAffection: number;
  };
}
```

Hit Zone 使用相对坐标，不写死屏幕像素：

```ts
type HitZoneShape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'polygon'; points: readonly [number, number][] };
```

所有坐标范围为 0–1，以 CharacterView 的标准设计画布为基准。角色素材更换后，只校准 `characters.ts`，业务逻辑不改。

反馈表单独放在 `reactions.ts`：

```ts
interface ReactionRule {
  id: string;
  characterId: CharacterId;
  gesture: GestureType;
  zones: readonly HitZoneId[];
  priority: number;
  when?: StatCondition;
  state: CharacterState;
  animation: string;
  durationMs: number;
  statDelta: Partial<HiddenStats>;
  feedback?: FeedbackSpec;
  sound?: string;
  haptic?: HapticPattern;
  cooldownMs?: number;
}
```

因此橘小洛和小灰共用引擎，但不共用反应结果。

## 6. AnimationAdapter

```ts
interface AnimationAdapter {
  play(animationKey: string, options?: AnimationPlayOptions): Promise<void>;
  stop(): void;
  reset(): void;
  destroy(): void;
}
```

第一版实现 `CssAnimationAdapter`。未来的 Sprite、Rive、Spine 只需要实现同一接口，状态机和 reaction table 不需要重写。

## 7. 防重影约束

- `PetScreen` 只创建一次 `CharacterView` 主实例。
- 主体 DOM 内只有一张 base 角色资源；表情与光点是明确命名的局部图层。
- `setCharacterState()` 是所有主动作的唯一入口。
- 状态切换先 stop/reset，再 play。
- 恢复动画使用 transition token，过期回调不能操作当前状态。
- Screen 自带 `AbortController`；销毁时一次清理全部事件。
- Idle、long press、state recovery 各自最多一个计时器，并提供 `cancel()` / `destroy()`。
- `visibilitychange`、换猫和退出页面都会统一清理。

## 8. MVP 开发顺序

1. PHASE 1：项目骨架、页面状态、启动页、选猫页、撸猫页占位。
2. PHASE 2：唯一 CharacterView、归一化 Hit Zones、Pointer Events、四类手势。
3. PHASE 3：角色状态机、反应规则、隐藏情绪、3/8/15 秒 Idle、Debug 面板。
4. PHASE 4：声音、震动、设置、版本化 localStorage、每日陪伴字段。
5. PHASE 5：PWA、GitHub Pages、中文 README、自动检查与手机回归测试。

每阶段结束都执行 TypeScript 检查和生产构建；阶段内先交付一个可运行竖切片，再扩展。

## 9. 主要风险与处理

1. **角色素材画布不统一**：三视图不是透明游戏素材。当前只做裁切预览；PHASE 2 前最好补同画布尺寸、透明背景、正面站姿 PNG。
2. **角色版本混用**：官网旧正面图与 2.0 不一致。所有正式素材必须标明角色版本，并以 2.0 三视图审核。
3. **手势冲突**：撸动会和页面滚动冲突。只对角色互动舞台设置 `touch-action: none`，页面其他区域仍可正常滚动。
4. **Tap 与 Rapid Tap 冲突**：普通 Tap 可以先反馈，达到 rapid 阈值时由状态机安全打断并切换到 rapid 反应；加入冷却避免反复抖动。
5. **定时器竞态**：Idle、long press、状态恢复都可能晚到。统一 token + 单计时器 + destroy 清理。
6. **iOS 音频限制**：首次用户手势内解锁 AudioContext；静音状态先于播放判断。
7. **震动支持不一致**：`navigator.vibrate` 只做能力检测后的增强，不影响主要反馈。
8. **GitHub Pages 子路径**：Vite 使用相对 `base`；PWA 的 scope、manifest 和缓存路径在 PHASE 5 一起验证。
9. **旧存档结构变化**：localStorage 从第一版就带 `schemaVersion`，升级时迁移或安全回退。
10. **移动端后台恢复**：监听 `visibilitychange`，暂停输入、音频和 Idle；回来后以单一 IDLE 状态恢复。

## 10. PHASE 1 验收

- `npm run build` 成功。
- 启动页可以进入选猫页。
- 两张角色卡使用 2.0 参考图，第一次点击产生不同的轻反馈。
- 再点同一角色进入撸猫页占位。
- 可以从占位页返回换猫。
- 页面销毁会撤销事件监听，不累计监听器。
- 移动端保持单列游戏壳，桌面端最大宽度 460px。

## 11. PHASE 3 实现结果

- `setCharacterState()` 是所有主反馈与 Idle 的唯一入口；每次切换会使旧恢复回调失效。
- CSS 适配器只在唯一视觉节点上保留一个 `data-animation`，没有叠加角色图片或动画 class。
- `reactionTable` 按优先级、角色、手势、区域、好感与刺激度匹配反馈。
- 橘小洛初始信任较高，慢撸与挠下巴更容易进入 `RELAXED` / `VERY_HAPPY`。
- 小灰初始警惕，摸头反馈会在 `affection >= 30` 后由后仰观察逐渐变为偷偷享受。
- Rapid Tap 会显著提高 `stimulation`；闲置时约每秒下降 4 点。
- `IdleManager` 只创建一个 interval；3 / 8 / 15 秒每层只触发一次，输入立即重置。
- `?debug=true` 显示当前 State、Animation、隐藏情绪、Gesture、Hit Zone、Idle 秒数和实例计数。
- 当前正面素材没有尾巴，尾巴命中区暂不启用；配置和 Reaction 规则未删除，待素材补齐后恢复。

## 12. PHASE 4 实现结果

- `StorageManager` 使用 `schemaVersion: 1`，读取时逐字段校验并限制数值范围；损坏存档安全回退。
- 存档记录 `lastPlayedDate`、`selectedCat`、`dailyInteractions`、两只猫各自的情绪和三项设置。
- 刷新后今日选择会在选猫页恢复；切换角色和离开撸猫页都会保存最新情绪。
- 新的一天会重置今日选择、每日互动次数和刺激度，不会锁死昨天选择的猫。
- `SoundManager` 只在用户首次触摸后创建或恢复 `AudioContext`，默认音量保持克制。
- 当前庭院音乐和四类反馈声为 Web Audio 占位实现；正式音频到位后内部替换即可。
- `HapticsManager` 检测浏览器支持情况，不支持时设置项自动禁用。
- 设置面板分别控制音乐、音效和震动，修改后立即生效并保存。
- 切后台时停止当前音效、音乐调度和震动；回到前台后只在音频仍可运行时安全恢复音乐。

## 13. PHASE 5 实现结果

- 修复 CharacterView 在弹性布局中高度无法解析而塌陷为 0×0 的问题；角色 Canvas 与 Hit Zone 层重新共享同一可见画布。
- `manifest.webmanifest`、普通图标、maskable 图标、主题色和 iOS 主屏幕元数据已经接入。
- Service Worker 只在生产环境注册，使用当前 scope 派生路径，兼容 GitHub Pages 项目子目录。
- Vite 保持相对 `base`，`dist/` 内没有写死仓库名或本地磁盘路径。
- GitHub Actions 会在推送 `main` 后执行 `npm ci`、`npm run build` 并发布 `dist/`。
- `README.md` 已补齐面向初学者的运行、素材替换、动作、反馈、Hit Zone、新角色、PWA 和 Pages 说明。
- 移动回归以角色实例数、IdleManager 实例数、画布尺寸、横向溢出、手势、刷新和换猫为核心检查项。
