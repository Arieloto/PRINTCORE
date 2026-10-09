import {
  BusinessSettings,
  Printer,
  Material,
  Customer,
  Quote,
  WorkOrder,
  PaymentRecord
} from '../types';
import { buildWorkOrderInstructions, isLegacyInsertInstruction } from './workOrderInstructions';

/**
 * Persistence layer.
 *
 * SQLite (via the local API server) is the source of truth. The public API stays
 * synchronous so components can keep reading in useState initializers: `init()`
 * loads everything into an in-memory cache once at boot, reads come from that
 * cache, and writes update the cache and are pushed to the server in the
 * background. localStorage is kept as a mirror so the app still works (and keeps
 * saving) if the server is not running.
 */

const STORAGE_KEYS = {
  SETTINGS: 'pc3d_settings_v2',
  PRINTERS: 'pc3d_printers_v2',
  MATERIALS: 'pc3d_materials_v2',
  CUSTOMERS: 'pc3d_customers_v2',
  QUOTES: 'pc3d_quotes_v2',
  WORK_ORDERS: 'pc3d_work_orders_v2',
  PAYMENTS: 'pc3d_payments_v2',
};

export const DEFAULT_SETTINGS: BusinessSettings = {
  workshopName: '',
  workshopLogo: '',
  rut: '',
  giro: '',
  address: '',
  commune: '',
  city: '',
  phone: '',
  email: '',
  website: '',

  monthlyTargetSalaryCLP: 0,
  monthlyAvailableHours: 180,
  monthlyProductiveHours: 140,
  monthlyBillableHours: 120,

  profitMode: 'margin',
  defaultProfitPercent: 30,
  ivaRate: 0.19,

  kwhPriceCLP: 210,
  defaultMaintenancePercent: 10,
  defaultRepairReservePerHourCLP: 250,
  defaultFailureRatePercent: 5,
  monthlyOverheadCLP: 0,
  minManufacturingPriceCLP: 0,
  paymentCommissionPercent: 0,
  targetInvestmentRecoveryMonths: 12,

  quoteCounter: 0,
  quotePrefix: 'COT-',
  workOrderCounter: 0,
  workOrderPrefix: 'OT-',
  numberPadding: 4,

  // Bank account (transfer details shown on quotes and receipts)
  bankName: 'Banco de Chile / Edwards',
  bankAccountType: 'Cuenta Corriente',
  bankAccountNumber: '00-192-88401-09',
  bankHolderName: '',
  bankHolderRut: '',
  bankHolderEmail: '',
  paymentMethodLabel: 'Transferencia Electrónica',

  // Payment receipt numbering (editable, starts at 0)
  receiptCounter: 0,
  receiptPrefix: 'REC-',
};

export const INITIAL_PRINTERS: Printer[] = [];

