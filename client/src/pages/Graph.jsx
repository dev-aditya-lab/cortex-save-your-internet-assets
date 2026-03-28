import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { getGraphData } from '../api';
import ItemDetail from '../components/ItemDetail';

const TYPE_COLORS = {
  article: '#6b7280', youtube: '#dc2626', tweet: '#4f46e5',
  image: '#16a34a', pdf: '#d97706', linkedin: '#1d4ed8', other: '#9ca3af'
};

const TYPE_OPTIONS = ['article', 'youtube', 'tweet', 'linkedin', 'image', 'pdf'];

export default function Graph() {
  // Raw data
  const [rawNodes, setRawNodes] = useState([]);
  const [rawEdges, setRawEdges] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [loading, setLoading] = useState(true);

  // Controls
  const [threshold, setThreshold] = useState(0.3);
  const [typeFilter, setTypeFilter] = useState(new Set());
  const [tagFilter, setTagFilter] = useState('');
  const [mode, setMode] = useState('explore'); // 'explore' | 'focus'
  const [focusNodeId, setFocusNodeId] = useState(null);

  // Interactions
  const [hoverNode, setHoverNode] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Graph
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });

  // Load data
  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGraphData({ threshold });
      setRawNodes(data.nodes || []);
      setRawEdges(data.edges || []);
      setAllTags(data.allTags || []);
      setMetadata(data.metadata || {});
    } catch { }
    setLoading(false);
  }, [threshold]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // Resize
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDims({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Memoize graph data — only recompute when data/filters change, NOT on hover
  const graphData = useMemo(() => {
    let nodes = [...rawNodes];
    let edges = [...rawEdges];

    // Type filter
    if (typeFilter.size > 0) {
      const idSet = new Set(nodes.filter(n => typeFilter.has(n.type)).map(n => n.id));
      nodes = nodes.filter(n => idSet.has(n.id));
      edges = edges.filter(e => idSet.has(e.source) && idSet.has(e.target));
    }

    // Tag filter
    if (tagFilter) {
      const idSet = new Set(nodes.filter(n => n.tags?.includes(tagFilter)).map(n => n.id));
      nodes = nodes.filter(n => idSet.has(n.id));
      edges = edges.filter(e => idSet.has(e.source) && idSet.has(e.target));
    }

    // Focus mode: show only selected node + its neighbors
    if (mode === 'focus' && focusNodeId) {
      const neighborIds = new Set();
      neighborIds.add(focusNodeId);
      edges.forEach(e => {
        const src = typeof e.source === 'object' ? e.source.id : e.source;
        const tgt = typeof e.target === 'object' ? e.target.id : e.target;
        if (src === focusNodeId) neighborIds.add(tgt);
        if (tgt === focusNodeId) neighborIds.add(src);
      });
      nodes = nodes.filter(n => neighborIds.has(n.id));
      edges = edges.filter(e => {
        const src = typeof e.source === 'object' ? e.source.id : e.source;
        const tgt = typeof e.target === 'object' ? e.target.id : e.target;
        return neighborIds.has(src) && neighborIds.has(tgt);
      });
    }

    // Recount connections for filtered set
    const connCount = {};
    edges.forEach(e => {
      const src = typeof e.source === 'object' ? e.source.id : e.source;
      const tgt = typeof e.target === 'object' ? e.target.id : e.target;
      connCount[src] = (connCount[src] || 0) + 1;
      connCount[tgt] = (connCount[tgt] || 0) + 1;
    });
    nodes = nodes.map(n => ({ ...n, connections: connCount[n.id] || 0 }));

    const links = edges.map(e => ({
      source: typeof e.source === 'object' ? e.source.id : e.source,
      target: typeof e.target === 'object' ? e.target.id : e.target,
      value: e.value,
      similarity: e.similarity
    }));

    return { nodes, links };
  }, [rawNodes, rawEdges, typeFilter, tagFilter, mode, focusNodeId]);

  // Separate hover highlighting — changes on hover WITHOUT recreating graphData
  const connectedSet = useMemo(() => {
    const connected = new Set();
    if (hoverNode) {
      connected.add(hoverNode.id);
      graphData.links.forEach(e => {
        const src = typeof e.source === 'object' ? e.source.id : e.source;
        const tgt = typeof e.target === 'object' ? e.target.id : e.target;
        if (src === hoverNode.id) connected.add(tgt);
        if (tgt === hoverNode.id) connected.add(src);
      });
    }
    return connected;
  }, [hoverNode, graphData.links]);

  const toggleType = (type) => {
    setTypeFilter(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  // Node drawing
  const drawNode = useCallback((node, ctx, globalScale) => {
    const r = 3 + Math.min(node.connections * 1.5, 12);
    const isHovered = hoverNode?.id === node.id;
    const isFocus = focusNodeId === node.id;
    const isConnected = connectedSet.has(node.id);
    const isDimmed = hoverNode && !isConnected;

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    const color = TYPE_COLORS[node.type] || TYPE_COLORS.other;
    ctx.fillStyle = isDimmed ? `${color}30` : color;
    ctx.fill();

    // Ring for hovered/focused
    if (isHovered || isFocus) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Label on hover or focus (only at reasonable zoom)
    if ((isHovered || isFocus || (isConnected && hoverNode)) && globalScale > 0.5) {
      const label = node.title?.substring(0, 28) + (node.title?.length > 28 ? '…' : '');
      const fontSize = Math.max(10 / globalScale, 3);
      ctx.font = `500 ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#111318';
      ctx.fillText(label, node.x, node.y + r + 2);
    }
  }, [hoverNode, focusNodeId, connectedSet]);

  // Link drawing
  const drawLink = useCallback((link, ctx) => {
    const srcId = typeof link.source === 'object' ? link.source.id : link.source;
    const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
    const isHighlighted = hoverNode && (connectedSet.has(srcId) && connectedSet.has(tgtId));
    const isDimmed = hoverNode && !isHighlighted;

    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.strokeStyle = isDimmed ? '#e0e2e715' : (isHighlighted ? '#111318' : '#d1d4da');
    ctx.lineWidth = isHighlighted ? Math.max(link.value / 40, 1) : Math.max(link.value / 60, 0.3);
    ctx.stroke();
  }, [hoverNode, connectedSet]);

  return (
    <div style={{ display: 'flex', height: `calc(100vh - 52px)`, overflow: 'hidden' }}>
      {/* Controls Panel */}
      <div style={{
        width: 240, flexShrink: 0, borderRight: '1px solid #e0e2e7',
        padding: '16px', overflowY: 'auto', background: '#fff',
        fontSize: '0.8125rem'
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>Knowledge Graph</h2>
        <p style={{ fontSize: '0.6875rem', color: '#8b919e', marginBottom: 16 }}>
          {graphData.nodes.length} nodes · {graphData.links.length} edges
        </p>

        {/* Mode Toggle */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b919e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Mode</label>
          <div style={{ display: 'flex', gap: 0, borderRadius: 5, overflow: 'hidden', border: '1px solid #e0e2e7' }}>
            <button onClick={() => { setMode('explore'); setFocusNodeId(null); }}
              style={{ flex: 1, padding: '5px 0', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
                background: mode === 'explore' ? '#111318' : '#fff', color: mode === 'explore' ? '#fff' : '#8b919e' }}>
              Explore
            </button>
            <button onClick={() => setMode('focus')}
              style={{ flex: 1, padding: '5px 0', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
                background: mode === 'focus' ? '#111318' : '#fff', color: mode === 'focus' ? '#fff' : '#8b919e' }}>
              Focus
            </button>
          </div>
        </div>

        {/* Focus Mode: Select node */}
        {mode === 'focus' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b919e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Focus Item</label>
            <select
              value={focusNodeId || ''}
              onChange={e => setFocusNodeId(e.target.value || null)}
              className="input"
              style={{ fontSize: '0.75rem', padding: '5px 8px' }}
            >
              <option value="">Select an item...</option>
              {rawNodes.filter(n => n.connections > 0).sort((a, b) => b.connections - a.connections).map(n => (
                <option key={n.id} value={n.id}>{n.title.substring(0, 40)}</option>
              ))}
            </select>
          </div>
        )}

        {/* Threshold Slider */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b919e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
            Similarity Threshold: {threshold.toFixed(2)}
          </label>
          <input type="range" min="0.1" max="0.95" step="0.05" value={threshold}
            onChange={e => setThreshold(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#111318' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: '#8b919e' }}>
            <span>More edges</span><span>Fewer edges</span>
          </div>
        </div>

        {/* Type Filter */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b919e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Filter by Type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {TYPE_OPTIONS.map(type => (
              <button key={type} onClick={() => toggleType(type)}
                style={{
                  padding: '3px 8px', borderRadius: 3, border: '1px solid #e0e2e7',
                  cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 500,
                  background: typeFilter.has(type) ? TYPE_COLORS[type] : '#fff',
                  color: typeFilter.has(type) ? '#fff' : TYPE_COLORS[type]
                }}>
                {type}
              </button>
            ))}
          </div>
          {typeFilter.size > 0 && (
            <button onClick={() => setTypeFilter(new Set())}
              style={{ marginTop: 6, border: 'none', background: 'none', color: '#8b919e', fontSize: '0.6875rem', cursor: 'pointer', textDecoration: 'underline' }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b919e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Filter by Tag</label>
            <select
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
              className="input"
              style={{ fontSize: '0.75rem', padding: '5px 8px' }}
            >
              <option value="">All tags</option>
              {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </div>
        )}

        {/* Legend */}
        <div>
          <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8b919e', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Legend</label>
          {Object.entries(TYPE_COLORS).filter(([k]) => k !== 'other').map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}></div>
              <span style={{ fontSize: '0.6875rem', color: '#555a65', textTransform: 'capitalize' }}>{type}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: '0.625rem', color: '#8b919e' }}>
            Node size = connections · Edge thickness = similarity
          </div>
        </div>
      </div>

      {/* Graph Area */}
      <div ref={containerRef} style={{ flex: 1, background: '#f6f7f9', position: 'relative' }}>
        {loading ? (
          <div className="loading-center" style={{ height: '100%' }}><div className="spinner"></div></div>
        ) : graphData.nodes.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: '20vh' }}>
            <div className="empty-state-icon">🕸️</div>
            <p>{mode === 'focus' && !focusNodeId ? 'Select an item to focus on' : 'No connected items found'}</p>
            <p className="hint">Try lowering the similarity threshold or saving more items</p>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dims.width}
            height={dims.height}
            nodeCanvasObject={drawNode}
            nodePointerAreaPaint={(node, color, ctx) => {
              const r = 3 + Math.min(node.connections * 1.5, 12);
              ctx.beginPath(); ctx.arc(node.x, node.y, r + 3, 0, 2 * Math.PI);
              ctx.fillStyle = color; ctx.fill();
            }}
            linkCanvasObject={drawLink}
            onNodeHover={node => setHoverNode(node || null)}
            onNodeClick={node => {
              if (mode === 'focus') {
                setFocusNodeId(node.id);
              } else {
                setSelectedItem(node);
              }
            }}
            backgroundColor="transparent"
            d3AlphaDecay={0.03}
            d3VelocityDecay={0.3}
            cooldownTicks={150}
            enableNodeDrag={true}
            enableZoomInteraction={true}
            enablePanInteraction={true}
            minZoom={0.3}
            maxZoom={8}
          />
        )}

        {/* Hover tooltip */}
        {hoverNode && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: '#fff', border: '1px solid #e0e2e7', borderRadius: 6,
            padding: '8px 12px', maxWidth: 260,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            pointerEvents: 'none', zIndex: 10
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: 2 }}>{hoverNode.title}</div>
            <div style={{ fontSize: '0.625rem', color: '#8b919e', display: 'flex', gap: 8 }}>
              <span className={`type-badge ${hoverNode.type}`} style={{ fontSize: '0.5625rem' }}>{hoverNode.type}</span>
              <span>{hoverNode.connections} connections</span>
              {hoverNode.domain && <span>{hoverNode.domain}</span>}
            </div>
            {hoverNode.tags?.length > 0 && (
              <div style={{ marginTop: 4, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {hoverNode.tags.slice(0, 4).map(t => <span key={t} className="tag" style={{ fontSize: '0.5625rem', padding: '0 4px' }}>{t}</span>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedItem && (
        <ItemDetail
          item={{ _id: selectedItem.id, ...selectedItem }}
          onClose={() => setSelectedItem(null)}
          onDeleted={() => { setSelectedItem(null); loadGraph(); }}
        />
      )}
    </div>
  );
}
