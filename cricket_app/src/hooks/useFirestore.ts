/**
 * Live Firestore subscriptions as React state.
 *
 * Both hooks take a string `key` that identifies the document or query; the listener is
 * only re-created when the key changes, so callers can build queries inline. Pass null to
 * skip (e.g. while waiting for an id). `fromCache` is true when the data came from the
 * offline cache rather than the server.
 */
import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Query } from 'firebase/firestore';
import { db } from '../firebase';
import type { WithId } from '../lib/types';

export interface DocState<T> {
  data: WithId<T> | null;
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
}

export interface QueryState<T> {
  data: WithId<T>[];
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
}

/** Subscribe to one document by path, e.g. "teams/abc". */
export function useDocData<T>(path: string | null): DocState<T> {
  const [state, setState] = useState<DocState<T> & { key: string | null }>({
    key: path,
    data: null,
    loading: path !== null,
    error: null,
    fromCache: false,
  });

  useEffect(() => {
    if (!path) return;
    return onSnapshot(
      doc(db, path),
      (snap) =>
        setState({
          key: path,
          data: snap.exists() ? ({ ...(snap.data() as T), id: snap.id } as WithId<T>) : null,
          loading: false,
          error: null,
          fromCache: snap.metadata.fromCache,
        }),
      (error) => setState({ key: path, data: null, loading: false, error, fromCache: false }),
    );
  }, [path]);

  // While a new key loads, don't show the previous key's data
  if (state.key !== path) return { data: null, loading: path !== null, error: null, fromCache: false };
  return state;
}

/** Subscribe to a query. `build` is only called when `key` changes. */
export function useQueryData<T>(key: string | null, build: () => Query): QueryState<T> {
  const [state, setState] = useState<QueryState<T> & { key: string | null }>({
    key,
    data: [],
    loading: key !== null,
    error: null,
    fromCache: false,
  });

  useEffect(() => {
    if (!key) return;
    return onSnapshot(
      build(),
      (snap) =>
        setState({
          key,
          data: snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }) as WithId<T>),
          loading: false,
          error: null,
          fromCache: snap.metadata.fromCache,
        }),
      (error) => {
        console.error(`Query "${key}" failed`, error);
        setState({ key, data: [], loading: false, error, fromCache: false });
      },
    );
    // `key` identifies the query; `build` is deliberately not a dependency
  }, [key]);

  if (state.key !== key) return { data: [], loading: key !== null, error: null, fromCache: false };
  return state;
}
