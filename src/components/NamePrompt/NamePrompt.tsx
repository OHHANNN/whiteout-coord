import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { Panel } from '@/components/Panel/Panel';

import styles from './NamePrompt.module.scss';

interface NamePromptProps {
  initialName?: string;
  onSubmit: (name: string) => void;
  pin: string;
}

export function NamePrompt({ initialName = '', onSubmit, pin }: NamePromptProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);

  const disabled = name.trim().length === 0;

  const submit = () => {
    if (disabled) return;
    onSubmit(name.trim().slice(0, 20));
  };

  return (
    <div className={styles.wrap}>
      <Panel label="IDENTIFY" labelRight={`PIN · ${pin}`}>
        <div className={styles.inner}>
          <div className={styles.title}>輸入你的車頭名稱</div>
          <div className={styles.sub}>ENTER YOUR CALLSIGN</div>

          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：CocoMelon"
            maxLength={20}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />

          <Button variant="primary" onClick={submit} disabled={disabled} block>
            → {t('entry.enter_room')}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
