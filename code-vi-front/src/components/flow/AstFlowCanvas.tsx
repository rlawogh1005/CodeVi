import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AstNode from './AstNode';
import type { AstSnapshot } from '../../interface/ast.interface';
import type { FlowNodeData } from '../../interface/flow.interface';
import { astSnapshotToFlow } from '../../utils/astToFlow';
import { applyDagreLayout } from '../../utils/layoutEngine';
import styles from './AstFlowCanvas.module.css';

const nodeTypes: NodeTypes = {
  astNode: AstNode,
};

interface Props {
  snapshot: AstSnapshot | null;
  onNodeSelect?: (data: FlowNodeData) => void;
}

export default function AstFlowCanvas({ snapshot, onNodeSelect }: Props) {
  // @xyflow/react v12: useNodesState/useEdgesState with generic Node/Edge
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!snapshot) return;

    setIsLoading(true);
    setTimeout(() => {
      const { nodes: rawNodes, edges: rawEdges } = astSnapshotToFlow(snapshot);
      const { nodes: lNodes, edges: lEdges } = applyDagreLayout(rawNodes, rawEdges, 'TB');
      setNodes(lNodes);
      setEdges(lEdges);
      setIsLoading(false);
    }, 0);
  }, [snapshot, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect?.(node.data as FlowNodeData);
    },
    [onNodeSelect]
  );

  const stats = useMemo(() => {
    if (!snapshot) return null;
    const dirCount = snapshot.directories.length;
    const fileCount = snapshot.directories.reduce((acc, d) => acc + d.files.length, 0);
    return { dirCount, fileCount };
  }, [snapshot]);

  if (!snapshot) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🔍</div>
        <h3>스냅샷을 선택하세요</h3>
        <p>좌측에서 빌드 스냅샷을 선택하면 코드 구조가 시각화됩니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.canvasWrapper}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <span>AST 구조 렌더링 중...</span>
        </div>
      )}

      {stats && (
        <div className={styles.statsBar}>
          <span>📁 {stats.dirCount} dirs</span>
          <span>📄 {stats.fileCount} files</span>
          <span>🔷 {nodes.length} nodes</span>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.05}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap
          nodeColor={(node) => {
            const type = (node.data as FlowNodeData)?.nodeType;
            const colors: Record<string, string> = {
              directory: '#3b82f6',
              file: '#10b981',
              class: '#f59e0b',
              function: '#a855f7',
            };
            return colors[type] ?? '#4a5568';
          }}
          style={{ background: '#0f1117', border: '1px solid #2d3150', borderRadius: 8 }}
        />
        <Controls style={{ background: '#1a1d2e', border: '1px solid #2d3150', borderRadius: 8 }} />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2d3150" />
      </ReactFlow>
    </div>
  );
}