export const INITIAL_MATERIALS: Material[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

function buildInitialQuotes(): Quote[] {
  return [];
}

function buildInitialWorkOrders(_quotes: Quote[]): WorkOrder[] {
  return [];
}

function buildInitialPayments(_quotes: Quote[]): PaymentRecord[] {
  return [];
}

interface AppState {
  settings: BusinessSettings;
  printers: Printer[];
  materials: Material[];
  customers: Customer[];
  quotes: Quote[];
  workOrders: WorkOrder[];
  payments: PaymentRecord[];
}

type CollectionKey =
  | 'printers'
  | 'materials'
  | 'customers'
  | 'quotes'
  | 'workOrders'
  | 'payments';

const COLLECTION_KEYS: CollectionKey[] = [
  'printers',
  'materials',
  'customers',
  'quotes',
  'workOrders',
  'payments'
];

/** Collections wiped by "vaciar todas las tablas"; settings are kept. */
const CLEARABLE_KEYS: CollectionKey[] = [
  'printers',
  'materials',
  'customers',
  'quotes',
  'workOrders',
  'payments'
];

const COLLECTION_STORAGE_KEYS: Record<CollectionKey, string> = {
  printers: STORAGE_KEYS.PRINTERS,
  materials: STORAGE_KEYS.MATERIALS,
  customers: STORAGE_KEYS.CUSTOMERS,
  quotes: STORAGE_KEYS.QUOTES,
  workOrders: STORAGE_KEYS.WORK_ORDERS,
  payments: STORAGE_KEYS.PAYMENTS
};

let state: AppState | null = null;
let serverOnline = false;

/**
 * 'server' → the state lives in SQLite (all browsers share it).
 * 'local'  → the API is unreachable; data only reaches localStorage and a
 *            banner tells the user their data is NOT synchronized.
 */
export type StorageMode = 'server' | 'local';

const modeListeners = new Set<(mode: StorageMode) => void>();
let reconnectTimer: ReturnType<typeof setInterval> | null = null;

function currentMode(): StorageMode {
  return serverOnline ? 'server' : 'local';
}

function notifyMode(): void {
  for (const listener of modeListeners) listener(currentMode());
}

function pushAllToServer(): Promise<unknown[]> {
  const s = ensureState();
  return Promise.all([
    put('/api/settings', s.settings),
    ...COLLECTION_KEYS.map((key) => put(`/api/collections/${key}`, s[key]))
  ]);
}

/** Polls /api/health until the API answers, then pushes the local state up. */
function startReconnectLoop(): void {
  if (reconnectTimer) return;
  reconnectTimer = setInterval(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(() => {
        serverOnline = true;
        if (reconnectTimer) {
          clearInterval(reconnectTimer);
          reconnectTimer = null;
        }
        notifyMode();
        // Last-writer-wins: push what this browser accumulated while offline.
        return pushAllToServer();
      })
      .catch(() => {
        // Still down; keep polling.
      });
  }, 5000);
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadFromLocalStorage(): AppState {
  return {
    // Merged with defaults so settings persisted by older builds pick up new keys.
    settings: {
      ...DEFAULT_SETTINGS,
      ...readLocal<Partial<BusinessSettings>>(STORAGE_KEYS.SETTINGS, {})
    },
    printers: readLocal<Printer[]>(STORAGE_KEYS.PRINTERS, []),
    materials: readLocal<Material[]>(STORAGE_KEYS.MATERIALS, []),
    customers: readLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, []),
    quotes: readLocal<Quote[]>(STORAGE_KEYS.QUOTES, []),
    workOrders: readLocal<WorkOrder[]>(STORAGE_KEYS.WORK_ORDERS, []),
    payments: readLocal<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, [])
  };
}

function ensureState(): AppState {
  if (!state) state = loadFromLocalStorage();
  return state;
}

/** Renombra "Fabricación 3D de alta precisión" a "Fabricación 3D" en cotizaciones guardadas. */
function migrateQuoteConcepts(s: AppState): boolean {
  const OLD = 'Fabricación 3D de alta precisión';
  const NEW = 'Fabricación 3D';
  let changed = false;
  for (const quote of s.quotes) {
    if (!Array.isArray(quote.commercialItems)) continue;
    for (const item of quote.commercialItems) {
      if (typeof item.concept === 'string' && item.concept.includes(OLD)) {
        item.concept = item.concept.replace(OLD, NEW);
        changed = true;
      }
      if (typeof item.description === 'string' && item.description.includes(OLD)) {
        item.description = item.description.replace(OLD, NEW);
        changed = true;
      }
    }
  }
  return changed;
}

