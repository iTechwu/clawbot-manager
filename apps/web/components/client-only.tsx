'use client';

import { useEffect, useState } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
  /** Optional fallback during SSR and before mount. Use to avoid layout shift. */
  fallback?: React.ReactNode;
}

/**
 * Renders children only after the component has mounted on the client.
 * Use to avoid hydration mismatches for components that rely on client-only
 * APIs or generate different markup on server vs client (e.g. Radix UI useId).
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
