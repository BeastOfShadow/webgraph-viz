import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';

import { useGraphStore } from '../store';
import type { GraphNode } from '../types';

interface TreeNode {
  segment: string;
  fullPath: string;
  page?: GraphNode;
  children: Map<string, TreeNode>;
}

function buildTree(nodes: GraphNode[]): TreeNode {
  const root: TreeNode = { segment: '/', fullPath: '/', children: new Map() };

  for (const node of nodes) {
    try {
      const url = new URL(node.url);
      const segments = url.pathname.split('/').filter(Boolean);

      if (segments.length === 0) {
        root.page = node;
        continue;
      }

      let current = root;
      let path = '';

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        path += '/' + seg;

        if (!current.children.has(seg)) {
          current.children.set(seg, { segment: seg, fullPath: path, children: new Map() });
        }

        const child = current.children.get(seg)!;
        if (i === segments.length - 1) child.page = node;
        current = child;
      }
    } catch {
      // skip invalid URLs
    }
  }

  return root;
}

function statusColor(code?: number | null): string {
  if (!code) return 'text-zinc-600';
  if (code >= 200 && code < 300) return 'text-emerald-400';
  if (code >= 300 && code < 400) return 'text-yellow-400';
  return 'text-red-400';
}

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (node: GraphNode) => void;
}

function TreeItem({ node, depth, selectedId, onSelect }: TreeItemProps) {
  const hasChildren = node.children.size > 0;
  const [expanded, setExpanded] = useState(depth < 2);
  const isSelected = node.page?.id === selectedId;

  return (
    <div>
      <div
        className={`flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-zinc-800 ${
          isSelected ? 'bg-indigo-900/40 text-indigo-300' : 'text-zinc-300'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => {
          if (hasChildren) setExpanded((e) => !e);
          if (node.page) onSelect(node.page);
        }}
      >
        <span className="text-zinc-500 w-3 flex-shrink-0">
          {hasChildren ? (
            expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : null}
        </span>
        {hasChildren ? (
          expanded ? (
            <FolderOpen size={12} className="flex-shrink-0 text-yellow-400/80" />
          ) : (
            <Folder size={12} className="flex-shrink-0 text-yellow-400/80" />
          )
        ) : (
          <FileText size={12} className="flex-shrink-0 text-zinc-500" />
        )}
        <span className="flex-1 truncate">{node.segment}</span>
        {node.page?.status_code != null && (
          <span className={`ml-auto flex-shrink-0 text-[10px] ${statusColor(node.page.status_code)}`}>
            {node.page.status_code}
          </span>
        )}
        {node.page?.pagerank != null && (
          <span className="ml-1 flex-shrink-0 text-[10px] text-zinc-600">
            {node.page.pagerank.toFixed(3)}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {Array.from(node.children.values()).map((child) => (
            <TreeItem
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView() {
  const storeNodes = useGraphStore((s) => s.nodes);
  const selectedNode = useGraphStore((s) => s.selectedNode);
  const selectNode = useGraphStore((s) => s.selectNode);

  const nodes = Array.from(storeNodes.values());
  const tree = buildTree(nodes);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-2 text-xs text-zinc-500">
        {nodes.length} pagine · gerarchia URL
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <TreeItem
          node={tree}
          depth={0}
          selectedId={selectedNode?.id ?? null}
          onSelect={selectNode}
        />
      </div>
    </div>
  );
}
