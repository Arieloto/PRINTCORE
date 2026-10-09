import React, { useState } from 'react';
import { 
  Search, 
  Copy, 
  FileText, 
  Layers, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Trash2
} from 'lucide-react';
import { BusinessSettings, Quote } from '../../types';
import { formatDate, formatMoney } from '../../services/currency';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface QuoteListProps {
  settings: BusinessSettings;
  quotes: Quote[];
  onOpenDocument: (quote: Quote, docType: 'cotizacion' | 'orden' | 'pago' | 'auditoria') => void;
  /** Copia los requisitos de esta cotización al costeo inteligente (trabajo similar). */
  onCopyRequirementsToWizard: (quote: Quote) => void;
  onGenerateWorkOrder: (quote: Quote) => void;
  onRecordPayment: (quote: Quote) => void;
  onStatusChange: (quoteId: string, newStatus: Quote['status']) => void;
  onNewQuoteClick: () => void;
  onDeleteQuote?: (quoteId: string) => void;
  /** IDs de cotizaciones con pagos registrados: su eliminación exige escribir ELIMINAR. */
  paidQuoteIds?: string[];
}

export const QuoteList: React.FC<QuoteListProps> = ({
  quotes,
  settings,
  onOpenDocument,
  onCopyRequirementsToWizard,
  onGenerateWorkOrder,
  onRecordPayment,
  onStatusChange,
  onNewQuoteClick,
  onDeleteQuote,
  paidQuoteIds
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; quoteNumber: string } | null>(null);

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = 
      q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && q.status === statusFilter;
  });

  const getStatusBadge = (status: Quote['status']) => {
    switch (status) {
      case 'draft':
        return <span className="text-slate-600 font-medium">Borrador</span>;
      case 'sent':
        return <span className="text-blue-600 font-medium">Enviada al Cliente</span>;
      case 'accepted':
        return <span className="text-emerald-600 font-medium">Aceptada</span>;
      case 'in_production':
        return <span className="text-purple-600 font-medium">En Producción</span>;
      case 'completed':
        return <span className="text-indigo-600 font-medium">Terminada</span>;
      case 'delivered':
        return <span className="text-teal-600 font-medium">Entregada</span>;
      case 'cancelled':
        return <span className="text-rose-600 font-medium">Anulada</span>;
      default:
        return <span className="text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Cotizaciones Comerciales
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión completa de cotizaciones, anticipos, copia de requisitos para trabajos similares y órdenes de taller
          </p>
        </div>

        <button
          onClick={onNewQuoteClick}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span>+ Crear Cotización</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número, cliente o proyecto..."
            className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({quotes.length})
          </button>
          <button
            onClick={() => setStatusFilter('in_production')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === 'in_production' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            En Producción
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === 'draft' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Borradores
          </button>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">N° Cotización</th>
                <th className="py-3 px-4">Cliente & Proyecto</th>
                <th className="py-3 px-4">Máquina & Material</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Pago</th>
                <th className="py-3 px-4 text-right">Total CLP</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron cotizaciones con los criterios indicados.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Number & Date */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{q.quoteNumber}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(q.createdAt, settings)}
                      </div>
                    </td>

                    {/* Customer & Project */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{q.projectName}</div>
                      <div className="text-slate-500 text-[11px] truncate">
                        {q.customerName} · <span className="font-mono">{q.customerRut}</span>
                      </div>
                    </td>

                    {/* Printer & Material */}
                    <td className="py-3 px-4 text-slate-600">
                      <div>{q.printerName}</div>
                      <div className="text-[11px] text-slate-400">
                        {q.materialName} ({q.materialColor}) · {q.partWeightGrams}g
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <select
                        value={q.status}
                        onChange={(e) => onStatusChange(q.id, e.target.value as Quote['status'])}
                        className="text-xs px-2 py-1 rounded border border-slate-200 bg-white font-medium focus:outline-none"
                      >
                        <option value="draft">Borrador</option>
                        <option value="sent">Enviada</option>
                        <option value="accepted">Aceptada</option>
                        <option value="in_production">En Producción</option>
                        <option value="completed">Terminada</option>
                        <option value="delivered">Entregada</option>
                        <option value="cancelled">Anulada</option>
                      </select>
                    </td>

                    {/* Payment Status */}
                    <td className="py-3 px-4 text-center">
                      {q.paymentStatus === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>100% Pagado</span>
                        </span>
                      ) : q.paymentStatus === 'partial' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Abonado 50%</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Pendiente</span>
                        </span>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono">
                        Saldo: {formatMoney(q.balanceCLP, settings)}
                      </div>
                    </td>

                    {/* Total Price */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-bold text-slate-900 tabular-nums">
                        {formatMoney(q.totalCLP, settings)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Neto: {formatMoney(q.subtotalNetCLP, settings)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* A4 Document Generator */}
                        <button
                          onClick={() => onOpenDocument(q, 'cotizacion')}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Ver cotización, orden de trabajo, comprobante de pago o auditoría"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {/* Generate Work Order */}
                        <button
                          onClick={() => onGenerateWorkOrder(q)}
                          className="p-1.5 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                          title="Generar Orden de Trabajo para Taller"
                        >
                          <Layers className="w-4 h-4" />
                        </button>

                        {/* Record Payment */}
                        <button
                          onClick={() => onRecordPayment(q)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          title="Registrar Abono o Pago Final"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>

                        {/* Copy requirements to a new costeo (similar job) */}
                        <button
                          onClick={() => onCopyRequirementsToWizard(q)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title={`Copiar requisitos de ${q.quoteNumber} al costeo (trabajo similar)`}
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Delete Quote */}
                        {onDeleteQuote && (
                          <button
                            onClick={() => setDeleteConfirm({ id: q.id, quoteNumber: q.quoteNumber })}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Eliminar cotización"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteConfirm}
        variant="danger"
        title={deleteConfirm && paidQuoteIds?.includes(deleteConfirm.id) ? '¿Eliminar cotización con pagos registrados?' : '¿Eliminar cotización?'}
        description={
          deleteConfirm && paidQuoteIds?.includes(deleteConfirm.id) ? (
            <>
              La cotización <span className="font-semibold text-slate-800">{deleteConfirm.quoteNumber}</span> tiene <span className="font-semibold text-rose-700">pagos registrados</span>. Al eliminarla se pierde también el registro de pagos y comprobantes. Esta acción no se puede deshacer.
            </>
          ) : (
            <>
              ¿Estás seguro de que deseas eliminar permanentemente la cotización <span className="font-semibold text-slate-800">{deleteConfirm?.quoteNumber}</span>? Esta acción no se puede deshacer.
            </>
          )
        }
        confirmLabel="Sí, eliminar"
        requireText={deleteConfirm && paidQuoteIds?.includes(deleteConfirm.id) ? 'ELIMINAR' : undefined}
        onConfirm={() => {
          if (onDeleteQuote && deleteConfirm) onDeleteQuote(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />

    </div>
  );
};
