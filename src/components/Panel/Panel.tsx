import type { ReactNode } from 'react';
import clsx from 'clsx';

import styles from './Panel.module.scss';

interface PanelProps {
  children: ReactNode;
  label?: string; // 左上角 [ LABEL ]
  labelRight?: string; // 右上角 SUB // INFO
  className?: string;
}

/**
 * HUD 風格面板：青色 1px 邊、四個角落裝飾 bracket、左上/右上可選 label。
 */
export function Panel({ children, label, labelRight, className }: PanelProps) {
  return (
    <div className={clsx(styles.panel, className)}>
      {label && <div className={styles.label}>{`[ ${label} ]`}</div>}
      {labelRight && <div className={styles.labelRight}>{labelRight}</div>}
      {children}
    </div>
  );
}
