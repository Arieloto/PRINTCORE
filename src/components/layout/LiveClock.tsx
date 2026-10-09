import React, { useEffect, useMemo, useState } from 'react';

/**
 * Live date + time (client machine clock), refreshed every second so it always
 * shows real time. Tabular figures keep the width from jittering. `locale`
 * follows the workshop configuration so dates match the selected country.
 */
export const LiveClock: React.FC<{ className?: string; withDate?: boolean; locale?: string }> = ({
  className = '',
  withDate = true,
  locale
}) => {
  const [now, setNow] = useState(() => new Date());

  const { dateFmt, timeFmt } = useMemo(() => ({
    dateFmt: new Intl.DateTimeFormat(locale || undefined, {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }),
    timeFmt: new Intl.DateTimeFormat(locale || undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }), [locale]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span
      className={`tabular-nums whitespace-nowrap ${className}`}
      title={`Fecha y hora actuales (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}
    >
      {withDate && <span className="hidden xl:inline">{dateFmt.format(now)} · </span>}
      {timeFmt.format(now)}
    </span>
  );
};
