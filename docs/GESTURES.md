# 手势抽象层设计文档

## 概述

手势抽象层是 LexiLand Read 的核心架构之一，目标是将平台特定的交互事件（如鼠标点击、触摸）抽象为语义化手势，使业务代码与平台解耦，便于未来迁移到 iPad。

## 核心理念

### 问题
- Web 平台：click, dblclick, mouseenter, mouseleave
- iPad 平台：touchstart, touchend, longPress, 3D Touch

如果业务组件直接监听这些事件，迁移时需要改动大量代码。

### 解决方案
引入手势抽象层，定义统一的手势类型（TAP, DOUBLE_TAP, HOVER 等），不同平台只需实现适配器。

```typescript
// ❌ 错误做法（与平台耦合）
<span onDoubleClick={handleMarkWord}>word</span>

// ✅ 正确做法（平台无关）
const ref = useRef<HTMLSpanElement>(null);
useGesture(ref, GestureType.DOUBLE_TAP, handleMarkWord);
return <span ref={ref}>word</span>;
```

## 手势类型映射

| 手势类型 | Web 实现 | iPad 实现 | 用途 |
|---------|---------|----------|------|
| TAP | click | touchend (单次) | 单击单词朗读 |
| DOUBLE_TAP | click (双击检测) | touchend (双击检测) | 双击标词 |
| HOVER | mouseenter/leave | longPress | 悬停显示提示 |
| LONG_PRESS | mousedown + 延迟 | touchstart + 延迟 | 长按菜单 |
| SELECTION | selectionchange | iOS Selection API | 选区生成插图 |

## 架构设计

```
┌─────────────────────────────────────────┐
│         业务组件 (Word.tsx)              │
│  useGesture(ref, DOUBLE_TAP, handler)   │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│       React Hook (useGesture.ts)        │
│    封装 EventManager 调用为 Hook         │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│    EventManager (单例，全局管理器)       │
│   - 根据平台选择适配器                   │
│   - 统一事件分发                         │
└──────────────────┬──────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
┌────────▼────────┐  ┌───────▼──────────┐
│ WebGestureAdapter│  │iPadGestureAdapter│
│  (Web 平台实现)  │  │ (iPad 平台实现)  │
└─────────────────┘  └──────────────────┘
         │                   │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │  DOM/Touch Events  │
         └────────────────────┘
```

## 核心代码

### 1. 手势类型定义

```typescript
// shared/src/types/gesture.ts
export enum GestureType {
  TAP = 'tap',
  DOUBLE_TAP = 'doubleTap',
  LONG_PRESS = 'longPress',
  HOVER = 'hover',
  SELECTION = 'selection',
}

export interface GestureEvent<T = HTMLElement> {
  type: GestureType;
  target: T;
  originalEvent: MouseEvent | TouchEvent | PointerEvent;
  data?: any;
}

export interface GestureConfig {
  platform: 'web' | 'ipad';
  longPressDelay: number;    // 长按延迟（ms）
  doubleTapDelay: number;    // 双击间隔（ms）
}

export type GestureHandler<T = HTMLElement> = (event: GestureEvent<T>) => void;
```

### 2. EventManager (单例)

```typescript
// frontend/src/core/events/EventManager.ts
class EventManager {
  private static instance: EventManager;
  private config: GestureConfig;
  private adapter: GestureAdapter;

  private constructor() {
    this.config = {
      platform: 'web',
      longPressDelay: 500,
      doubleTapDelay: 300,
    };
    this.adapter = this.createAdapter();
  }

  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  configure(config: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...config };
    this.adapter = this.createAdapter();
  }

  attach(
    element: HTMLElement,
    gestureType: GestureType,
    handler: GestureHandler
  ): () => void {
    return this.adapter.attach(element, gestureType, handler);
  }

  private createAdapter(): GestureAdapter {
    if (this.config.platform === 'web') {
      return new WebGestureAdapter(this.config);
    } else {
      return new iPadGestureAdapter(this.config);
    }
  }
}

export default EventManager;
```

