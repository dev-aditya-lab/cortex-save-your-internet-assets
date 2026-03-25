import { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { getGraphData } from '../api';

const TYPE_COLORS = {
  article: '#2563eb',
  youtube: '#dc2626',
  tweet: '#6366f1',
  image: '#16a34a',
  pdf: '#d97706',
  other: '#64748b',
};

export default function Graph() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  const graphRef = useRef();

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGraphData();
      setGraphData({
        nodes: data.nodes.map(n => ({ ...n, label: n.title })),
        links: data.edges.map(e => ({ source: e.source, target: e.target, value: e.value }))
      });
    } catch (err) {
      console.error('Failed to load graph:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  const handleNodeClick = (node) => {
    if (node && graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 400);
      graphRef.current.zoom(3, 400);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Knowledge Graph</h1>
          <p style={{ fontSize: '0.8125rem', color: '#646b75', marginTop: 4 }}>
            Visual map of how your saved content connects
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#646b75' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }}></span>
              {type}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : graphData.nodes.length === 0 ? (
        <div className="empty-state">
          <p>Save some items first to see your knowledge graph.</p>
        </div>
      ) : (
        <div className="graph-container" style={{ position: 'relative' }}>
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel="title"
            nodeColor={(node) => TYPE_COLORS[node.type] || '#64748b'}
            nodeRelSize={6}
            linkColor={() => '#d1d5db'}
            linkWidth={(link) => Math.max(1, link.value / 30)}
            onNodeClick={handleNodeClick}
            onNodeHover={setHoveredNode}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const size = 6;
              const color = TYPE_COLORS[node.type] || '#64748b';

              // Draw circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();

              // Draw border for hovered
              if (hoveredNode && hoveredNode.id === node.id) {
                ctx.strokeStyle = '#1a1d21';
                ctx.lineWidth = 2;
                ctx.stroke();
              }

              // Draw label if zoomed in enough
              if (globalScale > 1.5) {
                const label = node.title || '';
                const fontSize = 10 / globalScale;
                ctx.font = `${fontSize}px Inter, sans-serif`;
                ctx.fillStyle = '#1a1d21';
                ctx.textAlign = 'center';
                ctx.fillText(label, node.x, node.y + size + fontSize + 2);
              }
            }}
            cooldownTicks={100}
            width={undefined}
            height={undefined}
          />

          {/* Hovered node tooltip */}
          {hoveredNode && (
            <div style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: '#ffffff',
              border: '1px solid #e2e5e9',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: '0.8125rem',
              maxWidth: 250,
              pointerEvents: 'none'
            }}>
              <div style={{ fontWeight: 500, marginBottom: 2 }}>{hoveredNode.title}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <span className={`item-type-badge ${hoveredNode.type}`}>{hoveredNode.type}</span>
                {hoveredNode.domain && (
                  <span style={{ fontSize: '0.6875rem', color: '#646b75' }}>{hoveredNode.domain}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
