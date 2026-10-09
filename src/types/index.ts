export type ProfitCalculationMode = 'markup' | 'margin';

export interface BusinessSettings {
  workshopName: string;
  workshopLogo?: string; // data URL (base64) del logo del taller
  rut: string;
  giro: string;
  address: string;
  commune: string;
  city: string;
  phone: string;
  email: string;
  website: string;

  // Currency & locale. Every amount is stored in this currency, so the same
  // data set works in any country.
  currencyCode: string;   // ISO 4217, e.g. 'CLP', 'USD', 'EUR', 'MXN'
  currencyLocale: string; // BCP-47 locale used to format amounts and dates
  taxLabel?: string;      // sales tax name, e.g. 'IVA', 'VAT', 'Sales Tax'
  taxIdLabel?: string;    // business tax id label, e.g. 'RUT', 'RFC', 'NIT'
  regionLabel?: string;   // sub-national division label, e.g. 'Comuna', 'Estado'

  // Economic & Labor Settings
  monthlyTargetSalaryCLP: number; // e.g. 1.000.000 in the workshop currency
  monthlyAvailableHours: number;  // e.g. 180 hrs
  monthlyProductiveHours: number; // e.g. 140 hrs
  monthlyBillableHours: number;   // e.g. 120 hrs -> hora_hombre = target / billable
  
  // Profit & Tax Settings
  profitMode: ProfitCalculationMode; // 'markup' (cost * 1.3) or 'margin' (cost / (1 - 0.3))
  defaultProfitPercent: number;      // e.g. 30%
  ivaRate: number;                   // sales tax rate as a fraction, e.g. 0.19
  
  // Overhead & Cost Factors
  kwhPriceCLP: number;               // e.g. 210 CLP/kWh
  defaultMaintenancePercent: number; // e.g. 10%
  defaultRepairReservePerHourCLP: number; // e.g. 250 CLP/hr
  defaultFailureRatePercent: number; // e.g. 8% (1 of ~12 prints fail)
  monthlyOverheadCLP: number;        // e.g. 120.000 CLP (internet, software, CAD, tools)
  minManufacturingPriceCLP: number;  // e.g. 5.000 CLP minimum floor
  paymentCommissionPercent: number;  // e.g. 3.0% (Transbank / WebPay)
  targetInvestmentRecoveryMonths: number; // e.g. 12 months
  
  // Consecutive Numbering Settings (editable and starting from 0)
  quoteCounter?: number;        // e.g. 0, 1, 2...
  quotePrefix?: string;         // e.g. 'COT-'
  workOrderCounter?: number;    // e.g. 0, 1, 2...
  workOrderPrefix?: string;     // e.g. 'OT-'
  numberPadding?: number;       // e.g. 4 for 0000, 0001, etc.

  // Bank account (used in quotes and bank transfer payments)
  bankName?: string;
  bankAccountType?: string;
  bankAccountNumber?: string;
  bankHolderName?: string;
  bankHolderRut?: string;
  bankHolderEmail?: string;
  paymentMethodLabel?: string;  // e.g. 'Transferencia Electrónica'

  // Payment receipts
  receiptCounter?: number;      // comprobantes de pago, starts at 0
  receiptPrefix?: string;       // e.g. 'REC-'
}

export interface Printer {
  id: string;
  name: string;
  brand: string;
  model: string;
  purchasePriceCLP: number;
  accessoriesCLP: number;
  totalInvestmentCLP: number;
  purchaseDate: string;
  estimatedUsefulHours: number;
  averageWatts: number;
  minWatts: number;
  maxWatts: number;
  targetMonthlyHours: number;
  maintenancePercent: number;
  repairReservePerHourCLP: number;
  status: 'available' | 'printing' | 'maintenance' | 'offline';
  location: string;
  serialNumber?: string;
  totalHoursPrinted: number;
  accumulatedRecoveryCLP: number;
  notes?: string;
}

export type MaterialType = 'PLA' | 'PLA+' | 'PETG' | 'ABS' | 'ASA' | 'TPU' | 'Resina' | 'Nylon' | 'Otro';

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  brand: string;
  color: string;
  spoolWeightGrams: number;
  spoolPriceCLP: number;
  costPerGramCLP: number;
  stockGrams: number;
  lotNumber?: string;
  location?: string;
  supplier?: string;
  densityGcm3?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'paint' | 'hardware' | 'packaging' | 'tooling' | 'consumable';
  unit: string; // 'unidad', 'ml', 'pliego', 'caja'
  unitCostCLP: number;
  stock: number;
  minStock: number;
  location?: string;
}

