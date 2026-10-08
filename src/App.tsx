import React, { useState, useEffect } from 'react';
import { AppStorage, StorageMode } from './services/storage';
import { 
  BusinessSettings, 
  Printer, 
  Material, 
  Customer, 
  Quote, 
  WorkOrder, 
  PaymentRecord 
} from './types';
import { Navbar, ActiveTab } from './components/layout/Navbar';
import { TitleBar } from './components/layout/TitleBar';
import { LiveClock } from './components/layout/LiveClock';
import { getDesktopShell } from './services/desktop';
import { SmartChecklistQuote } from './components/quote/SmartChecklistQuote';
import { QuoteList } from './components/quote/QuoteList';
import { WorkOrdersView } from './components/production/WorkOrdersView';
import { FinancialDashboard } from './components/analytics/FinancialDashboard';
import { PrinterSimulator } from './components/simulator/PrinterSimulator';
import { InventoryManager } from './components/inventory/InventoryManager';
import { PrinterManager } from './components/printers/PrinterManager';
import { CustomerManager } from './components/customers/CustomerManager';
import { BusinessSettingsView } from './components/settings/BusinessSettingsView';
import { DocumentA4Modal, DocumentType } from './components/documents/DocumentA4Modal';
import { PaymentModal } from './components/payments/PaymentModal';
import { buildWorkOrderInstructions } from './services/workOrderInstructions';