### 3. Web 适配器

```typescript
// frontend/src/core/events/WebGestureAdapter.ts
export class WebGestureAdapter implements GestureAdapter {
  constructor(private config: GestureConfig) {}

  attach(
    element: HTMLElement,
    gestureType: GestureType,
    handler: GestureHandler
  ): () => void {
    switch (gestureType) {
      case GestureType.TAP:
        return this.attachTap(element, handler);
      case GestureType.DOUBLE_TAP:
        return this.attachDoubleTap(element, handler);
      case GestureType.HOVER:
        return this.attachHover(element, handler);
      case GestureType.LONG_PRESS:
        return this.attachLongPress(element, handler);
      case GestureType.SELECTION:
        return this.attachSelection(element, handler);
    }
  }

  private attachDoubleTap(element: HTMLElement, handler: GestureHandler) {
    let lastTap = 0;

    const listener = (e: MouseEvent) => {
      const now = Date.now();
      const delta = now - lastTap;

      if (delta < this.config.doubleTapDelay && delta > 0) {
        // 双击
        e.preventDefault();
        handler({
          type: GestureType.DOUBLE_TAP,
          target: element,
          originalEvent: e,
        });
        lastTap = 0; // 重置，避免三连击
      } else {
        // 可能是单击，等待
        lastTap = now;
      }
    };

    element.addEventListener('click', listener);
    return () => element.removeEventListener('click', listener);
  }

  // 其他方法实现...
}
```

### 4. React Hook

```typescript
// frontend/src/core/events/useGesture.ts
import { useEffect, RefObject } from 'react';
import EventManager from './EventManager';
import { GestureType, GestureHandler } from '@lexiland/shared';

export function useGesture<T extends HTMLElement>(
  ref: RefObject<T>,
  gestureType: GestureType,
  handler: GestureHandler<T>,
  deps: any[] = []
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const manager = EventManager.getInstance();
    const cleanup = manager.attach(
      element as HTMLElement,
      gestureType,
      handler as GestureHandler
    );

    return cleanup;
  }, [ref, gestureType, handler, ...deps]);
}
```

### 5. 业务组件使用

```typescript
// frontend/src/features/reader/Word.tsx
import { useRef } from 'react';
import { useGesture } from '@/core/events/useGesture';
import { GestureType, Token } from '@lexiland/shared';

interface WordProps {
  token: Token;
  onTap: (word: string) => void;
  onDoubleTap: (word: string) => void;
}

export function Word({ token, onTap, onDoubleTap }: WordProps) {
  const ref = useRef<HTMLSpanElement>(null);

  // 声明式注册手势
  useGesture(ref, GestureType.TAP, () => onTap(token.text));
  useGesture(ref, GestureType.DOUBLE_TAP, () => onDoubleTap(token.text));

  return (
    <span
      ref={ref}
      className={cn(
        'word',
        token.isMarked && 'font-bold',
        token.isKnown && 'text-orange-300'
      )}
    >
      {token.text}
      {token.annotation && (
        <span className="annotation">
          {token.annotation.ipa} · {token.annotation.translation}
        </span>
      )}
    </span>
  );
}
```

## 双击事件处理难点

### 问题
Web 中 `dblclick` 事件会同时触发：
1. 第一次 `click`
2. 第二次 `click`
3. `dblclick`

如果业务逻辑既监听 `click` 又监听 `dblclick`，会导致：
- 双击时，先朗读（click），再标词（dblclick）

### 解决方案
不使用原生 `dblclick`，而是在 `click` 中手动检测双击：

