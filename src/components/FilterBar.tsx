export type SortMode = 'power' | 'recent';

interface FilterBarProps {
  query: string;
  onQuery: (value: string) => void;
  topics: string[];
  activeTopic: string | null;
  onTopic: (topic: string | null) => void;
  sources: { id: string; name: string }[];
  activeSource: string | null;
  onSource: (source: string | null) => void;
  sort: SortMode;
  onSort: (sort: SortMode) => void;
}

export function FilterBar({
  query,
  onQuery,
  topics,
  activeTopic,
  onTopic,
  sources,
  activeSource,
  onSource,
  sort,
  onSort,
}: FilterBarProps) {
  return (
    <div className="filters" style={{ marginBottom: 16 }}>
      <label className="search">
        <span className="search__icon" aria-hidden="true">
          ⌕
        </span>
        <input
          type="search"
          value={query}
          placeholder="Search quests"
          onChange={(event) => onQuery(event.target.value)}
          aria-label="Search quests"
        />
      </label>

      <div className="filter-group">
        <button
          type="button"
          className="sys-btn"
          aria-pressed={sort === 'power'}
          onClick={() => onSort('power')}
        >
          Power
        </button>
        <button
          type="button"
          className="sys-btn"
          aria-pressed={sort === 'recent'}
          onClick={() => onSort('recent')}
        >
          Recent
        </button>
      </div>

      <div className="filter-group" style={{ flexBasis: '100%' }}>
        <button
          type="button"
          className="sys-btn"
          aria-pressed={activeTopic === null && activeSource === null}
          onClick={() => {
            onTopic(null);
            onSource(null);
          }}
        >
          All
        </button>

        {topics.map((topic) => (
          <button
            type="button"
            key={topic}
            className="sys-btn"
            aria-pressed={activeTopic === topic}
            onClick={() => onTopic(activeTopic === topic ? null : topic)}
          >
            {topic}
          </button>
        ))}

        {sources.map((source) => (
          <button
            type="button"
            key={source.id}
            className="sys-btn"
            aria-pressed={activeSource === source.id}
            onClick={() => onSource(activeSource === source.id ? null : source.id)}
          >
            {source.name}
          </button>
        ))}
      </div>
    </div>
  );
}
