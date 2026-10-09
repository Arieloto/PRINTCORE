import React, { useState } from 'react';
import {
  Check,
  Image
} from 'lucide-react';
import { BusinessSettings, ProfitCalculationMode } from '../../types';
import { currencyCodeOf, CURRENCY_PRESETS, formatMoney, formatRate, regionLabelOf, taxIdLabelOf, taxLabelOf } from '../../services/currency';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface BusinessSettingsViewProps {
  settings: BusinessSettings;
  onSaveSettings: (settings: BusinessSettings) => void;
  onClearAllData?: () => void;
  onResetDemoData?: () => void;
}

export const BusinessSettingsView: React.FC<BusinessSettingsViewProps> = ({
  settings,
  onSaveSettings,
  onClearAllData,
  onResetDemoData
}) => {
  const [form, setForm] = useState<BusinessSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [blankConfirm, setBlankConfirm] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);

  const confirmSave = () => {
    setSaveConfirm(false);
    onSaveSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const calculatedHourlyLaborRate = Math.round(
    form.monthlyTargetSalaryCLP / Math.max(1, form.monthlyBillableHours)
  );

  const handleSetBlank = () => {
    setForm({
      ...form,
      workshopName: '',
      rut: '',
      giro: '',
      address: '',
      commune: '',
      city: '',
      phone: '',
      email: '',
      website: '',
      monthlyTargetSalaryCLP: 0,
      monthlyOverheadCLP: 0,
      minManufacturingPriceCLP: 0,
      paymentCommissionPercent: 0
    });
    setBlankConfirm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveConfirm(true);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Configuración del Negocio & Motor de Costos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define tu taller, sueldo objetivo, horas de producción, costo eléctrico, impuestos y parámetros de margen
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBlankConfirm(true)}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Deja todos los campos en blanco para que ingreses tus datos sin ejemplos"
          >
            Dejar Cuadros en Blanco
          </button>

          {onClearAllData && (
            <button
              type="button"
              onClick={() => setClearAllConfirm(true)}
              className="px-3 py-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              title="Borra todos los datos de prueba y deja el sistema completamente limpio para ti"
            >
              Limpiar Taller a Cero
            </button>
          )}

          {savedSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Guardado</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 0. Moneda, idioma de números y etiquetas regionales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Moneda y formato regional
            </h2>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {formatMoney(1234567, form)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Moneda del taller
              </label>
              <select
                value={form.currencyCode}
                onChange={(e) => {
                  const preset = CURRENCY_PRESETS.find((item) => item.code === e.target.value);
                  setForm({
                    ...form,
                    currencyCode: e.target.value,
                    currencyLocale: preset?.locale ?? form.currencyLocale
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {!CURRENCY_PRESETS.some((preset) => preset.code === form.currencyCode) && (
                  <option value={form.currencyCode}>{form.currencyCode}</option>
                )}
                {CURRENCY_PRESETS.map((preset) => (
                  <option key={preset.code} value={preset.code}>
                    {preset.code} — {preset.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400">
                Todos los montos se guardan y calculan en esta moneda
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Formato de números y fechas
              </label>
              <select
                value={form.currencyLocale}
                onChange={(e) => setForm({ ...form, currencyLocale: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {[form.currencyLocale, ...CURRENCY_PRESETS.map((preset) => preset.locale)]
                  .filter((locale, index, all) => locale && all.indexOf(locale) === index)
                  .map((locale) => (
                    <option key={locale} value={locale}>{locale}</option>
                  ))}
              </select>
              <span className="text-[10px] text-slate-400">
                Separadores de miles y decimales usados en toda la app
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre del impuesto a las ventas
              </label>
              <input
                type="text"
                value={form.taxLabel ?? ''}
                onChange={(e) => setForm({ ...form, taxLabel: e.target.value })}
                placeholder="IVA"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <span className="text-[10px] text-slate-400">IVA, VAT, Sales Tax, IGV…</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Identificador tributario de la empresa
              </label>
              <input
                type="text"
                value={form.taxIdLabel ?? ''}
                onChange={(e) => setForm({ ...form, taxIdLabel: e.target.value })}
                placeholder="RUT"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <span className="text-[10px] text-slate-400">RUT, RFC, NIT, RUC, Tax ID…</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                División administrativa
              </label>
              <input
                type="text"
                value={form.regionLabel ?? ''}
                onChange={(e) => setForm({ ...form, regionLabel: e.target.value })}
                placeholder="Comuna"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <span className="text-[10px] text-slate-400">Comuna, Estado, Provincia, Región…</span>
            </div>
          </div>
        </div>

        {/* 1. Sueldo Objetivo y Hora Hombre */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              1. Objetivo Económico & Tarifa Hora Hombre
            </h2>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Hora Hombre: {formatRate(calculatedHourlyLaborRate, settings)} / hr
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Sueldo Mensual Objetivo ({currencyCodeOf(settings)})
              </label>
              <input
                type="number"
                step="50000"
                value={form.monthlyTargetSalaryCLP}
                onChange={(e) => setForm({ ...form, monthlyTargetSalaryCLP: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono tabular-nums text-sm font-bold"
              />
              <span className="text-[10px] text-slate-400">Ingreso que esperas retirar mensualmente</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Horas Productivas al Mes
              </label>
              <input
                type="number"
                value={form.monthlyBillableHours}
                onChange={(e) => setForm({ ...form, monthlyBillableHours: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono tabular-nums text-sm font-bold"
              />
              <span className="text-[10px] text-slate-400">
                Horas netas disponibles para trabajos de producción (típico: 100-140 hrs)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-600 mb-1">
                Horas Disponibles Totales
              </label>
              <input
                type="number"
                value={form.monthlyAvailableHours}
                onChange={(e) => setForm({ ...form, monthlyAvailableHours: parseInt(e.target.value, 10) || 180 })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
              />
              <span className="text-[10px] text-slate-400">Jornada mensual (ej: 180 hrs)</span>
            </div>

            <div>
              <label className="block font-medium text-slate-600 mb-1">
                Horas Productivas en Taller
              </label>
              <input
                type="number"
                value={form.monthlyProductiveHours}
                onChange={(e) => setForm({ ...form, monthlyProductiveHours: parseInt(e.target.value, 10) || 140 })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
              />
              <span className="text-[10px] text-slate-400">Tiempo en taller sin contar ventas o admin</span>
            </div>
          </div>
        </div>

        {/* 2. Rentabilidad & Modo de Utilidad */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            2. Modelo de Utilidad y Margen
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Método de Cálculo de Utilidad
              </label>
              <select
                value={form.profitMode}
                onChange={(e) => setForm({ ...form, profitMode: e.target.value as ProfitCalculationMode })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="margin">Margen Real (Precio = Costo / (1 - Margen))</option>
                <option value="markup">Recargo (Precio = Costo × (1 + Recargo))</option>
              </select>
              <span className="text-[10px] text-slate-400">
                El margen real asegura que el % de cada venta sea ganancia neta.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                % Utilidad Objetivo Predeterminado
              </label>
              <input
                type="number"
                min="5"
                max="90"
                value={form.defaultProfitPercent}
                onChange={(e) => setForm({ ...form, defaultProfitPercent: parseFloat(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
              <span className="text-[10px] text-slate-400">
                Margen inicial aplicado en nuevas cotizaciones
              </span>
            </div>
          </div>
        </div>

        {/* 3. Parámetros Técnicos y Eléctricos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            3. Electricidad, Gastos Generales & Falla
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Precio Electricidad ({currencyCodeOf(settings)} / kWh)
              </label>
              <input
                type="number"
                value={form.kwhPriceCLP}
                onChange={(e) => setForm({ ...form, kwhPriceCLP: parseFloat(e.target.value) || 210 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
              <span className="text-[10px] text-slate-400">Revisa el valor por kWh de tu proveedor eléctrico local</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {taxLabelOf(settings)} (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.ivaRate}
                onChange={(e) => setForm({ ...form, ivaRate: parseFloat(e.target.value) || 0.19 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
              <span className="text-[10px] text-slate-400">0.19 = 19% sobre valor neto</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tarifa Mínima de Fabricación
              </label>
              <input
                type="number"
                step="1000"
                value={form.minManufacturingPriceCLP}
                onChange={(e) => setForm({ ...form, minManufacturingPriceCLP: parseInt(e.target.value, 10) || 5000 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
              <span className="text-[10px] text-slate-400">Piso mínimo para piezas pequeñas</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Gastos Fijos Mensuales ({currencyCodeOf(settings)})
              </label>
              <input
                type="number"
                step="10000"
                value={form.monthlyOverheadCLP}
                onChange={(e) => setForm({ ...form, monthlyOverheadCLP: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
              />
              <span className="text-[10px] text-slate-400">Internet, software CAD, herramientas</span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Tasa de Fallos Estimada (%)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={form.defaultFailureRatePercent}
                onChange={(e) => setForm({ ...form, defaultFailureRatePercent: parseFloat(e.target.value) || 8 })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
              />
              <span className="text-[10px] text-slate-400">Porcentaje de impresiones con fallas</span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Meses Recuperación Amortización
              </label>
              <input
                type="number"
                min="3"
                max="36"
                value={form.targetInvestmentRecoveryMonths}
                onChange={(e) => setForm({ ...form, targetInvestmentRecoveryMonths: parseInt(e.target.value, 10) || 12 })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
              />
              <span className="text-[10px] text-slate-400">Plazo para pagar cada impresora</span>
            </div>
          </div>
        </div>

        {/* 4. Datos del Taller / Emisor */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            4. Datos del Taller (cotizaciones y pagos)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Logo del Taller</label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 border border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {form.workshopLogo ? (
                    <img src={form.workshopLogo} alt="Logo del taller" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Image className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 1024 * 1024) {
                        alert('El logo no puede pesar más de 1 MB.');
                        e.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => setForm({ ...form, workshopLogo: String(reader.result) });
                      reader.readAsDataURL(file);
                    }}
                    className="block w-full text-[11px] text-slate-600 file:mr-2 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-slate-700 file:bg-slate-100 file:border file:border-slate-200 file:rounded cursor-pointer hover:file:bg-slate-200"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Se imprime en la cotización y el comprobante de pago. PNG/JPG/WEBP, hasta 1 MB.
                  </span>
                  {form.workshopLogo && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, workshopLogo: '' })}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                    >
                      Quitar logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Nombre Comercial / Taller</label>
              <input
                type="text"
                value={form.workshopName}
                onChange={(e) => setForm({ ...form, workshopName: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">{taxIdLabelOf(settings)} de la empresa</label>
              <input
                type="text"
                value={form.rut}
                onChange={(e) => setForm({ ...form, rut: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Giro / actividad económica</label>
              <input
                type="text"
                value={form.giro}
                onChange={(e) => setForm({ ...form, giro: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">{regionLabelOf(settings)} y ciudad</label>
              <input
                type="text"
                value={form.commune}
                onChange={(e) => setForm({ ...form, commune: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Email de Contacto</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* 5. Datos Bancarios y Numeración de Documentos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            5. Datos Bancarios y Numeración de Documentos
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Banco</label>
              <input
                type="text"
                value={form.bankName ?? ''}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder="Ej: Banco o entidad financiera"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Tipo de Cuenta</label>
              <input
                type="text"
                value={form.bankAccountType ?? ''}
                onChange={(e) => setForm({ ...form, bankAccountType: e.target.value })}
                placeholder="Ej: Cuenta Corriente / Vista"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">N° de Cuenta</label>
              <input
                type="text"
                value={form.bankAccountNumber ?? ''}
                onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                placeholder="Ej: 00-192-88401-09"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Titular de la Cuenta</label>
              <input
                type="text"
                value={form.bankHolderName ?? ''}
                onChange={(e) => setForm({ ...form, bankHolderName: e.target.value })}
                placeholder="Deja vacío para usar el nombre del taller"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">{taxIdLabelOf(settings)} del titular</label>
              <input
                type="text"
                value={form.bankHolderRut ?? ''}
                onChange={(e) => setForm({ ...form, bankHolderRut: e.target.value })}
                placeholder={`Deja vacío para usar el ${taxIdLabelOf(settings)} del taller`}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Email del Titular</label>
              <input
                type="email"
                value={form.bankHolderEmail ?? ''}
                onChange={(e) => setForm({ ...form, bankHolderEmail: e.target.value })}
                placeholder="Deja vacío para usar el email del taller"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Método de Pago Predeterminado</label>
              <input
                type="text"
                value={form.paymentMethodLabel ?? ''}
                onChange={(e) => setForm({ ...form, paymentMethodLabel: e.target.value })}
                placeholder="Ej: Transferencia Electrónica"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">Se muestra en el comprobante de pago</span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">N° Próximo Comprobante de Pago</label>
              <input
                type="number"
                min="0"
                value={form.receiptCounter ?? 0}
                onChange={(e) => setForm({ ...form, receiptCounter: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
              />
              <span className="text-[10px] text-slate-400">Arranca en 0. Se incrementa con cada pago registrado</span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Prefijo Comprobante</label>
              <input
                type="text"
                value={form.receiptPrefix ?? 'REC-'}
                onChange={(e) => setForm({ ...form, receiptPrefix: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>

          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            Guardar Configuración de Taller
          </button>
        </div>

      </form>

      {/* In-app Blank Confirm Modal */}
      <ConfirmDialog
        open={blankConfirm}
        variant="warning"
        title="¿Dejar cuadros en blanco?"
        description="Esto limpiará el nombre del taller, el identificador tributario, dirección y valores para que ingreses tu propia información desde cero."
        confirmLabel="Limpiar campos"
        onConfirm={handleSetBlank}
        onCancel={() => setBlankConfirm(false)}
      />

      {/* In-app Clear All Data Confirm Modal */}
      <ConfirmDialog
        open={clearAllConfirm}
        variant="danger"
        title="¿Limpiar taller a cero?"
        description="Se vaciarán TODAS las cotizaciones, órdenes de trabajo, pagos, impresoras y materiales. Esta acción es irreversible."
        confirmLabel="Sí, limpiar a cero"
        requireText="LIMPIAR"
        onConfirm={() => {
          if (onClearAllData) onClearAllData();
          setClearAllConfirm(false);
        }}
        onCancel={() => setClearAllConfirm(false)}
      />

      {/* Save Settings Confirm Modal */}
      <ConfirmDialog
        open={saveConfirm}
        variant="info"
        title="¿Guardar cambios en la configuración?"
        description="Estos valores alimentan el motor de costos: afectarán el cálculo de todas las cotizaciones nuevas que crees a partir de ahora."
        confirmLabel="Guardar cambios"
        onConfirm={confirmSave}
        onCancel={() => setSaveConfirm(false)}
      />

    </div>
  );
};
