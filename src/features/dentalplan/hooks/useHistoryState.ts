import { useCallback, useRef, useState } from "react";
export type HistoryApi<T> = {
  state: T;
  set: (next: T | ((prev: T) => T), options?: { commit?: boolean }) => void;
  commit: (next: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (next: T) => void;
};
export function useHistoryState<T>(initial: T, limit = 100): HistoryApi<T> {
  const [state, setState] = useState(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const [, force] = useState(0);
  const commit = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) => {
        const value = typeof next === "function" ? (next as (previous: T) => T)(prev) : next;
        past.current.push(prev);
        if (past.current.length > limit) past.current.shift();
        future.current = [];
        return value;
      });
      force((value) => value + 1);
    },
    [limit],
  );
  const set = useCallback(
    (next: T | ((prev: T) => T), options?: { commit?: boolean }) => {
      if (options?.commit === false) setState(next);
      else commit(next);
    },
    [commit],
  );
  const undo = useCallback(() => {
    setState((prev) => {
      const value = past.current.pop();
      if (value === undefined) return prev;
      future.current.push(prev);
      return value;
    });
    force((value) => value + 1);
  }, []);
  const redo = useCallback(() => {
    setState((prev) => {
      const value = future.current.pop();
      if (value === undefined) return prev;
      past.current.push(prev);
      return value;
    });
    force((current) => current + 1);
  }, []);
  const reset = useCallback((next: T) => {
    past.current = [];
    future.current = [];
    setState(next);
    force((value) => value + 1);
  }, []);
  return {
    state,
    set,
    commit,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    reset,
  };
}
