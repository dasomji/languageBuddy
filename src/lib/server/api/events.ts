import { EventEmitter } from "events";

export const ee = new EventEmitter();

export const EVENTS = {
  STATS_UPDATED: "stats_updated",
  PROGRESS: "progress",
} as const;

