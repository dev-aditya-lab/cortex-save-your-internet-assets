import { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { getGraphData } from '../api';

const typeColors = {
  article: '#6b7280', youtube: '#dc2626', tweet: '#4f46e5',
  image: '#16a34a', pdf: '#d97706', linkedin: '#1d4ed8', other: '#9ca3af'
};

export default function Graph() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getGraphData();
        const links = (data.edges || []).map(e => ({ source: e.source, target: e.target, value: e.value }));
        setGraphData({ nodes: data.nodes || [], links });
      } catch { }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div className="page-container" style={{ paddingBottom: 0 }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Knowledge Graph</h1>
          <p className="page-subtitle">
            {graphData.nodes.length} items · {graphData.links.length} connections
          </p>
        </div>
      </div>

      <div className="graph-container" ref={containerRef}>
        {loading ? (
          <div className="loading-center"><div className="spinner"></div></div>
        ) : graphData.nodes.length === 0 ? (
          <div className="empty-state">
            <p>Not enough data for a graph yet</p>
            <p className="hint">Save more items to see connections</p>
          </div>
        ) : (
          <ForceGraph2D
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            nodeColor={node => typeColors[node.type] || '#9ca3af'}
            nodeLabel={node => `${node.title}\n[${node.type}]`}
            nodeRelSize={5}
            linkWidth={link => Math.max(link.value / 25, 0.5)}
            linkColor={() => '#e0e2e7'}
            backgroundColor="#f6f7f9"
            cooldownTicks={100}
          />
        )}
      </div>
    </div>
  );
}
