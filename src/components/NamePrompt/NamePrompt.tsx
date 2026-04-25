import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { Panel } from '@/components/Panel/Panel';

import type { ParticipantType } from '@/types/room';

import styles from './NamePrompt.module.scss';

interface NamePromptProps {
  initialName?: string;
  initialType?: ParticipantType;
  onSubmit: (name: string, type: ParticipantType) => void;
  pin: string;
}

export function NamePrompt({
  initialName = '',
  initialType = 'driver',
  onSubmit,
  pin,
}: NamePromptProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<ParticipantType>(initialType);

  const disabled = name.trim().length === 0;

  const submit = () => {
    if (disabled) return;
    onSubmit(name.trim().slice(0, 20), type);
  };

  return (
    <div className={styles.wrap}>
      <Panel label="IDENTIFY" labelRight={`PIN · ${pin}`}>
        <div className={styles.inner}>
          <div className={styles.title}>{t('entry.enter_name_title')}</div>
          <div className={styles.sub}>{t('entry.enter_name_sub')}</div>

          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('entry.name_placeholder')}
            maxLength={20}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />

          <div className={styles.typeRow}>
            <button
              type="button"
              className={`${styles.typeBtn} ${type === 'driver' ? styles.typeBtnOn : ''}`}
              onClick={() => setType('driver')}
            >
              {t('entry.type_driver')}
              <span className={styles.typeHint}>
                {t('entry.type_driver_hint')}
              </span>
            </button>
            <button
              type="button"
              className={`${styles.typeBtn} ${type === 'passenger' ? styles.typeBtnOn : ''}`}
              onClick={() => setType('passenger')}
            >
              {t('entry.type_passenger')}
              <span className={styles.typeHint}>
                {t('entry.type_passenger_hint')}
              </span>
            </button>
          </div>

          <Button variant="primary" onClick={submit} disabled={disabled} block>
            → {t('entry.enter_room')}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
