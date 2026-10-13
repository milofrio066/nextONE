import type { ComponentType } from 'react';
import type { Kind } from '../types';

export type BlockType =
  | 'hero' | 'countdown' | 'stats' | 'flip' | 'tabs' | 'accordion' | 'timeline' | 'agenda'
  | 'checklist' | 'quiz' | 'chooser' | 'steps' | 'bars' | 'donut' | 'radar' | 'people'
  | 'kanban' | 'compare' | 'slider' | 'links' | 'callout' | 'cta';

export type Props = Record<string, unknown>;
export interface Block { id: string; type: BlockType; props: Props }
export interface PageData { v: 1; accent?: string; blocks: Block[] }

export type FieldType = 'text' | 'textarea' | 'url' | 'number' | 'datetime' | 'select' | 'list' | 'strings';
export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  max?: number;
  help?: string;
  options?: [string, string][];
  fields?: FieldSpec[];
}
export interface BlockDef {
  type: BlockType;
  label: string;
  desc: string;
  icon: ComponentType<{ size?: number }>;
  fields: FieldSpec[];
  defaults: () => Props;
}
export interface PageTemplate {
  id: string;
  kind: Kind;
  name: string;
  description: string;
  tag: string;
  accent: string;
  blocks: { type: BlockType; props: Props }[];
}
