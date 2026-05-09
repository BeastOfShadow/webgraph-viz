import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useRef, useState } from 'react';

import { computePositions } from '../lib/layout';
import { useGraphStore } from '../store';
import type { GraphEdge, GraphNode } from '../types';
import CustomNode from './CustomNode';

const nodeTypes = { page: CustomNode };

export default function GraphCanvas() {
  const storeNodes = useGraphStore((s) => s.nodes);
  const storeEdges = useGraphStore((s) => s.edges);
  const selectedId = useGraphStore((s) => s.selectedNode?.id ?? null);
  const selectNode = useGraphStore((s) => s.selectNode);
  const status = useGraphStore((s) => s.status);
  const crawlId = useGraphStore((s) => s.crawlId);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Nodes the user manually dragged — their positions survive re-layout
  const draggedRef = useRef(new Set<string>());
  // Track whether we already fired the post-crawl re-layout
  const relayoutFiredRef = useRef(false);

  // Reset on new crawl
  useEffect(() => {
    draggedRef.current = new Set();
    relayoutFiredRef.current = false;
  }, [crawlId]);

  // Full re-layout when crawl completes (fixes stale ring positions from streaming)
  useEffect(() => {
    if (status !== 'done' || relayoutFiredRef.current) return;
    relayoutFiredRef.current = true;

    setNodes((current) => {
      const positions = computePositions(Array.from(storeNodes.values()));
      return current.map((n) => ({
        ...n,
        position: draggedRef.current.has(n.id)
          ? n.position
          : (positions.get(n.id) ?? n.position),
      }));
    });
  }, [status, storeNodes]);

  // Sync store → local state during crawl (preserve prior positions to avoid jump)
  useEffect(() => {
    setNodes((current) => {
      const positions = computePositions(Array.from(storeNodes.values()));
      const existing = new Map(current.map((n) => [n.id, n]));
      const next: Node[] = [];

      for (const node of storeNodes.values()) {
        const prior = existing.get(node.id);
        next.push({
          id: node.id,
          type: 'page',
          position: prior?.position ?? positions.get(node.id) ?? { x: 0, y: 0 },
          data: node as unknown as Record<string, unknown>,
          selected: node.id === selectedId,
        });
      }
      return next;
    });
  }, [storeNodes, selectedId]);

  useEffect(() => {
    setEdges((current) => {
      const existing = new Map(current.map((e) => [e.id, e]));
      const next: Edge[] = [];
      for (const edge of storeEdges.values()) {
        next.push(existing.get(edge.id) ?? buildEdge(edge));
      }
      return next;
    });
  }, [storeEdges]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type === 'position' && !change.dragging) {
        draggedRef.current.add(change.id);
      }
    }
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => selectNode(node.data as unknown as GraphNode)}
      onPaneClick={() => selectNode(null)}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={3}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={32} size={1} color="#27272a" />
      <Controls className="!border-zinc-700 !bg-zinc-900/90" />
      <MiniMap
        nodeColor={(n) =>
          ((n.data as unknown as GraphNode)?.depth === 0 ? '#6366f1' : '#71717a')
        }
        maskColor="rgba(0, 0, 0, 0.6)"
        className="!border-zinc-700 !bg-zinc-900/90"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}

function buildEdge(edge: GraphEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    style: { stroke: '#3f3f46', strokeWidth: 1 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b' },
  };
}
