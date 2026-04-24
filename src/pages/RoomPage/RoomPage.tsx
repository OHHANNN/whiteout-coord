import { Link, useParams } from 'react-router-dom';

import { Panel } from '@/components/Panel/Panel';
import { UtcClock } from '@/components/UtcClock/UtcClock';

import styles from './RoomPage.module.scss';

/**
 * Phase 2+ 會正式接 Firebase，這裡先是 placeholder 讓路由跑得起來。
 */
export function RoomPage() {
  const { pin } = useParams<{ pin: string }>();

  return (
    <div className={styles.page}>
      <Panel label={`ROOM · ${pin}`} labelRight="BRIDGE // PENDING">
        <div className={styles.inner}>
          <UtcClock size="md" />
          <div className={styles.placeholder}>
            <div>房間 / ROOM</div>
            <div className={styles.pin}>{pin}</div>
            <div className={styles.note}>
              Phase 2 · Firebase 整合完成後，這裡會出現指揮官面板 & 車頭名單。
            </div>
            <Link to="/" className={styles.back}>
              ← 返回進入頁
            </Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}
