import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button/Button';
import { LangSwitch } from '@/components/LangSwitch/LangSwitch';
import { Panel } from '@/components/Panel/Panel';
import { PinInput } from '@/components/PinInput/PinInput';
import { UtcClock } from '@/components/UtcClock/UtcClock';

import styles from './EntryPage.module.scss';

const PIN_LENGTH = 8;

function generatePin(): string {
  // 8 位數字，前位不為 0
  const first = Math.floor(Math.random() * 9) + 1;
  const rest = Array.from({ length: PIN_LENGTH - 1 }, () =>
    Math.floor(Math.random() * 10)
  );
  return String(first) + rest.join('');
}

export function EntryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRandom = () => {
    setPin(generatePin());
    setError(null);
  };

  const handleEnter = () => {
    if (pin.length !== PIN_LENGTH || !/^\d+$/.test(pin)) {
      setError(t('entry.pin_invalid'));
      return;
    }
    navigate(`/room/${pin}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.langRow}>
        <LangSwitch />
      </div>

      <Panel label="GATE · 00" labelRight="UTC // T-0" className={styles.panel}>
        <div className={styles.inner}>
          <div className={styles.brand}>
            <div className={styles.kicker}>{t('brand.kicker')}</div>
            <h1 className={styles.title}>{t('brand.title')}</h1>
            <div className={styles.subtitle}>{t('brand.subtitle')}</div>
          </div>

          <UtcClock size="lg" />

          <div className={styles.sub}>{t('brand.desc')}</div>

          <div className={styles.pinBlock}>
            <div className={styles.pinLabel}>◆ {t('entry.pin_label')} ◆</div>
            <PinInput
              length={PIN_LENGTH}
              value={pin}
              onChange={(v) => {
                setPin(v);
                setError(null);
              }}
              onComplete={() => setError(null)}
            />
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.btns}>
              <Button variant="ghost" block onClick={handleRandom}>
                {t('entry.random')}
              </Button>
              <Button variant="primary" block onClick={handleEnter}>
                {t('entry.enter_room')} →
              </Button>
            </div>

            <div className={styles.hint}>› {t('entry.hint')}</div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
