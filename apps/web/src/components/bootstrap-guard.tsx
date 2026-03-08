'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isFirstRun } from '@/actions/identity';

export default function BootstrapGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    // `mounted` prevents SSR/client hydration mismatch:
    // the server renders the loading spinner, and on the client we also start
    // with the spinner — so both sides agree on the initial render tree.
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mark as mounted FIRST so React doesn't see a mismatch between
        // the server-rendered loading state and the client-side initial state.
        setMounted(true);

        if (pathname === '/bootstrap') {
            setLoading(false);
            return;
        }

        isFirstRun().then(firstRun => {
            if (firstRun) {
                router.push('/bootstrap');
            } else {
                setLoading(false);
            }
        });
    }, [pathname, router]);

    // Always render spinner during SSR and before client hydration completes.
    // This ensures SSR and client agree on the initial render → no hydration error.
    if (!mounted || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-lime-400 to-green-600 flex items-center justify-center text-3xl shadow-lg shadow-lime-500/20 animate-pulse">
                        🦎
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading Skales...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
