import React, { useState } from 'react';
import { X, DollarSign, CheckCircle } from 'lucide-react';
import { Quote, PaymentRecord, BusinessSettings } from '../../types';

interface PaymentModalProps {
  quote: Quote;
  settings?: BusinessSettings;
  onSavePayment: (payment: PaymentRecord) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  quote,
  settings,
  onSavePayment,
  onClose
}) => {
  const [amount, setAmount] = useState<number>(quote.balanceCLP > 0 ? quote.balanceCLP : quote.downPaymentCLP);
  const [method, setMethod] = useState<PaymentRecord['method']>('transferencia');
  const [referenceNumber, setReferenceNumber] = useState(`TRF-${Math.floor(100000 + Math.random() * 900000)}`);
  const [receiptNumber, setReceiptNumber] = useState(
    `${settings?.receiptPrefix || 'REC-'}${String(settings?.receiptCounter ?? 0).padStart(settings?.numberPadding ?? 4, '0')}`
  );
  const [paymentType, setPaymentType] = useState<PaymentRecord['paymentType']>(
    quote.paymentStatus === 'unpaid' ? 'down_payment' : 'final_payment'
  );
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    const payment: PaymentRecord = {
      id: `pay_${Date.now()}`,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      amountCLP: amount,
      date: new Date().toISOString(),
      paymentType,
      method,
      referenceNumber,
      receiptNumber,
      notes
    };

    onSavePayment(payment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Registrar Abono o Pago
            </h2>
            <p className="text-[11px] text-slate-500">
              {quote.quoteNumber} · {quote.customerName}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Balance Summary */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-3 gap-2 text-xs text-center font-mono">
          <div>
            <span className="text-[10px] text-slate-400 block font-sans">Total</span>
            <span className="font-bold text-slate-900">${quote.totalCLP.toLocaleString('es-CL')}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-sans">Abonado</span>
            <span className="font-bold text-blue-700">
              ${(quote.totalCLP - quote.balanceCLP).toLocaleString('es-CL')}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-sans">Saldo</span>
            <span className="font-bold text-emerald-700">${quote.balanceCLP.toLocaleString('es-CL')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tipo de Pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentType('down_payment');
                  setAmount(quote.downPaymentCLP);
                }}
                className={`py-1.5 px-2 border rounded text-xs cursor-pointer ${
                  paymentType === 'down_payment' ? 'border-slate-900 bg-slate-50 font-bold text-slate-900' : 'border-slate-200 text-slate-600'
                }`}
              >
                Anticipo 50% (${quote.downPaymentCLP.toLocaleString('es-CL')})
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentType('final_payment');
                  setAmount(quote.balanceCLP > 0 ? quote.balanceCLP : quote.totalCLP);
                }}
                className={`py-1.5 px-2 border rounded text-xs cursor-pointer ${
                  paymentType === 'final_payment' ? 'border-slate-900 bg-slate-50 font-bold text-slate-900' : 'border-slate-200 text-slate-600'
                }`}
              >
                Saldo Final (${quote.balanceCLP.toLocaleString('es-CL')})
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Monto a Registrar ($ CLP)
            </label>
            <input
              type="number"
              required
              min="100"
              max={quote.totalCLP}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm font-bold tabular-nums"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Método de Pago
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentRecord['method'])}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="efectivo">Efectivo en Taller</option>
                <option value="debito">Tarjeta Débito (POS)</option>
                <option value="credito">Tarjeta Crédito</option>
                <option value="webpay">Webpay / Online</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                N° de Operación / Comprobante
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              N° Comprobante de Pago (editable)
            </label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
            />
            <span className="text-[10px] text-slate-400">
              Número inicial definido en Configuración del Negocio
            </span>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Notas Adicionales
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Ej: Acreditado en ${settings?.bankName || 'el banco indicado'}`}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Registrar Pago</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
