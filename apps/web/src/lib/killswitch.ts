// ============================================================
// Skales Killswitch — Emergency Shutdown
// ============================================================
// Triggered manually (Telegram /killswitch, Dashboard button)
// or automatically (RAM overload, API loop detection).
//
// Actions:
//   1. Write killswitch log to Desktop (fallback: .skales-data/)
//   2. Stop the Next.js process via process.exit(0)
//   3. Optionally issue OS-level shutdown command
//
// Design: fully synchronous so it can run from any context.
// Gives the caller a 1.5-second window to send a final response
// before the process exits.
// ============================================================

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

import { DATA_DIR } from '@/lib/paths';

// ─── Types ───────────────────────────────────────────────────

export type KillswitchReason =
    | 'manual_telegram'
    | 'manual_dashboard'
    | 'manual_chat'
    | 'auto_ram'
    | 'auto_api_loop'
    | 'auto_file_access';

export interface KillswitchOptions {
    reason: KillswitchReason;
    details?: string;
    triggeredBy?: string;
    /** Also issue OS shutdown command (default: false) */
    shutdownPC?: boolean;
}

export interface KillswitchResult {
    success: boolean;
    logPath: string;
    error?: string;
}

// ─── Main Function ────────────────────────────────────────────

export function executeKillswitch(options: KillswitchOptions): KillswitchResult {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const logFilename = `killswitch-log-${timestamp}.txt`;

    const shutdownCmd = process.platform === 'win32'
        ? 'shutdown /s /t 0'
        : 'sudo shutdown -h now';

    const logContent = [
        '============================================================',
        'SKALES EMERGENCY KILLSWITCH TRIGGERED',
        '============================================================',
        `Timestamp    : ${now.toISOString()}`,
        `Reason       : ${options.reason}`,
        `Details      : ${options.details || 'N/A'}`,
        `Triggered by : ${options.triggeredBy || 'unknown'}`,
        `Process PID  : ${process.pid}`,
        `Platform     : ${process.platform}`,
        `Node.js      : ${process.version}`,
        `Hostname     : ${os.hostname()}`,
        `Uptime       : ${Math.round(process.uptime())}s`,
        '============================================================',
        '',
        'Actions taken:',
        '  1. Killswitch log written to Desktop',
        '  2. Skales process termination initiated (process.exit(0))',
        options.shutdownPC
            ? `  3. System shutdown initiated: ${shutdownCmd}`
            : '  3. System shutdown: skipped',
        '',
        '============================================================',
        'To restart Skales, close and reopen the app.',
        '============================================================',
    ].join('\n');

    const desktopPath = path.join(os.homedir(), 'Desktop');
    let actualLogPath = path.join(desktopPath, logFilename);

    try {
        // Write log — prefer Desktop, fall back to .skales-data/
        try {
            if (!fs.existsSync(desktopPath)) {
                fs.mkdirSync(desktopPath, { recursive: true });
            }
            fs.writeFileSync(actualLogPath, logContent, 'utf-8');
        } catch {
            if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
            actualLogPath = path.join(DATA_DIR, logFilename);
            fs.writeFileSync(actualLogPath, logContent, 'utf-8');
        }

        // 1.5s window so the caller can send a final HTTP response / Telegram message
        setTimeout(() => {
            if (options.shutdownPC) {
                try { execSync(shutdownCmd); } catch { /* best effort */ }
            }
            process.exit(0);
        }, 1500);

        return { success: true, logPath: actualLogPath };
    } catch (e: any) {
        return { success: false, logPath: actualLogPath, error: e.message };
    }
}

// ─── Auto-Trigger: RAM Monitor ────────────────────────────────
// Called from NotificationManager every 30s.
// Returns true if RAM usage is critically high (>= threshold).

export function isRamCritical(thresholdPercent = 95): boolean {
    try {
        const total = os.totalmem();
        const free = os.freemem();
        const usedPercent = ((total - free) / total) * 100;
        return usedPercent >= thresholdPercent;
    } catch {
        return false;
    }
}
