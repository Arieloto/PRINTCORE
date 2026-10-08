import React, { useEffect, useState } from 'react';
import { 
  Layers, 
  Printer as PrinterIcon, 
  CheckCircle2, 
  FileText, 
  PackageMinus
} from 'lucide-react';
import { WorkOrder, Quote } from '../../types';
import { buildWorkOrderInstructions } from '../../services/workOrderInstructions';

interface WorkOrdersViewProps {
  workOrders: WorkOrder[];
  quotes: Quote[];
  onOpenDocument: (quote: Quote, docType: 'orden') => void;
  onUpdateOrderStatus: (orderId: string, status: WorkOrder['status']) => void;
  onToggleQACheck: (orderId: string, checkKey: 'visualOk' | 'dimensionalOk' | 'assemblyOk') => void;
  onUpdateInstructions: (
    orderId: string,
    key: 'finishingInstructions' | 'paintingInstructions' | 'assemblyInstructions',
    value: string
  ) => void;
  onDeductInventory: (order: WorkOrder) => void;
}

interface InstructionEditorProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
}

const InstructionEditor: React.FC<InstructionEditorProps> = ({ label, value, onSave }) => {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setDraft(value);
    setSaved(true);
  }, [value]);

  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
      <textarea
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setSaved(false);
        }}
        rows={3}
        className="w-full resize-y rounded border border-slate-200 bg-white p-2 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
      />
      <button
        type="button"
        disabled={saved}
        onClick={() => {
          onSave(draft);
          setSaved(true);
        }}
        className="rounded bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-default disabled:opacity-50"
      >
        Guardar instrucciones
      </button>
    </label>
  );
};

export const WorkOrdersView: React.FC<WorkOrdersViewProps> = ({
  workOrders,
  quotes,
  onOpenDocument,
  onUpdateOrderStatus,
  onToggleQACheck,
  onUpdateInstructions,
  onDeductInventory
}) => {
  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Gestión de Producción & Taller
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Órdenes de trabajo, trazabilidad de material consumido, inspección dimensional y hojas de cama
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Órdenes activas:</span>
          <span className="font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
            {workOrders.filter(w => w.status !== 'completed').length}
          </span>
        </div>
      </div>

      {/* Orders Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workOrders.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p>No hay órdenes de trabajo en el taller actualmente.</p>
            <p className="text-xs text-slate-400 mt-1">
              Genera una orden desde una cotización aprobada.
            </p>
          </div>
        ) : (
          workOrders.map((wo) => {
            const relatedQuote = quotes.find(q => q.id === wo.quoteId);
            const defaultInstructions = relatedQuote ? buildWorkOrderInstructions(relatedQuote) : null;

            return (
              <div 
                key={wo.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-4"
              >
                {/* Top Card Info */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {wo.orderNumber}
                      </span>
                      <div className="text-[11px] text-slate-500">
                        Ref: {wo.quoteNumber}
                      </div>
                    </div>

                    <select
                      value={wo.status}
                      onChange={(e) => onUpdateOrderStatus(wo.id, e.target.value as WorkOrder['status'])}
                      className="text-xs px-2 py-1 rounded border border-slate-200 bg-white font-medium focus:outline-none"
                    >
                      <option value="queued">En cola</option>
                      <option value="printing">Imprimiendo</option>
                      <option value="post_processing">Postprocesado</option>
                      <option value="quality_check">Control Calidad</option>
                      <option value="ready_for_dispatch">Listo Despacho</option>
                      <option value="completed">Completada</option>
                    </select>
                  </div>

                  <h3 className="font-semibold text-sm text-slate-900 mt-2 truncate">
                    {wo.projectName}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    Cliente: {wo.customerName}
                  </p>

                  {/* Machine & Filament badges */}
                  <div className="grid grid-cols-2 gap-2 my-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Máquina</div>
                      <div className="font-medium text-slate-800 truncate">{wo.printerName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Filamento</div>
                      <div className="font-medium text-slate-800 truncate">{wo.materialName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Tiempo Est.</div>
                      <div className="font-mono font-semibold text-slate-800">{wo.printHoursEstimated} hrs</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Gramos Totales</div>
                      <div className="font-mono font-semibold text-emerald-700">{wo.totalGramsRequired}g</div>
                    </div>
                  </div>

                  <details className="border-t border-slate-100 pt-2">
                    <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Instrucciones de producción
                    </summary>
                    <div className="mt-3 space-y-3">
                      <InstructionEditor
                        label="Postprocesado y acabado"
                        value={wo.finishingInstructions || defaultInstructions?.finishing || ''}
                        onSave={(value) => onUpdateInstructions(wo.id, 'finishingInstructions', value)}
                      />
                      {(wo.paintingInstructions || defaultInstructions?.painting) && (
                        <InstructionEditor
                          label="Pintura"
                          value={wo.paintingInstructions || defaultInstructions?.painting || ''}
                          onSave={(value) => onUpdateInstructions(wo.id, 'paintingInstructions', value)}
                        />
                      )}
                      <InstructionEditor
                        label="Ensamblaje"
                        value={wo.assemblyInstructions || defaultInstructions?.assembly || ''}
                        onSave={(value) => onUpdateInstructions(wo.id, 'assemblyInstructions', value)}
                      />
                    </div>
                  </details>

                  {/* QA Checklist */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      Control de Calidad (Taller)
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wo.qaChecks.visualOk}
                        onChange={() => onToggleQACheck(wo.id, 'visualOk')}
                        className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                      />
                      <span className={wo.qaChecks.visualOk ? 'text-slate-800' : 'text-slate-400'}>
                        Inspección visual (sin warping)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wo.qaChecks.dimensionalOk}
                        onChange={() => onToggleQACheck(wo.id, 'dimensionalOk')}
                        className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                      />
                      <span className={wo.qaChecks.dimensionalOk ? 'text-slate-800' : 'text-slate-400'}>
                        Control dimensional (±0.2mm)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wo.qaChecks.assemblyOk}
                        onChange={() => onToggleQACheck(wo.id, 'assemblyOk')}
                        className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                      />
                      <span className={wo.qaChecks.assemblyOk ? 'text-slate-800' : 'text-slate-400'}>
                        Ajuste mecánico e insertos
                      </span>
                    </label>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onDeductInventory(wo)}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 transition-colors cursor-pointer"
                    title="Descuenta los gramos reales de la bobina en inventario"
                  >
                    <PackageMinus className="w-3.5 h-3.5" />
                    <span>Descontar Filamento</span>
                  </button>

                  {relatedQuote && (
                    <button
                      onClick={() => onOpenDocument(relatedQuote, 'orden')}
                      className="px-2.5 py-1 text-[11px] font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded flex items-center gap-1 transition-colors cursor-pointer"
                      title="Imprimir hoja física A4 para la máquina"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Hoja A4</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
