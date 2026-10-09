import { BusinessSettings, MaterialType, FinishingType, PaintingLevel, UrgencyLevel } from '../types';
import { formatMoney } from './currency';

export interface Parsed3DIntent {
  materialType?: MaterialType;
  spoolWeightGrams?: number;
  spoolPriceCLP?: number;
  partWeightGrams?: number;
  supportWeightGrams?: number;
  printHours?: number;
  quantity?: number;
  isMulticolor?: boolean;
  colorCount?: number;
  purgeGrams?: number;
  designHours?: number;
  finishingType?: FinishingType;
  paintingLevel?: PaintingLevel;
  urgency?: UrgencyLevel;
  rawMatchedTokens: string[];
}

export function parseNatural3DText(text: string, settings?: BusinessSettings): Parsed3DIntent {
  const result: Parsed3DIntent = {
    rawMatchedTokens: []
  };

  const lower = text.toLowerCase();

  // 1. Material Type
  if (lower.includes('pla+')) {
    result.materialType = 'PLA+';
    result.rawMatchedTokens.push('Material: PLA+');
  } else if (lower.includes('pla')) {
    result.materialType = 'PLA';
    result.rawMatchedTokens.push('Material: PLA');
  } else if (lower.includes('petg')) {
    result.materialType = 'PETG';
    result.rawMatchedTokens.push('Material: PETG');
  } else if (lower.includes('abs')) {
    result.materialType = 'ABS';
    result.rawMatchedTokens.push('Material: ABS');
  } else if (lower.includes('asa')) {
    result.materialType = 'ASA';
    result.rawMatchedTokens.push('Material: ASA');
  } else if (lower.includes('tpu') || lower.includes('flex')) {
    result.materialType = 'TPU';
    result.rawMatchedTokens.push('Material: TPU');
  } else if (lower.includes('resina') || lower.includes('resin')) {
    result.materialType = 'Resina';
    result.rawMatchedTokens.push('Material: Resina');
  } else if (lower.includes('nylon')) {
    result.materialType = 'Nylon';
    result.rawMatchedTokens.push('Material: Nylon');
  }

  // 2. Spool Weight (Bobina)
  // "1 kilo", "1 kg", "1kg", "1000g", "750g", "500g", "bobina de 1 kilo"
  const spoolKgMatch = lower.match(/bobina\s*(?:de\s+)?(?:filamento\s+)?(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:kilo|kg)/i) || 
                       lower.match(/(\d+(?:[.,]\d+)?)\s*(?:kilo|kg)/i);
  if (spoolKgMatch) {
    const val = parseFloat(spoolKgMatch[1].replace(',', '.'));
    result.spoolWeightGrams = Math.round(val * 1000);
    result.rawMatchedTokens.push(`Bobina: ${result.spoolWeightGrams}g (${val} kg)`);
  } else {
    const spoolGramsMatch = lower.match(/bobina\s*(?:de\s+)?(?:filamento\s+)?(?:de\s+)?(\d+)\s*(?:gramos|gr|g)\b/i);
    if (spoolGramsMatch) {
      result.spoolWeightGrams = parseInt(spoolGramsMatch[1], 10);
      result.rawMatchedTokens.push(`Bobina: ${result.spoolWeightGrams}g`);
    }
  }

  // 3. Spool Price
  // "18 mil", "18.000", "$18000", "costó 18 mil", "20 mil quinientos"
  const priceMilMatch = lower.match(/(?:cost[oó]|precio|valor|valió)?\s*\$?(\d+(?:[.,]\d+)?)\s*mil(?: quinientos)?/i);
  if (priceMilMatch) {
    const baseMil = parseFloat(priceMilMatch[1].replace(',', '.'));
    let total = Math.round(baseMil * 1000);
    if (priceMilMatch[0].includes('quinientos')) {
      total += 500;
    }
    result.spoolPriceCLP = total;
    result.rawMatchedTokens.push(`Precio Bobina: ${formatMoney(total, settings)}`);
  } else {
    const priceDirectMatch = lower.match(/(?:bobina|filamento).*?\$?\s*([1-9]\d{1,2}(?:\.\d{3})|\d{4,6})\b/i) ||
                             lower.match(/cost[oó]\s*\$?([1-9]\d{1,2}(?:\.\d{3})|\d{4,6})\b/i);
    if (priceDirectMatch) {
      const cleanNum = parseInt(priceDirectMatch[1].replace(/\./g, ''), 10);
      if (cleanNum >= 5000 && cleanNum <= 200000) {
        result.spoolPriceCLP = cleanNum;
        result.rawMatchedTokens.push(`Precio Bobina: ${formatMoney(cleanNum, settings)}`);
      }
    }
  }

  // 4. Part Weight (Pieza / gramos)
  // "la pieza pesa 120 gramos", "120g", "120 gramos", "peso 85g"
  const partMatch = lower.match(/(?:pieza|modelo|impresi[oó]n|objeto|peso).*?(\d+(?:[.,]\d+)?)\s*(?:gramos|gr|g)\b/i) ||
                    lower.match(/(\d+(?:[.,]\d+)?)\s*(?:gramos|gr|g)\b/i);
  if (partMatch) {
    const grams = parseFloat(partMatch[1].replace(',', '.'));
    // Make sure we didn't pick up the spool weight if it was 1000g
    if (grams < 900 || !result.spoolWeightGrams) {
      result.partWeightGrams = Math.round(grams);
      result.rawMatchedTokens.push(`Peso pieza: ${result.partWeightGrams}g`);
    }
  }

  // 5. Support Weight
  const supportMatch = lower.match(/soporte[s]?.*?(\d+(?:[.,]\d+)?)\s*(?:gramos|gr|g)\b/i);
  if (supportMatch) {
    result.supportWeightGrams = Math.round(parseFloat(supportMatch[1].replace(',', '.')));
    result.rawMatchedTokens.push(`Soportes: ${result.supportWeightGrams}g`);
  }

  // 6. Print Time (Tiempo de impresión)
  // "demora 6 horas", "6 horas y media", "6h 20m", "45 minutos", "6 horas"
  const hoursMinutesMatch = lower.match(/(\d+)\s*(?:h|horas?)\s*(?:y\s*)?(\d+)\s*(?:m|min|minutos?)/i);
  if (hoursMinutesMatch) {
    const h = parseInt(hoursMinutesMatch[1], 10);
    const m = parseInt(hoursMinutesMatch[2], 10);
    result.printHours = Number((h + m / 60).toFixed(2));
    result.rawMatchedTokens.push(`Tiempo: ${h}h ${m}m (${result.printHours} hrs)`);
  } else {
    const halfHourMatch = lower.match(/(\d+)\s*(?:horas?|h)\s*y\s*media/i);
    if (halfHourMatch) {
      const h = parseInt(halfHourMatch[1], 10);
      result.printHours = h + 0.5;
      result.rawMatchedTokens.push(`Tiempo: ${result.printHours} hrs`);
    } else {
      const hoursOnlyMatch = lower.match(/(?:demora|tarda|tiempo|dura)?\s*(\d+(?:[.,]\d+)?)\s*(?:h|horas?)\b/i);
      if (hoursOnlyMatch) {
        result.printHours = parseFloat(hoursOnlyMatch[1].replace(',', '.'));
        result.rawMatchedTokens.push(`Tiempo: ${result.printHours} hrs`);
      } else {
        const minutesOnlyMatch = lower.match(/(\d+)\s*(?:min|minutos?)\b/i);
        if (minutesOnlyMatch) {
          const m = parseInt(minutesOnlyMatch[1], 10);
          result.printHours = Number((m / 60).toFixed(2));
          result.rawMatchedTokens.push(`Tiempo: ${m} min (${result.printHours} hrs)`);
        }
      }
    }
  }

  // 7. Quantity
  const qtyMatch = lower.match(/(\d+)\s*(?:piezas?|unidades?|copias?|items?|unid)\b/i);
  if (qtyMatch) {
    result.quantity = parseInt(qtyMatch[1], 10);
    result.rawMatchedTokens.push(`Cantidad: ${result.quantity} piezas`);
  }

  // 8. Multicolor
  if (lower.includes('multicolor') || lower.includes('ams') || lower.includes('mmu')) {
    result.isMulticolor = true;
    const colorsMatch = lower.match(/(\d+)\s*colores/i);
    result.colorCount = colorsMatch ? parseInt(colorsMatch[1], 10) : 2;
    result.rawMatchedTokens.push(`Multicolor: ${result.colorCount} colores`);
  }

  // Purge grams
  const purgeMatch = lower.match(/purga[s]?.*?(\d+)\s*(?:gramos|gr|g)\b/i);
  if (purgeMatch) {
    result.purgeGrams = parseInt(purgeMatch[1], 10);
    result.rawMatchedTokens.push(`Purgas: ${result.purgeGrams}g`);
  }

  // 9. Finishing & Painting
  if (lower.includes('primer') || lower.includes('masill') || lower.includes('imprim')) {
    result.finishingType = 'sanding_primer';
    result.rawMatchedTokens.push('Acabado: Lijado e Imprimación');
  } else if (lower.includes('lijad') || lower.includes('lija')) {
    result.finishingType = 'sanding';
    result.rawMatchedTokens.push('Acabado: Lijado');
  }

  if (lower.includes('pintad') || lower.includes('pintura') || lower.includes('aerograf')) {
    if (lower.includes('detall') || lower.includes('colecc')) {
      result.paintingLevel = 'detailed';
      result.rawMatchedTokens.push('Pintura: Detallada');
    } else {
      result.paintingLevel = 'basic';
      result.rawMatchedTokens.push('Pintura: Básica');
    }
  }

  // 10. Urgency
  if (lower.includes('urgente') || lower.includes('para ayer') || lower.includes('hoy mismo')) {
    result.urgency = 'urgent';
    result.rawMatchedTokens.push('Prioridad: Urgente');
  } else if (lower.includes('priorit') || lower.includes('rápido') || lower.includes('rapido')) {
    result.urgency = 'priority';
    result.rawMatchedTokens.push('Prioridad: Prioritaria');
  }

  return result;
}

export function parseNaturalAmount(text: string): number | null {
  const clean = text.trim().toLowerCase();
  
  // Local slang / expressions understood by the parser
  const milMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*mil$/);
  if (milMatch) {
    return Math.round(parseFloat(milMatch[1].replace(',', '.')) * 1000);
  }

  const kMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*k$/);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);
  }

  // Pure numbers with dots or commas: "$18.000", "18000"
  const digits = clean.replace(/[^0-9]/g, '');
  if (digits.length > 0) {
    return parseInt(digits, 10);
  }

  return null;
}
