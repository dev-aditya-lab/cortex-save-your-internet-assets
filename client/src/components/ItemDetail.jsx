import { useState, useEffect } from 'react';
import { getItem, getRelatedItems, deleteItem, addHighlight, deleteHighlight } from '../api';
import { HiOutlineExternalLink, HiOutlineTrash, HiX } from 'react-icons/hi';

export default function ItemDetail({ item, onClose, onDeleted }) {
  const [full, setFull] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highlightText, setHighlightText] = useState('');
  const [highlightNote, setHighlightNote] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [itemData, relatedData] = await Promise.all([
          getItem(item._id),
          getRelatedItems(item._id).catch(() => [])
        ]);
        setFull(itemData);
        setRelated(relatedData);
      } catch { }
      setLoading(false);
    };
    load();
  }, [item._id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await deleteItem(item._id);
      onDeleted?.();
    } catch { }
  };

  const handleAddHighlight = async () => {
    if (!highlightText.trim()) return;
    try {
      const updated = await addHighlight(item._id, { text: highlightText, note: highlightNote });
      setFull(updated);
      setHighlightText('');
      setHighlightNote('');
    } catch { }
  };

  const handleDeleteHighlight = async (hId) => {
    try {
      const updated = await deleteHighlight(item._id, hId);
      setFull(updated);
    } catch { }
  };

  const data = full || item;
  const date = new Date(data.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <>
      <div className="detail-overlay" onClick={onClose}></div>
      <div className="detail-panel">
        <div className="detail-header">
          <span className={`type-badge ${data.type}`}>{data.type}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {data.url && (
              <a href={data.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                <HiOutlineExternalLink size={14} />
              </a>
            )}
            <button className="btn btn-ghost btn-sm" onClick={handleDelete} style={{ color: '#e5484d' }}>
              <HiOutlineTrash size={14} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <HiX size={14} />
            </button>
          </div>
        </div>

        <div className="detail-body">
          {loading ? (
            <div className="loading-center"><div className="spinner"></div></div>
          ) : (
            <>
              {/* Title & Meta */}
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>
                {data.title}
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#8b919e', marginBottom: 16 }}>
                {data.domain && <>{data.domain} · </>}{date}
              </p>

              {/* Thumbnail */}
              {data.thumbnail && (
                <img
                  src={data.thumbnail} alt=""
                  style={{ width: '100%', borderRadius: 6, marginBottom: 16, border: '1px solid #e0e2e7' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}

              {/* Description */}
              {data.description && (
                <div className="detail-section">
                  <p style={{ fontSize: '0.8125rem', color: '#555a65', lineHeight: 1.6 }}>
                    {data.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {data.tags?.length > 0 && (
                <div className="detail-section">
                  <div className="detail-section-title">Tags</div>
                  <div className="tags-row">
                    {data.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                  </div>
                </div>
              )}

              {/* Embedding Info */}
              {data.hasEmbedding && (
                <div className="detail-section">
                  <div className="detail-section-title">Intelligence</div>
                  <p style={{ fontSize: '0.75rem', color: '#8b919e' }}>
                    Embedding: {data.embeddingDimensions}-dim vector · Model: all-MiniLM-L6-v2
                  </p>
                </div>
              )}

              {/* Highlights */}
              <div className="detail-section">
                <div className="detail-section-title">Highlights</div>
                {data.highlights?.map(h => (
                  <div key={h._id} className="highlight-item">
                    <div className="highlight-text">"{h.text}"</div>
                    {h.note && <div className="highlight-note">{h.note}</div>}
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteHighlight(h._id)} style={{ marginTop: 4, fontSize: '0.6875rem', color: '#e5484d' }}>
                      Remove
                    </button>
                  </div>
                ))}
                <div style={{ marginTop: 8 }}>
                  <input className="input" placeholder="Add a highlight..." value={highlightText} onChange={e => setHighlightText(e.target.value)} style={{ marginBottom: 6 }} />
                  {highlightText && (
                    <>
                      <input className="input" placeholder="Note (optional)" value={highlightNote} onChange={e => setHighlightNote(e.target.value)} style={{ marginBottom: 6 }} />
                      <button className="btn btn-secondary btn-sm" onClick={handleAddHighlight}>Add Highlight</button>
                    </>
                  )}
                </div>
              </div>

              {/* Related Items */}
              {related.length > 0 && (
                <div className="detail-section">
                  <div className="detail-section-title">Related</div>
                  {related.map(r => (
                    <div key={r._id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f1f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8125rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </span>
                      <span className="similarity-badge">{r.similarity}%</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
