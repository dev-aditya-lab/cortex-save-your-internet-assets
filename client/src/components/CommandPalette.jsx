import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineSearch } from 'react-icons/hi';
import { searchItems, getItems } from '../api';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [focusIdx, setFocusIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setFocusIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchItems(query);
        setResults(data.slice(0, 8));
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[focusIdx]) {
      onClose();
      navigate(`/?item=${results[focusIdx]._id}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <HiOutlineSearch size={18} />
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search your knowledge base..."
            value={query}
            onChange={e => { setQuery(e.target.value); setFocusIdx(0); }}
            onKeyDown={handleKeyDown}
          />
          {loading && <div className="spinner" style={{ width: 14, height: 14 }}></div>}
        </div>
        {results.length > 0 && (
          <div className="cmd-results">
            {results.map((item, i) => (
              <div
                key={item._id}
                className={`cmd-result-item ${i === focusIdx ? 'focused' : ''}`}
                onClick={() => { onClose(); navigate(`/?item=${item._id}`); }}
                onMouseEnter={() => setFocusIdx(i)}
              >
                <span className="cmd-result-title">{item.title}</span>
                <span className="cmd-result-type">{item.type}</span>
              </div>
            ))}
          </div>
        )}
        {query && !loading && results.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.8125rem', color: '#8b919e' }}>
            No results found
          </div>
        )}
        <div className="cmd-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
