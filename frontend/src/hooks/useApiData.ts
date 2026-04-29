import { useState, useEffect } from "react";

interface UseApiDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApiData<T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = [],
): UseApiDataState<T> {
  const [state, setState] = useState<UseApiDataState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const load = async () => {
      try {
        setState({ data: null, loading: true, error: null });
        const data = await fetchFn();
        setState({ data, loading: false, error: null });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load data";
        setState({ data: null, loading: false, error: message });
      }
    };

    load();
  }, deps);

  return state;
}
