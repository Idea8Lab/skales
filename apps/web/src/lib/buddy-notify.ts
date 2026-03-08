/**
 * buddy-notify.ts
 *
 * Lightweight utility to push a short notification message to the Desktop Buddy
 * bubble. Any server-side code (autopilot, task runner, scheduled jobs, etc.)
 * can call `pushBuddyNotification()` and the Buddy widget will display it
 * within ~5 seconds via its polling interval.
 *
 * Storage: ~/.skales-data/buddy-queue.json  (array of { text, ts })
 * The GET /api/buddy-notifications endpoint drains this file atomically.
 */

import fs   from 'fs';
import path from 'path';
import { DATA_DIR } from '@/lib/paths';

const QUEUE_FILE = path.join(DATA_DIR, 'buddy-queue.json');
const MAX_QUEUE  = 20; // prevent unbounded growth if buddy window is closed

export interface BuddyNotification {
    text: string;
    ts:   number;
}

function readQueue(): BuddyNotification[] {
    try {
        if (!fs.existsSync(QUEUE_FILE)) return [];
        return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8')) as BuddyNotification[];
    } catch {
        return [];
    }
}

function writeQueue(queue: BuddyNotification[]): void {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
    } catch { /* non-fatal */ }
}

/**
 * Push a short text notification to the Buddy bubble queue.
 * Call this from task runners, autopilot hooks, cron completions, etc.
 *
 * @example
 *   pushBuddyNotification('✅ Task "Send weekly report" completed.');
 *   pushBuddyNotification('📧 Email sent to john@example.com.');
 */
export function pushBuddyNotification(text: string): void {
    const queue = readQueue();
    queue.push({ text: text.slice(0, 200), ts: Date.now() });
    // Keep only the most recent MAX_QUEUE notifications
    writeQueue(queue.slice(-MAX_QUEUE));
}

/**
 * Drain all pending notifications (returns them and clears the queue).
 * Called exclusively by GET /api/buddy-notifications.
 */
export function drainBuddyNotifications(): BuddyNotification[] {
    const queue = readQueue();
    if (queue.length === 0) return [];
    writeQueue([]);          // atomic clear
    return queue;
}
