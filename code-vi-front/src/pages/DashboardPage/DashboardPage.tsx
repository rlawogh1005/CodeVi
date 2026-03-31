import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { astDataService } from '../../services/test_astDataService';
import type { AstSnapshotSummary } from '../../interface/ast.interface';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState<AstSnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    astDataService
      .getSnapshots()
      .then(setSnapshots)
      .catch(() => setError('스냅샷 목록을 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    navigate('/login');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>⬡</span>
          <h1 className={styles.title}>Code Visualizer</h1>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>빌드 스냅샷</h2>
          <p className={styles.sectionDesc}>스냅샷을 클릭하면 코드 구조를 시각화합니다.</p>
        </div>

        {loading && (
          <div className={styles.center}>
            <div className={styles.spinner} />
            <p>로딩 중...</p>
          </div>
        )}

        {error && <div className={styles.errorBox}>{error}</div>}

        {!loading && !error && (
          <div className={styles.grid}>
            {snapshots.length === 0 ? (
              <div className={styles.emptyState}>
                <span style={{ fontSize: 40 }}>📭</span>
                <p>등록된 스냅샷이 없습니다.</p>
                <small>Jenkins 파이프라인을 실행하면 스냅샷이 생성됩니다.</small>
              </div>
            ) : (
              snapshots.map((snap) => (
                <button
                  key={snap.id}
                  className={styles.snapshotCard}
                  onClick={() => navigate(`/visualization/${snap.id}`)}
                >
                  <div className={styles.cardIcon}>🏗️</div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitle}>Snapshot #{snap.id}</div>
                    {snap.buildNumber && (
                      <div className={styles.cardMeta}>Build #{snap.buildNumber}</div>
                    )}
                    <div className={styles.cardMeta}>
                      {new Date(snap.createdAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <div className={styles.cardArrow}>→</div>
                </button>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
