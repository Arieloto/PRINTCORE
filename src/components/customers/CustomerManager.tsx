import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X
} from 'lucide-react';
import { Customer } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface CustomerManagerProps {
  customers: Customer[];
  onSaveCustomers: (customers: Customer[]) => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  customers,
  onSaveCustomers
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState<boolean>(false);
  const [discardConfirm, setDiscardConfirm] = useState<boolean>(false);
  // Snapshot del formulario al abrir el modal: si cambia, hay cambios sin guardar.
  const [formSnapshot, setFormSnapshot] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+56 9 ');
  const [address, setAddress] = useState('');
  const [commune, setCommune] = useState('');
  const [customerType, setCustomerType] = useState<'particular' | 'empresa'>('particular');
  const [giro, setGiro] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.companyName && c.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setCompanyName('');
    setRut('');
    setEmail('');
    setPhone('+56 9 ');
    setAddress('');
    setCommune('');
    setCustomerType('particular');
    setGiro('');
    setNotes('');
    setFormSnapshot('');
    setShowModal(true);
  };

  const isFormDirty = () =>
    [name, companyName, rut, email, phone, address, commune, customerType, giro, notes].join('|') !== formSnapshot;

  /** Cierra el modal de edición; si hay cambios sin guardar pide confirmación. */
  const requestCloseModal = () => {
    if (isFormDirty()) setDiscardConfirm(true);
    else setShowModal(false);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setCompanyName(c.companyName || '');
    setRut(c.rut);
    setEmail(c.email);
    setPhone(c.phone);
    setAddress(c.address);
    setCommune(c.commune);
    setCustomerType(c.customerType);
    setGiro(c.giro || '');
    setNotes(c.notes || '');
    setFormSnapshot([c.name, c.companyName || '', c.rut, c.email, c.phone, c.address, c.commune, c.customerType, c.giro || '', c.notes || ''].join('|'));
    setShowModal(true);
  };

  const handleDelete = (id: string, custName: string) => {
    setDeleteConfirm({ id, name: custName });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onSaveCustomers(customers.filter(c => c.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    }
  };

  const handleClearAll = () => {
    setClearAllConfirm(true);
  };

  const confirmClearAll = () => {
    onSaveCustomers([]);
    setClearAllConfirm(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rut.trim()) return;

    if (editingCustomer) {
      // Update
      const updated = customers.map(c => {
        if (c.id === editingCustomer.id) {
          return {
            ...c,
            name,
            companyName: customerType === 'empresa' ? companyName : undefined,
            rut,
            email,
            phone,
            address,
            commune,
            customerType,
            giro: customerType === 'empresa' ? giro : undefined,
            notes
          };
        }
        return c;
      });
      onSaveCustomers(updated);
    } else {
      // Create
      const newCust: Customer = {
        id: `cust_${Date.now()}`,
        name,
        companyName: customerType === 'empresa' ? companyName : undefined,
        rut,
        email,
        phone,
        address,
        commune,
        customerType,
        giro: customerType === 'empresa' ? giro : undefined,
        notes,
        totalSpentCLP: 0
      };
      onSaveCustomers([newCust, ...customers]);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Directorio de Clientes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro con RUT chileno, giro comercial, clasificación empresa/particular y datos de contacto
          </p>
        </div>

        <div className="flex items-center gap-2">
          {customers.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Borra la lista para ingresar únicamente tus clientes reales"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
              <span>Limpiar directorio</span>
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Ingresar Mi Cliente</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, RUT o email..."
            className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="text-xs text-slate-500">
          Total: <span className="font-bold text-slate-900 font-mono">{customers.length} clientes</span>
        </div>
      </div>

      {/* Customer Table or Empty */}
      {customers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-800">No hay clientes registrados</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Registra los datos de tus clientes habituales para asociar rápidamente las cotizaciones e imprimir con su RUT y dirección.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            + Ingresar Primer Cliente
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Cliente / Razón Social</th>
                  <th className="py-3 px-4">RUT</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4">Comuna</th>
                  <th className="py-3 px-4 text-right">Gasto Histórico</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      {c.companyName && (
                        <div className="text-[11px] text-slate-500">{c.companyName}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {c.rut}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        c.customerType === 'empresa' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.customerType === 'empresa' ? 'Empresa' : 'Particular'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <div>{c.email}</div>
                      <div className="text-[11px] text-slate-400">{c.phone}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {c.commune || '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ${c.totalSpentCLP.toLocaleString('es-CL')}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Editar cliente"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Eliminar cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Customer */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">
                {editingCustomer ? `Editar Cliente: ${editingCustomer.name}` : 'Ingresar Nuevo Cliente'}
              </h2>
              <button onClick={requestCloseModal} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="flex gap-4 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="custType"
                    checked={customerType === 'particular'}
                    onChange={() => setCustomerType('particular')}
                  />
                  <span>Particular</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="custType"
                    checked={customerType === 'empresa'}
                    onChange={() => setCustomerType('empresa')}
                  />
                  <span>Empresa</span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre Completo / Contacto Principal
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Marcelo Gómez P."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                />
              </div>

              {customerType === 'empresa' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Razón Social
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ej: Tecnologías Mecánicas SpA"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">RUT</label>
                  <input
                    type="text"
                    required
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    placeholder="12.345.678-9"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Comuna / Ciudad</label>
                  <input
                    type="text"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    placeholder="Santiago, Providencia, etc."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@correo.cl"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Dirección de Despacho</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle, número, oficina"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              {customerType === 'empresa' && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Giro Comercial</label>
                  <input
                    type="text"
                    value={giro}
                    onChange={(e) => setGiro(e.target.value)}
                    placeholder="Ej: Fabricación de maquinaria, diseño, etc."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notas del Cliente</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Requerimientos habituales, tolerancias, etc."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={requestCloseModal}
                  className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  {editingCustomer ? 'Guardar Cambios' : 'Guardar Cliente'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* In-app Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteConfirm}
        variant="danger"
        title="¿Eliminar cliente?"
        description={<>¿Estás seguro de eliminar el cliente <strong>"{deleteConfirm?.name}"</strong>? Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* In-app Clear All Confirmation Modal */}
      <ConfirmDialog
        open={clearAllConfirm}
        variant="danger"
        title="¿Vaciar directorio de clientes?"
        description="Se eliminarán TODOS los clientes de la lista para ingresar los tuyos propios desde cero. Esta acción no se puede deshacer."
        confirmLabel="Sí, vaciar lista"
        requireText="ELIMINAR"
        onConfirm={confirmClearAll}
        onCancel={() => setClearAllConfirm(false)}
      />

      {/* Unsaved Changes Guard */}
      <ConfirmDialog
        open={discardConfirm}
        variant="warning"
        title="¿Descartar cambios sin guardar?"
        description="Modificaste datos de este cliente pero no los guardaste. Si cierras ahora, se perderán los cambios."
        confirmLabel="Descartar cambios"
        cancelLabel="Seguir editando"
        onConfirm={() => {
          setDiscardConfirm(false);
          setShowModal(false);
        }}
        onCancel={() => setDiscardConfirm(false)}
      />

    </div>
  );
};
