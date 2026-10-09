import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  AlertTriangle, 
  Sparkles, 
  Zap, 
  ShieldAlert, 
  ArrowRight, 
  ArrowLeft, 
  Eye, 
  FileCheck,
  ChevronRight,
  Info,
  RotateCcw
} from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { 
  Printer, 
  Material, 
  Customer, 
  BusinessSettings, 
  CostCalculationInput, 
  Quote, 
  ModelOrigin, 
  FinishingType, 
  PaintingLevel, 
  PackagingType, 
  UrgencyLevel,
  ProfitCalculationMode 
} from '../../types';
import { formatMoney, formatRate, taxLabelOf } from '../../services/currency';
import { calculate3DCost } from '../../services/costEngine';
import { parseNatural3DText, Parsed3DIntent } from '../../services/naturalLanguageParser';
import { AppStorage } from '../../services/storage';
import { REFERENCE_PRINTER_PRESETS } from '../../data/printerPresets';

interface SmartChecklistQuoteProps {
  printers: Printer[];
  materials: Material[];
  customers: Customer[];
  settings: BusinessSettings;
  /** Incrementa para limpiar el formulario (señal de "Nueva Cotización") */
  resetSignal?: number;
  /** Cotización cuyos requisitos se copian al formulario (trabajo similar) */
  loadQuote?: Quote | null;
  /** Incrementa para disparar la carga de `loadQuote` */
  loadSignal?: number;
  onQuoteCreated: (quote: Quote) => void;
  onOpenAudit: (quote: Quote) => void;
  onOpenDocument: (quote: Quote, docType: 'cotizacion' | 'orden' | 'pago' | 'auditoria') => void;
  onSaveNewPrinter?: (printer: Printer) => void;
  onSaveNewMaterial?: (material: Material) => void;
  onSaveNewCustomer?: (customer: Customer) => void;
}

type RequirementStatus = 'completed' | 'pending' | 'auto_calculated' | 'missing' | 'inconsistent';

interface RequirementItem {
  id: string;
  label: string;
  status: RequirementStatus;
  detail: string;
}

