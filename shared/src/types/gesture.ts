/** 手势事件类型 */
export enum GestureType {
  TAP = 'tap',
  DOUBLE_TAP = 'doubleTap',
  LONG_PRESS = 'longPress',
  HOVER = 'hover',
  SELECTION = 'selection',
}

/** 手势事件 */
export interface GestureEvent<T = HTMLElement> {
  type: GestureType;
  target: T;
  originalEvent: MouseEvent | TouchEvent | PointerEvent;
  data?: any;
}

/** 手势配置 */
export interface GestureConfig {
  platform: 'web' | 'ipad';
  longPressDelay: number;
  doubleTapDelay: number;
}

/** 手势处理器 */
export type GestureHandler<T = HTMLElement> = (event: GestureEvent<T>) => void;