function migrateLegacyWorkOrderInstructions(s: AppState): boolean {
  let changed = false;
  for (const order of s.workOrders) {
    if (!isLegacyInsertInstruction(order.assemblyInstructions)) continue;
    const quote = s.quotes.find((item) => item.id === order.quoteId);
    const instructions = quote
      ? buildWorkOrderInstructions(quote)
      : {
          finishing: 'Completar solo el acabado indicado en el diseño aprobado. Retirar soportes y rebabas sin alterar superficies funcionales.',
          assembly: 'Montar únicamente los componentes especificados en el diseño aprobado. Confirmar tipo y medida de herrajes antes de instalarlos; no asumir una rosca ni una temperatura universal.'
        };
    order.finishingInstructions = instructions.finishing;
    order.paintingInstructions = instructions.painting;
    order.assemblyInstructions = instructions.assembly;
    changed = true;
  }
  return changed;
}

function repairPaymentMethodLabel(s: AppState): boolean {
  if (!s.settings.paymentMethodLabel?.includes('\uFFFD')) return false;
  s.settings = {
    ...s.settings,
    paymentMethodLabel: DEFAULT_SETTINGS.paymentMethodLabel
  };
  return true;
}

function hasLocalData(s: AppState): boolean {
  return (
    COLLECTION_KEYS.some((key) => s[key].length > 0) ||
    JSON.stringify(s.settings) !== JSON.stringify(DEFAULT_SETTINGS)
  );
}

function mirrorSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(ensureState().settings));
  } catch {
    // localStorage may be unavailable; SQLite remains the source of truth.
  }
}

function mirrorCollection(key: CollectionKey): void {
  try {
    localStorage.setItem(COLLECTION_STORAGE_KEYS[key], JSON.stringify(ensureState()[key]));
  } catch {
    // localStorage may be unavailable; SQLite remains the source of truth.
  }
}

function mirrorAll(): void {
  mirrorSettings();
  for (const key of COLLECTION_KEYS) mirrorCollection(key);
}

function put(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function send(path: string, body: unknown): void {
  if (!serverOnline) return;
  put(path, body)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    })
    .catch((error) => {
      serverOnline = false;
      notifyMode();
      startReconnectLoop();
      console.warn(
        '[printcore] No se pudo guardar en SQLite. Los datos quedan en localStorage hasta reconectar.',
        error
      );
    });
}

function persistSettings(): void {
  mirrorSettings();
  send('/api/settings', ensureState().settings);
}

function persistCollection(key: CollectionKey): void {
  mirrorCollection(key);
  send(`/api/collections/${key}`, ensureState()[key]);
}

function normalizeRemote(remote: Record<string, unknown>): AppState {
  const fallback = loadFromLocalStorage();
  const collections = {} as Record<CollectionKey, unknown[]>;
  for (const key of COLLECTION_KEYS) {
    collections[key] = Array.isArray(remote[key]) ? (remote[key] as unknown[]) : [];
  }
  return {
    settings:
      remote.settings && typeof remote.settings === 'object'
        ? { ...DEFAULT_SETTINGS, ...(remote.settings as Partial<BusinessSettings>) }
        : fallback.settings,
    printers: collections.printers as Printer[],
    materials: collections.materials as Material[],
    customers: collections.customers as Customer[],
    quotes: collections.quotes as Quote[],
    workOrders: collections.workOrders as WorkOrder[],
    payments: collections.payments as PaymentRecord[]
  };
}

