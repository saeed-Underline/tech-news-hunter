import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArchivePanel } from './components/ArchivePanel';
import { Backdrop } from './components/Backdrop';
import { BootSequence } from './components/BootSequence';
import { FilterBar, type SortMode } from './components/FilterBar';
import { GateTimeline } from './components/GateTimeline';
import { HunterStatus } from './components/HunterStatus';
import { QuestCard } from './components/QuestCard';
import { StoragePanel } from './components/StoragePanel';
import { SysWindow } from './components/SysWindow';
import { Toast } from './components/Toast';
import { dateParts, timeAgo } from './lib/format';
import { useDay, useIndex } from './lib/useData';
import type { Article } from './types';

const REPO_URL = 'https://github.com/saeed-Underline/tech-news-hunter';
const BOOT_KEY = 'tnh:booted';
const STALE_AFTER_HOURS = 36;

type View = 'quests' | 'archive';

export default function App() {
  const [booting, setBooting] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return sessionStorage.getItem(BOOT_KEY) !== '1';
  });

  const dismissBoot = useCallback(() => {
    try {
      sessionStorage.setItem(BOOT_KEY, '1');
    } catch {
      // Private-mode browsers can refuse sessionStorage; the boot just replays.
    }
    setBooting(false);
  }, []);

  const { data: index, error: indexError, loading: indexLoading } = useIndex();

  const [view, setView] = useState<View>('quests');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('power');
  const [showToast, setShowToast] = useState(false);
  const [toastDone, setToastDone] = useState(false);

  // Land on the most recent gate as soon as the manifest arrives.
  useEffect(() => {
    if (index?.latest && !selectedDate) setSelectedDate(index.latest);
  }, [index, selectedDate]);

  const { data: day, error: dayError, loading: dayLoading } = useDay(selectedDate);
  const articles = useMemo<Article[]>(() => day?.articles ?? [], [day]);

  // Announce a fresh drop once per session.
  useEffect(() => {
    // `toastDone` latches so dismissing it cannot re-trigger this effect.
    if (!index?.latest || toastDone || showToast || booting) return;
    if (selectedDate !== index.latest || !articles.length) return;

    const age = Date.now() - new Date(index.generatedAt).getTime();
    if (age < 26 * 3600 * 1000) setShowToast(true);
  }, [index, selectedDate, articles, toastDone, showToast, booting]);

  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of articles) {
      for (const topic of article.topics) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([topic]) => topic);
  }, [articles]);

  const sources = useMemo(() => {
    const present = new Map<string, string>();
    for (const article of articles) present.set(article.sourceId, article.sourceName);
    return [...present.entries()].map(([id, name]) => ({ id, name }));
  }, [articles]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = articles.filter((article) => {
      if (activeTopic && !article.topics.includes(activeTopic)) return false;
      if (activeSource && article.sourceId !== activeSource) return false;
      if (
        needle &&
        !`${article.title} ${article.summary} ${article.sourceName}`.toLowerCase().includes(needle)
      ) {
        return false;
      }
      return true;
    });

    return filtered.sort((a, b) =>
      sort === 'power'
        ? b.score - a.score
        : Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
    );
  }, [articles, query, activeTopic, activeSource, sort]);

  const sRankCount = articles.filter((a) => a.rank === 'S').length;
  const isStale = index
    ? Date.now() - new Date(index.generatedAt).getTime() > STALE_AFTER_HOURS * 3600 * 1000
    : false;

  return (
    <>
      <Backdrop />
      {booting && <BootSequence onDone={dismissBoot} />}

      <div className="shell">
        <header className="masthead">
          <div className="masthead__brand">
            <div className="status-line">
              <span className={`pulse-dot${isStale ? ' pulse-dot--stale' : ''}`} />
              <span className="label">
                {index
                  ? `System ${isStale ? 'idle' : 'online'} · synced ${timeAgo(index.generatedAt)}`
                  : 'Establishing link…'}
              </span>
            </div>

            <h1 className="title">
              Tech News Hunter
              <span className="title__sub">Daily quest log · automated by GitHub Actions</span>
            </h1>
          </div>

          <div className="masthead__aside">
            <div className="stat-tile">
              <div className="stat-tile__value">{articles.length}</div>
              <div className="label">Quests</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile__value stat-tile__value--violet">{sRankCount}</div>
              <div className="label">S-Rank</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile__value">{index?.stats.daysTracked ?? 0}</div>
              <div className="label">Days</div>
            </div>
          </div>
        </header>

        {indexLoading && (
          <div className="sys-window">
            <div className="state">
              <span className="spinner" />
              <div className="state__title">Opening the gate</div>
            </div>
          </div>
        )}

        {indexError && (
          <div className="sys-window">
            <div className="state">
              <div className="state__title">No quest log found</div>
              <p className="state__text">{indexError}</p>
            </div>
          </div>
        )}

        {index && (
          <>
            <div className="filter-group" style={{ marginBottom: 18 }}>
              <button
                type="button"
                className="sys-btn"
                aria-pressed={view === 'quests'}
                onClick={() => setView('quests')}
              >
                Quest Log
              </button>
              <button
                type="button"
                className="sys-btn"
                aria-pressed={view === 'archive'}
                onClick={() => setView('archive')}
              >
                Archive Vault
              </button>
            </div>

            <div className="app-grid">
              <aside className="rail">
                <HunterStatus index={index} articles={articles} />
                <StoragePanel index={index} />
              </aside>

              <div className="main">
                {view === 'quests' ? (
                  <>
                    <GateTimeline
                      days={index.days}
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setQuery('');
                      }}
                    />

                    <SysWindow
                      title="Daily Quest Log"
                      meta={selectedDate ? dateParts(selectedDate).long : undefined}
                    >
                      <FilterBar
                        query={query}
                        onQuery={setQuery}
                        topics={topics}
                        activeTopic={activeTopic}
                        onTopic={setActiveTopic}
                        sources={sources}
                        activeSource={activeSource}
                        onSource={setActiveSource}
                        sort={sort}
                        onSort={setSort}
                      />

                      {dayLoading && (
                        <div className="state">
                          <span className="spinner" />
                        </div>
                      )}

                      {dayError && (
                        <div className="state">
                          <div className="state__title">Gate closed</div>
                          <p className="state__text">{dayError}</p>
                        </div>
                      )}

                      {!dayLoading && !dayError && visible.length === 0 && (
                        <div className="state">
                          <div className="state__title">No quests match</div>
                          <p className="state__text">
                            Nothing on this board fits the current filters. Clear them to see all{' '}
                            {articles.length} quests.
                          </p>
                        </div>
                      )}

                      {visible.length > 0 && (
                        <div className="quests">
                          {visible.map((article, position) => (
                            <QuestCard key={article.id} article={article} index={position} />
                          ))}
                        </div>
                      )}
                    </SysWindow>
                  </>
                ) : (
                  <ArchivePanel index={index} />
                )}
              </div>
            </div>
          </>
        )}

        <footer className="footer">
          <span>Gathered daily by GitHub Actions · no trackers, no backend</span>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            View source ↗
          </a>
        </footer>
      </div>

      {showToast && (
        <Toast
          title="⚠ New quests available"
          text={`${articles.length} quests logged for today. ${sRankCount} reached S-rank.`}
          onClose={() => {
            setShowToast(false);
            setToastDone(true);
          }}
        />
      )}
    </>
  );
}
