// WHUT OS V3 — Card System Types

export type CardType =
  | 'stat'
  | 'chart'
  | 'email-list'
  | 'email-compose'
  | 'email-detail'
  | 'calendar'
  | 'research'
  | 'content'
  | 'file-list'
  | 'action'
  | 'markdown';

export type CardSize = 'small' | 'medium' | 'large' | 'full';

export interface Card {
  id: string;
  type: CardType;
  title?: string;
  data: any;
  position: { x: number; y: number }; // percentage of viewport
  size: CardSize;
  priority: number; // 1 = primary, 2 = secondary, 3 = tertiary
  interactive: boolean;
  minimized?: boolean;
}

export interface StreamEvent {
  type: 'status' | 'card' | 'done' | 'error';
  text?: string;       // status text or spoken text
  card?: Card;         // for card events
  error?: string;      // for error events
}
