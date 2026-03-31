import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData, FlowNodeType } from '../../interface/flow.interface';
import styles from './AstNode.module.css';

const NODE_CONFIG: Record<FlowNodeType, { emoji: string; className: string }> = {
  directory: { emoji: '📁', className: styles.directory },
  file: { emoji: '📄', className: styles.file },
  class: { emoji: '🏛️', className: styles.class },
  function: { emoji: '⚡', className: styles.function },
};

// @xyflow/react v12: NodeProps uses Record<string, unknown> generic
// We cast data to FlowNodeData after receiving it
function AstNode({ data: rawData, selected }: NodeProps) {
  const data = rawData as FlowNodeData;
  const config = NODE_CONFIG[data.nodeType] ?? { emoji: '🔷', className: '' };
  const { metrics } = data;

  return (
    <div className={`${styles.node} ${config.className} ${selected ? styles.selected : ''}`}>
      <Handle type="target" position={Position.Top} className={styles.handle} />

      {/* DIT Badge (상속 깊이) */}
      {data.nodeType === 'class' && metrics && (
        <div className={styles.ditBadge} title="Depth of Inheritance Tree">
          D{metrics.dit}
        </div>
      )}

      {/* NOC Badge (자식 수) */}
      {data.nodeType === 'class' && metrics && metrics.noc > 0 && (
        <div className={styles.nocBadge} title={`Number of Children: ${metrics.noc}`}>
          N{metrics.noc}
        </div>
      )}

      <div className={styles.header}>
        <span className={styles.emoji}>{config.emoji}</span>
        <span className={styles.label} title={data.label}>
          {data.label}
        </span>
      </div>

      {data.meta && (
        <div className={styles.meta}>
          {data.meta.startLine != null && (
            <span className={styles.metaTag}>
              L{data.meta.startLine}–{data.meta.endLine}
            </span>
          )}
          {data.meta.methodCount != null && (
            <span className={styles.metaTag}>{data.meta.methodCount} methods</span>
          )}
          {data.meta.fileCount != null && (
            <span className={styles.metaTag}>{data.meta.fileCount} files</span>
          )}
        </div>
      )}

      {/* CK Metrics Grid (클래스 전용) */}
      {data.nodeType === 'class' && metrics && (
        <div className={styles.metricsGrid}>
          <div className={styles.metricItem} title="Coupling Between Objects">
            <span className={styles.metricLabel}>CBO</span>
            <span className={styles.metricValue}>{metrics.cbo}</span>
          </div>
          <div className={styles.metricItem} title="Response For a Class">
            <span className={styles.metricLabel}>RFC</span>
            <span className={styles.metricValue}>{metrics.rfc}</span>
          </div>
          <div className={styles.metricItem} title="Lack of Cohesion in Methods">
            <span className={`${styles.metricLabel} ${metrics.lcom > 50 ? styles.warn : ''}`}>LCOM</span>
            <span className={styles.metricValue}>{metrics.lcom}</span>
          </div>
        </div>
      )}

      {/* 가로형 WMC 게이지 (복잡도) */}
      {data.nodeType === 'class' && metrics && (
        <div className={styles.wmcBarWrapper} title={`Weighted Methods (Complexity): ${metrics.wmc}`}>
          <div 
            className={styles.wmcBar} 
            style={{ width: `${Math.min(metrics.wmc * 5, 100)}%` }} 
          />
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}

export default memo(AstNode);
