"use client";

import { useState, useEffect, useRef } from "react";
import type { DataSource } from "@/lib/scene-types";

interface DataSlotResult {
  data: any;
  isLoading: boolean;
  error: string | null;
}

function getGoogleTokens() {
  try {
    const raw = localStorage.getItem("whut_google_tokens");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function useDataSlot(dataSource?: DataSource): DataSlotResult {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!!dataSource);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!dataSource) return;

    const key = JSON.stringify(dataSource);
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;

    setIsLoading(true);
    setError(null);

    const tokens = getGoogleTokens();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (tokens?.access_token) {
      headers["x-google-access-token"] = tokens.access_token;
    }
    if (tokens?.refresh_token) {
      headers["x-google-refresh-token"] = tokens.refresh_token;
    }

    const params = dataSource.params
      ? `?${new URLSearchParams(
          Object.entries(dataSource.params).map(([k, v]) => [k, String(v)])
        ).toString()}`
      : "";

    fetch(`/api/data/${dataSource.integration}/${dataSource.method}${params}`, {
      headers,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to fetch data: ${res.status}`);
        const json = await res.json();
        setData(json);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [dataSource]);

  return { data, isLoading, error };
}
