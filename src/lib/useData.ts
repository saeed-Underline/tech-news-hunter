import { useEffect, useRef, useState } from 'react';
import { getJson } from './api';
import type { ArchiveFile, DayFile, NewsIndex } from '../types';

interface Resource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

const IDLE = { data: null, error: null, loading: true } as const;

export function useIndex(): Resource<NewsIndex> {
  const [state, setState] = useState<Resource<NewsIndex>>(IDLE);

  useEffect(() => {
    const controller = new AbortController();

    getJson<NewsIndex>('index.json', controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error:
            'No quest log found yet. Run `npm run collect` locally, or wait for the daily GitHub Action to publish its first report.',
        });
        console.error(err);
      });

    return () => controller.abort();
  }, []);

  return state;
}

/** Fetches one day file, keeping already-loaded days in memory. */
export function useDay(date: string | null): Resource<DayFile> {
  const cache = useRef(new Map<string, DayFile>());
  const [state, setState] = useState<Resource<DayFile>>(IDLE);

  useEffect(() => {
    if (!date) {
      setState({ data: null, error: null, loading: false });
      return;
    }

    const cached = cache.current.get(date);
    if (cached) {
      setState({ data: cached, error: null, loading: false });
      return;
    }

    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });

    getJson<DayFile>(`daily/${date}.json`, controller.signal)
      .then((data) => {
        cache.current.set(date, data);
        setState({ data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({ data: null, loading: false, error: `Gate ${date} could not be opened.` });
        console.error(err);
      });

    return () => controller.abort();
  }, [date]);

  return state;
}

export function useArchive(month: string | null): Resource<ArchiveFile> {
  const cache = useRef(new Map<string, ArchiveFile>());
  const [state, setState] = useState<Resource<ArchiveFile>>(IDLE);

  useEffect(() => {
    if (!month) {
      setState({ data: null, error: null, loading: false });
      return;
    }

    const cached = cache.current.get(month);
    if (cached) {
      setState({ data: cached, error: null, loading: false });
      return;
    }

    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });

    getJson<ArchiveFile>(`archive/${month}.json`, controller.signal)
      .then((data) => {
        cache.current.set(month, data);
        setState({ data, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({ data: null, loading: false, error: `Archive ${month} is unavailable.` });
        console.error(err);
      });

    return () => controller.abort();
  }, [month]);

  return state;
}
