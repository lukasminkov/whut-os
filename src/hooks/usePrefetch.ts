"use client";

import { useEffect, useRef } from "react";

/**
 * Prefetches commonly needed data on dashboard load / tab focus.
 * Hits the data API routes which warm the server-side cache (60s TTL).
 * This is fire-and-forget — failures are silently ignored.
 */
export function usePrefetch() {
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const prefetch = async () => {
      try {
        // Hit the AI route's cached tool execution indirectly by
        // prefetching Google API data via the proxy routes.
        // These warm both the proxy cache and any server-side caching.
        const base = window.location.origin;
        const googleTokens = localStorage.getItem("whut_google_tokens");
        if (!googleTokens) return;

        const { access_token } = JSON.parse(googleTokens);
        if (!access_token) return;

        const headers = { Authorization: `Bearer ${access_token}` };

        // Fire and forget — parallel prefetch
        await Promise.allSettled([
          fetch(`${base}/api/google/gmail`, { headers }).catch(() => {}),
          fetch(`${base}/api/google/calendar`, { headers }).catch(() => {}),
        ]);
      } catch {
        // Prefetch is best-effort
      }
    };

    // Slight delay to not compete with initial render
    const timer = setTimeout(prefetch, 500);

    // Also prefetch on tab focus (user returning to app)
    const onFocus = () => {
      hasFetched.current = false;
      setTimeout(prefetch, 200);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
}