export interface Customer {
  id: string;
  name: string;
  companyName?: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
  commune: string;
  customerType: 'particular' | 'empresa';
  giro?: string;
  notes?: string;
  totalSpentCLP: number;
}

export type ModelOrigin = 
  | 'client_file' 
  | 'download_free' 
  | 'commercial_license' 
  | 'in_house_design' 
  | 'custom_from_scratch';

export type FinishingType = 
  | 'none' 
  | 'basic_cleaning' 
  | 'sanding' 
  | 'sanding_primer' 
  | 'premium_finishing';

export type PaintingLevel = 
  | 'none' 
  | 'basic' 
  | 'intermediate' 
  | 'detailed' 
  | 'collector';

export type PackagingType = 
  | 'standard' 
  | 'reinforced' 
  | 'figure_box' 
  | 'custom_foam';

export type UrgencyLevel = 'normal' | 'priority' | 'urgent';

export interface CostCalculationInput {
  // Model & Printer
  printerId: string;
  materialId: string;
  partWeightGrams: number;
  supportWeightGrams: number;
  printHours: number;
  
  // Multicolor
  isMulticolor: boolean;
  colorCount: number;
  purgeGrams: number;
  purgeTowerGrams: number;
  filamentSwitchesCount: number;
  
  // Waste & Failure
  scrapPercent?: number; // material waste factor
  failureRatePercent?: number; // failure rate override
  
  // Labor Breakdown
  designHours: number;
  designMinutes?: number;
  designType: 'none' | 'scratch' | 'stl_repair' | 'customization' | 'reverse_engineering';
  designRevisionsIncluded: number;
  extraRevisionsCount: number;
  
  prepManufacturingMinutes: number; // slicing, plate preparation, printer prep
  postProcessingMinutes: number;   // support removal, basic deburring
  
  // Finishing & Paint
  finishingType: FinishingType;
  finishingMinutes: number;
  
  paintingLevel: PaintingLevel;
  paintingMinutes: number;
  paintingSuppliesCostCLP: number;
  
  // Assembly & Hardware
  assemblyMinutes: number;
  assemblyHardwareCostCLP: number;
  
  // Quality & Packaging
  qualityControlMinutes: number;
  packagingType: PackagingType;
  packagingSuppliesCostCLP: number;
  
  // Slicing quality (drives the customer-facing Fabricación 3D description)
  layerHeightMm?: number;    // e.g. 0.10, 0.20
  nozzleDiameterMm?: number; // e.g. 0.40, 0.60

  // Commercial & Quantity
  quantity: number; // Volume discount applicability
  urgency: UrgencyLevel;
  customDiscountPercent?: number;
  
  // Custom Overrides
  customElectricityKwhCLP?: number;
  customHourlyLaborRateCLP?: number;
  customMachineHourlyRateCLP?: number;
  customProfitPercent?: number;
  customProfitMode?: ProfitCalculationMode;
}

export interface DetailedCostItem {
  id: string;
  category: string;
  name: string;
  formulaDescription: string;
  quantityUnits: string;
  unitRateCLP: number;
  totalCostCLP: number;
  source: 'configuration' | 'printer_catalog' | 'material_catalog' | 'slicer' | 'calculated' | 'manual';
}

export interface CostBreakdown {
  // Material Costs
  materialPartCostCLP: number;
  materialSupportCostCLP: number;
  materialPurgeCostCLP: number;
  materialWasteCostCLP: number;
  totalMaterialCostCLP: number;
  totalMaterialGrams: number;
  
  // Machine Costs
  machineRecoveryCostCLP: number;
  machineHourlyRateCLP: number;
  electricityCostCLP: number;
  maintenanceCostCLP: number;
  repairReserveCostCLP: number;
  totalMachineCostCLP: number;
  
  // Labor Costs
  laborHourlyRateCLP: number;
  designLaborCostCLP: number;
  preparationLaborCostCLP: number;
  postProcessingLaborCostCLP: number;
  finishingLaborCostCLP: number;
  paintingLaborCostCLP: number;
  assemblyLaborCostCLP: number;
  qualityControlLaborCostCLP: number;
  totalLaborHours: number;
  totalLaborCostCLP: number;
  
  // Direct Supplies
  paintingSuppliesCostCLP: number;
  assemblyHardwareCostCLP: number;
  packagingSuppliesCostCLP: number;
  totalSuppliesCostCLP: number;
  
