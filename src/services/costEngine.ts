import {
  BusinessSettings,
  Printer,
  Material,
  CostCalculationInput,
  CostBreakdown,
  CommercialItem,
  DetailedCostItem
} from '../types';
import { formatMoney, formatRate } from './currency';

export function calculate3DCost(
  input: CostCalculationInput,
  printer: Printer,
  material: Material,
  settings: BusinessSettings
): { breakdown: CostBreakdown; commercialItems: CommercialItem[] } {
  const auditTrail: DetailedCostItem[] = [];

  // 1. Labor Rate Calculation (Hora Hombre)
  const billableHours = Math.max(1, settings.monthlyBillableHours || 120);
  const laborHourlyRateCLP = Math.round(
    input.customHourlyLaborRateCLP ?? (settings.monthlyTargetSalaryCLP / billableHours)
  );
  const dailyAverageRateCLP = Math.round(settings.monthlyTargetSalaryCLP / 30);

  auditTrail.push({
    id: 'labor_rate',
    category: 'Mano de Obra',
    name: 'Tarifa Hora Hombre',
    formulaDescription: `Valor diario promedio (${formatMoney(dailyAverageRateCLP, settings)} = sueldo mensual ${formatMoney(settings.monthlyTargetSalaryCLP, settings)} / 30 días) · Tarifa hora = sueldo / ${billableHours} hrs productivas consideradas`,
    quantityUnits: '1 hora',
    unitRateCLP: laborHourlyRateCLP,
    totalCostCLP: laborHourlyRateCLP,
    source: input.customHourlyLaborRateCLP ? 'manual' : 'configuration'
  });

  // 2. Material Cost Calculations
  const costPerGram = material.spoolWeightGrams > 0 
    ? material.spoolPriceCLP / material.spoolWeightGrams 
    : 18.99;

  const partWeight = Math.max(0, input.partWeightGrams || 0);
  const supportWeight = Math.max(0, input.supportWeightGrams || 0);
  const purgeWeight = input.isMulticolor 
    ? Math.max(0, (input.purgeGrams || 0) + (input.purgeTowerGrams || 0)) 
    : 0;

  const materialPartCostCLP = Math.round(partWeight * costPerGram);
  const materialSupportCostCLP = Math.round(supportWeight * costPerGram);
  const materialPurgeCostCLP = Math.round(purgeWeight * costPerGram);

  // Waste scrap factor (desperdicio de material básico)
  const scrapPercent = input.scrapPercent ?? 3; // 3% normal scrap
  const baseMaterialWeight = partWeight + supportWeight + purgeWeight;
  const baseMaterialCost = materialPartCostCLP + materialSupportCostCLP + materialPurgeCostCLP;
  const materialWasteCostCLP = Math.round(baseMaterialCost * (scrapPercent / 100));

  const totalMaterialCostCLP = baseMaterialCost + materialWasteCostCLP;
  const totalMaterialGrams = baseMaterialWeight * (1 + scrapPercent / 100);

  auditTrail.push({
    id: 'material_part',
    category: 'Material',
    name: `Material de pieza (${material.name})`,
    formulaDescription: `${partWeight} g × ${formatRate(costPerGram, settings)}/g (Bobina ${material.spoolWeightGrams}g a ${formatMoney(material.spoolPriceCLP, settings)})`,
    quantityUnits: `${partWeight} g`,
    unitRateCLP: costPerGram,
    totalCostCLP: materialPartCostCLP,
    source: 'material_catalog'
  });

  if (supportWeight > 0) {
    auditTrail.push({
      id: 'material_supports',
      category: 'Material',
      name: 'Material de soportes',
      formulaDescription: `${supportWeight} g × ${formatRate(costPerGram, settings)}/g`,
      quantityUnits: `${supportWeight} g`,
      unitRateCLP: costPerGram,
      totalCostCLP: materialSupportCostCLP,
      source: 'slicer'
    });
  }

  if (purgeWeight > 0) {
    auditTrail.push({
      id: 'material_purges',
      category: 'Material',
      name: 'Material de purgas y torre multicolor',
      formulaDescription: `${purgeWeight} g × ${formatRate(costPerGram, settings)}/g (${input.colorCount || 2} colores)`,
      quantityUnits: `${purgeWeight} g`,
      unitRateCLP: costPerGram,
      totalCostCLP: materialPurgeCostCLP,
      source: 'slicer'
    });
  }

  auditTrail.push({
    id: 'material_waste',
    category: 'Material',
    name: 'Desperdicio técnico de filamento',
    formulaDescription: `${scrapPercent}% de margen de mermas sobre material directo`,
    quantityUnits: `${scrapPercent}%`,
    unitRateCLP: baseMaterialCost,
    totalCostCLP: materialWasteCostCLP,
    source: 'calculated'
  });

  // 3. Machine Print Costs & Electricity
  const printHours = Math.max(0.1, input.printHours || 0);

  // Machine recovery per hour: Investment / Months / Monthly Hours
  const recoveryMonths = Math.max(1, settings.targetInvestmentRecoveryMonths || 12);
  const monthlyMachineHours = Math.max(1, printer.targetMonthlyHours || 160);
  const monthlyRecoveryCLP = printer.totalInvestmentCLP / recoveryMonths;
  const machineRecoveryPerHourCLP = input.customMachineHourlyRateCLP !== undefined && input.customMachineHourlyRateCLP > 0
    ? input.customMachineHourlyRateCLP
    : (monthlyRecoveryCLP / monthlyMachineHours);
  const machineRecoveryCostCLP = Math.round(machineRecoveryPerHourCLP * printHours);

  // Maintenance cost per hour: (Investment * maintenance%) / (Useful life or Annual hours)
  const maintenanceAnnualRate = (printer.maintenancePercent || settings.defaultMaintenancePercent || 10) / 100;
  const usefulHours = printer.estimatedUsefulHours || (monthlyMachineHours * 12);
  const maintenancePerHourCLP = (printer.totalInvestmentCLP * maintenanceAnnualRate) / usefulHours;
  const maintenanceCostCLP = Math.round(maintenancePerHourCLP * printHours);

  // Repair reserve
  const repairReservePerHourCLP = printer.repairReservePerHourCLP || settings.defaultRepairReservePerHourCLP || 250;
  const repairReserveCostCLP = Math.round(repairReservePerHourCLP * printHours);

  // Electricity: (Watts / 1000) * hours * kWh price
  const kwhRate = input.customElectricityKwhCLP ?? settings.kwhPriceCLP ?? 210;
  const kwhConsumed = (printer.averageWatts / 1000) * printHours;
  const electricityCostCLP = Math.round(kwhConsumed * kwhRate);

  const machineHourlyRateCLP = Math.round(machineRecoveryPerHourCLP + maintenancePerHourCLP + repairReservePerHourCLP);
  const totalMachineCostCLP = machineRecoveryCostCLP + maintenanceCostCLP + repairReserveCostCLP + electricityCostCLP;

  auditTrail.push({
    id: 'machine_recovery',
    category: 'Máquina',
    name: `Depreciación y recuperación (${printer.name})`,
    formulaDescription: `Inversión ${formatMoney(printer.totalInvestmentCLP, settings)} / ${recoveryMonths} meses / ${monthlyMachineHours} hrs/mes = ${formatRate(Math.round(machineRecoveryPerHourCLP), settings)}/hr × ${printHours} hrs`,
    quantityUnits: `${printHours} hrs`,
    unitRateCLP: machineRecoveryPerHourCLP,
    totalCostCLP: machineRecoveryCostCLP,
    source: 'printer_catalog'
  });

  auditTrail.push({
    id: 'machine_electricity',
    category: 'Máquina',
    name: 'Consumo Eléctrico',
    formulaDescription: `(${printer.averageWatts}W / 1000) × ${printHours} hrs × ${formatRate(kwhRate, settings)}/kWh = ${kwhConsumed.toFixed(2)} kWh`,
    quantityUnits: `${kwhConsumed.toFixed(2)} kWh`,
    unitRateCLP: kwhRate,
    totalCostCLP: electricityCostCLP,
    source: 'calculated'
  });

  auditTrail.push({
    id: 'machine_maintenance',
    category: 'Máquina',
    name: 'Mantenimiento preventivo de máquina',
    formulaDescription: `${formatRate(Math.round(maintenancePerHourCLP), settings)}/hr (${(maintenanceAnnualRate * 100).toFixed(0)}% anual) × ${printHours} hrs`,
    quantityUnits: `${printHours} hrs`,
    unitRateCLP: maintenancePerHourCLP,
    totalCostCLP: maintenanceCostCLP,
    source: 'printer_catalog'
  });

  auditTrail.push({
    id: 'machine_repair',
    category: 'Máquina',
    name: 'Reserva para repuestos y fallas de hardware',
    formulaDescription: `${formatRate(repairReservePerHourCLP, settings)}/hr × ${printHours} hrs`,
    quantityUnits: `${printHours} hrs`,
    unitRateCLP: repairReservePerHourCLP,
    totalCostCLP: repairReserveCostCLP,
    source: 'configuration'
  });

  // 4. Labor Costs (Time * Rate)
  const designMinutes = input.designMinutes !== undefined
    ? Math.max(0, input.designMinutes)
    : (input.designHours ? Math.max(0, input.designHours * 60) : 0);
  const designHours = Number((designMinutes / 60).toFixed(2));
  const designLaborCostCLP = Math.round((designMinutes / 60) * laborHourlyRateCLP);

  const prepMinutes = Math.max(0, input.prepManufacturingMinutes || 0);
  const preparationLaborCostCLP = Math.round((prepMinutes / 60) * laborHourlyRateCLP);

  const postProcMinutes = Math.max(0, input.postProcessingMinutes || 0);
  const postProcessingLaborCostCLP = Math.round((postProcMinutes / 60) * laborHourlyRateCLP);

  const finishingMinutes = Math.max(0, input.finishingMinutes || 0);
  const finishingLaborCostCLP = Math.round((finishingMinutes / 60) * laborHourlyRateCLP);

  const paintingMinutes = Math.max(0, input.paintingMinutes || 0);
  const paintingLaborCostCLP = Math.round((paintingMinutes / 60) * laborHourlyRateCLP);

  const assemblyMinutes = Math.max(0, input.assemblyMinutes || 0);
  const assemblyLaborCostCLP = Math.round((assemblyMinutes / 60) * laborHourlyRateCLP);

  const qcMinutes = Math.max(0, input.qualityControlMinutes || 0);
  const qualityControlLaborCostCLP = Math.round((qcMinutes / 60) * laborHourlyRateCLP);

  const totalLaborHours = Number(
    (designHours + (prepMinutes + postProcMinutes + finishingMinutes + paintingMinutes + assemblyMinutes + qcMinutes) / 60).toFixed(2)
  );
  const totalLaborCostCLP = designLaborCostCLP + preparationLaborCostCLP + postProcessingLaborCostCLP +
    finishingLaborCostCLP + paintingLaborCostCLP + assemblyLaborCostCLP + qualityControlLaborCostCLP;

  if (designMinutes > 0) {
    auditTrail.push({
      id: 'labor_design',
      category: 'Mano de Obra',
      name: 'Diseño, modelado y optimización CAD 3D',
      formulaDescription: `${designMinutes} min (${designHours} hrs) × ${formatRate(laborHourlyRateCLP, settings)}/hr`,
      quantityUnits: `${designMinutes} min`,
      unitRateCLP: laborHourlyRateCLP,
      totalCostCLP: designLaborCostCLP,
      source: 'manual'
    });
  }

  if (prepMinutes > 0) {
    auditTrail.push({
      id: 'labor_prep',
      category: 'Mano de Obra',
      name: 'Preparación para fabricación y Slicing',
      formulaDescription: `${prepMinutes} min (${(prepMinutes/60).toFixed(2)} hrs) × ${formatRate(laborHourlyRateCLP, settings)}/hr`,
      quantityUnits: `${prepMinutes} min`,
      unitRateCLP: laborHourlyRateCLP,
      totalCostCLP: preparationLaborCostCLP,
      source: 'manual'
    });
  }

  if (postProcMinutes > 0) {
    auditTrail.push({
      id: 'labor_post',
      category: 'Mano de Obra',
      name: 'Retiro de soportes y limpieza',
      formulaDescription: `${postProcMinutes} min × ${formatRate(laborHourlyRateCLP, settings)}/hr`,
      quantityUnits: `${postProcMinutes} min`,
      unitRateCLP: laborHourlyRateCLP,
      totalCostCLP: postProcessingLaborCostCLP,
      source: 'manual'
    });
  }

  if (finishingMinutes > 0) {
    auditTrail.push({
      id: 'labor_finishing',
      category: 'Mano de Obra',
      name: 'Acabado, lijado e imprimación',
      formulaDescription: `${finishingMinutes} min × ${formatRate(laborHourlyRateCLP, settings)}/hr`,
      quantityUnits: `${finishingMinutes} min`,
      unitRateCLP: laborHourlyRateCLP,
      totalCostCLP: finishingLaborCostCLP,
      source: 'manual'
    });
  }

  if (paintingMinutes > 0) {
    auditTrail.push({
      id: 'labor_painting',
      category: 'Mano de Obra',
      name: 'Pintura (mano de obra)',
      formulaDescription: `${paintingMinutes} min × ${formatRate(laborHourlyRateCLP, settings)}/hr`,
      quantityUnits: `${paintingMinutes} min`,
      unitRateCLP: laborHourlyRateCLP,
      totalCostCLP: paintingLaborCostCLP,
      source: 'manual'
    });
  }

  if (assemblyMinutes > 0) {
    auditTrail.push({
      id: 'labor_assembly',
      category: 'Mano de Obra',
      name: 'Ensamblaje, herrajes e insertos',
      formulaDescription: `${assemblyMinutes} min × ${formatRate(laborHourlyRateCLP, settings)}/hr`,
      quantityUnits: `${assemblyMinutes} min`,
      unitRateCLP: laborHourlyRateCLP,
      totalCostCLP: assemblyLaborCostCLP,
      source: 'manual'
    });
  }

  if (qcMinutes > 0) {
    auditTrail.push({
      id: 'labor_qc',
      category: 'Mano de Obra',
      name: 'Control de calidad e inspección',
      formulaDescription: `${qcMinutes} min × ${formatRate(laborHourlyRateCLP, settings)}/hr`,
      quantityUnits: `${qcMinutes} min`,
      unitRateCLP: laborHourlyRateCLP,
      totalCostCLP: qualityControlLaborCostCLP,
      source: 'manual'
    });
  }

  // 5. Direct Consumables & Supplies
  const paintingSuppliesCostCLP = Math.max(0, input.paintingSuppliesCostCLP || 0);
  const assemblyHardwareCostCLP = Math.max(0, input.assemblyHardwareCostCLP || 0);
  const packagingSuppliesCostCLP = Math.max(0, input.packagingSuppliesCostCLP || 0);
  const totalSuppliesCostCLP = paintingSuppliesCostCLP + assemblyHardwareCostCLP + packagingSuppliesCostCLP;

  if (paintingSuppliesCostCLP > 0) {
    auditTrail.push({
      id: 'supplies_paint',
      category: 'Gastos Pintura',
      name: 'Gastos de pintura (insumos)',
      formulaDescription: 'Pinturas acrílicas, diluyentes, cinta de enmascarar, barniz protector',
      quantityUnits: '1 set',
      unitRateCLP: paintingSuppliesCostCLP,
      totalCostCLP: paintingSuppliesCostCLP,
      source: 'manual'
    });
  }

  if (assemblyHardwareCostCLP > 0) {
    auditTrail.push({
      id: 'supplies_hardware',
      category: 'Insumos',
      name: 'Tornillería, insertos roscados e imanes',
      formulaDescription: 'Componentes mecánicos de ensamble',
      quantityUnits: '1 set',
      unitRateCLP: assemblyHardwareCostCLP,
      totalCostCLP: assemblyHardwareCostCLP,
      source: 'manual'
    });
  }

  if (packagingSuppliesCostCLP > 0) {
    auditTrail.push({
      id: 'supplies_packaging',
      category: 'Insumos',
      name: 'Embalaje y protección técnica',
      formulaDescription: 'Cajas de microcorrugado, pluriball, relleno biodegradable y etiquetas',
      quantityUnits: '1 set',
      unitRateCLP: packagingSuppliesCostCLP,
      totalCostCLP: packagingSuppliesCostCLP,
      source: 'manual'
    });
  }

  // 6. Overheads & Failure Risk
  // Overhead allocation: monthly overhead apportioned to billable hours
  const hourlyOverheadCLP = (settings.monthlyOverheadCLP || 120000) / billableHours;
  // Overheads are allocated by labor time + partial machine footprint
  const overheadAllocationCostCLP = Math.round(hourlyOverheadCLP * (totalLaborHours + printHours * 0.15));

  auditTrail.push({
    id: 'overhead',
    category: 'Gastos Generales',
    name: 'Asignación de gastos generales de taller',
    formulaDescription: `Gastos fijos (${formatMoney(settings.monthlyOverheadCLP, settings)}/mes) prorrateados en tiempo productivo`,
    quantityUnits: 'Proporcional',
    unitRateCLP: hourlyOverheadCLP,
    totalCostCLP: overheadAllocationCostCLP,
    source: 'calculated'
  });

  // Failure risk: print fails happen!
  const failureRate = (input.failureRatePercent ?? settings.defaultFailureRatePercent ?? 8) / 100;
  const printDirectRiskBase = totalMaterialCostCLP + totalMachineCostCLP;
  const failureRiskCostCLP = Math.round(printDirectRiskBase * failureRate);

  auditTrail.push({
    id: 'failure_risk',
    category: 'Riesgo y Fallas',
    name: 'Reserva por tasa de fallos de impresión',
    formulaDescription: `${(failureRate * 100).toFixed(1)}% sobre costos directos de impresión (1 de cada ${(1/failureRate).toFixed(0)} piezas sufre fallo)`,
    quantityUnits: `${(failureRate * 100).toFixed(0)}%`,
    unitRateCLP: printDirectRiskBase,
    totalCostCLP: failureRiskCostCLP,
    source: 'configuration'
  });

  // 7. Base Unit Cost vs Batch
  const quantity = Math.max(1, input.quantity || 1);

  // Distinguish fixed one-time costs vs variable per-unit costs:
  // Fixed costs: Initial design, initial Slicing/prep
  const fixedJobCostCLP = designLaborCostCLP + preparationLaborCostCLP;
  
  // Variable cost per piece:
  // Material + Machine + Post-processing + Finishing + Painting + Assembly + QC + Supplies + Risk
  const variableUnitCostCLP = totalMaterialCostCLP + totalMachineCostCLP + 
    postProcessingLaborCostCLP + finishingLaborCostCLP + paintingLaborCostCLP + 
    assemblyLaborCostCLP + qualityControlLaborCostCLP + totalSuppliesCostCLP + 
    overheadAllocationCostCLP + failureRiskCostCLP;

  const totalInternalCostCLP = Math.round(fixedJobCostCLP + (variableUnitCostCLP * quantity));
  const baseUnitCostCLP = Math.round(totalInternalCostCLP / quantity);

  // 8. Commercial Margin / Profit
  const profitMode = input.customProfitMode ?? settings.profitMode ?? 'margin';
  const profitPercent = input.customProfitPercent ?? settings.defaultProfitPercent ?? 35;

  let unitNetProfitCLP = 0;
  let totalNetProfitCLP = 0;
  let targetNetBeforeDiscounts = 0;

  if (profitMode === 'markup') {
    // Recargo: precio = costo * (1 + margin)
    totalNetProfitCLP = Math.round(totalInternalCostCLP * (profitPercent / 100));
    targetNetBeforeDiscounts = totalInternalCostCLP + totalNetProfitCLP;
    unitNetProfitCLP = Math.round(totalNetProfitCLP / quantity);
  } else {
    // Margen real: precio = costo / (1 - margin)
    const factor = Math.max(0.05, 1 - (profitPercent / 100));
    targetNetBeforeDiscounts = Math.round(totalInternalCostCLP / factor);
    totalNetProfitCLP = targetNetBeforeDiscounts - totalInternalCostCLP;
    unitNetProfitCLP = Math.round(totalNetProfitCLP / quantity);
  }

  auditTrail.push({
    id: 'profit_calculation',
    category: 'Rentabilidad',
    name: `Utilidad comercial (${profitMode === 'markup' ? 'Recargo' : 'Margen'} ${profitPercent}%)`,
    formulaDescription: profitMode === 'markup' 
      ? `Costo ${formatMoney(totalInternalCostCLP, settings)} × ${profitPercent}%`
      : `Costo ${formatMoney(totalInternalCostCLP, settings)} / (1 - ${(profitPercent/100).toFixed(2)})`,
    quantityUnits: `${profitPercent}%`,
    unitRateCLP: totalInternalCostCLP,
    totalCostCLP: totalNetProfitCLP,
    source: 'configuration'
  });

  // 9. Urgency Surcharges & Volume Discounts
  let urgencySurchargeCLP = 0;
  if (input.urgency === 'priority') {
    urgencySurchargeCLP = Math.round(targetNetBeforeDiscounts * 0.15); // +15%
  } else if (input.urgency === 'urgent') {
    urgencySurchargeCLP = Math.round(targetNetBeforeDiscounts * 0.30); // +30%
  }

  // Volume discount tiers
  let volumeDiscountPercent = 0;
  if (input.customDiscountPercent !== undefined && input.customDiscountPercent > 0) {
    volumeDiscountPercent = input.customDiscountPercent;
  } else if (quantity >= 50) {
    volumeDiscountPercent = 20;
  } else if (quantity >= 25) {
    volumeDiscountPercent = 15;
  } else if (quantity >= 10) {
    volumeDiscountPercent = 10;
  } else if (quantity >= 5) {
    volumeDiscountPercent = 5;
  }

  const volumeDiscountCLP = Math.round((targetNetBeforeDiscounts + urgencySurchargeCLP) * (volumeDiscountPercent / 100));
  let calculatedSubtotalNet = (targetNetBeforeDiscounts + urgencySurchargeCLP) - volumeDiscountCLP;

  // 10. Minimum Manufacturing Price Floor
  const minFloorCLP = (settings.minManufacturingPriceCLP || 5000) * quantity;
  let isMinPriceApplied = false;
  let minPriceAdjustmentCLP = 0;

  if (calculatedSubtotalNet < minFloorCLP) {
    minPriceAdjustmentCLP = minFloorCLP - calculatedSubtotalNet;
    calculatedSubtotalNet = minFloorCLP;
    isMinPriceApplied = true;

    auditTrail.push({
      id: 'min_floor_adjustment',
      category: 'Comercial',
      name: 'Ajuste de Tarifa Mínima de Fabricación',
      formulaDescription: `El valor calculado (${formatMoney((calculatedSubtotalNet - minPriceAdjustmentCLP), settings)}) estaba bajo el costo mínimo del taller (${formatMoney(minFloorCLP, settings)})`,
      quantityUnits: `${quantity} piezas`,
      unitRateCLP: settings.minManufacturingPriceCLP,
      totalCostCLP: minPriceAdjustmentCLP,
      source: 'configuration'
    });
  }

  // 11. Sales tax & final total
  const ivaRate = settings.ivaRate ?? 0.19;
  const ivaCLP = Math.round(calculatedSubtotalNet * ivaRate);
  const finalTotalCLP = calculatedSubtotalNet + ivaCLP;

  const unitPriceNetCLP = Math.round(calculatedSubtotalNet / quantity);
  const unitPriceFinalCLP = Math.round(finalTotalCLP / quantity);

  const breakdown: CostBreakdown = {
    materialPartCostCLP,
    materialSupportCostCLP,
    materialPurgeCostCLP,
    materialWasteCostCLP,
    totalMaterialCostCLP,
    totalMaterialGrams: Math.round(totalMaterialGrams),

    machineRecoveryCostCLP,
    machineHourlyRateCLP,
    electricityCostCLP,
    maintenanceCostCLP,
    repairReserveCostCLP,
    totalMachineCostCLP,

    laborHourlyRateCLP,
    designLaborCostCLP,
    preparationLaborCostCLP,
    postProcessingLaborCostCLP,
    finishingLaborCostCLP,
    paintingLaborCostCLP,
    assemblyLaborCostCLP,
    qualityControlLaborCostCLP,
    totalLaborHours,
    totalLaborCostCLP,

    paintingSuppliesCostCLP,
    assemblyHardwareCostCLP,
    packagingSuppliesCostCLP,
    totalSuppliesCostCLP,

    overheadAllocationCostCLP,
    failureRiskCostCLP,

    baseUnitCostCLP,
    totalInternalCostCLP,

    appliedProfitPercent: profitPercent,
    profitMode,
    unitNetProfitCLP,
    totalNetProfitCLP,

    urgencySurchargeCLP,
    volumeDiscountPercent,
    volumeDiscountCLP,

    isMinPriceApplied,
    minPriceAdjustmentCLP,

    subtotalNetCLP: calculatedSubtotalNet,
    ivaRate,
    ivaCLP,
    finalTotalCLP,

    unitPriceNetCLP,
    unitPriceFinalCLP,

    auditTrail
  };

  // 12. Generate Clean Commercial Items for the Client
  // Rule: NEVER leak electricity, depreciation, internal salary or purges to client!
  const commercialItems = generateCleanCommercialItems(input, breakdown, material, quantity);

  return { breakdown, commercialItems };
}