export const SmartChecklistQuote: React.FC<SmartChecklistQuoteProps> = ({
  printers,
  materials,
  customers,
  settings,
  resetSignal,
  loadQuote,
  loadSignal,
  onQuoteCreated,
  onOpenAudit,
  onOpenDocument,
  onSaveNewPrinter,
  onSaveNewMaterial,
  onSaveNewCustomer
}) => {
  // Mode: Fast Mode (minimal inputs) vs Professional Mode (every parameter tweakable)
  const [isProMode, setIsProMode] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showCommercialPreview, setShowCommercialPreview] = useState<boolean>(false);
  const [activeWhyExplanation, setActiveWhyExplanation] = useState<string | null>(null);

  // Natural Language input state
  const [naturalText, setNaturalText] = useState<string>('');
  const [parsedIntent, setParsedIntent] = useState<Parsed3DIntent | null>(null);

  // Form State - start clean without hardcoded sample values!
  const [quoteNumber, setQuoteNumber] = useState<string>(() => AppStorage.getNextQuoteNumber(settings));
  const [projectName, setProjectName] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(printers[0]?.id || '');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(materials[0]?.id || '');

  // Ad-hoc Custom Printer (when fleet is empty or user wants to enter directly)
  const [manualPrinterMode, setManualPrinterMode] = useState<boolean>(printers.length === 0);
  const [adhocPrinterName, setAdhocPrinterName] = useState<string>('Mi Impresora 3D');
  const [adhocPrinterWatts, setAdhocPrinterWatts] = useState<number>(120);
  const [adhocPrinterHourlyRate, setAdhocPrinterHourlyRate] = useState<number>(250);
  const [adhocPrinterInvestment, setAdhocPrinterInvestment] = useState<number>(450000);
  const [printerSavedSuccess, setPrinterSavedSuccess] = useState<boolean>(false);

  // Ad-hoc Custom Material (when inventory is empty or user wants to enter directly)
  const [manualMaterialMode, setManualMaterialMode] = useState<boolean>(materials.length === 0);
  const [adhocMaterialName, setAdhocMaterialName] = useState<string>('Filamento PLA');
  const [adhocMaterialType, setAdhocMaterialType] = useState<string>('PLA');
  const [adhocMaterialColor, setAdhocMaterialColor] = useState<string>('Estándar');
  const [adhocSpoolPrice, setAdhocSpoolPrice] = useState<number>(18990);
  const [adhocSpoolWeight, setAdhocSpoolWeight] = useState<number>(1000);
  const [adhocCostPerGramOverride, setAdhocCostPerGramOverride] = useState<number | undefined>(undefined);
  const [materialSavedSuccess, setMaterialSavedSuccess] = useState<boolean>(false);

  // Ad-hoc Custom Customer (editable directly by the user, starts blank)
  const [manualCustomerMode, setManualCustomerMode] = useState<boolean>(true);
  const [adhocCustomerName, setAdhocCustomerName] = useState<string>('');
  const [adhocCustomerRut, setAdhocCustomerRut] = useState<string>('');
  const [adhocCustomerEmail, setAdhocCustomerEmail] = useState<string>('');
  const [adhocCustomerPhone, setAdhocCustomerPhone] = useState<string>('');
  const [customerSavedSuccess, setCustomerSavedSuccess] = useState<boolean>(false);

  // Live overrides directly on quote
  const [customWatts, setCustomWatts] = useState<number | undefined>(undefined);
  const [customSpoolPrice, setCustomSpoolPrice] = useState<number | undefined>(undefined);
  const [customSpoolWeight, setCustomSpoolWeight] = useState<number | undefined>(undefined);
  
  // Model & Slicing Inputs
  const [modelOrigin, setModelOrigin] = useState<ModelOrigin>('client_file');
  const [modelLicenseVerified, setModelLicenseVerified] = useState<boolean>(true);
  const [partWeightGrams, setPartWeightGrams] = useState<number>(0);
  const [supportWeightGrams, setSupportWeightGrams] = useState<number>(0);
  const [printHours, setPrintHours] = useState<number>(0);
  const [layerHeightMm, setLayerHeightMm] = useState<number>(0.2);
  const [nozzleDiameterMm, setNozzleDiameterMm] = useState<number>(0.4);
  
  // Multicolor
  const [isMulticolor, setIsMulticolor] = useState<boolean>(false);
  const [colorCount, setColorCount] = useState<number>(2);
  const [purgeGrams, setPurgeGrams] = useState<number>(0);

  // Labor & CAD Design (in minutes!)
  const [designMinutes, setDesignMinutes] = useState<number>(0);
  const designHours = Number((designMinutes / 60).toFixed(2));
  const [designType, setDesignType] = useState<'none' | 'scratch' | 'stl_repair' | 'customization' | 'reverse_engineering'>('none');
  const [prepMinutes, setPrepMinutes] = useState<number>(0);
  const [postProcMinutes, setPostProcMinutes] = useState<number>(0);
  
  // Finishing & Paint
  const [finishingType, setFinishingType] = useState<FinishingType>('none');
  const [finishingMinutes, setFinishingMinutes] = useState<number>(0);
  const [paintingLevel, setPaintingLevel] = useState<PaintingLevel>('none');
  const [paintingMinutes, setPaintingMinutes] = useState<number>(0);
  const [paintingSuppliesCostCLP, setPaintingSuppliesCostCLP] = useState<number>(0);
  
  // Assembly
  const [assemblyMinutes, setAssemblyMinutes] = useState<number>(0);
  const [assemblyHardwareCostCLP, setAssemblyHardwareCostCLP] = useState<number>(0);

  // Quality & Packaging
  const [qualityControlMinutes, setQualityControlMinutes] = useState<number>(0);
  const [packagingType, setPackagingType] = useState<PackagingType>('standard');
  const [packagingSuppliesCostCLP, setPackagingSuppliesCostCLP] = useState<number>(0);

  // Commercial & Volume
  const [quantity, setQuantity] = useState<number>(1);
  const [urgency, setUrgency] = useState<UrgencyLevel>('normal');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);

  // Plazo, condiciones y notas editables por cotización
  const [extraDeliveryDays, setExtraDeliveryDays] = useState<number>(0); // "+ días aproximados" (solo impresión)
  const [termsConditions, setTermsConditions] = useState<string>(
    'Validez 15 días corridos. Anticipo del 50% para inicio de fabricación y saldo contra aviso de entrega o despacho. Garantía sobre tolerancias dimensionales especificadas.'
  );
  const [quoteNotes, setQuoteNotes] = useState<string>('');

  // Etiqueta corta de calidad para la vista previa del cliente
  const describePrintQualityLabel = (h: number): string => {
    if (h <= 0.08) return 'Premium';
    if (h <= 0.12) return 'Alta';
    if (h <= 0.17) return 'Equilibrada';
    if (h <= 0.24) return 'Estándar';
    return 'Prototipo';
  };
  
  // Custom Overrides in Pro Mode
  const [customProfitPercent, setCustomProfitPercent] = useState<number>(settings.defaultProfitPercent);
  const [customProfitMode, setCustomProfitMode] = useState<ProfitCalculationMode>(settings.profitMode);
  const [customHourlyLaborRateCLP, setCustomHourlyLaborRateCLP] = useState<number | undefined>(undefined);
  const [customElectricityKwhCLP, setCustomElectricityKwhCLP] = useState<number | undefined>(undefined);

  // Fallback ad-hoc printer and material if user has 0 in database
  const fallbackPrinter: Printer = useMemo(() => ({
    id: 'default_prn',
    name: 'Mi Impresora 3D',
    brand: 'Genérica',
    model: 'Estándar',
    purchasePriceCLP: 500000,
    accessoriesCLP: 0,
    totalInvestmentCLP: 500000,
    purchaseDate: '2024-01-01',
    estimatedUsefulHours: 4000,
    averageWatts: 130,
    minWatts: 45,
    maxWatts: 280,
    targetMonthlyHours: 160,
    maintenancePercent: 10,
    repairReservePerHourCLP: 250,
    status: 'available',
    location: 'Taller',
    totalHoursPrinted: 0,
    accumulatedRecoveryCLP: 0
  }), []);

  const fallbackMaterial: Material = useMemo(() => ({
    id: 'default_mat',
    name: 'Filamento PLA',
    type: 'PLA',
    brand: 'Genérica',
    color: 'Estándar',
    spoolWeightGrams: 1000,
    spoolPriceCLP: 18990,
    costPerGramCLP: 18.99,
    stockGrams: 1000
  }), []);

  const fallbackCustomer: Customer = useMemo(() => ({
    id: 'default_cust',
    name: '',
    rut: '',
    email: '',
    phone: '',
    address: '',
    commune: '',
    customerType: 'particular',
    totalSpentCLP: 0
  }), []);

  // Selected Entities
  const basePrinter = useMemo(() => 
    printers.find(p => p.id === selectedPrinterId) || printers[0] || fallbackPrinter,
    [printers, selectedPrinterId, fallbackPrinter]
  );

  const currentPrinter: Printer = useMemo(() => {
    if (manualPrinterMode || printers.length === 0) {
      return {
        id: 'adhoc_printer',
        name: adhocPrinterName.trim() || 'Mi Impresora 3D',
        brand: 'Personalizada',
        model: 'Manual',
        purchasePriceCLP: adhocPrinterInvestment,
        accessoriesCLP: 0,
        totalInvestmentCLP: adhocPrinterInvestment,
        purchaseDate: new Date().toISOString().split('T')[0],
        estimatedUsefulHours: 4000,
        averageWatts: customWatts ?? adhocPrinterWatts,
        minWatts: Math.round(adhocPrinterWatts * 0.35),
        maxWatts: Math.round(adhocPrinterWatts * 2.2),
        targetMonthlyHours: 160,
        maintenancePercent: 10,
        repairReservePerHourCLP: 250,
        status: 'available',
        location: 'Taller',
        totalHoursPrinted: 0,
        accumulatedRecoveryCLP: 0
      };
    }
    return {
      ...basePrinter,
      averageWatts: customWatts ?? basePrinter.averageWatts
    };
  }, [manualPrinterMode, printers, selectedPrinterId, fallbackPrinter, adhocPrinterName, adhocPrinterInvestment, adhocPrinterWatts, customWatts]);

  const baseMaterial = useMemo(() => 
    materials.find(m => m.id === selectedMaterialId) || materials[0] || fallbackMaterial,
    [materials, selectedMaterialId, fallbackMaterial]
  );

  const currentMaterial: Material = useMemo(() => {
    if (manualMaterialMode || materials.length === 0) {
      const price = customSpoolPrice ?? adhocSpoolPrice;
      const weight = customSpoolWeight ?? adhocSpoolWeight;
      const autoCpg = weight > 0 ? price / weight : 18.99;
      const finalCpg = adhocCostPerGramOverride !== undefined && adhocCostPerGramOverride > 0
        ? adhocCostPerGramOverride
        : Number(autoCpg.toFixed(2));
      return {
        id: 'adhoc_material',
        name: adhocMaterialName.trim() || 'Filamento PLA',
        type: adhocMaterialType as any,
        brand: 'Personalizada',
        color: adhocMaterialColor || 'Estándar',
        spoolWeightGrams: weight,
        spoolPriceCLP: price,
        costPerGramCLP: finalCpg,
        stockGrams: 1000
      };
    }
    const price = customSpoolPrice ?? baseMaterial.spoolPriceCLP;
    const weight = customSpoolWeight ?? baseMaterial.spoolWeightGrams;
    const cpg = weight > 0 ? price / weight : 18.99;
    return {
      ...baseMaterial,
      spoolPriceCLP: price,
      spoolWeightGrams: weight,
      costPerGramCLP: Number(cpg.toFixed(2))
    };
  }, [manualMaterialMode, materials, selectedMaterialId, fallbackMaterial, adhocSpoolPrice, adhocSpoolWeight, adhocCostPerGramOverride, adhocMaterialName, adhocMaterialType, adhocMaterialColor, customSpoolPrice, customSpoolWeight]);

  const currentCustomer: Customer = useMemo(() => {
    if (manualCustomerMode || !selectedCustomerId || customers.length === 0) {
      return {
        id: 'adhoc_cust',
        name: adhocCustomerName.trim(),
        rut: adhocCustomerRut.trim(),
        email: adhocCustomerEmail.trim(),
        phone: adhocCustomerPhone.trim(),
        address: '',
        commune: '',
        customerType: 'particular',
        totalSpentCLP: 0
      };
    }
    return customers.find(c => c.id === selectedCustomerId) || fallbackCustomer;
  }, [manualCustomerMode, customers, selectedCustomerId, fallbackCustomer, adhocCustomerName, adhocCustomerRut, adhocCustomerEmail, adhocCustomerPhone]);

  // Handlers to quickly save newly entered entities into workshop database
  const handleQuickSavePrinter = () => {
    if (onSaveNewPrinter) {
      const newP: Printer = {
        id: `prn_${Date.now()}`,
        name: adhocPrinterName.trim() || 'Mi Impresora 3D',
        brand: 'Personalizada',
        model: 'Manual',
        purchasePriceCLP: adhocPrinterInvestment,
        accessoriesCLP: 0,
        totalInvestmentCLP: adhocPrinterInvestment,
        purchaseDate: new Date().toISOString().split('T')[0],
        estimatedUsefulHours: 4000,
        averageWatts: adhocPrinterWatts,
        minWatts: Math.round(adhocPrinterWatts * 0.35),
        maxWatts: Math.round(adhocPrinterWatts * 2.2),
        targetMonthlyHours: 160,
        maintenancePercent: 10,
        repairReservePerHourCLP: 250,
        status: 'available',
        location: 'Taller',
        totalHoursPrinted: 0,
        accumulatedRecoveryCLP: 0
      };
      onSaveNewPrinter(newP);
      setSelectedPrinterId(newP.id);
      setManualPrinterMode(false);
      setPrinterSavedSuccess(true);
      setTimeout(() => setPrinterSavedSuccess(false), 3000);
    }
  };

  const handleQuickSaveMaterial = () => {
    if (onSaveNewMaterial) {
      const autoCpg = adhocSpoolWeight > 0 ? adhocSpoolPrice / adhocSpoolWeight : 18.99;
      const finalCpg = adhocCostPerGramOverride !== undefined && adhocCostPerGramOverride > 0
        ? adhocCostPerGramOverride
        : Number(autoCpg.toFixed(2));

      const newM: Material = {
        id: `mat_${Date.now()}`,
        name: adhocMaterialName.trim() || 'Filamento PLA',
        type: adhocMaterialType as any,
        brand: 'Personalizada',
        color: adhocMaterialColor || 'Estándar',
        spoolWeightGrams: adhocSpoolWeight,
        spoolPriceCLP: adhocSpoolPrice,
        costPerGramCLP: finalCpg,
        stockGrams: 1000,
        location: 'Taller'
      };
      onSaveNewMaterial(newM);
      setSelectedMaterialId(newM.id);
      setManualMaterialMode(false);
      setMaterialSavedSuccess(true);
      setTimeout(() => setMaterialSavedSuccess(false), 3000);
    }
  };

  const handleQuickSaveCustomer = () => {
    if (onSaveNewCustomer && adhocCustomerName.trim()) {
      const newC: Customer = {
        id: `cust_${Date.now()}`,
        name: adhocCustomerName.trim(),
        rut: adhocCustomerRut.trim(),
        email: adhocCustomerEmail.trim(),
        phone: adhocCustomerPhone.trim(),
        address: '',
        commune: '',
        customerType: 'particular',
        totalSpentCLP: 0
      };
      onSaveNewCustomer(newC);
      setSelectedCustomerId(newC.id);
      setManualCustomerMode(false);
      setCustomerSavedSuccess(true);
      setTimeout(() => setCustomerSavedSuccess(false), 3000);
    }
  };

  // Real-time calculation input
  const costCalculationInput: CostCalculationInput = useMemo(() => ({
    printerId: currentPrinter?.id || '',
    materialId: currentMaterial?.id || '',
    partWeightGrams,
    supportWeightGrams,
    printHours,
    isMulticolor,
    colorCount: isMulticolor ? colorCount : 1,
    purgeGrams: isMulticolor ? purgeGrams : 0,
    purgeTowerGrams: isMulticolor ? 15 : 0,
    filamentSwitchesCount: isMulticolor ? 45 : 0,
    designHours,
    designMinutes,
    designType,
    designRevisionsIncluded: 1,
    extraRevisionsCount: 0,
    prepManufacturingMinutes: prepMinutes,
    postProcessingMinutes: postProcMinutes,
    finishingType,
    finishingMinutes,
    paintingLevel,
    paintingMinutes,
    paintingSuppliesCostCLP,
    assemblyMinutes,
    assemblyHardwareCostCLP,
    qualityControlMinutes,
    packagingType,
    packagingSuppliesCostCLP,
    quantity,
    urgency,
    layerHeightMm,
    nozzleDiameterMm,
    customDiscountPercent: customDiscountPercent > 0 ? customDiscountPercent : undefined,
    customProfitPercent,
    customProfitMode,
    customHourlyLaborRateCLP,
    customElectricityKwhCLP
  }), [
    currentPrinter, currentMaterial, partWeightGrams, supportWeightGrams, printHours,
    isMulticolor, colorCount, purgeGrams, designHours, designMinutes, designType, prepMinutes,
    postProcMinutes, finishingType, finishingMinutes, paintingLevel, paintingMinutes,
    paintingSuppliesCostCLP, assemblyMinutes, assemblyHardwareCostCLP,
    qualityControlMinutes, packagingType, packagingSuppliesCostCLP, quantity, urgency,
    layerHeightMm, nozzleDiameterMm,
    customDiscountPercent, customProfitPercent, customProfitMode,
    customHourlyLaborRateCLP, customElectricityKwhCLP
  ]);

  // Real-time pure engine cost
  const calculationResult = useMemo(() => {
    if (!currentPrinter || !currentMaterial) return null;
    return calculate3DCost(costCalculationInput, currentPrinter, currentMaterial, settings);
  }, [costCalculationInput, currentPrinter, currentMaterial, settings]);

  // Adaptive Requirements Checklist
  const checklistItems: RequirementItem[] = useMemo(() => {
    const items: RequirementItem[] = [];

    // 1. Cliente
    const hasCustomerName = Boolean(currentCustomer && currentCustomer.name.trim().length > 0);
    if (!hasCustomerName) {
      items.push({
        id: 'customer',
        label: 'Datos del Cliente',
        status: 'missing',
        detail: 'Ingresa el nombre o datos del cliente'
      });
    } else {
      items.push({
        id: 'customer',
        label: 'Datos del Cliente',
        status: 'completed',
        detail: currentCustomer.rut ? `${currentCustomer.name} (${currentCustomer.rut})` : currentCustomer.name
      });
    }

    // 2. Modelo & Licencia
    let licStatus: RequirementStatus = 'completed';
    let licDetail = 'Archivo y licencia validados';
    if (modelOrigin === 'download_free' && !modelLicenseVerified) {
      licStatus = 'inconsistent';
      licDetail = '⚠ Advertencia: Verificar licencia de uso comercial';
    }
    items.push({
      id: 'model_license',
      label: 'Origen del Modelo 3D',
      status: licStatus,
      detail: licDetail
    });

    // 3. Impresora
    items.push({
      id: 'printer',
      label: 'Impresora Asignada',
      status: currentPrinter ? 'completed' : 'missing',
      detail: currentPrinter ? `${currentPrinter.name} (${currentPrinter.averageWatts}W)` : 'Seleccionar máquina'
    });

    // 4. Material
    items.push({
      id: 'material',
      label: 'Material y Filamento',
      status: currentMaterial ? 'completed' : 'missing',
      detail: currentMaterial ? `${currentMaterial.name} (${formatRate(currentMaterial.costPerGramCLP, settings)}/g)` : 'Seleccionar material'
    });

    // 5. Peso de pieza
    if (partWeightGrams <= 0) {
      items.push({
        id: 'part_weight',
        label: 'Peso de la Pieza',
        status: 'missing',
        detail: 'Falta ingresar los gramos de la pieza'
      });
    } else {
      items.push({
        id: 'part_weight',
        label: 'Peso de la Pieza',
        status: 'completed',
        detail: `${partWeightGrams} gramos netos`
      });
    }

    // 6. Soportes
    if (supportWeightGrams > partWeightGrams && partWeightGrams > 0) {
      items.push({
        id: 'supports',
        label: 'Peso de Soportes',
        status: 'inconsistent',
        detail: '⚠ Inconsistente: Soportes mayores al peso de la pieza'
      });
    } else {
      items.push({
        id: 'supports',
        label: 'Soportes de Fabricación',
        status: supportWeightGrams > 0 ? 'completed' : 'auto_calculated',
        detail: supportWeightGrams > 0 ? `${supportWeightGrams} gramos` : 'Sin soportes necesarios'
      });
    }

    // 7. Tiempo de impresión
    if (printHours <= 0) {
      items.push({
        id: 'print_time',
        label: 'Tiempo de Impresión',
        status: 'inconsistent',
        detail: 'El tiempo de impresión no puede ser 0'
      });
    } else {
      items.push({
        id: 'print_time',
        label: 'Tiempo de Impresión',
        status: 'completed',
        detail: `${printHours} horas de ocupación de máquina`
      });
    }

    // 8. Multicolor (si aplica)
    if (isMulticolor) {
      items.push({
        id: 'multicolor',
        label: 'Proceso Multicolor',
        status: 'completed',
        detail: `${colorCount} colores, ${purgeGrams}g purga estimada`
      });
    }

    // 9. Electricidad
    items.push({
      id: 'electricity',
      label: 'Tarifa Eléctrica',
      status: 'auto_calculated',
      detail: `${formatRate(costCalculationInput.customElectricityKwhCLP ?? settings.kwhPriceCLP, settings)}/kWh cargado desde config`
    });

    // 10. Mano de obra
    const billableLabor = calculationResult?.breakdown.laborHourlyRateCLP || 0;
    items.push({
      id: 'labor',
      label: 'Mano de Obra Humana',
      status: 'auto_calculated',
      detail: `${formatMoney(billableLabor, settings)}/h (${calculationResult?.breakdown.totalLaborHours || 0} hrs estimadas)`
    });

    // 11. Gastos & Mantenimiento
    items.push({
      id: 'overhead_maint',
      label: 'Mantenimiento & Gastos',
      status: 'auto_calculated',
      detail: 'Depreciación, mantenimiento 10% y gastos generales'
    });

    // 12. Utilidad & Margen
    items.push({
      id: 'profit',
      label: 'Margen Comercial',
      status: 'completed',
      detail: `${calculationResult?.breakdown.profitMode === 'markup' ? 'Recargo' : 'Margen'} ${calculationResult?.breakdown.appliedProfitPercent}%`
    });

    // 13. Sales tax
    items.push({
      id: 'iva',
      label: `${taxLabelOf(settings)} (${(settings.ivaRate * 100).toFixed(0)}%)`,
      status: 'auto_calculated',
      detail: 'Calculado sobre valor neto comercial'
    });

    return items;
  }, [
    currentCustomer, modelOrigin, modelLicenseVerified, currentPrinter, currentMaterial,
    partWeightGrams, supportWeightGrams, printHours, isMulticolor, colorCount, purgeGrams,
    costCalculationInput, settings, calculationResult
  ]);

  const missingCount = checklistItems.filter(i => i.status === 'missing' || i.status === 'inconsistent').length;
  const completedCount = checklistItems.filter(i => i.status === 'completed' || i.status === 'auto_calculated').length;
  const progressPercent = Math.round((completedCount / checklistItems.length) * 100);
  const hasCriticalInconsistencies = checklistItems.some(i => i.status === 'inconsistent' || i.status === 'missing');

  // Handle Natural Language Parse
  const handleNaturalTextChange = (text: string) => {
    setNaturalText(text);
    if (text.trim().length > 6) {
      const parsed = parseNatural3DText(text, settings);
      setParsedIntent(parsed);
    } else {
      setParsedIntent(null);
    }
  };

  const applyParsedIntent = () => {
    if (!parsedIntent) return;

    if (parsedIntent.materialType) {
      const match = materials.find(m => m.type === parsedIntent.materialType);
      if (match) setSelectedMaterialId(match.id);
    }
    if (parsedIntent.spoolWeightGrams !== undefined) {
      setCustomSpoolWeight(parsedIntent.spoolWeightGrams);
    }
    if (parsedIntent.spoolPriceCLP !== undefined) {
      setCustomSpoolPrice(parsedIntent.spoolPriceCLP);
    }
    if (parsedIntent.partWeightGrams !== undefined) {
      setPartWeightGrams(parsedIntent.partWeightGrams);
    }
    if (parsedIntent.supportWeightGrams !== undefined) {
      setSupportWeightGrams(parsedIntent.supportWeightGrams);
    }
    if (parsedIntent.printHours !== undefined) {
      setPrintHours(parsedIntent.printHours);
    }
    if (parsedIntent.quantity !== undefined) {
      setQuantity(parsedIntent.quantity);
    }
    if (parsedIntent.isMulticolor !== undefined) {
      setIsMulticolor(parsedIntent.isMulticolor);
      if (parsedIntent.colorCount) setColorCount(parsedIntent.colorCount);
      if (parsedIntent.purgeGrams) setPurgeGrams(parsedIntent.purgeGrams);
    }
    if (parsedIntent.finishingType !== undefined) {
      setFinishingType(parsedIntent.finishingType);
      setFinishingMinutes(20);
    }
    if (parsedIntent.paintingLevel !== undefined) {
      setPaintingLevel(parsedIntent.paintingLevel);
      setPaintingMinutes(45);
      setPaintingSuppliesCostCLP(3500);
    }
    if (parsedIntent.urgency !== undefined) {
      setUrgency(parsedIntent.urgency);
    }

    setNaturalText('');
    setParsedIntent(null);
  };

  // Clear form to clean slate
  const handleClearForm = () => {
    setQuoteNumber(AppStorage.getNextQuoteNumber(settings));
    setProjectName('');
    setAdhocCustomerName('');
    setAdhocCustomerRut('');
    setAdhocCustomerEmail('');
    setAdhocCustomerPhone('');
    setSelectedCustomerId('');
    setManualCustomerMode(true);
    setPartWeightGrams(0);
    setSupportWeightGrams(0);
    setPrintHours(0);
    setLayerHeightMm(0.2);
    setNozzleDiameterMm(0.4);
    setIsMulticolor(false);
    setColorCount(2);
    setPurgeGrams(0);
    setDesignMinutes(0);
    setPrepMinutes(0);
    setPostProcMinutes(0);
    setFinishingType('none');
    setFinishingMinutes(0);
    setPaintingLevel('none');
    setPaintingMinutes(0);
    setPaintingSuppliesCostCLP(0);
    setAssemblyMinutes(0);
    setAssemblyHardwareCostCLP(0);
    setQualityControlMinutes(0);
    setPackagingSuppliesCostCLP(0);
    setQuantity(1);
    setUrgency('normal');
    setExtraDeliveryDays(0);
    setTermsConditions(
      'Validez 15 días corridos. Anticipo del 50% para inicio de fabricación y saldo contra aviso de entrega o despacho. Garantía sobre tolerancias dimensionales especificadas.'
    );
    setQuoteNotes('');
    setCustomDiscountPercent(0);
    setCustomWatts(undefined);
    setCustomSpoolPrice(undefined);
    setCustomSpoolWeight(undefined);
    setCustomElectricityKwhCLP(undefined);
    setCustomHourlyLaborRateCLP(undefined);
    setCustomProfitPercent(settings.defaultProfitPercent);
    setCustomProfitMode(settings.profitMode);
    setCurrentStep(1);
  };

  // "Nueva Cotización": limpia el formulario (el wizard permanece montado entre pestañas
  // para no perder lo escrito, así que la limpieza debe ser explícita)
  const lastResetSignal = useRef(resetSignal ?? 0);
  useEffect(() => {
    const next = resetSignal ?? 0;
    if (next !== lastResetSignal.current) {
      lastResetSignal.current = next;
      handleClearForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  // Copiar los requisitos de una cotización anterior (trabajo similar):
  // rellena los 6 pasos y deja el costeo listo para revisar/ajustar, con N° nuevo.
  const handleLoadQuoteRequirements = (quote: Quote) => {
    const input = quote.costInput;

    // Paso 1: cliente (de flota si sigue existiendo; si no, modo manual con sus datos)
    const customerExists = customers.some(c => c.id === quote.customerId);
    if (customerExists) {
      setSelectedCustomerId(quote.customerId);
      setManualCustomerMode(false);
    } else {
      setSelectedCustomerId('');
      setManualCustomerMode(true);
    }
    setAdhocCustomerName(quote.customerName || '');
    setAdhocCustomerRut(quote.customerRut || '');
    setAdhocCustomerEmail(quote.customerEmail || '');
    setAdhocCustomerPhone(quote.customerPhone || '');
    setProjectName(quote.projectName || '');

    // Paso 2: impresora
    const printerId = input?.printerId || quote.printerId;
    if (printers.length > 0 && printers.some(p => p.id === printerId)) {
      setSelectedPrinterId(printerId);
      setManualPrinterMode(false);
    } else {
      setManualPrinterMode(true);
      setAdhocPrinterName(quote.printerName || 'Mi Impresora 3D');
    }

    // Paso 3: material
    const materialId = input?.materialId || quote.materialId;
    if (materials.length > 0 && materials.some(m => m.id === materialId)) {
      setSelectedMaterialId(materialId);
      setManualMaterialMode(false);
    } else {
      setManualMaterialMode(true);
      setAdhocMaterialName(quote.materialName || 'Filamento PLA');
      setAdhocMaterialColor(quote.materialColor || 'Estándar');
    }

    // Paso 3: especificaciones de impresión
    setPartWeightGrams(input?.partWeightGrams ?? quote.partWeightGrams ?? 0);
    setSupportWeightGrams(input?.supportWeightGrams ?? quote.supportWeightGrams ?? 0);
    setPrintHours(input?.printHours ?? quote.printHours ?? 0);
    setLayerHeightMm(input?.layerHeightMm ?? quote.layerHeightMm ?? 0.2);
    setNozzleDiameterMm(input?.nozzleDiameterMm ?? quote.nozzleDiameterMm ?? 0.4);
    setModelOrigin(quote.modelOrigin || 'client_file');
    setModelLicenseVerified(quote.isLicenseCommercialSafe ?? true);
    const multicolor = input?.isMulticolor ?? quote.isMulticolor ?? false;
    setIsMulticolor(multicolor);
    setColorCount(input?.colorCount ?? quote.colorCount ?? 2);
    setPurgeGrams(input?.purgeGrams ?? quote.purgeGrams ?? 0);

    // Paso 4: mano de obra y proceso
    setDesignMinutes(input?.designMinutes ?? 0);
    setDesignType(input?.designType ?? 'none');
    setPrepMinutes(input?.prepManufacturingMinutes ?? 0);
    setPostProcMinutes(input?.postProcessingMinutes ?? 0);

    // Paso 5: acabado, pintura, ensamble y embalaje
    setFinishingType(input?.finishingType ?? 'none');
    setFinishingMinutes(input?.finishingMinutes ?? 0);
    setPaintingLevel(input?.paintingLevel ?? 'none');
    setPaintingMinutes(input?.paintingMinutes ?? 0);
    setPaintingSuppliesCostCLP(input?.paintingSuppliesCostCLP ?? 0);
    setAssemblyMinutes(input?.assemblyMinutes ?? 0);
    setAssemblyHardwareCostCLP(input?.assemblyHardwareCostCLP ?? 0);
    setQualityControlMinutes(input?.qualityControlMinutes ?? 0);
    setPackagingType(input?.packagingType ?? 'standard');
    setPackagingSuppliesCostCLP(input?.packagingSuppliesCostCLP ?? 0);

    // Paso 6: comercial y entrega
    setQuantity(input?.quantity ?? quote.quantity ?? 1);
    setUrgency(input?.urgency ?? quote.urgency ?? 'normal');
    setCustomDiscountPercent(input?.customDiscountPercent ?? 0);
    setCustomProfitPercent(input?.customProfitPercent ?? settings.defaultProfitPercent);
    setCustomProfitMode(input?.customProfitMode ?? settings.profitMode);
    setCustomHourlyLaborRateCLP(input?.customHourlyLaborRateCLP);
    setCustomElectricityKwhCLP(input?.customElectricityKwhCLP);
    setExtraDeliveryDays(quote.extraDeliveryDays ?? 0);
    setTermsConditions(quote.termsConditions || 'Validez 15 días corridos. Anticipo del 50% para inicio de fabricación y saldo contra aviso de entrega o despacho. Garantía sobre tolerancias dimensionales especificadas.');
    setQuoteNotes(quote.notes || '');

    // Sobrescrituras ad-hoc: se parten desde la configuración (no se arrastran)
    setCustomWatts(undefined);
    setCustomSpoolPrice(undefined);
    setCustomSpoolWeight(undefined);

    // Cotización nueva: número siguiente y formulario desde el paso 1
    setQuoteNumber(AppStorage.getNextQuoteNumber(settings));
    setIsProMode(true); // muestra todos los parámetros copiados
    setCurrentStep(1);
    setNaturalText('');
    setParsedIntent(null);
  };

  const lastLoadSignal = useRef(loadSignal ?? 0);
  useEffect(() => {
    const next = loadSignal ?? 0;
    if (next !== lastLoadSignal.current && loadQuote) {
      lastLoadSignal.current = next;
      handleLoadQuoteRequirements(loadQuote);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSignal, loadQuote]);

  // Guardia: si el wizard tiene datos ingresados, "Limpiar" pide confirmación antes de borrar.
  const isWizardDirty =
    projectName.trim() !== '' ||
    adhocCustomerName.trim() !== '' ||
    selectedCustomerId !== '' ||
    partWeightGrams > 0 ||
    printHours > 0;
  const [clearFormConfirm, setClearFormConfirm] = useState(false);

  // Complete missing costs automatically (only workshop base parameters)
  const handleCompleteDefaults = () => {
    setCustomElectricityKwhCLP(settings.kwhPriceCLP);
    setCustomProfitPercent(settings.defaultProfitPercent);
    setCustomProfitMode(settings.profitMode);
  };

  // Save official quote
  const handleSaveQuote = () => {
    if (!calculationResult || !currentCustomer || !currentPrinter || !currentMaterial) return;

    const finalQuoteNumber = quoteNumber.trim() || AppStorage.getNextQuoteNumber(settings);
    const today = new Date();
    const expiry = new Date(today);
    expiry.setDate(today.getDate() + 15);

    const baseDeliveryDays = urgency === 'urgent' ? 1 : urgency === 'priority' ? 2 : 4;
    // Pintado: mínimo 5 días hábiles (regla del taller)
    const minPaintingDays = paintingLevel !== 'none' ? 5 : 0;
    const finalDeliveryDays = Math.max(baseDeliveryDays, minPaintingDays, 1);

    const quote: Quote = {
      id: `quot_${Date.now()}`,
      quoteNumber: finalQuoteNumber,
      customerId: currentCustomer.id,
      customerName: currentCustomer.name.trim() || 'Cliente Directo',
      customerRut: currentCustomer.rut,
      customerEmail: currentCustomer.email,
      customerPhone: currentCustomer.phone,
      projectName: projectName.trim() || 'Pieza 3D Personalizada',
      status: 'draft',
      createdAt: today.toISOString(),
      validUntil: expiry.toISOString(),
      estimatedDeliveryDays: finalDeliveryDays,
      printerId: currentPrinter.id,
      printerName: currentPrinter.name,
      materialId: currentMaterial.id,
      materialName: currentMaterial.name,
      materialColor: currentMaterial.color,
      partWeightGrams,
      supportWeightGrams,
      isMulticolor,
      colorCount: isMulticolor ? colorCount : 1,
      purgeGrams: isMulticolor ? purgeGrams : 0,
      printHours,
      layerHeightMm,
      nozzleDiameterMm,
      modelOrigin,
      isLicenseCommercialSafe: modelOrigin !== 'download_free' || modelLicenseVerified,
      quantity,
      urgency,
      costBreakdown: calculationResult.breakdown,
      // Snapshot de los 6 pasos: permite "copiar requisitos" a un costeo nuevo.
      costInput: costCalculationInput,
      commercialItems: calculationResult.commercialItems,
      subtotalNetCLP: calculationResult.breakdown.subtotalNetCLP,
      discountCLP: calculationResult.breakdown.volumeDiscountCLP,
      ivaCLP: calculationResult.breakdown.ivaCLP,
      totalCLP: calculationResult.breakdown.finalTotalCLP,
      downPaymentPercent: 50,
      downPaymentCLP: Math.round(calculationResult.breakdown.finalTotalCLP * 0.5),
      balanceCLP: Math.round(calculationResult.breakdown.finalTotalCLP * 0.5),
      paymentStatus: 'unpaid',
      extraDeliveryDays: Math.max(0, extraDeliveryDays || 0),
      termsConditions: termsConditions.trim() || 'Validez 15 días corridos. Anticipo del 50% para inicio de fabricación y saldo contra aviso de entrega o despacho. Garantía sobre tolerancias dimensionales especificadas.',
      notes: quoteNotes.trim() || `Modelo: ${projectName || 'Pieza 3D'}. Material: ${currentMaterial.type} (${currentMaterial.color}). Acabado: ${finishingType}.`
    };

    // Increment consecutive counter
    AppStorage.incrementQuoteCounter();
    setQuoteNumber(AppStorage.getNextQuoteNumber(settings));

    onQuoteCreated(quote);
    onOpenDocument(quote, 'cotizacion');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Mode & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Costeo y Cotización Inteligente
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Motor de costeo real desacoplado con separación de costos internos y conceptos comerciales
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Fast vs Pro mode segmented switch */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setIsProMode(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                !isProMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Modo Rápido
            </button>
            <button
              onClick={() => setIsProMode(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isProMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Modo Profesional
            </button>
          </div>

          <button
            onClick={handleCompleteDefaults}
            className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            title="Completa automáticamente electricidad, mano de obra, depreciación e IVA desde la configuración"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completar costos faltantes</span>
          </button>

          <button
            onClick={() => (isWizardDirty ? setClearFormConfirm(true) : handleClearForm())}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            title="Vacía todos los campos y vuelve al paso 1 para empezar una cotización nueva"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* Natural Language Prompt Assistant */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">
              Asistente de Lenguaje Natural
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Escribe en lenguaje cotidiano para auto-rellenar
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={naturalText}
            onChange={(e) => handleNaturalTextChange(e.target.value)}
            placeholder="Ej: 'Necesito PLA, bobina 18 mil, la pieza pesa 120 gramos, demora 6 horas y son 3 piezas'"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
          {parsedIntent && parsedIntent.rawMatchedTokens.length > 0 && (
            <button
              onClick={applyParsedIntent}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <span>Aplicar ({parsedIntent.rawMatchedTokens.length} datos)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Extracted tokens preview */}
        {parsedIntent && parsedIntent.rawMatchedTokens.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="text-slate-400">Interpretado:</span>
            {parsedIntent.rawMatchedTokens.map((tok, idx) => (
              <span key={idx} className="bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded text-[11px] font-mono">
                {tok}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3-Column Layout: Left (Checklist) | Center (Question Flow) | Right (Real-time Cost Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMN 1: LEFT - Adaptive Requirement Checklist (3 cols on lg) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-semibold text-slate-900">
                Checklist de Requisitos
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {missingCount === 0 ? '100% Listo para costear' : `Faltan ${missingCount} requisitos`}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700">
              {progressPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                hasCriticalInconsistencies ? 'bg-amber-500' : 'bg-emerald-500'
              }`} 
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Checklist rows */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {checklistItems.map((item) => (
              <div 
                key={item.id}
                className="p-2 rounded-lg bg-slate-50/60 border border-slate-100 text-xs flex items-start gap-2.5"
              >
                <div className="mt-0.5 shrink-0">
                  {item.status === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                  {item.status === 'auto_calculated' && (
                    <Sparkles className="w-4 h-4 text-blue-500" />
                  )}
                  {item.status === 'pending' && (
                    <Clock className="w-4 h-4 text-amber-500" />
                  )}
                  {item.status === 'missing' && (
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                  )}
                  {item.status === 'inconsistent' && (
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 truncate">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.status === 'completed' ? '🟢' : item.status === 'auto_calculated' ? '🔵' : item.status === 'inconsistent' ? '⚠' : '🔴'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Alert if inconsistent */}
          {hasCriticalInconsistencies && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Corrige las inconsistencias antes de emitir la cotización.</span>
            </div>
          )}
        </div>

        {/* COLUMN 2: CENTER - Step-by-Step Adaptive Question Assistant (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
          
          {/* Step indicator header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                {currentStep}
              </span>
              <span className="text-xs font-bold text-slate-800">
                {currentStep === 1 && '1. Datos del Proyecto y Cliente'}
                {currentStep === 2 && '2. Impresora y Filamento'}
                {currentStep === 3 && '3. Parámetros de Slicing y Peso'}
                {currentStep === 4 && '4. Multicolor, Purgas y Licencia'}
                {currentStep === 5 && '5. Mano de Obra, Acabado y Pintura'}
                {currentStep === 6 && '6. Cantidad, Urgencia y Ajustes'}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                disabled={currentStep === 1}
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentStep === 6}
                onClick={() => setCurrentStep(prev => Math.min(6, prev + 1))}
                className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* STEP 1: Project & Customer */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      N° de Cotización <span className="text-emerald-600 font-normal text-[10px]">(Consecutivo)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setQuoteNumber(AppStorage.getNextQuoteNumber(settings))}
                      className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5 cursor-pointer"
                      title="Restablecer al consecutivo sugerido"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Sugerir N°</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={quoteNumber}
                    onChange={(e) => setQuoteNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    placeholder="COT-0000"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Consecutivo editable en caso de error o ajuste manual.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Proyecto / Pieza
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                    placeholder="Ej: Carcasa personalizada, Engranaje, Prototipo, etc."
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Identificador o modelo a fabricar.
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Datos del Cliente
                  </label>
                  {customers.length > 0 && (
                    <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded">
                      <button
                        type="button"
                        onClick={() => { setManualCustomerMode(true); setSelectedCustomerId(''); }}
                        className={`px-2 py-0.5 text-[10px] rounded cursor-pointer ${
                          manualCustomerMode ? 'bg-white shadow-xs font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Ingresar datos
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setManualCustomerMode(false);
                          if (!selectedCustomerId && customers.length > 0) {
                            setSelectedCustomerId(customers[0].id);
                          }
                        }}
                        className={`px-2 py-0.5 text-[10px] rounded cursor-pointer ${
                          !manualCustomerMode ? 'bg-white shadow-xs font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Clientes guardados ({customers.length})
                      </button>
                    </div>
                  )}
                </div>

                {!manualCustomerMode && customers.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="">-- Selecciona un cliente guardado --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.rut ? `(${c.rut})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">
                          Nombre o Razón Social <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={adhocCustomerName}
                          onChange={(e) => setAdhocCustomerName(e.target.value)}
                          placeholder="Ingresa el nombre del cliente..."
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:border-slate-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">RUT (Opcional)</label>
                        <input
                          type="text"
                          value={adhocCustomerRut}
                          onChange={(e) => setAdhocCustomerRut(e.target.value)}
                          placeholder="12.345.678-9"
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Email (Opcional)</label>
                        <input
                          type="email"
                          value={adhocCustomerEmail}
                          onChange={(e) => setAdhocCustomerEmail(e.target.value)}
                          placeholder="cliente@correo.cl"
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Teléfono (Opcional)</label>
                        <input
                          type="text"
                          value={adhocCustomerPhone}
                          onChange={(e) => setAdhocCustomerPhone(e.target.value)}
                          placeholder="+56 9 1234 5678"
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>
                    {onSaveNewCustomer && adhocCustomerName.trim() && (
                      <div className="pt-1 flex items-center justify-between border-t border-slate-200">
                        <span className="text-[10px] text-slate-500">¿Deseas guardar este cliente en tu agenda?</span>
                        <button
                          type="button"
                          onClick={handleQuickSaveCustomer}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer"
                        >
                          {customerSavedSuccess ? '✓ Guardado' : '+ Guardar en Directorio'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Trabajo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setModelOrigin('client_file'); setDesignMinutes(0); }}
                    className={`p-2.5 text-left border rounded-lg text-xs cursor-pointer transition-colors ${
                      modelOrigin === 'client_file' ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium">Archivo del Cliente</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">STL ya diseñado y listo (0 min CAD)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setModelOrigin('in_house_design'); setDesignMinutes(prev => prev > 0 ? prev : 30); }}
                    className={`p-2.5 text-left border rounded-lg text-xs cursor-pointer transition-colors ${
                      modelOrigin === 'in_house_design' ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium">Diseño / Personalización</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Requiere modelado CAD (configurable en min)</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Printer & Material */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Printer Section */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Impresora 3D Asignada
                  </label>
                  <div className="flex items-center gap-2">
                    {printers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setManualPrinterMode(!manualPrinterMode)}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                      >
                        {manualPrinterMode ? 'Elegir de mi flota' : '+ Ingresar datos directamente'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveWhyExplanation(activeWhyExplanation === 'printer' ? null : 'printer')}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>¿Por qué?</span>
                    </button>
                  </div>
                </div>

                {activeWhyExplanation === 'printer' && (
                  <div className="mb-2 p-2.5 bg-blue-50 border border-blue-200 text-blue-900 text-[11px] rounded-lg">
                    La máquina determina el consumo en Watts para la electricidad y la amortización de la inversión según sus horas de vida útil.
                  </div>
                )}

                {!manualPrinterMode && printers.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedPrinterId}
                      onChange={(e) => setSelectedPrinterId(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      {printers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.averageWatts}W ($ {Math.round(p.totalInvestmentCLP / (p.estimatedUsefulHours || 4000))}/hr amort.)
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Potencia real (Watts)</label>
                        <input
                          type="number"
                          value={customWatts ?? currentPrinter.averageWatts}
                          onChange={(e) => setCustomWatts(parseInt(e.target.value, 10) || 100)}
                          className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Ubicación / Notas</label>
                        <div className="text-[11px] font-medium text-slate-700 pt-1 truncate">
                          {currentPrinter.brand} · {currentPrinter.location}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-medium text-slate-700">Nombre o Modelo de tu Impresora</label>
                        <span className="text-[10px] text-slate-400">O elige una referencia rápida:</span>
                      </div>
                      
                      {/* Reference Quick Presets */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {REFERENCE_PRINTER_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setAdhocPrinterName(preset.name);
                              setAdhocPrinterWatts(preset.averageWatts);
                              setAdhocPrinterInvestment(preset.purchasePriceCLP);
                              setAdhocPrinterHourlyRate(Math.round(preset.purchasePriceCLP / (preset.estimatedUsefulHours || 4000)));
                            }}
                            className="text-[10px] px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                            title={`Cargar datos de ${preset.name} (${preset.averageWatts}W, ${formatMoney(preset.purchasePriceCLP, settings)})`}
                          >
                            {preset.model} ({preset.averageWatts}W)
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        value={adhocPrinterName}
                        onChange={(e) => setAdhocPrinterName(e.target.value)}
                        placeholder="Ej: Anet A8, Ender 3 V1, CR-10, Artillery, etc."
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Consumo Eléctrico (Watts)</label>
                        <input
                          type="number"
                          value={adhocPrinterWatts}
                          onChange={(e) => setAdhocPrinterWatts(parseInt(e.target.value, 10) || 100)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                        />
                        <span className="text-[10px] text-slate-400">Típico FDM: 80 - 200W</span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Inversión / Precio Compra ($ CLP)</label>
                        <input
                          type="number"
                          step="10000"
                          value={adhocPrinterInvestment}
                          onChange={(e) => setAdhocPrinterInvestment(parseInt(e.target.value, 10) || 0)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                        />
                        <span className="text-[10px] text-slate-400">Para amortización de máquina</span>
                      </div>
                    </div>
                    {onSaveNewPrinter && (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">¿Deseas agregarla a tu catálogo permanente?</span>
                        <button
                          type="button"
                          onClick={handleQuickSavePrinter}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer"
                        >
                          {printerSavedSuccess ? '✓ Guardada' : '+ Guardar en Mi Flota'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Material Section */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Material y Filamento
                  </label>
                  <div className="flex items-center gap-2">
                    {materials.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setManualMaterialMode(!manualMaterialMode)}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                      >
                        {manualMaterialMode ? 'Elegir de mi inventario' : '+ Ingresar datos directamente'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveWhyExplanation(activeWhyExplanation === 'material' ? null : 'material')}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>¿Por qué?</span>
                    </button>
                  </div>
                </div>

                {activeWhyExplanation === 'material' && (
                  <div className="mb-2 p-2.5 bg-blue-50 border border-blue-200 text-blue-900 text-[11px] rounded-lg">
                    El costo por gramo se obtiene directamente del precio de la bobina dividido en su peso neto.
                  </div>
                )}

                {!manualMaterialMode && materials.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedMaterialId}
                      onChange={(e) => setSelectedMaterialId(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.color}) — ${m.costPerGramCLP}/g
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Precio Bobina ($ CLP)</label>
                        <input
                          type="number"
                          step="500"
                          value={customSpoolPrice ?? currentMaterial.spoolPriceCLP}
                          onChange={(e) => setCustomSpoolPrice(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Peso Bobina (g)</label>
                        <input
                          type="number"
                          value={customSpoolWeight ?? currentMaterial.spoolWeightGrams}
                          onChange={(e) => setCustomSpoolWeight(parseInt(e.target.value, 10) || 1000)}
                          className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Nombre del Material</label>
                        <input
                          type="text"
                          value={adhocMaterialName}
                          onChange={(e) => setAdhocMaterialName(e.target.value)}
                          placeholder="Ej: PLA Negro Pro, PETG Gris"
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Tipo de Polímero</label>
                        <select
                          value={adhocMaterialType}
                          onChange={(e) => setAdhocMaterialType(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        >
                          <option value="PLA">PLA Estándar</option>
                          <option value="PLA+">PLA+</option>
                          <option value="PETG">PETG</option>
                          <option value="ABS">ABS</option>
                          <option value="ASA">ASA</option>
                          <option value="TPU">TPU / Flexible</option>
                          <option value="Resina">Resina UV</option>
                          <option value="Nylon">Nylon / PA</option>
                          <option value="Otro">Otro polímero</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Precio Bobina ($ CLP)</label>
                        <input
                          type="number"
                          step="500"
                          value={adhocSpoolPrice}
                          onChange={(e) => setAdhocSpoolPrice(parseInt(e.target.value, 10) || 0)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Peso Neto Bobina (g)</label>
                        <input
                          type="number"
                          value={adhocSpoolWeight}
                          onChange={(e) => setAdhocSpoolWeight(parseInt(e.target.value, 10) || 1000)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-2 bg-white border border-slate-200 rounded flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-500">Costo real resultante:</span>
                      <span className="font-bold text-emerald-700">
                        ${(adhocSpoolWeight > 0 ? adhocSpoolPrice / adhocSpoolWeight : 0).toFixed(2)} CLP / gramo
                      </span>
                    </div>

                    {onSaveNewMaterial && (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">¿Deseas agregar este filamento a tu inventario?</span>
                        <button
                          type="button"
                          onClick={handleQuickSaveMaterial}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer"
                        >
                          {materialSavedSuccess ? '✓ Guardado' : '+ Guardar en Mi Inventario'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Slicing Parameters & Weight */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Peso de la Pieza (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={partWeightGrams === 0 ? '' : partWeightGrams}
                    onChange={(e) => setPartWeightGrams(e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums font-semibold"
                  />
                  <span className="text-[10px] text-slate-400">Peso neto reportado por el Slicer</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Peso de Soportes (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={supportWeightGrams === 0 ? '' : supportWeightGrams}
                    onChange={(e) => setSupportWeightGrams(e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                  />
                  <span className="text-[10px] text-slate-400">Material consumido en soportes</span>
                </div>
              </div>

              {/* Slicing quality & nozzle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Calidad (Altura de Capa)
                  </label>
                  <select
                    value={layerHeightMm}
                    onChange={(e) => setLayerHeightMm(parseFloat(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value={0.06}>Ultra Fina — 0.06 mm (Detalle máximo)</option>
                    <option value={0.1}>Fina — 0.10 mm (Alta calidad)</option>
                    <option value={0.16}>Media — 0.16 mm (Equilibrada)</option>
                    <option value={0.2}>Estándar — 0.20 mm (Rápida)</option>
                    <option value={0.28}>Borrador — 0.28 mm (Prototipo rápido)</option>
                  </select>
                  <span className="text-[10px] text-slate-400">Capas más finas = más tiempo y mejor acabado</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Boquilla (mm)
                  </label>
                  <select
                    value={nozzleDiameterMm}
                    onChange={(e) => setNozzleDiameterMm(parseFloat(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value={0.25}>0.25 mm (Detalles finos)</option>
                    <option value={0.4}>0.40 mm (Estándar de fábrica)</option>
                    <option value={0.6}>0.60 mm (Impresión más rápida)</option>
                    <option value={0.8}>0.80 mm (Alto caudal / piezas grandes)</option>
                  </select>
                  <span className="text-[10px] text-slate-400">Boquillas gruesas imprimen más rápido con menos detalle</span>
                </div>
              </div>

              {supportWeightGrams > partWeightGrams && partWeightGrams > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Atención: El peso de soportes supera el peso de la pieza. Revisa la orientación del modelo.</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Tiempo de Impresión (Horas)
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveWhyExplanation(activeWhyExplanation === 'print_hours' ? null : 'print_hours')}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>¿Por qué me preguntas esto?</span>
                  </button>
                </div>

                {activeWhyExplanation === 'print_hours' && (
                  <div className="mb-2 p-2.5 bg-blue-50 border border-blue-200 text-blue-900 text-[11px] rounded-lg">
                    La hora de máquina es totalmente independiente de la hora hombre: solo paga consumo eléctrico y recuperación de la impresora.
                  </div>
                )}

                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={printHours === 0 ? '' : printHours}
                  onChange={(e) => setPrintHours(e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.0"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums font-semibold"
                />
                <span className="text-[10px] text-slate-400">Tiempo total de ocupación de la cama caliente</span>
              </div>
            </div>
          )}

          {/* STEP 4: Multicolor & License */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800">
                      ¿Es impresión multicolor / multimaterial?
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Uso de sistema de cambio automático (Bambu AMS, MMU, etc.)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isMulticolor}
                    onChange={(e) => setIsMulticolor(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>

                {isMulticolor && (
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Cantidad de Colores
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="8"
                        value={colorCount}
                        onChange={(e) => setColorCount(parseInt(e.target.value, 10) || 2)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Gramos de Purga y Torre
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={purgeGrams === 0 ? '' : purgeGrams}
                        onChange={(e) => setPurgeGrams(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                        placeholder="0"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Commercial License Verification */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Licencia y Origen del Archivo 3D
                </label>
                <select
                  value={modelOrigin}
                  onChange={(e) => setModelOrigin(e.target.value as ModelOrigin)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="client_file">Archivo entregado por el cliente</option>
                  <option value="download_free">Modelo descargado gratuitamente (Thingiverse/Printables)</option>
                  <option value="commercial_license">Modelo con suscripción / licencia comercial (Patreon, Thangs)</option>
                  <option value="in_house_design">Diseño propio del taller</option>
                  <option value="custom_from_scratch">Diseño y desarrollo desde cero</option>
                </select>

                {modelOrigin === 'download_free' && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-900 space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-700" />
                      <span>Advertencia de Propiedad Intelectual</span>
                    </div>
                    <p>
                      Verificar licencia de uso comercial antes de comercializar la impresión. Si la licencia es Creative Commons No Comercial (CC-BY-NC), no puede venderse comercialmente.
                    </p>
                    <label className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        checked={modelLicenseVerified}
                        onChange={(e) => setModelLicenseVerified(e.target.checked)}
                        className="w-3.5 h-3.5 text-amber-600 rounded"
                      />
                      <span className="font-medium text-[11px]">He verificado que este modelo cuenta con autorización comercial</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Labor, Postprocessing & Painting */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Diseño y Modelado CAD (minutos)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {designMinutes > 0 ? `${designMinutes} min = ${(designMinutes / 60).toFixed(2)} hrs` : '0 min'}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={designMinutes === 0 ? '' : designMinutes}
                    onChange={(e) => setDesignMinutes(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="0 min"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg tabular-nums font-medium"
                  />
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {[15, 30, 45, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDesignMinutes(mins)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          designMinutes === mins
                            ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                    {designMinutes > 0 && (
                      <button
                        type="button"
                        onClick={() => setDesignMinutes(0)}
                        className="text-[10px] px-1.5 py-0.5 rounded text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                        title="Quitar tiempo de diseño CAD"
                      >
                        0m
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Tarifa: {formatRate(calculationResult?.breakdown.laborHourlyRateCLP ?? 0, settings)}/hr (~{formatRate(Math.round((calculationResult?.breakdown.laborHourlyRateCLP || 0) / 60), settings)}/min)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preparación / Slicing (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={prepMinutes === 0 ? '' : prepMinutes}
                    onChange={(e) => setPrepMinutes(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg tabular-nums"
                  />
                  <span className="text-[10px] text-slate-400">Orientación y calibración</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nivel de Acabado y Postprocesado
                </label>
                <select
                  value={finishingType}
                  onChange={(e) => {
                    const val = e.target.value as FinishingType;
                    setFinishingType(val);
                    if (val === 'none') setFinishingMinutes(0);
                    else if (val === 'basic_cleaning') setFinishingMinutes(10);
                    else if (val === 'sanding') setFinishingMinutes(25);
                    else if (val === 'sanding_primer') setFinishingMinutes(45);
                    else setFinishingMinutes(60);
                  }}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="none">Sin acabado (en bruto)</option>
                  <option value="basic_cleaning">Limpieza básica y retiro de soportes (10 min)</option>
                  <option value="sanding">Lijado progresivo al agua (25 min)</option>
                  <option value="sanding_primer">Lijado e imprimación / primer (45 min)</option>
                  <option value="premium_finishing">Acabado premium de alta textura (60 min)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nivel de Pintura
                  </label>
                  <select
                    value={paintingLevel}
                    onChange={(e) => {
                      const val = e.target.value as PaintingLevel;
                      setPaintingLevel(val);
                      if (val === 'none') {
                        setPaintingMinutes(0);
                        setPaintingSuppliesCostCLP(0);
                      } else if (val === 'basic') {
                        setPaintingMinutes(30);
                        setPaintingSuppliesCostCLP(2500);
                      } else if (val === 'detailed') {
                        setPaintingMinutes(60);
                        setPaintingSuppliesCostCLP(5000);
                      } else {
                        setPaintingMinutes(120);
                        setPaintingSuppliesCostCLP(9000);
                      }
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="none">Sin pintura</option>
                    <option value="basic">Pintura básica monocolor</option>
                    <option value="detailed">Pintura detallada multicapa</option>
                    <option value="collector">Nivel coleccionista / aerógrafo</option>
                  </select>
                  {paintingLevel !== 'none' && (
                    <span className="text-[10px] text-amber-600">
                      Plazo mínimo de pintado: 5 días hábiles · Insumos bajo "Gastos Pintura" y mano de obra cobrada aparte
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ensamblaje & Tornillos ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={assemblyHardwareCostCLP === 0 ? '' : assemblyHardwareCostCLP}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                      setAssemblyHardwareCostCLP(val);
                      setAssemblyMinutes(val > 0 ? 15 : 0);
                    }}
                    placeholder="0"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg tabular-nums"
                  />
                  <span className="text-[10px] text-slate-400">Insertos roscados, imanes, pernos</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Quantity, Urgency & Pro Overrides */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cantidad a Fabricar (Serie)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg tabular-nums font-semibold"
                  />
                  <span className="text-[10px] text-slate-400">
                    {quantity >= 10 ? 'Aplica escala de descuento por serie' : 'Pieza unitaria'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Plazo y Urgencia
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="normal">Estándar (Turno regular)</option>
                    <option value="priority">Prioritaria (+15% recargo)</option>
                    <option value="urgent">Express / Urgente (+30% recargo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    + Días Aproximados (solo impresión)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={extraDeliveryDays}
                    onChange={(e) => setExtraDeliveryDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg tabular-nums font-semibold"
                  />
                  <span className="text-[10px] text-slate-400">
                    Suma al plazo calculado (ej: 4 días + 3 = 7 días hábiles)
                  </span>
                </div>
              </div>

              {/* Directly Editable Margins & Rates */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Margen de Ganancia y Tarifas Editables
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Todos los costos son modificables
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Modo de Cálculo de Utilidad
                    </label>
                    <select
                      value={customProfitMode}
                      onChange={(e) => setCustomProfitMode(e.target.value as ProfitCalculationMode)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white"
                    >
                      <option value="margin">Margen real (Precio = Costo / (1 - M))</option>
                      <option value="markup">Markup recargo (Precio = Costo × (1 + M))</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      % Utilidad / Margen Objetivo
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={customProfitPercent}
                      onChange={(e) => setCustomProfitPercent(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md tabular-nums font-bold text-emerald-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Costo Electricidad ($ CLP/kWh)
                    </label>
                    <input
                      type="number"
                      min="50"
                      value={customElectricityKwhCLP ?? settings.kwhPriceCLP}
                      onChange={(e) => setCustomElectricityKwhCLP(parseFloat(e.target.value) || 210)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md tabular-nums font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Tarifa Mano de Obra ($ CLP/hr)
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={customHourlyLaborRateCLP ?? calculationResult?.breakdown.laborHourlyRateCLP}
                      onChange={(e) => setCustomHourlyLaborRateCLP(parseFloat(e.target.value) || undefined)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md tabular-nums font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      % Descuento Adicional
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={customDiscountPercent === 0 ? '' : customDiscountPercent}
                      onChange={(e) => setCustomDiscountPercent(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                      placeholder="0%"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Costo Amortización Máquina ($ CLP/hr)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={adhocPrinterHourlyRate}
                      onChange={(e) => setAdhocPrinterHourlyRate(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md tabular-nums font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Footer Controls */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md disabled:opacity-40 cursor-pointer"
            >
              Anterior
            </button>

            {currentStep < 6 ? (
              <button
                onClick={() => setCurrentStep(prev => Math.min(6, prev + 1))}
                className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Siguiente paso</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Datos listos para cotizar</span>
              </span>
            )}
          </div>
        </div>

        {/* COLUMN 3: RIGHT - Real-Time Incremental Cost Breakdown & Commercial Preview (4 cols on lg) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          
          {/* Header & View Switcher */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-semibold text-slate-900">
                {showCommercialPreview ? 'Vista Cotización Cliente' : 'Costo Real Interno'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {showCommercialPreview ? 'Conceptos comerciales limpios' : 'Desglose técnico confidencial'}
              </p>
            </div>

            <button
              onClick={() => setShowCommercialPreview(!showCommercialPreview)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-md text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showCommercialPreview ? 'Ver Interno' : 'Ver Cliente'}</span>
            </button>
          </div>

          {calculationResult && !showCommercialPreview && (
            /* Detailed Internal Cost Stack (Confidential) */
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Material neto ({calculationResult.breakdown.totalMaterialGrams}g)</span>
                <span className="font-mono font-medium text-slate-800 tabular-nums">
                  {formatMoney(calculationResult.breakdown.totalMaterialCostCLP, settings)}
                </span>
              </div>

              {calculationResult.breakdown.materialPurgeCostCLP > 0 && (
                <div className="flex justify-between py-0.5 text-slate-500 pl-2">
                  <span>↳ Purgas multicolor</span>
                  <span className="font-mono tabular-nums">
                    {formatMoney(calculationResult.breakdown.materialPurgeCostCLP, settings)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Máquina & Amortización ({printHours} hrs)</span>
                <span className="font-mono font-medium text-slate-800 tabular-nums">
                  {formatMoney(calculationResult.breakdown.machineRecoveryCostCLP, settings)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Consumo Eléctrico</span>
                <span className="font-mono font-medium text-slate-800 tabular-nums">
                  {formatMoney(calculationResult.breakdown.electricityCostCLP, settings)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Mantenimiento & Repuestos</span>
                <span className="font-mono font-medium text-slate-800 tabular-nums">
                  {formatMoney((calculationResult.breakdown.maintenanceCostCLP + calculationResult.breakdown.repairReserveCostCLP), settings)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Mano de Obra ({calculationResult.breakdown.totalLaborHours} hrs)</span>
                <span className="font-mono font-medium text-slate-800 tabular-nums">
                  {formatMoney(calculationResult.breakdown.totalLaborCostCLP, settings)}
                </span>
              </div>

              {calculationResult.breakdown.totalSuppliesCostCLP > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>Insumos y Embalaje</span>
                  <span className="font-mono font-medium text-slate-800 tabular-nums">
                    {formatMoney(calculationResult.breakdown.totalSuppliesCostCLP, settings)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Gastos Generales & Mermas</span>
                <span className="font-mono font-medium text-slate-800 tabular-nums">
                  {formatMoney((calculationResult.breakdown.overheadAllocationCostCLP + calculationResult.breakdown.failureRiskCostCLP), settings)}
                </span>
              </div>

              {/* Subtotal Costo Real */}
              <div className="pt-2 flex justify-between font-semibold text-slate-900 border-t border-slate-200">
                <span>Costo Total Interno</span>
                <span className="font-mono tabular-nums">
                  {formatMoney(calculationResult.breakdown.totalInternalCostCLP, settings)}
                </span>
              </div>

              {/* Profit */}
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Utilidad Taller ({calculationResult.breakdown.appliedProfitPercent}%)</span>
                <span className="font-mono tabular-nums">
                  +{formatMoney(calculationResult.breakdown.totalNetProfitCLP, settings)}
                </span>
              </div>

              {/* Minimum floor notification */}
              {calculationResult.breakdown.isMinPriceApplied && (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>Aplicada tarifa mínima de fabricación ($5.000)</span>
                </div>
              )}
            </div>
          )}

          {calculationResult && showCommercialPreview && (
            /* Clean Commercial Items (What the customer sees!) */
            <div className="space-y-2 text-xs">
              <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg mb-2">
                🔒 El cliente solo ve estos conceptos profesionales. Costo eléctrico, amortización y sueldo quedan ocultos.
              </div>

              {calculationResult.commercialItems.map((item) => (
                <div key={item.id} className="py-1.5 border-b border-slate-100 flex justify-between items-start">
                  <div className="pr-3">
                    <div className="font-medium text-slate-800 flex items-center gap-1.5">
                      {item.concept}
                      {item.concept.includes('Fabricación 3D') && (
                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Calidad {describePrintQualityLabel(layerHeightMm)}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">{item.quantity} un.</div>
                    {item.description && (
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5 max-w-[240px]">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatMoney(item.totalNetCLP, settings)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Totals Box: Neto, IVA, Total */}
          {calculationResult && (
            <div className="pt-3 border-t-2 border-slate-900 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal Neto</span>
                <span className="font-mono font-semibold text-slate-800 tabular-nums">
                  {formatMoney(calculationResult.breakdown.subtotalNetCLP, settings)}
                </span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>{taxLabelOf(settings)} ({(settings.ivaRate * 100).toFixed(0)}%)</span>
                <span className="font-mono font-semibold text-slate-800 tabular-nums">
                  {formatMoney(calculationResult.breakdown.ivaCLP, settings)}
                </span>
              </div>

              <div className="flex justify-between text-sm font-bold text-slate-950 pt-2 border-t border-slate-200">
                <span>PRECIO TOTAL (CLP)</span>
                <span className="font-mono text-base text-emerald-600 tabular-nums">
                  {formatMoney(calculationResult.breakdown.finalTotalCLP, settings)}
                </span>
              </div>

              {quantity > 1 && (
                <div className="text-[11px] text-right text-slate-500 font-mono">
                  {formatMoney(calculationResult.breakdown.unitPriceFinalCLP, settings)} c/u con {taxLabelOf(settings)}
                </div>
              )}

              {/* Payment conditions preview */}
              <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span>Anticipo 50% para inicio:</span>
                  <span className="font-mono font-semibold">
                    {formatMoney(Math.round(calculationResult.breakdown.finalTotalCLP * 0.5), settings)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Saldo 50% contra aviso:</span>
                  <span className="font-mono">
                    {formatMoney(Math.round(calculationResult.breakdown.finalTotalCLP * 0.5), settings)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Condiciones comerciales y notas editables */}
          <div className="pt-2 space-y-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Condiciones Comerciales (editables)
              </label>
              <textarea
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                rows={3}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notas Adicionales (editables)
              </label>
              <textarea
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                rows={2}
                placeholder="Deja vacío para usar la nota automática (modelo, material, acabado)"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg resize-y"
              />
            </div>
          </div>

          {/* Action Buttons: Math Audit & Official Quote Creation */}
          <div className="pt-2 space-y-2">
            <button
              onClick={() => {
                if (calculationResult && currentCustomer && currentPrinter && currentMaterial) {
                  // Temporary quote object for audit viewing
                  const tempQuote: Quote = {
                    id: 'temp_audit',
                    quoteNumber: 'COT-AUDITORIA',
                    customerId: currentCustomer.id,
                    customerName: currentCustomer.name,
                    customerRut: currentCustomer.rut,
                    customerEmail: currentCustomer.email,
                    projectName,
                    status: 'draft',
                    createdAt: new Date().toISOString(),
                    validUntil: new Date().toISOString(),
                    estimatedDeliveryDays: Math.max(3, paintingLevel !== 'none' ? 5 : 0),
                    extraDeliveryDays: Math.max(0, extraDeliveryDays || 0),
                    printerId: currentPrinter.id,
                    printerName: currentPrinter.name,
                    materialId: currentMaterial.id,
                    materialName: currentMaterial.name,
                    materialColor: currentMaterial.color,
                    partWeightGrams,
                    supportWeightGrams,
                    isMulticolor,
                    colorCount: isMulticolor ? colorCount : 1,
                    purgeGrams: isMulticolor ? purgeGrams : 0,
                    printHours,
                    layerHeightMm,
                    nozzleDiameterMm,
                    modelOrigin,
                    isLicenseCommercialSafe: true,
                    quantity,
                    urgency,
                    costBreakdown: calculationResult.breakdown,
                    commercialItems: calculationResult.commercialItems,
                    subtotalNetCLP: calculationResult.breakdown.subtotalNetCLP,
                    discountCLP: calculationResult.breakdown.volumeDiscountCLP,
                    ivaCLP: calculationResult.breakdown.ivaCLP,
                    totalCLP: calculationResult.breakdown.finalTotalCLP,
                    downPaymentPercent: 50,
                    downPaymentCLP: Math.round(calculationResult.breakdown.finalTotalCLP * 0.5),
                    balanceCLP: Math.round(calculationResult.breakdown.finalTotalCLP * 0.5),
                    paymentStatus: 'unpaid',
                    termsConditions: termsConditions.trim() || 'Validez 15 días corridos.'
                  };
                  onOpenAudit(tempQuote);
                }
              }}
              className="w-full py-2 px-3 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-medium"
            >
              <Info className="w-3.5 h-3.5" />
              <span>¿Cómo se obtuvo este precio? (Auditoría)</span>
            </button>

            <button
              onClick={handleSaveQuote}
              disabled={hasCriticalInconsistencies}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-300 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <FileCheck className="w-4 h-4 stroke-[2.5]" />
              <span>Generar Cotización y Ver PDF A4</span>
            </button>
          </div>
        </div>

      </div>

      {/* Confirmación antes de limpiar el costeo si hay datos ingresados */}
      <ConfirmDialog
        open={clearFormConfirm}
        variant="warning"
        title="¿Limpiar el costeo?"
        description="Hay datos ingresados en este costeo. Si lo limpias, se perderán todos los valores y volverás al paso 1."
        confirmLabel="Sí, limpiar"
        onConfirm={() => {
          setClearFormConfirm(false);
          handleClearForm();
        }}
        onCancel={() => setClearFormConfirm(false)}
      />

    </div>
  );
};
