export interface Tag {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  content: string;
  type: TaskType;
  dueDate: string | null;
  reminderValue: number | null;
  reminderUnit: 'minutes' | 'hours' | 'days' | null;
  project: {
    id: string;
    name: string;
  } | null;
  tags: Tag[];
}

export interface Project {
  id: string;
  name: string;
}

export interface Settings {
  serverUrl?: string;
  username?: string;
  password?: string;
  notificationsEnabled?: boolean;
  devModeEnabled?: boolean;
  consoleLoggingEnabled?: boolean;
}

export type View = 'main' | 'settings';

export enum TaskType {
  TASK = 'task',
  NOTE = 'note',
  PROJECT = 'project',
}

export type RescheduleMode = 'specific' | 'relative';
export type RescheduleUnit = 'minutes' | 'hours' | 'days' | 'months' | 'years';

export interface ReschedulePayload {
  mode: RescheduleMode;
  date?: string;
  value?: number;
  unit?: RescheduleUnit;
}