export class AppStorage {
  /**
   * Loads the persisted state. Must be awaited before the app renders, because
   * components read from the cache synchronously in their useState initializers.
   */
  static async init(): Promise<void> {
    const local = loadFromLocalStorage();
    try {
      const response = await fetch('/api/state');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const remote = (await response.json()) as Record<string, unknown>;

      const remoteIsEmpty =
        !remote.settings &&
        COLLECTION_KEYS.every((key) => !Array.isArray(remote[key]) || remote[key].length === 0);

      if (remoteIsEmpty && hasLocalData(local)) {
        // First run against an empty database: carry over existing localStorage data.
        state = local;
        serverOnline = true;
        await pushAllToServer();
        console.info('[printcore] Datos locales migrados a SQLite.');
      } else {
        // Server wins: every browser boots with the same data.
        state = normalizeRemote(remote);
        serverOnline = true;
        mirrorAll();
      }
      if (repairPaymentMethodLabel(state)) {
        persistSettings();
        console.info('[printcore] Se reparó el método de pago predeterminado con caracteres dañados.');
      }
      if (migrateQuoteConcepts(state)) {
        persistCollection('quotes');
        console.info('[printcore] Cotizaciones actualizadas: "Fabricación 3D de alta precisión" -> "Fabricación 3D".');
      }
      if (migrateLegacyWorkOrderInstructions(state)) {
        persistCollection('workOrders');
        console.info('[printcore] Se actualizaron instrucciones antiguas de ensamblaje en órdenes de trabajo.');
      }
      notifyMode();
    } catch (error) {
      serverOnline = false;
      state = local;
      if (repairPaymentMethodLabel(state)) {
        try {
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
        } catch { /* localStorage unavailable */ }
        console.info('[printcore] Se reparó el método de pago predeterminado con caracteres dañados.');
      }
      if (migrateQuoteConcepts(state)) {
        try {
          localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(state.quotes));
        } catch { /* localStorage unavailable */ }
      }
      if (migrateLegacyWorkOrderInstructions(state)) {
        try {
          localStorage.setItem(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(state.workOrders));
        } catch { /* localStorage unavailable */ }
      }
      notifyMode();
      startReconnectLoop();
      console.warn(
        '[printcore] Servidor SQLite no disponible; usando localStorage. Inicia el servidor con "npm run dev".',
        error
      );
    }
  }

  static isServerOnline(): boolean {
    return serverOnline;
  }

  /** 'server' when SQLite is reachable, 'local' when data stays in this browser. */
  static getMode(): StorageMode {
    return currentMode();
  }

  /** Subscribes to mode changes; returns the unsubscribe function. */
  static onModeChange(listener: (mode: StorageMode) => void): () => void {
    modeListeners.add(listener);
    return () => modeListeners.delete(listener);
  }

  static getSettings(): BusinessSettings {
    return ensureState().settings;
  }

  static saveSettings(settings: BusinessSettings): void {
    ensureState().settings = settings;
    persistSettings();
  }

  static getPrinters(): Printer[] {
    return ensureState().printers;
  }

  static savePrinters(printers: Printer[]): void {
    ensureState().printers = printers;
    persistCollection('printers');
  }

  static getMaterials(): Material[] {
    return ensureState().materials;
  }

  static saveMaterials(materials: Material[]): void {
    ensureState().materials = materials;
    persistCollection('materials');
  }

  static deductMaterialStock(materialId: string, gramsUsed: number): void {
    const s = ensureState();
    s.materials = s.materials.map((m) =>
      m.id === materialId ? { ...m, stockGrams: Math.max(0, m.stockGrams - gramsUsed) } : m
    );
    persistCollection('materials');
  }

  static getCustomers(): Customer[] {
    return ensureState().customers;
  }

  static saveCustomers(customers: Customer[]): void {
    ensureState().customers = customers;
    persistCollection('customers');
  }

  static getQuotes(): Quote[] {
    return ensureState().quotes;
  }

  static saveQuotes(quotes: Quote[]): void {
    ensureState().quotes = quotes;
    persistCollection('quotes');
  }

  static addQuote(quote: Quote): void {
    ensureState().quotes.unshift(quote);
    persistCollection('quotes');
  }

  static getWorkOrders(): WorkOrder[] {
    return ensureState().workOrders;
  }

  static saveWorkOrders(orders: WorkOrder[]): void {
    ensureState().workOrders = orders;
    persistCollection('workOrders');
  }

  static addWorkOrder(order: WorkOrder): void {
    ensureState().workOrders.unshift(order);
    persistCollection('workOrders');
  }

  static getPayments(): PaymentRecord[] {
    return ensureState().payments;
  }

  static savePayments(payments: PaymentRecord[]): void {
    ensureState().payments = payments;
    persistCollection('payments');
  }

  static addPayment(payment: PaymentRecord): void {
    const s = ensureState();
    s.payments.unshift(payment);

    const index = s.quotes.findIndex((q) => q.id === payment.quoteId);
    if (index !== -1) {
      const quote = s.quotes[index];
      const newBalance = Math.max(0, quote.balanceCLP - payment.amountCLP);
      s.quotes[index] = {
        ...quote,
        balanceCLP: newBalance,
        paymentStatus: newBalance === 0 ? 'paid' : 'partial'
      };
    }

    persistCollection('payments');
    persistCollection('quotes');
  }

  static formatNumber(prefix: string, counter: number, padding: number = 4): string {
    const numStr = padding > 0 ? String(counter).padStart(padding, '0') : String(counter);
    return `${prefix}${numStr}`;
  }

  static getNextQuoteNumber(settings?: BusinessSettings): string {
    const s = settings || AppStorage.getSettings();
    const counter = typeof s.quoteCounter === 'number' ? s.quoteCounter : 0;
    const prefix = s.quotePrefix !== undefined ? s.quotePrefix : 'COT-';
    const padding = typeof s.numberPadding === 'number' ? s.numberPadding : 4;
    return AppStorage.formatNumber(prefix, counter, padding);
  }

  static incrementQuoteCounter(): void {
    const s = AppStorage.getSettings();
    const current = typeof s.quoteCounter === 'number' ? s.quoteCounter : 0;
    s.quoteCounter = current + 1;
    AppStorage.saveSettings(s);
  }

  static getNextWorkOrderNumber(settings?: BusinessSettings): string {
    const s = settings || AppStorage.getSettings();
    const counter = typeof s.workOrderCounter === 'number' ? s.workOrderCounter : 0;
    const prefix = s.workOrderPrefix !== undefined ? s.workOrderPrefix : 'OT-';
    const padding = typeof s.numberPadding === 'number' ? s.numberPadding : 4;
    return AppStorage.formatNumber(prefix, counter, padding);
  }

  static incrementWorkOrderCounter(): void {
    const s = AppStorage.getSettings();
    const current = typeof s.workOrderCounter === 'number' ? s.workOrderCounter : 0;
    s.workOrderCounter = current + 1;
    AppStorage.saveSettings(s);
  }

  static updateQuoteNumber(id: string, newNumber: string): void {
    const s = ensureState();
    s.quotes = s.quotes.map((q) => (q.id === id ? { ...q, quoteNumber: newNumber } : q));
    persistCollection('quotes');
  }

  static updateWorkOrderNumber(id: string, newNumber: string): void {
    const s = ensureState();
    s.workOrders = s.workOrders.map((w) => (w.id === id ? { ...w, orderNumber: newNumber } : w));
    persistCollection('workOrders');
  }

  static deleteQuote(id: string): void {
    const s = ensureState();
    s.quotes = s.quotes.filter((q) => q.id !== id);
    persistCollection('quotes');
  }

  static deleteWorkOrder(id: string): void {
    const s = ensureState();
    s.workOrders = s.workOrders.filter((w) => w.id !== id);
    persistCollection('workOrders');
  }

  static clearAllData(): void {
    const s = ensureState();
    for (const key of CLEARABLE_KEYS) {
      s[key] = [] as never;
      persistCollection(key);
    }
  }

  static resetToDemoData(): void {
    const s = ensureState();
    s.settings = { ...DEFAULT_SETTINGS };
    s.printers = [...INITIAL_PRINTERS];
    s.materials = [...INITIAL_MATERIALS];
    s.customers = [...INITIAL_CUSTOMERS];
    s.quotes = buildInitialQuotes();
    s.workOrders = buildInitialWorkOrders(s.quotes);
    s.payments = buildInitialPayments(s.quotes);

    persistSettings();
    for (const key of CLEARABLE_KEYS) persistCollection(key);
  }
}