```typescript
private attachDoubleTap(element: HTMLElement, handler: GestureHandler) {
  let lastTap = 0;
  let singleTapTimer: number | null = null;

  const listener = (e: MouseEvent) => {
    const now = Date.now();
    const delta = now - lastTap;

    if (delta < this.config.doubleTapDelay && delta > 0) {
      // 确认双击
      if (singleTapTimer) {
        clearTimeout(singleTapTimer);
        singleTapTimer = null;
      }

      e.preventDefault();
      handler({
        type: GestureType.DOUBLE_TAP,
        target: element,
        originalEvent: e,
      });
      lastTap = 0;
    } else {
      // 等待可能的第二次点击
      lastTap = now;

      // 延迟触发单击（如果需要）
      // singleTapTimer = window.setTimeout(() => {
      //   handler({ type: GestureType.TAP, ... });
      // }, this.config.doubleTapDelay);
    }
  };

  element.addEventListener('click', listener);
  return () => {
    element.removeEventListener('click', listener);
    if (singleTapTimer) clearTimeout(singleTapTimer);
  };
}
```

**注意**：如果同时需要 TAP 和 DOUBLE_TAP，TAP 需要延迟触发，等待确认不是双击。

## iPad 迁移指南

未来迁移到 iPad 时，只需：

1. 实现 `iPadGestureAdapter`：
```typescript
export class iPadGestureAdapter implements GestureAdapter {
  attach(element: HTMLElement, gestureType: GestureType, handler: GestureHandler) {
    switch (gestureType) {
      case GestureType.TAP:
        return this.attachTouch(element, handler);
      case GestureType.DOUBLE_TAP:
        return this.attachDoubleTouch(element, handler);
      case GestureType.HOVER:
        // iPad 上用长按模拟悬停
        return this.attachLongPress(element, handler);
      // ...
    }
  }
}
```

2. 配置平台：
```typescript
// React Native 中
EventManager.getInstance().configure({ platform: 'ipad' });
```

3. **业务代码无需改动**

## 最佳实践

1. **不要在业务组件中直接监听 DOM 事件**
   - ❌ `<span onClick={...}>`
   - ✅ `useGesture(ref, GestureType.TAP, ...)`

2. **一个元素只注册一种手势类型**
   - 如果同时需要 TAP 和 DOUBLE_TAP，优先 DOUBLE_TAP，TAP 降级为延迟触发

3. **手势冲突处理**
   - HOVER 和 TAP 可共存
   - LONG_PRESS 和 HOVER 互斥（iPad 上 HOVER 用 LONG_PRESS 实现）

4. **阻止默认行为**
   - 双击时阻止文本选中：`e.preventDefault()`
   - 长按时阻止右键菜单：`e.preventDefault()`

## 测试策略

1. **单元测试**：
   - 测试 EventManager 单例
   - 测试 WebGestureAdapter 各手势识别逻辑

2. **集成测试**：
   - 模拟用户快速双击，验证只触发 DOUBLE_TAP
   - 模拟用户悬停，验证 HOVER 进入/离开

3. **E2E 测试**：
   - Playwright 模拟真实用户操作
   - 验证标词、朗读、卡片展开等完整流程

## 性能优化

1. **事件委托**（可选）：
   如果单词数量超过 1000，考虑事件委托：
   ```typescript
   // 在 ReaderView 上监听，通过 event.target 判断点击的单词
   useGesture(containerRef, GestureType.DOUBLE_TAP, (e) => {
     const word = findWordByTarget(e.target);
     if (word) handleMarkWord(word);
   });
   ```

2. **防抖/节流**：
   - HOVER 事件用防抖，避免频繁触发
   - SELECTION 事件用节流，避免选区变化时频繁计算

## 总结

手势抽象层是跨平台架构的关键，通过统一的手势接口，使业务代码与平台解耦。设计时需要考虑：

- **可扩展性**：未来支持新平台（Android、桌面端）
- **可测试性**：每个适配器独立测试
- **性能**：避免过度抽象导致性能损失
- **用户体验**：手势识别要准确，延迟要低

这种设计在开发初期会增加一些复杂度，但长期来看，大幅降低了迁移成本和维护难度。
