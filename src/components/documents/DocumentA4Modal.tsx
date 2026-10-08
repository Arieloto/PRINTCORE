import React, { useEffect, useState } from 'react';
import { 
  X, 
  Printer as PrintIcon, 
  FileText, 
  CheckSquare, 
  DollarSign, 
  Calculator
} from 'lucide-react';
import { Quote, BusinessSettings, WorkOrder, PaymentRecord } from '../../types';
import { buildWorkOrderInstructions } from '../../services/workOrderInstructions';

export type DocumentType = 
  | 'cotizacion' 
  | 'orden' 
  | 'pago' 
  | 'auditoria';

interface DocumentA4ModalProps {
  quote: Quote;
  settings: BusinessSettings;
  workOrder?: WorkOrder;
  paymentRecord?: PaymentRecord;
  initialType?: DocumentType;
  onClose: () => void;
}

export const DocumentA4Modal: React.FC<DocumentA4ModalProps> = ({
  quote,
  settings,
  workOrder,
  paymentRecord,
  initialType = 'cotizacion',
  onClose
}) => {
  const [docType, setDocType] = useState<DocumentType>(initialType);
  const defaultWorkOrderInstructions = buildWorkOrderInstructions(quote);

  // Marca el body mientras el documento está abierto para que al imprimir/PDF
  // salga solo el documento y no la app de fondo (ver index.css @media print).
  useEffect(() => {
    document.body.classList.add('a4-print-open');
    return () => document.body.classList.remove('a4-print-open');
  }, []);

  const methodLabel = (method: PaymentRecord['method']): string => {
    const labels: Record<PaymentRecord['method'], string> = {
      transferencia: 'Transferencia Bancaria',
      efectivo: 'Efectivo en Taller',
      debito: 'Tarjeta Débito',
      credito: 'Tarjeta Crédito',
      webpay: 'Webpay / Online',
      otro: 'Otro'
    };
    return labels[method] || String(method);
  };

  const qualityLabel = (layerHeightMm?: number): string => {
    const h = layerHeightMm ?? 0.2;
    if (h <= 0.08) return `Premium — ${h} mm`;
    if (h <= 0.12) return `Alta — ${h} mm`;
    if (h <= 0.17) return `Equilibrada — ${h} mm`;
    if (h <= 0.24) return `Estándar — ${h} mm`;
    return `Prototipo — ${h} mm`;
  };

  const handlePrint = () => {
    // Refuerzo: garantiza el aislamiento antes de abrir el diálogo del sistema,
    // incluso si React aún no aplicó el efecto o la clase se perdió.
    document.body.classList.add('a4-print-open');
    window.print();
  };

  return (
    <div className="a4-print-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static">
      
      {/* Modal Container */}
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Modal Top Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 no-print">
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-400">
              Documentos A4
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-300 font-mono">
              {quote.quoteNumber}
            </span>
          </div>

          {/* Document Type Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg overflow-x-auto">
            <button
              onClick={() => setDocType('cotizacion')}
              className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                docType === 'cotizacion' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Cotización Cliente</span>
            </button>

            <button
              onClick={() => setDocType('orden')}
              className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                docType === 'orden' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Orden de Trabajo</span>
            </button>

            <button
              onClick={() => setDocType('pago')}
              className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                docType === 'pago' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Comprobante Pago</span>
            </button>

            <button
              onClick={() => setDocType('auditoria')}
              className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                docType === 'auditoria' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Auditoría Costos</span>
            </button>
          </div>

          {/* Print & Close Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white text-slate-900 font-semibold text-xs rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PrintIcon className="w-3.5 h-3.5" />
              <span>Imprimir / PDF A4</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Body: Styled as an authentic A4 sheet (210mm x 297mm proportions) */}
        <div className="p-6 md:p-10 bg-slate-100 print:bg-white overflow-y-auto max-h-[85vh] print:max-h-none print:p-0">
          
          <div className="a4-page mx-auto bg-white p-8 md:p-12 shadow-sm border border-slate-200 print:border-none print:shadow-none max-w-3xl text-slate-900 min-h-[900px] flex flex-col justify-between text-xs">
            
            {/* 1. COTIZACIÓN COMERCIAL (Clean, Zero Internal Secrets) */}
            {docType === 'cotizacion' && (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                
                {/* Header */}
                <div>
                  <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900">
                    <div>
                      <div className="flex items-center gap-2">
                        {settings.workshopLogo ? (
                          <img
                            src={settings.workshopLogo}
                            alt={settings.workshopName || 'Logo'}
                            className="h-9 w-auto max-w-[120px] object-contain"
                          />
                        ) : (
                          <div className="w-7 h-7 bg-slate-900 text-white rounded font-bold text-xs flex items-center justify-center">
                            3D
                          </div>
                        )}
                        <h1 className="text-lg font-bold tracking-tight text-slate-950">
                          {settings.workshopName}
                        </h1>
                      </div>
                      <p className="text-slate-600 mt-1">{settings.giro}</p>
                      <p className="text-slate-500 text-[11px]">RUT: {settings.rut} · {settings.commune}, {settings.city}</p>
                      <p className="text-slate-500 text-[11px]">{settings.email} · {settings.phone}</p>
                    </div>

                    <div className="text-right">
                      <div className="inline-block bg-slate-900 text-white px-3 py-1 font-bold tracking-wider text-xs">
                        COTIZACIÓN
                      </div>
                      <div className="font-mono text-sm font-bold mt-2 text-slate-900">
                        {quote.quoteNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Emisión: {new Date(quote.createdAt).toLocaleDateString('es-CL')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Válida hasta: {new Date(quote.validUntil).toLocaleDateString('es-CL')}
                      </div>
                    </div>
                  </div>

                  {/* Customer Information Block */}
                  <div className="grid grid-cols-2 gap-6 my-6 p-3 bg-slate-50 rounded border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Cliente / Razón Social
                      </span>
                      <div className="font-semibold text-slate-900 text-sm mt-0.5">
                        {quote.customerName}
                      </div>
                      <div className="text-slate-600 mt-0.5">RUT: {quote.customerRut}</div>
                      <div className="text-slate-500">{quote.customerEmail}</div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Proyecto
                      </span>
                      <div className="font-semibold text-slate-900 text-sm mt-0.5">
                        {quote.projectName}
                      </div>
                      <div className="text-slate-600 mt-0.5">
                        Plazo estimado: {quote.estimatedDeliveryDays} días hábiles
                        {(quote.extraDeliveryDays ?? 0) > 0 && (
                          <> (+{quote.extraDeliveryDays} días aproximados)</>
                        )}
                      </div>
                      <div className="text-slate-500">
                        Material de fabricación: {quote.materialName} ({quote.materialColor})
                      </div>
                      <div className="text-slate-500">
                        Calidad de impresión: {qualityLabel(quote.layerHeightMm)} · Boquilla {quote.nozzleDiameterMm || 0.4} mm
                      </div>
                    </div>
                  </div>

                  {/* Clean Commercial Table (NO internal costs!) */}
                  <table className="w-full text-left border-collapse mt-4">
                    <thead>
                      <tr className="border-b-2 border-slate-900 text-[11px] font-bold uppercase text-slate-700">
                        <th className="py-2">Concepto</th>
                        <th className="py-2">Descripción Técnica del Servicio</th>
                        <th className="py-2 text-center w-16">Cant.</th>
                        <th className="py-2 text-right w-24">Unitario</th>
                        <th className="py-2 text-right w-24">Total Neto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {quote.commercialItems.map((item) => (
                        <tr key={item.id} className="py-2">
                          <td className="py-2.5 font-semibold text-slate-900 pr-2">
                            {item.concept}
                          </td>
                          <td className="py-2.5 text-slate-600 text-[11px] pr-2">
                            {item.description}
                          </td>
                          <td className="py-2.5 text-center font-mono tabular-nums">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                            ${item.unitPriceNetCLP.toLocaleString('es-CL')}
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                            ${item.totalNetCLP.toLocaleString('es-CL')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals & Payment Conditions */}
                <div className="pt-6 border-t-2 border-slate-900 space-y-4">
                  <div className="flex justify-between items-start">
                    
                    {/* Bank Details for Transfer */}
                    <div className="w-1/2 p-3 bg-slate-50 rounded border border-slate-200 text-[11px] space-y-1">
                      <div className="font-bold text-slate-800">
                        Datos para Transferencia Bancaria (Chile)
                      </div>
                      <div className="text-slate-600">Banco: {settings.bankName || '—'}</div>
                      <div className="text-slate-600">Tipo de cuenta: {settings.bankAccountType || '—'}</div>
                      <div className="text-slate-600">N° Cuenta: {settings.bankAccountNumber || '—'}</div>
                      <div className="text-slate-600">Titular: {settings.bankHolderName || settings.workshopName}</div>
                      <div className="text-slate-600">RUT: {settings.bankHolderRut || settings.rut}</div>
                      <div className="text-slate-600">Email: {settings.bankHolderEmail || settings.email}</div>
                    </div>

                    {/* Financial Summary */}
                    <div className="w-2/5 space-y-1.5 text-right text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal Neto:</span>
                        <span className="font-mono font-medium tabular-nums">
                          ${quote.subtotalNetCLP.toLocaleString('es-CL')} CLP
                        </span>
                      </div>

                      {quote.discountCLP > 0 && (
                        <div className="flex justify-between text-emerald-700">
                          <span>Descuento Comercial:</span>
                          <span className="font-mono tabular-nums">
                            -${quote.discountCLP.toLocaleString('es-CL')} CLP
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-slate-600">
                        <span>IVA (19%):</span>
                        <span className="font-mono font-medium tabular-nums">
                          ${quote.ivaCLP.toLocaleString('es-CL')} CLP
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-3 text-sm font-bold text-slate-950 pt-2 border-t border-slate-300">
                        <span>TOTAL:</span>
                        <span className="font-mono text-base text-slate-900 tabular-nums">
                          ${quote.totalCLP.toLocaleString('es-CL')}{' '}
                          <span className="text-[10px] font-sans text-slate-400">CLP</span>
                        </span>
                      </div>

                      <div className="pt-2 text-[11px] text-slate-500">
                        <div>Anticipo 50%: ${quote.downPaymentCLP.toLocaleString('es-CL')} CLP</div>
                        <div>Saldo contra aviso: ${quote.balanceCLP.toLocaleString('es-CL')} CLP</div>
                      </div>
                    </div>
                  </div>

                  {/* Terms and Signatures */}
                  <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-500">
                    <p className="font-semibold text-slate-700">Condiciones comerciales:</p>
                    <p>{quote.termsConditions}</p>
                    <p className="mt-1">
                      Para confirmar la producción de este trabajo, favor transferir el anticipo del 50% y enviar el comprobante indicando el número de cotización {quote.quoteNumber}.
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* 2. ORDEN DE TRABAJO TÉCNICA (Workshop Floor Sheet) */}
            {docType === 'orden' && (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
                    <div>
                      <div className="inline-block bg-slate-900 text-white px-2.5 py-0.5 font-bold text-xs tracking-wider">
                        HOJA DE TALLER & PRODUCCIÓN
                      </div>
                      <h1 className="text-base font-bold text-slate-900 mt-2">
                        Orden de Trabajo {workOrder ? workOrder.orderNumber : `OT-${quote.quoteNumber.replace('COT-', '')}`}
                      </h1>
                      <p className="text-slate-500 text-[11px]">
                        Ref. Cotización: {quote.quoteNumber} · Cliente: {quote.customerName}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-800">
                        Fecha: {new Date().toLocaleDateString('es-CL')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Técnico: {workOrder?.responsibleTechnician || 'Operador de Turno'}
                      </div>
                      <div className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        PRIORIDAD: {quote.urgency.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Technical Print Spec Grid */}
                  <div className="grid grid-cols-3 gap-3 my-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Máquina Asignada</span>
                      <div className="font-bold text-slate-800 mt-1">{quote.printerName}</div>
                      <div className="text-[11px] text-slate-500">Cama limpia y placa PEI</div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Material & Color</span>
                      <div className="font-bold text-slate-800 mt-1">{quote.materialName}</div>
                      <div className="text-[11px] text-slate-500">Color: {quote.materialColor}</div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tiempo & Cantidad</span>
                      <div className="font-bold text-slate-800 mt-1">{quote.printHours} Horas / {quote.quantity} un.</div>
                      <div className="text-[11px] text-slate-500">Tiempo total de ocupación</div>
                    </div>
                  </div>

                  {/* Slicing Parameters: Quality & Nozzle */}
                  {(quote.layerHeightMm || quote.nozzleDiameterMm) && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Calidad (Altura de Capa)</span>
                        <div className="font-bold text-slate-800 mt-1">{quote.layerHeightMm || 0.2} mm</div>
                        <div className="text-[11px] text-slate-500">Perfil de slicing seleccionado</div>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Boquilla</span>
                        <div className="font-bold text-slate-800 mt-1">{quote.nozzleDiameterMm || 0.4} mm</div>
                        <div className="text-[11px] text-slate-500">Diámetro de extrusión</div>
                      </div>
                    </div>
                  )}

                  {/* Weights Breakdown for Slicing Verification */}
                  <div className="p-3 border border-slate-200 rounded bg-slate-50/50 space-y-2">
                    <div className="text-xs font-bold text-slate-800">
                      Consumo de Filamento Verificado en Slicer:
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                      <div>Pieza: <span className="font-bold">{quote.partWeightGrams}g</span></div>
                      <div>Soportes: <span className="font-bold">{quote.supportWeightGrams}g</span></div>
                      <div>Purgas: <span className="font-bold">{quote.purgeGrams}g</span></div>
                      <div className="text-emerald-700">Total: <span className="font-bold">{quote.costBreakdown.totalMaterialGrams}g</span></div>
                    </div>
                  </div>

                  {/* Post-processing & Assembly Instructions */}
                  <div className="mt-4 space-y-3">
                    <div className="p-3 border border-slate-200 rounded">
                      <div className="text-xs font-bold text-slate-800 mb-1">
                        Instrucciones de Postprocesado y Acabado
                      </div>
                      <p className="text-slate-600 text-[11px]">
                        {workOrder?.finishingInstructions || defaultWorkOrderInstructions.finishing}
                      </p>
                    </div>

                    {(workOrder?.paintingInstructions || defaultWorkOrderInstructions.painting) && (
                      <div className="p-3 border border-slate-200 rounded">
                        <div className="text-xs font-bold text-slate-800 mb-1">
                          Instrucciones de Pintura
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          {workOrder?.paintingInstructions || defaultWorkOrderInstructions.painting}
                        </p>
                      </div>
                    )}

                    <div className="p-3 border border-slate-200 rounded">
                      <div className="text-xs font-bold text-slate-800 mb-1">
                        Instrucciones de Ensamblaje
                      </div>
                      <p className="text-slate-600 text-[11px]">
                        {workOrder?.assemblyInstructions || defaultWorkOrderInstructions.assembly}
                        </p>
                      </div>
                  </div>

                  {/* Quality Control Checklist (Mandatory for workshop floor) */}
                  <div className="mt-4 p-4 border-2 border-dashed border-slate-300 rounded space-y-2">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Control de Calidad (Completar antes de empaque)
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-emerald-600" />
                        <span>Inspección visual: Sin delaminación, sin warping en esquinas, primera capa uniforme.</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-emerald-600" />
                        <span>Control dimensional: Calibración con pie de metro según tolerancia especificada (±0.2mm).</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 rounded text-emerald-600" />
                        <span>Ajuste mecánico: Acople de tornillos, insertos o imanes según plano de diseño.</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Sign-off box */}
                <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-[11px] text-slate-500">
                  <div>
                    <span>Observaciones de taller: _________________________________________________</span>
                  </div>
                  <div className="text-center">
                    <div className="w-40 border-b border-slate-400 mb-1"></div>
                    <span>Firma Operador / Control Calidad</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. COMPROBANTE DE PAGO / ABONO */}
            {docType === 'pago' && (
              <div className="space-y-6 flex-1 flex flex-col justify-between max-w-lg mx-auto">
                <div className="border-2 border-slate-900 p-6 rounded-lg space-y-5">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      {settings.workshopLogo && (
                        <img
                          src={settings.workshopLogo}
                          alt={settings.workshopName || 'Logo'}
                          className="h-8 w-auto max-w-[90px] object-contain"
                        />
                      )}
                      <div>
                        <div className="font-bold text-sm text-slate-900">{settings.workshopName}</div>
                        <div className="text-[11px] text-slate-500">RUT: {settings.rut}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-700">COMPROBANTE DE INGRESO</div>
                      <div className="text-xs font-mono">N° {paymentRecord ? paymentRecord.receiptNumber : `${settings.receiptPrefix || 'REC-'}${String(settings.receiptCounter ?? 0).padStart(settings.numberPadding ?? 4, '0')}`}</div>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500">Recibimos de:</span>
                      <div className="font-bold text-slate-900 text-sm">{quote.customerName}</div>
                      <div className="text-slate-600">RUT: {quote.customerRut}</div>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                      <span className="text-emerald-800 text-[11px] font-semibold block">La suma de:</span>
                      <div className="text-lg font-bold font-mono text-emerald-900">
                        ${(paymentRecord?.amountCLP || quote.downPaymentCLP).toLocaleString('es-CL')} CLP
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">
                        Por concepto de: Anticipo 50% fabricación proyecto {quote.projectName}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div><span className="font-semibold">Fecha:</span> {new Date().toLocaleDateString('es-CL')}</div>
                      <div><span className="font-semibold">Método:</span> {paymentRecord?.method ? methodLabel(paymentRecord.method) : (settings.paymentMethodLabel || 'Transferencia Electrónica')}</div>
                      <div><span className="font-semibold">Referencia:</span> {paymentRecord?.referenceNumber || '—'}</div>
                      <div><span className="font-semibold">Saldo restante:</span> ${quote.balanceCLP.toLocaleString('es-CL')} CLP</div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 text-center">
                    <div className="w-48 mx-auto border-b border-slate-400 mb-1"></div>
                    <div className="text-[11px] text-slate-600 font-semibold">{settings.workshopName}</div>
                    <div className="text-[10px] text-slate-400">Comprobante de Caja y Taller</div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. AUDITORÍA MATEMÁTICA DE COSTOS (Internal Traceability) */}
            {docType === 'auditoria' && (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
                    <div>
                      <div className="inline-block bg-slate-900 text-white px-2.5 py-0.5 font-bold text-xs">
                        AUDITORÍA MATEMÁTICA DE COSTOS INTERNOS
                      </div>
                      <h1 className="text-base font-bold text-slate-900 mt-2">
                        Trazabilidad de Precios: {quote.projectName}
                      </h1>
                      <p className="text-slate-500 text-[11px]">
                        Ref. {quote.quoteNumber} · Máquina: {quote.printerName} · Filamento: {quote.materialName}
                      </p>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <div className="text-slate-500">Costo Real Interno:</div>
                      <div className="text-base font-bold text-slate-900">
                        ${quote.costBreakdown.totalInternalCostCLP.toLocaleString('es-CL')}
                      </div>
                      <div className="text-emerald-700 font-semibold">
                        Utilidad: +${quote.costBreakdown.totalNetProfitCLP.toLocaleString('es-CL')} ({quote.costBreakdown.appliedProfitPercent}%)
                      </div>
                    </div>
                  </div>

                  {/* Audit Trail List with exact formulas */}
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-bold text-slate-800">
                      Desglose de Factores y Fórmulas Matemáticas:
                    </div>

                    <div className="border border-slate-200 rounded divide-y divide-slate-100 text-xs">
                      {quote.costBreakdown.auditTrail.map((item) => (
                        <div key={item.id} className="p-2.5 flex justify-between items-start">
                          <div className="pr-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{item.name}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {item.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                              {item.formulaDescription}
                            </p>
                          </div>
                          <div className="text-right shrink-0 font-mono">
                            <div className="font-bold text-slate-900">
                              ${item.totalCostCLP.toLocaleString('es-CL')}
                            </div>
                            <div className="text-[10px] text-slate-400">{item.quantityUnits}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
                  <span>Generado por PrintCore 3D Engine · Registro para control de rentabilidad</span>
                  <span className="font-mono">Fecha: {new Date().toLocaleString('es-CL')}</span>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