/**
 * Etiqueta comercial de la calidad de impresión según altura de capa.
 */
function describePrintQualityLabel(layerHeightMm: number): string {
  if (layerHeightMm <= 0.08) return 'Premium (Ultra Fina)';
  if (layerHeightMm <= 0.12) return 'Alta (Fina)';
  if (layerHeightMm <= 0.17) return 'Equilibrada (Media)';
  if (layerHeightMm <= 0.24) return 'Estándar';
  return 'Prototipo (Borrador)';
}

function generateCleanCommercialItems(
  input: CostCalculationInput,
  breakdown: CostBreakdown,
  material: Material,
  quantity: number
): CommercialItem[] {
  const items: CommercialItem[] = [];
  let idCounter = 1;

  // 1. Design & 3D Modeling (if applicable)
  const effectiveDesignMinutes = input.designMinutes !== undefined
    ? input.designMinutes
    : (input.designHours ? Math.round(input.designHours * 60) : 0);

  if (effectiveDesignMinutes > 0 || (input.designHours && input.designHours > 0)) {
    const designTotal = Math.round(
      (breakdown.designLaborCostCLP * (1 + breakdown.appliedProfitPercent / 100))
    );
    const timeLabel = effectiveDesignMinutes >= 60
      ? `${(effectiveDesignMinutes / 60).toFixed(1)} hrs (${effectiveDesignMinutes} min)`
      : `${effectiveDesignMinutes} min`;

    items.push({
      id: `comm_${idCounter++}`,
      concept: 'Diseño y modelado CAD 3D',
      description: input.designType === 'scratch'
        ? `Modelado CAD 3D paramétrico (${timeLabel}) desarrollado desde especificaciones, adaptado para fabricación aditiva.`
        : `Modelado y optimización geométrica (${timeLabel}), reparación de mallas y preparación digital de archivos 3D.`,
      quantity: 1,
      unitPriceNetCLP: designTotal,
      totalNetCLP: designTotal
    });
  }

  // 2. Preparation for Manufacturing (Slicing, orientation, toolpaths)
  if (input.prepManufacturingMinutes > 0) {
    const prepTotal = Math.round(
      (breakdown.preparationLaborCostCLP * (1 + breakdown.appliedProfitPercent / 100))
    );
    items.push({
      id: `comm_${idCounter++}`,
      concept: 'Preparación para fabricación',
      description: 'Ingeniería de corte (slicing), orientación por resistencia mecánica, soportes y calibración.',
      quantity: 1,
      unitPriceNetCLP: prepTotal,
      totalNetCLP: prepTotal
    });
  }

  // 3. Core 3D Manufacturing (Material + machine + electricity + standard labor wrapped into clean unit price)
  const coreBaseCost = breakdown.totalMaterialCostCLP + breakdown.totalMachineCostCLP + 
    breakdown.failureRiskCostCLP + breakdown.overheadAllocationCostCLP;
  
  // Apportion profit to manufacturing
  const profitMultiplier = 1 + (breakdown.appliedProfitPercent / 100);
  const mfgTotal = Math.round(coreBaseCost * profitMultiplier);
  const mfgUnitPrice = Math.round(mfgTotal / quantity);

  const layerHeight = input.layerHeightMm ?? 0.2;
  const nozzleDiameter = input.nozzleDiameterMm ?? 0.4;
  const qualityLabel = describePrintQualityLabel(layerHeight);

  items.push({
    id: `comm_${idCounter++}`,
    concept: 'Fabricación 3D',
    description: `Impresión aditiva técnica en ${material.type} (${material.name}) de grado profesional · Calidad ${qualityLabel} (capa ${layerHeight} mm, boquilla ${nozzleDiameter} mm). Control de calidad: si alguna pieza sale con defectos, se corrige antes de la entrega.`,
    quantity,
    unitPriceNetCLP: mfgUnitPrice,
    totalNetCLP: mfgUnitPrice * quantity
  });

  // 4. Multicolor Manufacturing (if applicable)
  if (input.isMulticolor && input.colorCount > 1) {
    const multicolorCost = (breakdown.materialPurgeCostCLP) * profitMultiplier;
    const multiTotal = Math.max(3000 * quantity, Math.round(multicolorCost));
    const multiUnitPrice = Math.round(multiTotal / quantity);
    items.push({
      id: `comm_${idCounter++}`,
      concept: 'Proceso de fabricación multicolor',
      description: `Integración automatizada de ${input.colorCount} tonalidades/materiales diferenciados sin uniones mecánicas.`,
      quantity,
      unitPriceNetCLP: multiUnitPrice,
      totalNetCLP: multiUnitPrice * quantity
    });
  }

  // 5. Finishing & Postprocessing (if applicable)
  if (input.finishingType !== 'none' || input.postProcessingMinutes > 0) {
    const finishingTotal = Math.round(
      (breakdown.postProcessingLaborCostCLP + breakdown.finishingLaborCostCLP) * profitMultiplier
    );
    if (finishingTotal > 0) {
      const finishUnitPrice = Math.round(finishingTotal / quantity);
      items.push({
        id: `comm_${idCounter++}`,
        concept: 'Postprocesado y acabado superficial',
        description: input.finishingType === 'sanding_primer'
          ? 'Retiro minucioso de soportes, lijado progresivo, aplicación de imprimación de alto relleno.'
          : 'Retiro de soportes técnicos, desbarbado y limpieza de interfaz geométrica.',
        quantity,
        unitPriceNetCLP: finishUnitPrice,
        totalNetCLP: finishUnitPrice * quantity
      });
    }
  }

  // 6. Painting labor & 7. Paint supplies (kept as separate client-facing lines)
  if (input.paintingLevel !== 'none' || input.paintingMinutes > 0) {
    const paintLaborTotal = Math.round(breakdown.paintingLaborCostCLP * profitMultiplier);
    if (paintLaborTotal > 0) {
      const paintLaborUnit = Math.round(paintLaborTotal / quantity);
      items.push({
        id: `comm_${idCounter++}`,
        concept: input.paintingLevel === 'collector' || input.paintingLevel === 'detailed'
          ? 'Pintura artística y acabado de colección'
          : 'Pintura y acabado de color',
        description: 'Pintura por capas, enmascaramiento, detalles a pincel/aerógrafo y barniz sellador mate/brillo.',
        quantity,
        unitPriceNetCLP: paintLaborUnit,
        totalNetCLP: paintLaborUnit * quantity
      });
    }

    const paintSuppliesTotal = Math.round(breakdown.paintingSuppliesCostCLP * profitMultiplier);
    if (paintSuppliesTotal > 0) {
      const paintSuppliesUnit = Math.round(paintSuppliesTotal / quantity);
      items.push({
        id: `comm_${idCounter++}`,
        concept: 'Gastos de pintura (insumos)',
        description: 'Pinturas, diluyentes, cinta de enmascarar y barniz necesarios para el acabado de color.',
        quantity,
        unitPriceNetCLP: paintSuppliesUnit,
        totalNetCLP: paintSuppliesUnit * quantity
      });
    }
  }

  // 7. Assembly & Hardware (if applicable)
  if (input.assemblyMinutes > 0 || input.assemblyHardwareCostCLP > 0) {
    const assemblyTotal = Math.round(
      (breakdown.assemblyLaborCostCLP + breakdown.assemblyHardwareCostCLP) * profitMultiplier
    );
    if (assemblyTotal > 0) {
      const asmUnitPrice = Math.round(assemblyTotal / quantity);
      items.push({
        id: `comm_${idCounter++}`,
        concept: 'Ensamblaje y montaje de componentes',
        description: 'Instalación de insertos roscados termofijados, pernos, imanes de neodimio y ajuste mecánico.',
        quantity,
        unitPriceNetCLP: asmUnitPrice,
        totalNetCLP: asmUnitPrice * quantity
      });
    }
  }

  // 8. Technical Packaging (if applicable)
  if (input.packagingSuppliesCostCLP > 0) {
    const packTotal = Math.round(
      (breakdown.packagingSuppliesCostCLP + breakdown.qualityControlLaborCostCLP) * profitMultiplier
    );
    if (packTotal > 0) {
      const packUnitPrice = Math.round(packTotal / quantity);
      items.push({
        id: `comm_${idCounter++}`,
        concept: 'Embalaje y protección técnica',
        description: 'Empaque reforzado individual contra impactos para resguardo en transporte.',
        quantity,
        unitPriceNetCLP: packUnitPrice,
        totalNetCLP: packUnitPrice * quantity
      });
    }
  }

  // 9. Urgency Surcharge item (if priority)
  if (breakdown.urgencySurchargeCLP > 0) {
    items.push({
      id: `comm_${idCounter++}`,
      concept: 'Producción prioritaria',
      description: 'Asignación inmediata de máquina en turno preferente y despacho acelerado.',
      quantity: 1,
      unitPriceNetCLP: breakdown.urgencySurchargeCLP,
      totalNetCLP: breakdown.urgencySurchargeCLP
    });
  }

  // Balancing adjustment: Ensure exact mathematical sync with subtotalNetCLP
  const commercialSum = items.reduce((sum, item) => sum + item.totalNetCLP, 0);
  const diff = breakdown.subtotalNetCLP - commercialSum;

  if (Math.abs(diff) > 0 && items.length > 0) {
    // Distribute difference onto the main manufacturing line so customer total is 100% exact
    const mfgItem = items.find(i => i.concept.includes('Fabricación 3D')) || items[0];
    mfgItem.totalNetCLP += diff;
    mfgItem.unitPriceNetCLP = Math.round(mfgItem.totalNetCLP / mfgItem.quantity);
  }

  return items;
}
