import { useState, useEffect } from 'react';
import { HiOutlineChip, HiOutlineRefresh } from 'react-icons/hi';

const API = '/api/debug';

export default function Debug() {
  const [pipelineInfo, setPipelineInfo] = useState(null);
  const [embeddings, setEmbeddings] = useState(null);
  const [clusters, setClusters] = useState(null);
  const [matrix, setMatrix] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [similarity, setSimilarity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, eRes, cRes] = await Promise.all([
        fetch(`${API}/pipeline-info`).then(r => r.json()),
        fetch(`${API}/embeddings`).then(r => r.json()),
        fetch(`${API}/clusters`).then(r => r.json())
      ]);
      setPipelineInfo(pRes);
      setEmbeddings(eRes);
      setClusters(cRes);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadMatrix = async () => {
    try {
      const res = await fetch(`${API}/matrix`).then(r => r.json());
      setMatrix(res);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSimilarity = async (id) => {
    setSelectedItem(id);
    try {
      const res = await fetch(`${API}/similarity/${id}`).then(r => r.json());
      setSimilarity(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const tabs = [
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'embeddings', label: 'Embeddings' },
    { key: 'similarity', label: 'Similarity' },
    { key: 'matrix', label: 'Matrix' },
    { key: 'clusters', label: 'Clusters' }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiOutlineChip size={24} /> Debug Mode
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#646b75', marginTop: 4 }}>
            Inspect real system internals — embeddings, similarity scores, clusters
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadAll}><HiOutlineRefresh size={16} /> Refresh</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #e2e5e9', paddingBottom: 2 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); if (t.key === 'matrix' && !matrix) loadMatrix(); }}
            style={{
              padding: '8px 16px', border: 'none', background: activeTab === t.key ? '#2563eb' : 'transparent',
              color: activeTab === t.key ? '#fff' : '#646b75', borderRadius: '6px 6px 0 0',
              fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer'
            }}
          >{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : (
        <>
          {/* PIPELINE TAB */}
          {activeTab === 'pipeline' && pipelineInfo && (
            <div>
              <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ marginBottom: 12 }}>Processing Pipeline</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pipelineInfo.pipeline.map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8f9fa', borderRadius: 6 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: '0.8125rem' }}>{step.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ marginBottom: 12 }}>System Configuration</h3>
                <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                  <tbody>
                    {Object.entries(pipelineInfo).filter(([k]) => k !== 'pipeline').map(([key, val]) => (
                      <tr key={key} style={{ borderBottom: '1px solid #e2e5e9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: '#646b75' }}>{key}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EMBEDDINGS TAB */}
          {activeTab === 'embeddings' && embeddings && (
            <div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div className="card" style={{ padding: 16, flex: 1 }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{embeddings.totalItems}</div>
                  <div style={{ fontSize: '0.75rem', color: '#646b75' }}>Total Items</div>
                </div>
                <div className="card" style={{ padding: 16, flex: 1 }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{embeddings.withEmbeddings}</div>
                  <div style={{ fontSize: '0.75rem', color: '#646b75' }}>With Embeddings</div>
                </div>
                <div className="card" style={{ padding: 16, flex: 1 }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{embeddings.embeddingDimensions}</div>
                  <div style={{ fontSize: '0.75rem', color: '#646b75' }}>Dimensions</div>
                </div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ marginBottom: 12 }}>Item Embeddings ({embeddings.embeddingModel})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {embeddings.items.map(item => (
                    <div key={item.id} style={{ padding: '10px 12px', background: '#f8f9fa', borderRadius: 6, cursor: 'pointer', border: selectedItem === item.id ? '2px solid #2563eb' : '1px solid #e2e5e9' }}
                      onClick={() => { loadSimilarity(item.id); setActiveTab('similarity'); }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{item.title}</span>
                        <span className={`item-type-badge ${item.type}`}>{item.type}</span>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.6875rem', color: '#646b75' }}>
                        dims: {item.embeddingDimensions} | mag: {item.embeddingMagnitude} | vec: [{item.embeddingPreview.join(', ')}...]
                      </div>
                      {item.tags?.length > 0 && (
                        <div className="tags-row" style={{ marginTop: 4 }}>
                          {item.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SIMILARITY TAB */}
          {activeTab === 'similarity' && (
            <div>
              {!similarity ? (
                <div className="empty-state"><p>Click an item in the Embeddings tab to see its similarity scores</p></div>
              ) : (
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ marginBottom: 4 }}>Similarity: "{similarity.target?.title}"</h3>
                  <p style={{ fontSize: '0.75rem', color: '#646b75', marginBottom: 16 }}>
                    Model: {similarity.embeddingModel} | Cluster threshold: {similarity.clusterThreshold} | Related threshold: {similarity.relatedThreshold}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {similarity.scores?.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 6, background: s.isClusterNeighbor ? '#dbeafe' : s.isRelated ? '#f0fdf4' : '#f8f9fa', border: '1px solid #e2e5e9' }}>
                        <div style={{ width: 60, textAlign: 'center' }}>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', color: s.cosineSimilarity > 0.5 ? '#2563eb' : s.cosineSimilarity > 0.3 ? '#16a34a' : '#646b75' }}>
                            {s.cosineSimilarity}
                          </div>
                          <div style={{ fontSize: '0.5625rem', color: '#646b75' }}>cos sim</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{s.title}</div>
                          <div style={{ fontSize: '0.6875rem', color: '#646b75' }}>
                            {s.isClusterNeighbor && <span style={{ color: '#2563eb' }}>● CLUSTER </span>}
                            {s.isRelated && <span style={{ color: '#16a34a' }}>● RELATED </span>}
                          </div>
                        </div>
                        <span className={`item-type-badge ${s.type}`}>{s.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MATRIX TAB */}
          {activeTab === 'matrix' && (
            <div>
              {!matrix ? (
                <div className="loading-center"><div className="spinner"></div></div>
              ) : matrix.size === 0 ? (
                <div className="empty-state"><p>No items with embeddings yet</p></div>
              ) : (
                <div className="card" style={{ padding: 16, overflowX: 'auto' }}>
                  <h3 style={{ marginBottom: 12 }}>Similarity Matrix ({matrix.size}×{matrix.size})</h3>
                  <p style={{ fontSize: '0.75rem', color: '#646b75', marginBottom: 12 }}>{matrix.note}</p>
                  <table style={{ borderCollapse: 'collapse', fontSize: '0.6875rem', fontFamily: 'monospace' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: 4, minWidth: 80 }}></th>
                        {matrix.labels.map((l, i) => (
                          <th key={i} style={{ padding: 4, writingMode: 'vertical-lr', maxHeight: 120, overflow: 'hidden', fontSize: '0.625rem' }}>{l.title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.matrix.map((row, i) => (
                        <tr key={i}>
                          <td style={{ padding: '4px 8px', fontWeight: 500, fontSize: '0.625rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{matrix.labels[i].title}</td>
                          {row.map((val, j) => {
                            const bg = i === j ? '#e2e5e9' : val > 0.5 ? '#2563eb' : val > 0.3 ? '#60a5fa' : val > 0.15 ? '#bfdbfe' : '#f8f9fa';
                            const color = val > 0.4 ? '#fff' : '#1a1d21';
                            return (
                              <td key={j} style={{ padding: 4, textAlign: 'center', background: bg, color, minWidth: 40, border: '1px solid #e2e5e9' }}>
                                {val.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CLUSTERS TAB */}
          {activeTab === 'clusters' && clusters && (
            <div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div className="card" style={{ padding: 16, flex: 1 }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{clusters.clusters?.length || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#646b75' }}>Clusters</div>
                </div>
                <div className="card" style={{ padding: 16, flex: 1 }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{clusters.clusteredItems || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#646b75' }}>Clustered Items</div>
                </div>
                <div className="card" style={{ padding: 16, flex: 1 }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{clusters.unclusteredItems || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#646b75' }}>Unclustered</div>
                </div>
                <div className="card" style={{ padding: 16, flex: 1 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'monospace' }}>{clusters.threshold}</div>
                  <div style={{ fontSize: '0.75rem', color: '#646b75' }}>Threshold</div>
                </div>
              </div>
              {clusters.clusters?.map(cluster => (
                <div key={cluster.index} className="card" style={{ padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h3>Cluster: {cluster.label}</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span className="tag">{cluster.size} items</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#2563eb' }}>avg sim: {cluster.avgSimilarity}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {cluster.items?.map(item => (
                      <div key={item.id} style={{ padding: '6px 10px', background: '#f8f9fa', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8125rem' }}>{item.title}</span>
                        <span className={`item-type-badge ${item.type}`}>{item.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {(!clusters.clusters || clusters.clusters.length === 0) && (
                <div className="empty-state"><p>No clusters formed yet. Save more related content to see clustering in action.</p></div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
