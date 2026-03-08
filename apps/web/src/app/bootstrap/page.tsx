'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { completeBootstrap } from '@/actions/identity';
import { saveApiKey } from '@/actions/chat';

export default function BootstrapPage() {
    const router = useRouter();
    const [step, setStep] = useState(0); // 0 = Security Disclaimer (mandatory)
    const [saving, setSaving] = useState(false);
    const [securityAccepted, setSecurityAccepted] = useState(false);
    // useRef guard prevents double-submission from double-clicking
    const submitting = useRef(false);
    const [formData, setFormData] = useState({
        name: '',
        occupation: '',
        goals: '',
        interests: '',
        language: 'auto',
        openrouterKey: '',
    });

    const handleSubmit = async () => {
        if (submitting.current || saving) return;
        submitting.current = true;
        setSaving(true);
        try {
            const goals = formData.goals.split(',').map(g => g.trim()).filter(Boolean);
            const interests = formData.interests.split(',').map(i => i.trim()).filter(Boolean);

            if (formData.openrouterKey.trim()) {
                await saveApiKey('openrouter', formData.openrouterKey.trim());
            }

            await completeBootstrap({
                name: formData.name || undefined,
                context: {
                    occupation: formData.occupation || undefined,
                    goals,
                    challenges: []
                },
                interests,
                preferences: {
                    language: formData.language,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            } as any);

            router.push('/chat');
        } finally {
            setSaving(false);
            submitting.current = false;
        }
    };

    const handleSkip = async () => {
        if (submitting.current || saving) return;
        submitting.current = true;
        setSaving(true);
        try {
            await completeBootstrap({} as any);
            router.push('/chat');
        } finally {
            setSaving(false);
            submitting.current = false;
        }
    };

    const SETUP_STEPS = 4; // Steps 1–4 (step 0 is the disclaimer)

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
            <div className="max-w-2xl w-full rounded-3xl border p-8 shadow-2xl animate-fadeIn"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-lime-400 to-green-600 flex items-center justify-center text-4xl shadow-lg shadow-lime-500/20 animate-float">
                        🦎
                    </div>
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-lime-400 to-green-600 bg-clip-text text-transparent">
                        Welcome to Skales!
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {step === 0
                            ? 'Please read and accept before continuing'
                            : `Let's get you set up • Step ${step} of ${SETUP_STEPS}`}
                    </p>
                </div>

                {/* Progress Bar — only shown after disclaimer */}
                {step > 0 && (
                    <div className="mb-8 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-light)' }}>
                        <div className="h-full bg-gradient-to-r from-lime-400 to-green-600 transition-all duration-500"
                            style={{ width: `${(step / SETUP_STEPS) * 100}%` }} />
                    </div>
                )}

                {/* ── Step 0: Security & Privacy Disclaimer (MANDATORY) ── */}
                {step === 0 && (
                    <div className="space-y-5 animate-fadeIn">
                        {/* Privacy */}
                        <div className="p-4 rounded-xl border" style={{ background: 'rgba(132,204,22,0.05)', borderColor: 'rgba(132,204,22,0.25)' }}>
                            <p className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                🔒 Privacy by Design — Local-First Architecture
                            </p>
                            <ul className="text-xs space-y-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                <li>✅ <strong>Runs 100% locally</strong> on your machine. No Skales cloud servers.</li>
                                <li>✅ <strong>No telemetry.</strong> Your data, chat history, and files never pass through our servers.</li>
                                <li>✅ <strong>Bring Your Own Keys (BYOK).</strong> API keys are saved locally. When using cloud models (OpenAI, Google, etc.), your computer communicates directly with their APIs — not ours.</li>
                                <li>✅ <strong>Offline mode:</strong> Select an Ollama model and disconnect from the internet for a fully air-gapped agent.</li>
                            </ul>
                        </div>

                        {/* Autonomy Warning */}
                        <div className="p-4 rounded-xl border" style={{ background: 'rgba(234,179,8,0.06)', borderColor: 'rgba(234,179,8,0.3)' }}>
                            <p className="font-bold text-sm mb-2 flex items-center gap-2 text-amber-400">
                                ⚠️ Autonomous Agent — Understand the Risks
                            </p>
                            <ul className="text-xs space-y-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                <li>⚡ Skales can <strong>execute terminal commands</strong>, read and write files, and browse the web.</li>
                                <li>🔑 When using cloud AI providers, Skales sends the necessary context (e.g. file contents, your instructions) to <strong>the provider you selected</strong> — not to us.</li>
                                <li>🛡️ Skales has built-in safeguards: system folders are blocked, destructive commands are filtered, and critical actions require your confirmation.</li>
                                <li>🚨 <strong>Prompt injection risk:</strong> Malicious content in web pages or files could attempt to hijack Skales. Never run Skales against untrusted content with elevated permissions.</li>
                                <li>📂 <strong>File access:</strong> By default, Skales is NOT sandboxed to its own Workspace folder. You can change this in Settings.</li>
                            </ul>
                        </div>

                        {/* Acceptance Checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                            <div className="relative mt-0.5 flex-shrink-0">
                                <input
                                    type="checkbox"
                                    checked={securityAccepted}
                                    onChange={e => setSecurityAccepted(e.target.checked)}
                                    className="sr-only"
                                />
                                <div onClick={() => setSecurityAccepted(v => !v)}
                                    className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer"
                                    style={{
                                        borderColor: securityAccepted ? '#84cc16' : 'var(--border)',
                                        background: securityAccepted ? '#84cc16' : 'transparent',
                                    }}>
                                    {securityAccepted && <span className="text-black text-xs font-bold">✓</span>}
                                </div>
                            </div>
                            <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                I understand that Skales is an autonomous agent with access to my local files and terminal. I accept responsibility for the tasks I assign to it, and I understand how my data is handled.
                            </span>
                        </label>

                        <button
                            onClick={() => { if (securityAccepted) setStep(1); }}
                            disabled={!securityAccepted}
                            className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                            style={{
                                background: securityAccepted ? '#84cc16' : 'var(--surface-light)',
                                color: securityAccepted ? 'black' : 'var(--text-muted)',
                                cursor: securityAccepted ? 'pointer' : 'not-allowed',
                                opacity: securityAccepted ? 1 : 0.5,
                            }}
                        >
                            I Understand — Continue to Setup →
                        </button>
                        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                            This confirmation cannot be skipped. It will not appear again after setup.
                        </p>
                    </div>
                )}

                {/* ── Step 1: Name + Occupation ── */}
                {step === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                What's your name? <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Alex"
                                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-lime-500 transition-colors"
                                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                What do you do?
                            </label>
                            <input
                                type="text"
                                value={formData.occupation}
                                onChange={(e: any) => setFormData({ ...formData, occupation: e.target.value })}
                                placeholder="e.g., Software Developer, Designer, Student"
                                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-lime-500 transition-colors"
                                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>
                )}

                {/* ── Step 2: Goals & Interests ── */}
                {step === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                What are your main goals?
                            </label>
                            <textarea
                                value={formData.goals}
                                onChange={(e: any) => setFormData({ ...formData, goals: e.target.value })}
                                placeholder="e.g., Build an app, Learn AI, Improve productivity"
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-lime-500 transition-colors resize-none"
                                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Separate with commas</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                What interests you?
                            </label>
                            <textarea
                                value={formData.interests}
                                onChange={(e: any) => setFormData({ ...formData, interests: e.target.value })}
                                placeholder="e.g., Technology, Design, Music, Science"
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-lime-500 transition-colors resize-none"
                                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Separate with commas</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                Native Language
                            </label>
                            <select
                                value={formData.language}
                                onChange={(e: any) => setFormData({ ...formData, language: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-lime-500 transition-colors"
                                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)', appearance: 'none' }}
                            >
                                <option value="auto">Auto-Detect (Follows your input)</option>
                                <option value="en">English</option>
                                <option value="de">German (Deutsch)</option>
                                <option value="fr">French (Français)</option>
                                <option value="es">Spanish (Español)</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* ── Step 3: API Key Setup ── */}
                {step === 3 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="p-4 rounded-xl border" style={{ background: 'rgba(132,204,22,0.05)', borderColor: 'rgba(132,204,22,0.2)' }}>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">🔑</span>
                                <div>
                                    <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>OpenRouter API Key</h3>
                                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                        OpenRouter gives you access to 100+ AI models (GPT-4, Claude, Gemini, Llama and more) through a single API.
                                        It's the recommended way to use Skales.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                OpenRouter API Key <span style={{ color: 'var(--text-muted)' }}>(Optional — add later in Settings)</span>
                            </label>
                            <input
                                type="password"
                                value={formData.openrouterKey}
                                onChange={(e: any) => setFormData({ ...formData, openrouterKey: e.target.value })}
                                placeholder="sk-or-v1-..."
                                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-lime-500 transition-colors font-mono text-sm"
                                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                Your key is stored locally and never sent to any server except OpenRouter.
                            </p>
                        </div>
                        <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--surface-light)' }}>
                            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>How to get your free OpenRouter key:</p>
                            <ol className="text-xs space-y-1.5 list-decimal list-inside" style={{ color: 'var(--text-secondary)' }}>
                                <li>Go to <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline font-medium">openrouter.ai/keys</a> and sign up (free)</li>
                                <li>Click <strong>"Create Key"</strong> and name it "Skales"</li>
                                <li>Copy the key (starts with <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--surface)' }}>sk-or-v1-</code>) and paste above</li>
                            </ol>
                            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                💡 Many models on OpenRouter have a <strong>free tier</strong>. You only pay if you use premium models.
                            </p>
                        </div>
                        <div className="p-3 rounded-xl border" style={{ background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.15)' }}>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>🦙 Prefer local AI?</span>{' '}
                                Skip this step and use <strong>Ollama</strong> — runs 100% offline. Configure it later in <strong>Settings → AI Provider → Ollama</strong>.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Step 4: Confirmation ── */}
                {step === 4 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="p-6 rounded-xl" style={{ background: 'var(--surface-light)' }}>
                            <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Ready to go! 🚀</h3>
                            <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {formData.name && <p>👤 <strong>Name:</strong> {formData.name}</p>}
                                {formData.occupation && <p>💼 <strong>Occupation:</strong> {formData.occupation}</p>}
                                {formData.goals && <p>🎯 <strong>Goals:</strong> {formData.goals}</p>}
                                {formData.interests && <p>⭐ <strong>Interests:</strong> {formData.interests}</p>}
                                {formData.openrouterKey.trim()
                                    ? <p>🔑 <strong>OpenRouter:</strong> <span style={{ color: '#84cc16' }}>Key configured ✓</span></p>
                                    : <p>🔑 <strong>OpenRouter:</strong> <span style={{ color: 'var(--text-muted)' }}>Not set — add later in Settings</span></p>
                                }
                            </div>
                        </div>
                        <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                            Skales remembers this to give you better, more personalized help. Update anytime in Settings.
                        </p>
                    </div>
                )}

                {/* ── Navigation (Steps 1–4) ── */}
                {step > 0 && (
                    <>
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setStep(step - 1)}
                                className="px-6 py-3 rounded-xl font-medium transition-all hover:bg-[var(--surface-light)]"
                                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            >
                                Back
                            </button>
                            {step < SETUP_STEPS ? (
                                <button
                                    onClick={() => setStep(step + 1)}
                                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-lime-500 hover:bg-lime-400 text-black transition-all shadow-lg shadow-lime-500/20"
                                >
                                    Continue →
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-lime-500 hover:bg-lime-400 text-black transition-all shadow-lg shadow-lime-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Setting up...' : "Let's Go! 🎉"}
                                </button>
                            )}
                        </div>
                        <button
                            onClick={handleSkip}
                            disabled={saving}
                            className="w-full mt-4 text-xs hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            {saving ? 'Please wait...' : 'Skip setup for now'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