export default function App() {
  // Global State
  const [activeTab, setActiveTab] = useState<ActiveTab>('checklist_quote');
  // Señal para reiniciar el formulario del costeo al pulsar "Nueva Cotización"
  // (el wizard permanece montado para no perder datos al cambiar de pestaña)
  const [newQuoteSignal, setNewQuoteSignal] = useState(0);
  const handleNewQuoteClick = () => {
    setActiveTab('checklist_quote');
    setNewQuoteSignal((n) => n + 1);
  };
  // "Trabajo similar": copia los requisitos de una cotización existente al costeo.
  const [quoteToLoad, setQuoteToLoad] = useState<Quote | null>(null);
  const [loadQuoteSignal, setLoadQuoteSignal] = useState(0);
  const [settings, setSettings] = useState<BusinessSettings>(() => AppStorage.getSettings());
  // Frameless desktop window: render our own title bar and offset the layout.
  const [desktop] = useState(() => getDesktopShell());
  // Server sync status: 'server' = SQLite (shared), 'local' = this browser only.
  const [storageMode, setStorageMode] = useState<StorageMode>(() => AppStorage.getMode());

  useEffect(() => {
    return AppStorage.onModeChange((mode) => {
      setStorageMode(mode);
      if (mode === 'server') {
        showNotification('Servidor conectado: tus datos se centralizan y se ven en todos tus navegadores');
      } else {
        showNotification('Sin conexión con el servidor: los datos se guardan solo en este navegador', 'info');
      }
    });
  }, []);
  const [printers, setPrinters] = useState<Printer[]>(() => AppStorage.getPrinters());
  const [materials, setMaterials] = useState<Material[]>(() => AppStorage.getMaterials());
  const [customers, setCustomers] = useState<Customer[]>(() => AppStorage.getCustomers());
  const [quotes, setQuotes] = useState<Quote[]>(() => AppStorage.getQuotes());
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => AppStorage.getWorkOrders());
  const [payments, setPayments] = useState<PaymentRecord[]>(() => AppStorage.getPayments());

  // Modal State
  const [activeDocumentQuote, setActiveDocumentQuote] = useState<Quote | null>(null);
  const [activeDocumentType, setActiveDocumentType] = useState<DocumentType>('cotizacion');
  const [paymentQuote, setPaymentQuote] = useState<Quote | null>(null);

  // Notification Banner
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Handlers
  const handleSaveSettings = (newSettings: BusinessSettings) => {
    setSettings(newSettings);
    AppStorage.saveSettings(newSettings);
    showNotification('Configuración de taller y costos actualizada');
  };

  const handleSavePrinters = (newPrinters: Printer[]) => {
    setPrinters(newPrinters);
    AppStorage.savePrinters(newPrinters);
    showNotification('Flota de impresoras actualizada');
  };

  const handleSaveMaterials = (newMaterials: Material[]) => {
    setMaterials(newMaterials);
    AppStorage.saveMaterials(newMaterials);
    showNotification('Inventario de filamentos actualizado');
  };

  const handleSaveCustomers = (newCustomers: Customer[]) => {
    setCustomers(newCustomers);
    AppStorage.saveCustomers(newCustomers);
    showNotification('Directorio de clientes actualizado');
  };

  const handleQuoteCreated = (newQuote: Quote) => {
    AppStorage.addQuote(newQuote);
    setQuotes(AppStorage.getQuotes());
    showNotification(`Cotización ${newQuote.quoteNumber} generada exitosamente`);
  };

  const handleStatusChange = (quoteId: string, newStatus: Quote['status']) => {
    const updated = quotes.map(q => q.id === quoteId ? { ...q, status: newStatus } : q);
    setQuotes(updated);
    AppStorage.saveQuotes(updated);
    showNotification(`Estado de cotización actualizado a "${newStatus}"`);
  };

  /**
   * "Trabajo similar": NO crea una cotización nueva. Carga los requisitos de la
   * cotización elegida en el costeo inteligente (los 6 pasos) para revisarlos y
   * guardar una cotización nueva desde ahí.
   */
  const handleCopyRequirementsToWizard = (quote: Quote) => {
    setQuoteToLoad(quote);
    setLoadQuoteSignal((n) => n + 1);
    setActiveTab('checklist_quote');
    showNotification(`Requisitos de ${quote.quoteNumber} copiados al costeo. Revisa y genera la nueva cotización.`);
  };

  const handleDeleteQuote = (quoteId: string) => {
    AppStorage.deleteQuote(quoteId);
    setQuotes(AppStorage.getQuotes());
    showNotification('Cotización eliminada exitosamente');
  };

  const handleClearAllData = () => {
    AppStorage.clearAllData();
    setPrinters([]);
    setMaterials([]);
    setCustomers([]);
    setQuotes([]);
    setWorkOrders([]);
    setPayments([]);
    showNotification('Se han vaciado todas las tablas para que ingreses tus propios datos');
  };

  const handleResetDemoData = () => {
    AppStorage.resetToDemoData();
    setSettings(AppStorage.getSettings());
    setPrinters(AppStorage.getPrinters());
    setMaterials(AppStorage.getMaterials());
    setCustomers(AppStorage.getCustomers());
    setQuotes(AppStorage.getQuotes());
    setWorkOrders(AppStorage.getWorkOrders());
    setPayments(AppStorage.getPayments());
    showNotification('Datos restablecidos al estado inicial');
  };

  const handleGenerateWorkOrder = (quote: Quote) => {
    const newOrderNumber = `OT-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const instructions = buildWorkOrderInstructions(quote);
    const newOrder: WorkOrder = {
      id: `wo_${Date.now()}`,
      orderNumber: newOrderNumber,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      projectName: quote.projectName,
      printerName: quote.printerName,
      materialName: quote.materialName,
      color: quote.materialColor,
      quantity: quote.quantity,
      partWeightGrams: quote.partWeightGrams,
      supportWeightGrams: quote.supportWeightGrams,
      purgeGrams: quote.purgeGrams,
      totalGramsRequired: quote.costBreakdown.totalMaterialGrams,
      printHoursEstimated: quote.printHours,
      status: 'printing',
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      finishingInstructions: instructions.finishing,
      paintingInstructions: instructions.painting,
      assemblyInstructions: instructions.assembly,
      qaChecks: {
        visualOk: true,
        dimensionalOk: false,
        assemblyOk: false,
        notes: 'Iniciada en taller.'
      },
      responsibleTechnician: 'Técnico de Turno PrintCore'
    };

    AppStorage.addWorkOrder(newOrder);
    setWorkOrders(AppStorage.getWorkOrders());

    // Update quote status to in_production
    handleStatusChange(quote.id, 'in_production');
    showNotification(`Orden de Trabajo ${newOrderNumber} creada y enviada a taller`);
    setActiveTab('work_orders');
  };

  const handleUpdateOrderStatus = (orderId: string, status: WorkOrder['status']) => {
    const updated = workOrders.map(w => w.id === orderId ? { ...w, status } : w);
    setWorkOrders(updated);
    AppStorage.saveWorkOrders(updated);
    showNotification(`Estado de orden actualizado a "${status}"`);
  };

  const handleToggleQACheck = (orderId: string, checkKey: 'visualOk' | 'dimensionalOk' | 'assemblyOk') => {
    const updated = workOrders.map(w => {
      if (w.id === orderId) {
        return {
          ...w,
          qaChecks: {
            ...w.qaChecks,
            [checkKey]: !w.qaChecks[checkKey]
          }
        };
      }
      return w;
    });
    setWorkOrders(updated);
    AppStorage.saveWorkOrders(updated);
  };

  const handleUpdateOrderInstructions = (
    orderId: string,
    key: 'finishingInstructions' | 'paintingInstructions' | 'assemblyInstructions',
    value: string
  ) => {
    const updated = workOrders.map(order => order.id === orderId ? { ...order, [key]: value } : order);
    setWorkOrders(updated);
    AppStorage.saveWorkOrders(updated);
  };

  const handleDeductInventory = (order: WorkOrder) => {
    const targetMat = materials.find(m => m.name.toLowerCase().includes(order.materialName.toLowerCase())) || materials[0];
    if (targetMat) {
      AppStorage.deductMaterialStock(targetMat.id, order.totalGramsRequired);
      setMaterials(AppStorage.getMaterials());
      showNotification(`Descontados ${order.totalGramsRequired}g de filamento ${targetMat.name}`);
    }
  };

  const handleSavePayment = (payment: PaymentRecord) => {
    AppStorage.addPayment(payment);
    setPayments(AppStorage.getPayments());
    setQuotes(AppStorage.getQuotes());
    // Advance the editable receipt counter (starts at 0 in settings)
    const nextReceiptCounter = (settings.receiptCounter ?? 0) + 1;
    const nextSettings = { ...settings, receiptCounter: nextReceiptCounter };
    setSettings(nextSettings);
    AppStorage.saveSettings(nextSettings);
    showNotification(`Pago de $${payment.amountCLP.toLocaleString('es-CL')} CLP registrado exitosamente`);
  };

  const openDocumentModal = (quote: Quote, type: DocumentType) => {
    setActiveDocumentQuote(quote);
    setActiveDocumentType(type);
  };

  const pendingQuotesCount = quotes.filter(q => q.status === 'draft' || q.status === 'sent').length;
  const activeOrdersCount = workOrders.filter(w => w.status !== 'completed').length;

  const handleWindowAction = (action: 'minimize' | 'toggleMaximize' | 'close') => {
    // Inert in browser preview (?titlebar=1); wired to the OS window in Electron.
    window.printcore?.window?.[action]?.();
  };

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col text-slate-900 ${desktop.active ? 'pt-9 desktop-shell' : ''}`}>

      {/* Custom title bar (frameless desktop window only) */}
      {desktop.active && (
        <TitleBar
          title="PrintCore 3D Chile"
          subtitle="Sistema de costeo y gestión para talleres de impresión 3D"
          onWindow={handleWindowAction}
        />
      )}
      
      {/* 3-Zone Top Navigation Contract */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewQuoteClick={handleNewQuoteClick}
        pendingQuotesCount={pendingQuotesCount}
        activeOrdersCount={activeOrdersCount}
        storageMode={storageMode}
      />

      {/* Persistent warning while data cannot reach the server */}
      {storageMode === 'local' && (
        <div className="no-print bg-amber-500/15 border-b border-amber-500/40 text-amber-700 text-[11px] py-1.5 px-4 text-center font-semibold">
          Modo local: sin conexión con el servidor — estos datos NO se sincronizarán con otros navegadores hasta
          que la conexión se restablezca.
        </div>
      )}

      {/* Ephemeral Notification Bar */}
      {notification && (
        <div className="no-print bg-slate-900 text-emerald-400 border-b border-slate-800 text-xs py-2 px-4 text-center font-medium shadow-sm transition-all">
          {notification.message}
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Tab 1: Flagship Quoting Assistant */}
        {/* Se mantiene montado (oculto con CSS) para no perder los datos del formulario al cambiar de pestaña */}
        <div className={activeTab === 'checklist_quote' ? undefined : 'hidden'}>
          <SmartChecklistQuote
            printers={printers}
            materials={materials}
            customers={customers}
            settings={settings}
            resetSignal={newQuoteSignal}
            loadQuote={quoteToLoad}
            loadSignal={loadQuoteSignal}
            onQuoteCreated={handleQuoteCreated}
            onOpenAudit={(q) => openDocumentModal(q, 'auditoria')}
            onOpenDocument={(q, type) => openDocumentModal(q, type)}
          />
        </div>

        {/* Tab 2: Quotes List */}
        {activeTab === 'quotes' && (
          <QuoteList
            quotes={quotes}
            onOpenDocument={(q, type) => openDocumentModal(q, type)}
            onCopyRequirementsToWizard={handleCopyRequirementsToWizard}
            onGenerateWorkOrder={handleGenerateWorkOrder}
            onRecordPayment={(q) => setPaymentQuote(q)}
            onStatusChange={handleStatusChange}
            onNewQuoteClick={handleNewQuoteClick}
            onDeleteQuote={handleDeleteQuote}
            paidQuoteIds={payments.map(p => p.quoteId)}
          />
        )}

        {/* Tab 3: Workshop Production & Work Orders */}
        {activeTab === 'work_orders' && (
          <WorkOrdersView
            workOrders={workOrders}
            quotes={quotes}
            onOpenDocument={(q, type) => openDocumentModal(q, type)}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onToggleQACheck={handleToggleQACheck}
            onUpdateInstructions={handleUpdateOrderInstructions}
            onDeductInventory={handleDeductInventory}
          />
        )}

        {/* Tab 4: Financial & Business Analytics */}
        {activeTab === 'analytics' && (
          <FinancialDashboard
            quotes={quotes}
            printers={printers}
            materials={materials}
            settings={settings}
            onNewQuoteClick={handleNewQuoteClick}
            onOpenSimulator={() => setActiveTab('simulator')}
          />
        )}

        {/* Tab 5: Printer Simulator */}
        {activeTab === 'simulator' && (
          <PrinterSimulator
            settings={settings}
            onClose={() => setActiveTab('analytics')}
          />
        )}

        {/* Tab 6: Materials & Inventory */}
        {activeTab === 'inventory' && (
          <InventoryManager
            materials={materials}
            onSaveMaterials={handleSaveMaterials}
          />
        )}

        {/* Tab 7: Fleet of Printers */}
        {activeTab === 'printers' && (
          <PrinterManager
            printers={printers}
            onSavePrinters={handleSavePrinters}
          />
        )}

        {/* Tab 8: Customers Directory */}
        {activeTab === 'customers' && (
          <CustomerManager
            customers={customers}
            onSaveCustomers={handleSaveCustomers}
          />
        )}

        {/* Tab 9: Business Settings */}
        {activeTab === 'settings' && (
          <BusinessSettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onClearAllData={handleClearAllData}
            onResetDemoData={handleResetDemoData}
          />
        )}

      </main>

      {/* A4 Modal Preview & Print */}
      {activeDocumentQuote && (
        <DocumentA4Modal
          quote={activeDocumentQuote}
          settings={settings}
          initialType={activeDocumentType}
          workOrder={workOrders.find(w => w.quoteId === activeDocumentQuote.id)}
          paymentRecord={payments.find(p => p.quoteId === activeDocumentQuote.id)}
          onClose={() => setActiveDocumentQuote(null)}
        />
      )}

      {/* Record Payment Modal */}
      {paymentQuote && (
        <PaymentModal
          quote={paymentQuote}
          settings={settings}
          onSavePayment={handleSavePayment}
          onClose={() => setPaymentQuote(null)}
        />
      )}

      {/* Discreet Footer */}
      <footer className="no-print border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-400">
        PrintCore 3D Chile · Sistema Integral de Gestión y Costeo de Impresión 3D
        <span className="block mt-1 text-slate-400/80">
          Fecha y hora actuales: <LiveClock className="font-medium text-slate-500" />
        </span>
      </footer>

    </div>
  );
}
