import type { GraphNode } from '../types';

/**
 * Concentric layout: BFS depth → ring distance.
 * Root node sits at the origin; everything else is positioned on rings spaced
 * `ringStep` apart. Pages with the same depth are evenly distributed around
 * their ring.
 */
export function computePositions(
  nodes: GraphNode[],
  ringStep = 280
): Map<string, { x: number; y: number }> {
  const byDepth = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const depth = node.depth ?? 0;
    if (!byDepth.has(depth)) byDepth.set(depth, []);
    byDepth.get(depth)!.push(node);
  }

  const positions = new Map<string, { x: number; y: number }>();

  for (const [depth, ringNodes] of byDepth) {
    if (depth === 0) {
      ringNodes.forEach((node, i) => {
        positions.set(node.id, { x: i === 0 ? 0 : i * 30, y: 0 });
      });
      continue;
    }
    const radius = depth * ringStep;
    // Stable ordering: by URL so re-renders keep positions
    ringNodes.sort((a, b) => a.url.localeCompare(b.url));
    ringNodes.forEach((node, i) => {
      const angle = (i / ringNodes.length) * 2 * Math.PI;
      // Round to int — non-integer transforms blur text on subpixel rendering
      positions.set(node.id, {
        x: Math.round(radius * Math.cos(angle)),
        y: Math.round(radius * Math.sin(angle)),
      });
    });
  }

  return positions;
}
