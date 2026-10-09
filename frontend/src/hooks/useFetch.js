import { useCallback, useEffect, useState } from 'react';

/** Runs `fn` whenever `deps` change; ignores stale responses. Returns { data, error, loading, reload }. */
export function useFetch(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let ignore = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => !ignore && setState({ data, error: null, loading: false }))
      .catch((error) => !ignore && setState({ data: null, error, loading: false }));
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
