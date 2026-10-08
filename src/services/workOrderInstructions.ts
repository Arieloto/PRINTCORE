import type { FinishingType, PaintingLevel, Quote } from '../types';

export interface WorkOrderInstructions {
  finishing: string;
  painting?: string;
  assembly: string;
}

const FINISHING_LABELS: Record<FinishingType, string> = {
  none: 'sin acabado adicional',
  basic_cleaning: 'limpieza básica y retiro de soportes',
  sanding: 'lijado progresivo',
  sanding_primer: 'lijado e imprimación',
  premium_finishing: 'acabado premium'
};

const PAINTING_LABELS: Record<PaintingLevel, string> = {
  none: 'sin pintura',
  basic: 'pintura básica monocolor',
  intermediate: 'pintura intermedia',
  detailed: 'pintura detallada multicapa',
  collector: 'pintura de nivel coleccionista'
};

export function buildWorkOrderInstructions(quote: Quote): WorkOrderInstructions {
  const input = quote.costInput;
  const hasSupports = quote.supportWeightGrams > 0;
  const finishing = input?.finishingType ?? (hasSupports ? 'basic_cleaning' : 'none');
  const finishingLabel = FINISHING_LABELS[finishing];
  const finishingSteps =
    finishing === 'none'
      ? 'Mantener la superficie según sale de impresión; retirar únicamente rebabas sueltas si las hubiera.'
      : [
          hasSupports ? 'Retirar los soportes sin marcar las superficies funcionales.' : null,
          finishing === 'sanding' || finishing === 'sanding_primer' || finishing === 'premium_finishing'
            ? 'Lijar de forma uniforme y comprobar que no se pierdan aristas, encajes ni cotas.'
            : 'Eliminar rebabas y restos de adhesión sin alterar las dimensiones.',
          finishing === 'sanding_primer' ? 'Aplicar imprimación uniforme y dejar secar antes de continuar.' : null,
          finishing === 'premium_finishing' ? 'Completar el acabado acordado y revisar la uniformidad de la superficie.' : null,
          'Limpiar la pieza y dejarla completamente seca antes del control final.'
        ]
          .filter(Boolean)
          .join(' ');

  const paintingLevel = input?.paintingLevel ?? 'none';
  const paintingIncluded = quote.commercialItems.some((item) =>
    item.concept.toLocaleLowerCase('es').includes('pintura')
  );
  const painting =
    paintingLevel === 'none' && !paintingIncluded
      ? undefined
      : `Pintura solicitada: ${paintingLevel === 'none' ? 'según el alcance cotizado' : PAINTING_LABELS[paintingLevel]}. Preparar la superficie según el acabado cotizado, aplicar capas uniformes y respetar los tiempos de secado entre capas. Confirmar con el cliente el color y brillo antes de pintar; el color del filamento no define el color de pintura. Revisar cobertura, adherencia y terminación antes de embalar.`;

  const hardwareIncluded = (input?.assemblyHardwareCostCLP ?? 0) > 0;
  const assemblyIncluded = quote.commercialItems.some((item) =>
    item.concept.toLocaleLowerCase('es').includes('ensamblaje')
  );
  const assembly =
    (input?.assemblyMinutes ?? 0) <= 0 && !hardwareIncluded && !assemblyIncluded
      ? 'No se cotizó montaje de componentes. Mantener las piezas separadas y no agregar insertos, tornillos, adhesivos ni otros herrajes sin confirmación.'
      : `Montaje solicitado para ${quote.projectName}: seguir el diseño y las indicaciones aprobadas por el cliente. Presentar las piezas en seco, confirmar orientación y ajuste antes de fijarlas. ${
          hardwareIncluded
            ? 'Instalar únicamente los herrajes incluidos en la cotización; confirmar tipo, medida y cantidad con el diseño. Para insertos termofijados, consultar la ficha del inserto y del material, ajustar la herramienta a sus especificaciones y hacer una prueba en una pieza equivalente. No asumir una medida de rosca ni una temperatura universal.'
            : 'Usar solo los componentes incluidos en el diseño aprobado; confirmar cualquier herraje adicional antes de instalarlo.'
        } Verificar el movimiento, alineación y sujeción del conjunto terminado.`;

  return {
    finishing: `Acabado cotizado: ${finishingLabel}. ${finishingSteps}`,
    painting,
    assembly
  };
}

export function isLegacyInsertInstruction(value?: string): boolean {
  return Boolean(
    value &&
      (value.includes('punta cónica a 220°C') ||
        value.includes('punta cónica a 220 °C') ||
        value.includes('Comprobar rosca M3 con perno guía'))
  );
}