  // Overheads & Risk
  overheadAllocationCostCLP: number;
  failureRiskCostCLP: number;
  
  // Subtotal Cost
  baseUnitCostCLP: number;
  totalInternalCostCLP: number; // Total for the entire batch
  
  // Commercial Calculation
  appliedProfitPercent: number;
  profitMode: ProfitCalculationMode;
  unitNetProfitCLP: number;
  totalNetProfitCLP: number;
  
  urgencySurchargeCLP: number;
  volumeDiscountPercent: number;
  volumeDiscountCLP: number;
  
  // Minimum fee enforcement
  isMinPriceApplied: boolean;
  minPriceAdjustmentCLP: number;
  
  // Final Totals
  subtotalNetCLP: number;
  ivaRate: number;
  ivaCLP: number;
  finalTotalCLP: number;
  
  unitPriceNetCLP: number;
  unitPriceFinalCLP: number;
  
  // Audit details
  auditTrail: DetailedCostItem[];
}

export interface CommercialItem {
  id: string;
  concept: string;
  description: string;
  quantity: number;
  unitPriceNetCLP: number;
  totalNetCLP: number;
}

export interface Quote {
  id: string;
  quoteNumber: string; // e.g. "COT-2024-0082"
  customerId: string;
  customerName: string;
  customerRut: string;
  customerEmail: string;
  customerPhone?: string;
  projectName: string;
  status: 'draft' | 'sent' | 'accepted' | 'in_production' | 'completed' | 'delivered' | 'cancelled';
  createdAt: string;
  validUntil: string;
  estimatedDeliveryDays: number;
  extraDeliveryDays?: number; // "+ días aproximados" editable por cotización (solo impresión)
  
  // Slicing and Spec Inputs
  printerId: string;
  printerName: string;
  materialId: string;
  materialName: string;
  materialColor: string;
  
  partWeightGrams: number;
  supportWeightGrams: number;
  isMulticolor: boolean;
  colorCount: number;
  purgeGrams: number;
  printHours: number;
  
  modelOrigin: ModelOrigin;
  modelLicenseNote?: string;
  isLicenseCommercialSafe: boolean;
  
  quantity: number;
  urgency: UrgencyLevel;

  // Slicing parameters (editable in costeo step 3)
  layerHeightMm?: number;    // Calidad: altura de capa (ej: 0.12, 0.20, 0.28)
  nozzleDiameterMm?: number; // Boquilla (ej: 0.25, 0.40, 0.60, 0.80)
  
  // Complete internal cost breakdown
  costBreakdown: CostBreakdown;

  /** Snapshot del formulario de costeo (los 6 pasos). Permite copiar los requisitos
   *  de esta cotización a un costeo nuevo para un trabajo similar. */
  costInput?: CostCalculationInput;

  // Customer-facing commercial items (clean, professional concepts)
  commercialItems: CommercialItem[];
  
  // Financial Summary
  subtotalNetCLP: number;
  discountCLP: number;
  ivaCLP: number;
  totalCLP: number;
  
  // Payment terms
  downPaymentPercent: number; // e.g. 50%
  downPaymentCLP: number;
  balanceCLP: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  
  termsConditions: string;
  notes?: string;
}

export interface WorkOrder {
  id: string;
  orderNumber: string; // e.g. "OT-2024-0043"
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  projectName: string;
  printerName: string;
  materialName: string;
  color: string;
  
  quantity: number;
  partWeightGrams: number;
  supportWeightGrams: number;
  purgeGrams: number;
  totalGramsRequired: number;
  printHoursEstimated: number;
  
  status: 'queued' | 'printing' | 'post_processing' | 'quality_check' | 'ready_for_dispatch' | 'completed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  
  finishingInstructions: string;
  paintingInstructions?: string;
  assemblyInstructions?: string;
  
  qaChecks: {
    visualOk: boolean;
    dimensionalOk: boolean;
    assemblyOk: boolean;
    notes: string;
  };
  responsibleTechnician: string;
}

export interface PaymentRecord {
  id: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  amountCLP: number;
  date: string;
  paymentType: 'down_payment' | 'final_payment' | 'full_payment' | 'installment';
  method: 'transferencia' | 'efectivo' | 'debito' | 'credito' | 'webpay' | 'otro';
  referenceNumber: string;
  receiptNumber: string;
  notes?: string;
}
