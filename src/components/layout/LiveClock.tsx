import React, { useEffect, useState } from 'react';

const dateFmt = new Intl.DateTimeFormat('es-CL', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const timeFmt = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

/**
 * Live date + time (client machine clock), refreshed every second so it always
 * shows real time. Tabular figures keep the width from jittering.
 */
export const LiveClock: React.FC<{ className?: string; withDate?: boolean }> = ({
  className = '',
  withDate = true
}) => {
  const [now, setNow] = useState(() => new Date());

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
