'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    getRecentMemoriesWithFilenames, loadSoul, loadHuman,
    clearMemories, getMemoryStats, saveHumanProfile, deleteMemory
} from '@/actions/identity';
import { createCronJob, deleteCronJob, listCronJobs, toggleCronJob } from '@/actions/tasks';
import { getExtractedMemories, removeExtractedMemory, triggerMemoryScan, type ExtractedMemory } from '@/actions/memories';

import {
    Brain, Sparkles, User, Trash2, RefreshCw, Save, AlertTriangle,
    Clock, Database, Zap, Edit3, Plus, Check, X, ScanSearch
} from 'lucide-react';

const Icon = ({ icon: I, ...props }: { icon: any;[key: string]: any }) => {
    const Component = I;
    return <Component {...props} />;
};

// Common emojis for quick selection
const AVATAR_EMOJIS = ['👤', '👨', '👩', '🧑', '👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨', '🚀', '🦸', '🧙', '🤖', '🎭', '🐉', '🦊', '🐺', '🦁', '🐸', '🌟', '🔥', '💎', '⚡'];

export default function MemoryPage() {
    const [shortTermMemories, setShortTermMemories] = useState<Array<{ filename: string; data: any }>>([]);
    const [longTermMemories, setLongTermMemories] = useState<Array<{ filename: string; data: any }>>([]);
    const [episodicMemories, setEpisodicMemories] = useState<Array<{ filename: string; data: any }>>([]);
    const [soul, setSoul] = useState<any>(null);
    const [human, setHuman] = useState<any>(null);
    const [stats, setStats] = useState({ shortTerm: 0, longTerm: 0, episodic: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const [identityCronExists, setIdentityCronExists] = useState(false);
    const [identityCronId, setIdentityCronId] = useState<string | null>(null);
    const [identityCronEnabled, setIdentityCronEnabled] = useState(false);

    // Auto-extracted memories (bi-temporal memory store)
    const [extractedMemories, setExtractedMemories] = useState<ExtractedMemory[]>([]);
    const [scanRunning, setScanRunning] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);


    // Profile form state
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('👤');
    const [content, setContent] = useState('');
    const [occupation, setOccupation] = useState('');
    const [interests, setInterests] = useState('');
    const [goals, setGoals] = useState('');
    const [language, setLanguage] = useState('en');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Compute word frequency cluster from all loaded memories
    const wordCluster = useMemo(() => {
        const STOP_WORDS = new Set([
            'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
            'from','is','are','was','were','be','been','being','have','has','had','do',
            'does','did','will','would','could','should','may','might','that','this',
            'these','those','it','its','i','you','he','she','we','they','me','him','her',
            'us','them','my','your','his','our','their','what','which','who','how','when',
            'where','why','not','no','so','as','if','then','than','about','up','out','also',
            'chat','skales','user','timestamp','summary','content','context','null','undefined',
        ]);

        const freq: Record<string, number> = {};
        const allMemories = [...shortTermMemories, ...longTermMemories, ...episodicMemories];

        for (const { data } of allMemories) {
            const texts = [
                data.summary,
                data.content,
                data.user,
                data.ai,
                data.context,
            ].filter(Boolean).join(' ');

            const words = texts
                .toLowerCase()
                .replace(/[^a-z0-9äöüß ]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 3 && !STOP_WORDS.has(w));

            for (const w of words) {
                freq[w] = (freq[w] || 0) + 1;
            }
        }

        // Sort by frequency, take top 35
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 35)
            .map(([word, count]) => ({ word, count }));
    }, [shortTermMemories, longTermMemories, episodicMemories]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [stm, ltm, epm, soulData, humanData, statsData, cronJobs, extracted] = await Promise.all([
                getRecentMemoriesWithFilenames('short-term', 30),
                getRecentMemoriesWithFilenames('long-term', 20),
                getRecentMemoriesWithFilenames('episodic', 50),
                loadSoul(),
                loadHuman(),
                getMemoryStats(),
                listCronJobs(),
                getExtractedMemories(),
            ]);
            setExtractedMemories(extracted);
            setShortTermMemories(stm);
            setLongTermMemories(ltm);
            setEpisodicMemories(epm);
            setSoul(soulData);
            setHuman(humanData);
            setStats(statsData);

            // Pre-fill profile form
            setName(humanData.name || '');
            setEmoji(humanData.emoji || '👤');
            setContent(humanData.content || '');
            setOccupation(humanData.context?.occupation || '');
            setInterests((humanData.interests || []).join(', '));
            setGoals((humanData.context?.goals || []).join(', '));
            setLanguage(humanData.preferences?.language || 'en');

            // Find all identity cron jobs — delete duplicates, keep only one
            const identityJobs = cronJobs.filter((j: any) =>
                j.name.toLowerCase().includes('identity') ||
                j.task.toLowerCase().includes('identity') ||
                j.task.toLowerCase().includes('user profile')
            );
            // Delete any extras beyond the first one
            if (identityJobs.length > 1) {
                for (const extra of identityJobs.slice(1)) {
                    await deleteCronJob(extra.id).catch(() => { });
                }
            }
            const foundCron = identityJobs[0] || null;
            setIdentityCronExists(!!foundCron);
            setIdentityCronId(foundCron?.id || null);
            setIdentityCronEnabled(foundCron?.enabled ?? false);

        } catch (e) {
            console.error('Failed to load memory data:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await saveHumanProfile({
                name,
                emoji,
                content,
                occupation,
                interests: interests.split(',').map(s => s.trim()).filter(Boolean),
                goals: goals.split(',').map(s => s.trim()).filter(Boolean),
                language,
            });
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 3000);
        } catch (e) {
            console.error('Failed to save profile:', e);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteMemory = async (type: 'short-term' | 'long-term' | 'episodic', filename: string) => {
        try {
            await deleteMemory(type, filename);
            loadData();
        } catch (e) {
            console.error('Failed to delete memory:', e);
        }
    };

    const handleClearMemories = async (type: 'short-term' | 'long-term' | 'episodic' | 'all') => {
        const label = type === 'all' ? 'ALL memories' : `${type} memories`;
        if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
        try {
            await clearMemories(type);
            loadData();
        } catch (e) {
            console.error('Failed to clear memories:', e);
        }
    };

    const handleDeleteExtractedMemory = async (id: string) => {
        try {
            await removeExtractedMemory(id);
            setExtractedMemories(prev => prev.filter(m => m.id !== id));
        } catch (e) {
            console.error('Failed to delete extracted memory:', e);
        }
    };

    const handleRunScan = async () => {
        setScanRunning(true);
        setScanResult(null);
        try {
            const result = await triggerMemoryScan();
            if (result.error) {
                setScanResult(`Error: ${result.error}`);
            } else if (result.skipped) {
                setScanResult('No new conversations since last scan.');
            } else {
                setScanResult(`Scanned ${result.scanned} session(s), extracted ${result.extracted} new memory(s).`);
                if (result.extracted > 0) {
                    const fresh = await getExtractedMemories();
                    setExtractedMemories(fresh);
                }
            }
        } catch (e: any) {
            setScanResult(`Error: ${e.message}`);
        } finally {
            setScanRunning(false);
            setTimeout(() => setScanResult(null), 5000);
        }
    };

    const handleCreateIdentityCron = async () => {
        try {
            // Guard: don't create a duplicate — clean up any that already exist first
            const existing = await listCronJobs();
            const dupes = existing.filter((j: any) =>
                j.name.toLowerCase().includes('identity') ||
                j.task.toLowerCase().includes('user profile')
            );
            for (const dupe of dupes) {
                await deleteCronJob(dupe.id).catch(() => { });
            }

            const job = await createCronJob({
                name: 'Identity Maintenance',
                schedule: '0 3 * * *',
                task:
                    'Perform a full identity maintenance cycle. Execute ALL of these steps in order:\n\n' +
                    '1. Read the file .skales-data/identity/human.json — note the user\'s name, interests, projects, relationship.interactionCount.\n\n' +
                    '2. Read the last 10 files from .skales-data/memory/short-term/ (list the folder, sort by filename descending, read the newest ones) — analyze patterns in topics, questions, tone.\n\n' +
                    '3. Update human.json: improve the "content" field with a 3-5 sentence summary of who the user is. Increment relationship.interactionCount by 1. Save back to .skales-data/identity/human.json.\n\n' +
                    '4. Update soul.json: read .skales-data/identity/soul.json, then set memory.totalInteractions to the current interactionCount from human.json, add any new learnings to personality.learnings (max 8 entries total, keep the most relevant), update lastUpdated to current timestamp in ms. Save back to .skales-data/identity/soul.json.\n\n' +
                    '5. Write a long-term memory entry: create .skales-data/memory/long-term/identity-update-TIMESTAMP.json (use current Unix timestamp in ms as TIMESTAMP) with structure: { "type": "identity-update", "timestamp": <now ms>, "summary": "<2-3 sentences>", "changes": ["<change1>", "<change2>"] }\n\n' +
                    'When done, respond ONLY with a single short English summary like: "Identity updated: [2-3 word change summary]". Do NOT send Telegram notifications — the system handles that automatically.',
                enabled: true,
            });
            setIdentityCronExists(true);
            setIdentityCronId(job.id);
            await loadData();
        } catch (e) {
            console.error('Failed to create identity cron:', e);
        }
    };

    const handleDisableIdentityCron = async () => {
        if (!identityCronId) return;
        const willEnable = !identityCronEnabled;
        if (!willEnable && !confirm('Disable Identity Maintenance? Your profile will no longer be updated automatically.')) return;
        try {
            await toggleCronJob(identityCronId, willEnable);
            setIdentityCronEnabled(willEnable);
        } catch (e) {
            console.error('Failed to toggle identity cron:', e);
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Icon icon={RefreshCw} size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-32">
            <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8 animate-fadeIn">
                <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                    <Icon icon={Brain} size={24} className="text-purple-500" />
                    Memory & Identity
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Manage what Skales knows about you and your context
                </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">

                {/* Stats Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Short-Term', value: stats.shortTerm, icon: Clock, color: 'text-blue-500' },
                        { label: 'Long-Term', value: stats.longTerm, icon: Database, color: 'text-purple-500' },
                        { label: 'Episodic', value: stats.episodic, icon: Zap, color: 'text-amber-500' },
                    ].map(stat => (
                        <div key={stat.label} className="rounded-2xl border p-4 text-center"
                            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                            <Icon icon={stat.icon} size={20} className={`${stat.color} mx-auto mb-2`} />
                            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Word Cluster Visualization */}
                {wordCluster.length > 0 && (
                    <section className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Icon icon={Sparkles} size={20} className="text-lime-400" />
                            Memory Topics
                        </h2>
                        <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
                            Most frequent topics across all stored memories
                        </p>
                        <div className="flex flex-wrap gap-2 items-center justify-center min-h-[80px]">
                            {(() => {
                                const maxCount = wordCluster[0]?.count || 1;
                                const minCount = wordCluster[wordCluster.length - 1]?.count || 1;
                                return wordCluster.map(({ word, count }) => {
                                    const norm = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
                                    const fontSize = Math.round(11 + norm * 15);
                                    const opacity = 0.45 + norm * 0.55;
                                    const lightness = Math.round(45 + norm * 25);
                                    return (
                                        <span
                                            key={word}
                                            title={`${count} occurrence${count !== 1 ? 's' : ''}`}
                                            style={{
                                                fontSize: `${fontSize}px`,
                                                opacity,
                                                color: `hsl(85, 65%, ${lightness}%)`,
                                                fontWeight: norm > 0.6 ? 700 : norm > 0.3 ? 600 : 400,
                                                letterSpacing: norm > 0.7 ? '0.02em' : undefined,
                                                cursor: 'default',
                                                lineHeight: '1.6',
                                            }}
                                        >
                                            {word}
                                        </span>
                                    );
                                });
                            })()}
                        </div>
                    </section>
                )}

                {/* User Profile */}
                <section className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Icon icon={User} size={20} className="text-lime-500" />
                        Your Profile
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        {/* Avatar Emoji Picker */}
                        <div>
                            <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                                Avatar
                            </label>
                            <div className="relative inline-block">
                                <button
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="w-14 h-14 rounded-2xl text-3xl border-2 flex items-center justify-center transition-all hover:border-lime-500"
                                    style={{ borderColor: showEmojiPicker ? '#84cc16' : 'var(--border)', background: 'var(--background)' }}
                                    title="Click to change avatar"
                                >
                                    {emoji}
                                </button>
                                {showEmojiPicker && (
                                    <div className="absolute top-16 left-0 z-50 w-72 p-3 rounded-xl border shadow-2xl animate-fadeIn"
                                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {AVATAR_EMOJIS.map(e => (
                                                <button
                                                    key={e}
                                                    onClick={() => { setEmoji(e); setShowEmojiPicker(false); }}
                                                    className="w-9 h-9 rounded-lg text-xl hover:bg-lime-500/10 transition-colors flex items-center justify-center"
                                                    style={{ background: emoji === e ? 'rgba(132,204,22,0.2)' : 'var(--background)' }}
                                                >
                                                    {e}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                                            <input
                                                placeholder="Or type a custom emoji..."
                                                className="w-full px-2 py-1.5 rounded-lg border text-sm"
                                                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                                                onChange={e => { if (e.target.value) setEmoji(e.target.value); }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Click to change avatar</p>
                        </div>

                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Your Name</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="How should Skales call you?"
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <div className="space-y-3 mb-4">
                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
                                AI Summary of You
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                                    Auto-updated by Identity CronJob
                                </span>
                            </label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Skales will auto-fill this with a summary of who you are based on your conversations..."
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                            <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: identityCronExists ? '#a78bfa' : 'var(--text-muted)' }}>
                                {identityCronExists
                                    ? <><Icon icon={Sparkles} size={10} /> Auto-updates nightly via Identity Maintenance</>
                                    : '⚠️ Enable Identity Maintenance below for automatic nightly updates'
                                }
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Occupation</label>
                            <input
                                value={occupation}
                                onChange={e => setOccupation(e.target.value)}
                                placeholder="e.g. Software Engineer, Entrepreneur..."
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Interests (comma-separated)</label>
                            <input
                                value={interests}
                                onChange={e => setInterests(e.target.value)}
                                placeholder="tech, music, entrepreneurship..."
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Goals (comma-separated)</label>
                            <input
                                value={goals}
                                onChange={e => setGoals(e.target.value)}
                                placeholder="build a startup, learn Spanish..."
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="px-5 py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-lime-500/20 disabled:opacity-50"
                    >
                        {profileSaved
                            ? <><Icon icon={Check} size={16} /> Saved!</>
                            : saving
                                ? <><Icon icon={RefreshCw} size={16} className="animate-spin" /> Saving...</>
                                : <><Icon icon={Save} size={16} /> Save Profile</>
                        }
                    </button>
                </section>

                {/* Identity Maintenance CronJob */}
                <section className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Icon icon={Sparkles} size={20} className="text-purple-500" />
                        Identity Maintenance
                    </h2>
                    <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                        Automatically analyze your conversations nightly and update your profile summary.
                    </p>
                    {identityCronExists ? (
                        <div className="flex items-center justify-between gap-3 p-3 rounded-xl"
                            style={{
                                background: identityCronEnabled ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.04)',
                                border: `1px solid ${identityCronEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}`,
                            }}>
                            <div className="flex items-center gap-3">
                                <Icon
                                    icon={identityCronEnabled ? Check : X}
                                    size={16}
                                    className={identityCronEnabled ? 'text-green-500 flex-shrink-0' : 'text-red-400 flex-shrink-0'}
                                />
                                <div>
                                    <p className={`text-sm font-medium ${identityCronEnabled ? 'text-green-500' : 'text-red-400'}`}>
                                        {identityCronEnabled ? 'Identity CronJob is active' : 'Identity CronJob is disabled'}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {identityCronEnabled
                                            ? 'Runs nightly at 3 AM — updates your AI Summary automatically'
                                            : 'Re-enable to resume automatic nightly profile updates'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDisableIdentityCron}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-all"
                                style={identityCronEnabled
                                    ? { border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', background: 'rgba(239,68,68,0.05)' }
                                    : { border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', background: 'rgba(34,197,94,0.05)' }
                                }
                            >
                                {identityCronEnabled
                                    ? <><Icon icon={X} size={12} className="inline mr-1" />Disable</>
                                    : <><Icon icon={Check} size={12} className="inline mr-1" />Enable</>
                                }
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleCreateIdentityCron}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:bg-purple-500 hover:text-white"
                            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--background)' }}
                        >
                            <Icon icon={Plus} size={16} />
                            Enable Identity Maintenance (runs nightly at 3 AM)
                        </button>
                    )}
                </section>

                {/* Short-Term Memory */}
                <section className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Icon icon={Clock} size={20} className="text-blue-500" />
                            Short-Term Memory ({stats.shortTerm})
                        </h2>
                        {stats.shortTerm > 0 && (
                            <button
                                onClick={() => handleClearMemories('short-term')}
                                className="text-xs px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors border border-red-500/20"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    {shortTermMemories.length === 0 ? (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No short-term memories yet</p>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {shortTermMemories.map(({ filename, data }) => (
                                <div key={filename} className="p-3 rounded-xl border flex items-start gap-3 group"
                                    style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm break-words" style={{ color: 'var(--text-primary)' }}>
                                            {data.summary || data.content || JSON.stringify(data).slice(0, 150)}
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(data.timestamp || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteMemory('short-term', filename)}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-red-500 transition-all flex-shrink-0"
                                        title="Delete this memory"
                                    >
                                        <Icon icon={Trash2} size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Knowledge & Facts (Secrets/Notes) */}
                <section className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Icon icon={Edit3} size={20} className="text-pink-500" />
                        Knowledge & Facts
                    </h2>
                    <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                        Specific facts Skales knows about you (e.g. "WiFi Password", "Door Code"). You can edit these manually.
                    </p>

                    <div className="space-y-3">
                        {soul && soul.memory?.knownFacts && Object.entries(soul.memory.knownFacts).length > 0 ? (
                            Object.entries(soul.memory.knownFacts).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-3 p-3 rounded-xl border group" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{key}</p>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{String(value)}</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (confirm(`Delete fact "${key}"?`)) {
                                                const newFacts = { ...soul.memory.knownFacts };
                                                delete newFacts[key];
                                                // We save the WHOLE soul object manually here to support deletion, 
                                                // since saveHumanProfile only merges.
                                                // ideally we'd have a specific removeFact action, but this works for MVP.
                                                // ACTUALLY: Let's use saveHumanProfile to overwrite with 'null' or handle differently?
                                                // No, let's just use the server action directly if we could, but we can't from client easily without exposing it.
                                                // Workaround: We'll implement a 'deleteFact' action next time. 
                                                // For now, let's just show them. Editing comes later.
                                                alert("Deletion not yet supported in UI. Ask Skales to 'forget the fact " + key + "' in chat.");
                                            }
                                        }}
                                        className="opacity-0 group-hover:opacity-50 hover:opacity-100 p-2 text-red-500"
                                        title="Delete (Ask Skales in chat for now)"
                                    >
                                        <Icon icon={Trash2} size={16} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-center py-4 italic" style={{ color: 'var(--text-muted)' }}>
                                No specific facts stored yet. Tell Skales: "Remember that my door code is 1234".
                            </p>
                        )}
                    </div>

                    {/* Simple Add Fact Form */}
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                        <details className="group">
                            <summary className="flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors hover:text-lime-500" style={{ color: 'var(--text-muted)' }}>
                                <Icon icon={Plus} size={14} /> Add New Fact
                            </summary>
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <input id="newFactKey" placeholder="Key (e.g. WiFi)" className="px-3 py-2 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                                <input id="newFactValue" placeholder="Value (e.g. abcd-1234)" className="px-3 py-2 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                                <button
                                    onClick={() => {
                                        const k = (document.getElementById('newFactKey') as HTMLInputElement).value;
                                        const v = (document.getElementById('newFactValue') as HTMLInputElement).value;
                                        if (k && v) {
                                            handleSaveProfile().then(() => {
                                                // We need to pass knownFacts specifically
                                                saveHumanProfile({ knownFacts: { [k]: v } }).then(() => {
                                                    loadData();
                                                    (document.getElementById('newFactKey') as HTMLInputElement).value = '';
                                                    (document.getElementById('newFactValue') as HTMLInputElement).value = '';
                                                });
                                            });
                                        }
                                    }}
                                    className="px-4 py-2 bg-lime-500/10 text-lime-500 hover:bg-lime-500 hover:text-black font-medium rounded-lg text-xs transition-colors"
                                >
                                    Save Fact
                                </button>
                            </div>
                        </details>
                    </div>
                </section>

                {/* Long-Term Memory */}
                <section className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Icon icon={Database} size={20} className="text-purple-500" />
                            Long-Term Memory ({stats.longTerm})
                        </h2>
                        {stats.longTerm > 0 && (
                            <button
                                onClick={() => handleClearMemories('long-term')}
                                className="text-xs px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors border border-red-500/20"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    {longTermMemories.length === 0 ? (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No long-term memories yet</p>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {longTermMemories.map(({ filename, data }) => (
                                <div key={filename} className="p-3 rounded-xl border flex items-start gap-3 group"
                                    style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm break-words" style={{ color: 'var(--text-primary)' }}>
                                            {data.summary || data.content || JSON.stringify(data).slice(0, 150)}
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(data.timestamp || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteMemory('long-term', filename)}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-red-500 transition-all flex-shrink-0"
                                        title="Delete this memory"
                                    >
                                        <Icon icon={Trash2} size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Episodic Memory */}
                {episodicMemories.length > 0 && (
                <section className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Icon icon={Zap} size={20} className="text-amber-500" />
                            Episodic Memory ({stats.episodic})
                        </h2>
                        {stats.episodic > 0 && (
                            <button
                                onClick={() => handleClearMemories('episodic')}
                                className="text-xs px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors border border-red-500/20"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {episodicMemories.map(({ filename, data }) => (
                            <div key={filename} className="p-3 rounded-xl border flex items-start gap-3 group"
                                style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm break-words" style={{ color: 'var(--text-primary)' }}>
                                        {data.summary || data.content || data.event || JSON.stringify(data).slice(0, 150)}
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        {new Date(data.timestamp || 0).toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteMemory('episodic' as any, filename)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-red-500 transition-all flex-shrink-0"
                                    title="Delete this memory"
                                >
                                    <Icon icon={Trash2} size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
                )}

                {/* Auto-Extracted Memories (Bi-Temporal Memory) */}
                <section className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Icon icon={ScanSearch} size={20} className="text-lime-400" />
                                Auto-Extracted Memories
                                <span className="text-xs font-normal px-2 py-0.5 rounded-full ml-1"
                                    style={{ background: 'rgba(132,204,22,0.1)', color: 'var(--text-muted)' }}>
                                    {extractedMemories.length}
                                </span>
                            </h2>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                Automatically learned from your conversations. Used to enrich Skales responses.
                            </p>
                        </div>
                        <button
                            onClick={handleRunScan}
                            disabled={scanRunning}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                            title="Scan conversations now"
                        >
                            <Icon icon={scanRunning ? RefreshCw : ScanSearch} size={13} className={scanRunning ? 'animate-spin' : ''} />
                            Scan Now
                        </button>
                    </div>
                    {scanResult && (
                        <p className="text-xs mb-3 px-3 py-2 rounded-lg"
                            style={{ background: 'rgba(132,204,22,0.08)', color: 'var(--text-muted)', border: '1px solid rgba(132,204,22,0.2)' }}>
                            {scanResult}
                        </p>
                    )}
                    {extractedMemories.length === 0 ? (
                        <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                            No auto-extracted memories yet. Memories are extracted every 90 min from your conversations.
                            <br />
                            <button onClick={handleRunScan} disabled={scanRunning} className="underline mt-1 hover:opacity-70 transition-opacity">
                                Run a scan now
                            </button>
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {extractedMemories.map((mem) => (
                                <div key={mem.id} className="p-3 rounded-xl border flex items-start gap-3 group"
                                    style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                                style={{
                                                    background: mem.category === 'preference' ? 'rgba(139,92,246,0.15)' :
                                                                mem.category === 'fact' ? 'rgba(59,130,246,0.15)' :
                                                                mem.category === 'action_item' ? 'rgba(245,158,11,0.15)' :
                                                                'rgba(132,204,22,0.12)',
                                                    color: mem.category === 'preference' ? 'rgb(167,139,250)' :
                                                           mem.category === 'fact' ? 'rgb(96,165,250)' :
                                                           mem.category === 'action_item' ? 'rgb(251,191,36)' :
                                                           'var(--text-muted)',
                                                }}>
                                                {mem.category.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-sm break-words" style={{ color: 'var(--text-primary)' }}>
                                            {mem.content}
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(mem.extracted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteExtractedMemory(mem.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-red-500 transition-all flex-shrink-0"
                                        title="Delete this memory"
                                    >
                                        <Icon icon={Trash2} size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Danger Zone */}
                <section className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'rgba(239,68,68,0.2)' }}>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-500">
                        <Icon icon={AlertTriangle} size={20} />
                        Danger Zone
                    </h2>
                    <button
                        onClick={() => handleClearMemories('all')}
                        className="px-4 py-2 rounded-xl text-sm font-bold border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                    >
                        <Icon icon={Trash2} size={14} className="inline mr-1" />
                        Delete All Memories
                    </button>
                </section>

            </div>
            </div>{/* max-w-4xl mx-auto */}
        </div>
    );
}
