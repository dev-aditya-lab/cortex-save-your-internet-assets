import { useState, useEffect } from 'react';
import { HiOutlineX, HiOutlineExternalLink, HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi';
import { getItem, getRelatedItems, addHighlight, deleteHighlight, deleteItem, getCollections, updateItem } from '../api';

export default function ItemDetail({ itemId, onClose, onDeleted }) {
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highlightText, setHighlightText] = useState('');
  const [highlightNote, setHighlightNote] = useState('');
  const [showHighlightForm, setShowHighlightForm] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    setLoading(true);
    Promise.all([
      getItem(itemId),
      getRelatedItems(itemId).catch(() => []),
      getCollections().catch(() => [])
    ]).then(([itemData, relatedData, colData]) => {
      setItem(itemData);
      setRelated(relatedData);
      setCollections(colData);
      setLoading(false);
    });
  }, [itemId]);

  const handleAddHighlight = async () => {
    if (!highlightText.trim()) return;
    const updated = await addHighlight(itemId, { text: highlightText, note: highlightNote });
    setItem(updated);
    setHighlightText('');
    setHighlightNote('');
    setShowHighlightForm(false);
  };

  const handleDeleteHighlight = async (hId) => {
    const updated = await deleteHighlight(itemId, hId);
    setItem(updated);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this item?')) return;
    await deleteItem(itemId);
    onDeleted?.();
    onClose();
  };

  const handleMoveToCollection = async (colId) => {
    await updateItem(itemId, { collectionId: colId || null });
    const updated = await getItem(itemId);
    setItem(updated);
  };

  if (!itemId) return null;

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="detail-panel">
        <div className="detail-header">
          <h2 style={{ fontSize: '0.9375rem' }}>Details</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleDelete} title="Delete">
              <HiOutlineTrash size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <HiOutlineX size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner"></div></div>
        ) : item ? (
          <div className="detail-body">
            {/* Thumbnail */}
            {item.thumbnail && (
              <img
                src={item.thumbnail}
                alt=""
                style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 6, marginBottom: 16 }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}

            {/* Title & URL */}
            <h3 style={{ marginBottom: 8 }}>{item.title}</h3>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.8125rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12, textDecoration: 'none' }}
              >
                {item.domain || 'Open link'} <HiOutlineExternalLink size={14} />
              </a>
            )}

            {/* Description */}
            {item.description && (
              <p style={{ fontSize: '0.8125rem', color: '#646b75', marginBottom: 16, lineHeight: 1.6 }}>
                {item.description}
              </p>
            )}

            {/* Type & Date */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <span className={`item-type-badge ${item.type}`}>{item.type}</span>
              <span style={{ fontSize: '0.75rem', color: '#646b75' }}>
                {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Tags */}
            {item.tags?.length > 0 && (
              <div className="detail-section">
                <div className="detail-section-title">Tags</div>
                <div className="tags-row">
                  {item.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Collection */}
            <div className="detail-section">
              <div className="detail-section-title">Collection</div>
              <select
                className="input"
                value={item.collectionId || ''}
                onChange={(e) => handleMoveToCollection(e.target.value)}
              >
                <option value="">No collection</option>
                {collections.map(col => (
                  <option key={col._id} value={col._id}>{col.name}</option>
                ))}
              </select>
            </div>

            {/* Highlights */}
            <div className="detail-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="detail-section-title" style={{ margin: 0 }}>Highlights & Notes</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowHighlightForm(!showHighlightForm)}>
                  <HiOutlinePlus size={14} /> Add
                </button>
              </div>

              {showHighlightForm && (
                <div style={{ marginBottom: 12, padding: 12, background: '#f8f9fa', borderRadius: 6 }}>
                  <input
                    className="input"
                    placeholder="Highlight text..."
                    value={highlightText}
                    onChange={e => setHighlightText(e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                  <input
                    className="input"
                    placeholder="Note (optional)"
                    value={highlightNote}
                    onChange={e => setHighlightNote(e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleAddHighlight}>Save</button>
                </div>
              )}

              {item.highlights?.length > 0 ? (
                item.highlights.map(h => (
                  <div key={h._id} className="highlight-item">
                    <div className="highlight-text">"{h.text}"</div>
                    {h.note && <div className="highlight-note">{h.note}</div>}
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 4, fontSize: '0.6875rem', color: '#dc2626' }}
                      onClick={() => handleDeleteHighlight(h._id)}
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.8125rem', color: '#646b75' }}>No highlights yet</p>
              )}
            </div>

            {/* Related Items */}
            {related.length > 0 && (
              <div className="detail-section">
                <div className="detail-section-title">Related Items</div>
                {related.map(r => (
                  <div
                    key={r._id}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e5e9', marginBottom: 6, cursor: 'default' }}
                  >
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: 2 }}>{r.title}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`item-type-badge ${r.type}`}>{r.type}</span>
                      <span className="similarity-badge">{r.similarity}% match</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
