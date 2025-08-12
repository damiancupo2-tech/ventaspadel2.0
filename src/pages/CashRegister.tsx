import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Download,
  Plus,
  Minus,
  Calendar,
  CreditCard,
  FileText,
  Banknote,
  Search,
  X,
  Clock,
  User,
  Package,
  Printer,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { updateAdminTurn, addTurnClosure, addAdminTurn } from '../utils/db';

const CashRegister: React.FC = () => {
  const {
    sales,
    courtBills,
    activeTurn,
    turnClosures,
    setActiveTurn,
    refreshData
  } = useStore();

  const [dateFilter, setDateFilter] = useState('today');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [adminName, setAdminName] = useState('');
  const [showOpenTurnModal, setShowOpenTurnModal] = useState(false);
  const [showClosureDetail, setShowClosureDetail] = useState(false);
  const [selectedClosure, setSelectedClosure] = useState<any>(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState(0);
  const [withdrawalPassword, setWithdrawalPassword] = useState('');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTurnDetailModal, setShowTurnDetailModal] = useState(false);
  const [selectedTurnForDetail, setSelectedTurnForDetail] = useState<any>(null);
  const [expenseData, setExpenseData] = useState({
    concept: '',
    detail: '',
    amount: 0
  });
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [initialCash, setInitialCash] = useState(0);

  useEffect(() => {
    refreshData();
  }, []);

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'yesterday': {
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return { start: yesterday, end: today };
      }
      case 'week': {
        const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: weekStart, end: new Date() };
      }
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: new Date() };
      }
      case 'custom': {
        const startDate = customDateStart ? new Date(customDateStart) : today;
        const endDate = customDateEnd ? new Date(customDateEnd + 'T23:59:59') : new Date();
        return { start: startDate, end: endDate };
      }
      default:
        return { start: today, end: new Date() };
    }
  };

  const { start, end } = getDateRange();

  // Filtrar ventas del kiosco
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    const turnStart = activeTurn ? new Date(activeTurn.startDate) : start;
    const matchesDate = activeTurn ? saleDate >= turnStart : (saleDate >= start && saleDate < end);
    const matchesSearch = (sale.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      sale.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPayment = !paymentFilter || sale.paymentMethod === paymentFilter;
    return matchesDate && matchesSearch && matchesPayment;
  });

  // Filtrar facturas de canchas
  const filteredCourtBills = courtBills.filter(bill => {
    const billDate = new Date(bill.createdAt);
    const turnStart = activeTurn ? new Date(activeTurn.startDate) : start;
    const matchesDate = activeTurn ? billDate >= turnStart : (billDate >= start && billDate < end);
    const matchesSearch = (bill.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (bill.courtName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesPayment = !paymentFilter || bill.paymentMethod === paymentFilter;
    return matchesDate && matchesSearch && matchesPayment;
  });

  // Combinar todas las transacciones
  const allTransactions = [
    ...filteredSales.map(sale => ({
      id: sale.id,
      type: sale.total < 0 ? 'retiro' : sale.customerName?.includes('Caja Inicial') ? 'caja-inicial' : 'kiosk',
      receiptNumber: sale.receiptNumber,
      customerName: sale.customerName || 'Cliente general',
      courtName: sale.total < 0 ? 'Retiro de Caja' :
        sale.customerName?.includes('Caja Inicial') ? 'Caja Inicial' :
          (sale.courtId || 'Kiosco'),
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      paymentBreakdown: undefined as any,
      createdAt: sale.createdAt,
      items: sale.items
    })),
    ...filteredCourtBills.map(bill => ({
      id: bill.id,
      type: 'court',
      receiptNumber: bill.receiptNumber,
      customerName: bill.customerName,
      courtName: bill.courtName,
      total: bill.total,
      paymentMethod: bill.paymentMethod,
      paymentBreakdown: bill.paymentBreakdown,
      createdAt: bill.createdAt,
      items: [...(bill.kioskItems || []), ...(bill.services || [])]
    })),
    ...(activeTurn?.transactions || []).map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      receiptNumber: transaction.receiptNumber,
      customerName: `Retiro - ${transaction.adminName}`,
      courtName: 'Retiro de Caja',
      total: -transaction.amount,
      paymentMethod: 'efectivo' as const,
      paymentBreakdown: undefined as any,
      createdAt: transaction.createdAt,
      items: [],
      notes: transaction.notes
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Calcular totales
  const totalPorMetodo = allTransactions.reduce((totals, transaction) => {
    if (transaction.paymentBreakdown) {
      totals.efectivo += transaction.paymentBreakdown.efectivo || 0;
      totals.transferencia += transaction.paymentBreakdown.transferencia || 0;
      totals.expensa += transaction.paymentBreakdown.expensa || 0;
    } else {
      if (transaction.paymentMethod === 'efectivo') totals.efectivo += transaction.total;
      else if (transaction.paymentMethod === 'transferencia') totals.transferencia += transaction.total;
      else if (transaction.paymentMethod === 'expensa') totals.expensa += transaction.total;
    }
    return totals;
  }, { efectivo: 0, transferencia: 0, expensa: 0 });

  const totalGeneral = totalPorMetodo.efectivo + totalPorMetodo.transferencia + totalPorMetodo.expensa;

  const handleAbrirTurno = async () => {
    if (!adminName.trim()) {
      alert('Debe ingresar el nombre del administrativo');
      return;
    }
    if (initialCash < 0) {
      alert('El monto de apertura no puede ser negativo');
      return;
    }
    if (initialCash === 0) {
      if (!window.confirm('¿Está seguro de abrir el turno sin monto inicial?')) return;
    }

    try {
      const initialTransactions: any[] = [];
      if (initialCash > 0) {
        const cajaInicialTransaction = {
          id: `caja-inicial-${Date.now()}`,
          receiptNumber: `CI-${Date.now()}`,
          items: [{
            product: {
              id: 'caja-inicial',
              name: 'Caja Inicial',
              category: 'Administrativo',
              price: initialCash,
              stock: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            quantity: 1,
            subtotal: initialCash
          }],
          total: initialCash,
          paymentMethod: 'efectivo' as const,
          customerName: `Caja Inicial - ${adminName.trim()}`,
          createdAt: new Date().toISOString()
        };
        initialTransactions.push(cajaInicialTransaction);
      }

      const newTurn = await addAdminTurn({
        adminName: adminName.trim(),
        startDate: new Date().toISOString(),
        status: 'active',
        sales: initialTransactions,
        courtBills: [],
        transactions: [],
        totals: {
          efectivo: initialCash,
          transferencia: 0,
          expensa: 0,
          total: initialCash
        }
      });

      setActiveTurn(newTurn);
      setAdminName('');
      setInitialCash(0);
      setShowOpenTurnModal(false);
      await refreshData();
    } catch (error) {
      console.error('Error al abrir turno:', error);
    }
  };

  const handleCerrarTurno = async () => {
    if (!activeTurn) return;
    if (!window.confirm(`¿Está seguro de cerrar el turno de ${activeTurn.adminName}?`)) return;

    try {
      const turnSales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        const turnStart = new Date(activeTurn.startDate);
        return saleDate >= turnStart;
      });

      const turnCourtBills = courtBills.filter(bill => {
        const billDate = new Date(bill.createdAt);
        const turnStart = new Date(activeTurn.startDate);
        return billDate >= turnStart;
      });

      const closure = await addTurnClosure({
        turnId: activeTurn.id,
        adminName: activeTurn.adminName,
        startDate: activeTurn.startDate,
        endDate: new Date().toISOString(),
        sales: turnSales,
        courtBills: turnCourtBills,
        transactions: activeTurn.transactions || [],
        totals: {
          efectivo: turnSales.filter(s => s.paymentMethod === 'efectivo').reduce((sum, s) => sum + s.total, 0) +
            turnCourtBills.filter(b => b.paymentMethod === 'efectivo').reduce((sum, b) => sum + b.total, 0),
          transferencia: turnSales.filter(s => s.paymentMethod === 'transferencia').reduce((sum, s) => sum + s.total, 0) +
            turnCourtBills.filter(b => b.paymentMethod === 'transferencia').reduce((sum, b) => sum + b.total, 0),
          expensa: turnSales.filter(s => s.paymentMethod === 'expensa').reduce((sum, s) => sum + s.total, 0) +
            turnCourtBills.filter(b => b.paymentMethod === 'expensa').reduce((sum, b) => sum + b.total, 0),
          total: turnSales.reduce((sum, s) => sum + s.total, 0) + turnCourtBills.reduce((sum, b) => sum + b.total, 0)
        },
        salesCount: turnSales.length,
        courtBillsCount: turnCourtBills.length
      });

      await updateAdminTurn(activeTurn.id, {
        status: 'closed',
        endDate: new Date().toISOString(),
        closedAt: new Date().toISOString()
      });

      setActiveTurn(null);
      await refreshData();

      alert(`Turno cerrado exitosamente.\nTotal: $${closure.totals.total}\nTransacciones: ${closure.salesCount + closure.courtBillsCount}`);
    } catch (error) {
      console.error('Error al cerrar turno:', error);
      alert('Error al cerrar el turno');
    }
  };

  const handleWithdrawal = async () => {
    if (!activeTurn) return;

    if (withdrawalPassword !== '2580') {
      alert('Contraseña incorrecta');
      return;
    }
    if (withdrawalAmount <= 0) {
      alert('El monto debe ser mayor a cero');
      return;
    }
    if (withdrawalAmount > totalPorMetodo.efectivo) {
      alert('No hay suficiente efectivo en caja');
      return;
    }

    try {
      const withdrawalId = `RETIRO-${String(Date.now()).slice(-4).padStart(4, '0')}`;

      const retiroTransaction = {
        id: `retiro-${Date.now()}`,
        type: 'retiro' as const,
        receiptNumber: `RET-${Date.now()}`,
        withdrawalId,
        amount: withdrawalAmount,
        adminName: activeTurn.adminName,
        notes: withdrawalNotes || 'Retiro de efectivo',
        createdAt: new Date().toISOString()
      };

      const newTotals = {
        ...activeTurn.totals,
        efectivo: activeTurn.totals.efectivo - withdrawalAmount,
        total: activeTurn.totals.total - withdrawalAmount
      };

      const updatedTransactions = [...(activeTurn.transactions || []), retiroTransaction];

      const updatedTurn = await updateAdminTurn(activeTurn.id, {
        totals: newTotals,
        transactions: updatedTransactions
      });

      if (updatedTurn) {
        setActiveTurn(updatedTurn);
      }

      setWithdrawalAmount(0);
      setWithdrawalPassword('');
      setWithdrawalNotes('');
      setShowWithdrawalModal(false);

      await refreshData();
      alert(`Retiro de $${withdrawalAmount} registrado exitosamente`);
    } catch (error) {
      console.error('Error al registrar retiro:', error);
      alert('Error al registrar el retiro');
    }
  };

  const getTypeLabel = (tipo: string) => {
    switch (tipo) {
      case 'kiosk': return 'Kiosco';
      case 'court': return 'Cancha';
      case 'caja-inicial': return 'Caja Inicial';
      case 'retiro': return 'Retiro';
      default: return 'Otro';
    }
  };

  // ---- EXPORTACIÓN CSV (usa allTransactions, pagos combinados + sin items) ----
  const exportTransactionsCSV = () => {
    if (allTransactions.length === 0) {
      alert('No hay transacciones para exportar');
      return;
    }

    const headers = [
      'Fecha',
      'Hora',
      'Tipo',
      'Recibo',
      'Cliente',
      'Cancha/Origen',
      'Producto/Servicio',
      'Cantidad',
      'Precio Unitario',
      'Subtotal Item',
      'Método Pago',
      'Monto Método',
      'Total Transacción'
    ];

    const rows: string[][] = [];

    allTransactions.forEach((transaction) => {
      const d = new Date(transaction.createdAt);
      const fecha = d.toLocaleDateString('es-AR');
      const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const tipo = getTypeLabel(transaction.type);
      const recibo = transaction.receiptNumber || '';
      const cliente = transaction.customerName || '';
      const origen = transaction.courtName || '';
      const totalTx = Number(transaction.total) || 0;

      const items = (transaction.items && transaction.items.length > 0)
        ? transaction.items
        : [{
            product: { name: 'Transacción sin items', price: Math.abs(totalTx) },
            service: undefined,
            nombre: 'Transacción sin items',
            quantity: 1,
            cantidad: 1,
            precio: Math.abs(totalTx),
            subtotal: Math.abs(totalTx)
          }];

      items.forEach((item: any) => {
        const itemName = item.product?.name || item.service?.name || item.nombre || 'Item';
        const quantity = Number(item.quantity || item.cantidad || 1);
        const unitPrice = Number(item.product?.price || item.service?.price || item.precio || 0);
        const subtotal = Number(item.subtotal || (quantity * unitPrice));

        if (transaction.paymentBreakdown) {
          const { efectivo = 0, transferencia = 0, expensa = 0 } = transaction.paymentBreakdown;

          if (efectivo > 0) {
            rows.push([
              fecha, hora, tipo, recibo, cliente, origen,
              itemName, quantity.toString(), unitPrice.toFixed(2), subtotal.toFixed(2),
              'efectivo', efectivo.toFixed(2), totalTx.toFixed(2)
            ]);
          }
          if (transferencia > 0) {
            rows.push([
              fecha, hora, tipo, recibo, cliente, origen,
              itemName, quantity.toString(), unitPrice.toFixed(2), subtotal.toFixed(2),
              'transferencia', transferencia.toFixed(2), totalTx.toFixed(2)
            ]);
          }
          if (expensa > 0) {
            rows.push([
              fecha, hora, tipo, recibo, cliente, origen,
              itemName, quantity.toString(), unitPrice.toFixed(2), subtotal.toFixed(2),
              'expensa', expensa.toFixed(2), totalTx.toFixed(2)
            ]);
          }
        } else {
          rows.push([
            fecha, hora, tipo, recibo, cliente, origen,
            itemName, quantity.toString(), unitPrice.toFixed(2), subtotal.toFixed(2),
            (transaction.paymentMethod || 'efectivo').toString(),
            Math.abs(totalTx).toFixed(2),
            totalTx.toFixed(2)
          ]);
        }
      });
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `arqueo-caja-detallado-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // ---- FIN EXPORTACIÓN CSV ----

  const printClosure = (closure: any) => {
    const printContent = `
      <html>
        <head>
          <title>Cierre de Turno - ${closure.adminName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .totals { border-top: 2px solid #000; padding-top: 10px; margin-top: 15px; }
            .total-row { display: flex; justify-content: space-between; margin: 5px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>VILLANUEVA PÁDEL</h1>
            <h2>Cierre de Turno</h2>
          </div>
          <div class="info-row"><span><strong>Administrativo:</strong></span><span>${closure.adminName}</span></div>
          <div class="info-row"><span><strong>Inicio:</strong></span><span>${new Date(closure.startDate).toLocaleString('es-ES')}</span></div>
          <div class="info-row"><span><strong>Cierre:</strong></span><span>${new Date(closure.endDate).toLocaleString('es-ES')}</span></div>
          <div class="info-row"><span><strong>Transacciones:</strong></span><span>${closure.salesCount + closure.courtBillsCount}</span></div>
          <div class="totals">
            <div class="total-row"><span>Efectivo:</span><span>$${closure.totals.efectivo}</span></div>
            <div class="total-row"><span>Transferencia:</span><span>$${closure.totals.transferencia}</span></div>
            <div class="total-row"><span>Expensa:</span><span>$${closure.totals.expensa}</span></div>
            <div class="total-row" style="border-top: 1px solid #000; padding-top: 5px;"><span>TOTAL:</span><span>$${closure.totals.total}</span></div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'efectivo': return <Banknote className="h-4 w-4 text-green-600" />;
      case 'transferencia': return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'expensa': return <FileText className="h-4 w-4 text-purple-600" />;
      case 'combinado': return <div className="flex space-x-1">
        <Banknote className="h-3 w-3 text-green-600" />
        <CreditCard className="h-3 w-3 text-blue-600" />
        <FileText className="h-3 w-3 text-purple-600" />
      </div>;
      default: return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'kiosk': return 'bg-green-100 text-green-800';
      case 'court': return 'bg-blue-100 text-blue-800';
      case 'caja-inicial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!activeTurn) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-yellow-100 rounded-full mb-4">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No hay turno administrativo activo
            </h2>
            <p className="text-gray-600 mb-6">
              Debe abrir un turno para ver el arqueo de caja.
            </p>
            <button
              onClick={() => setShowOpenTurnModal(true)}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Abrir Nuevo Turno
            </button>
          </div>
        </div>

        {showOpenTurnModal && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowOpenTurnModal(false)} />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center">
                  <User className="h-5 w-5 mr-2 text-green-600" />
                  Abrir Nuevo Turno
                </h2>
                <button onClick={() => setShowOpenTurnModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Administrativo</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ingrese su nombre"
                    autoFocus
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto de Caja Inicial</label>
                  <input
                    type="number"
                    value={initialCash}
                    onChange={(e) => setInitialCash(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button onClick={() => setShowOpenTurnModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleAbrirTurno} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                    Abrir Turno
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Arqueo de Caja</h1>
          <p className="mt-2 text-sm text-gray-700">Control de ingresos y gestión de turnos administrativos</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-2">
          <button
            onClick={exportTransactionsCSV}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </button>
          <button
            onClick={() => setShowWithdrawalModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 shadow-sm hover:bg-orange-100"
          >
            <Minus className="h-4 w-4 mr-2" />
            Retiro de Dinero
          </button>
          <button
            onClick={handleCerrarTurno}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
          >
            <X className="h-4 w-4 mr-2" />
            Cerrar Turno
          </button>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <User className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-800">Turno Activo</p>
              <p className="text-lg font-bold text-green-900">{activeTurn.adminName}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-green-600 mr-2" />
            <div className="text-right">
              <p className="text-sm font-medium text-green-800">Inicio</p>
              <p className="text-sm text-green-700">{new Date(activeTurn.startDate).toLocaleString('es-ES')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-green-800">Transacciones</p>
            <p className="text-xl font-bold text-green-900">{allTransactions.length}</p>
          </div>
        </div>
      </div>

      {/* Totales por método */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="flex-shrink-0"><DollarSign className="h-8 w-8 text-green-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total General</p>
              <p className="text-2xl font-bold text-gray-900">${totalGeneral.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-400">
          <div className="flex items-center">
            <div className="flex-shrink-0"><Banknote className="h-8 w-8 text-green-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Efectivo</p>
              <p className="text-2xl font-bold text-gray-900">${totalPorMetodo.efectivo.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="flex-shrink-0"><CreditCard className="h-8 w-8 text-blue-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Transferencia</p>
              <p className="text-2xl font-bold text-gray-900">${totalPorMetodo.transferencia.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="flex-shrink-0"><FileText className="h-8 w-8 text-purple-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Expensa</p>
              <p className="text-2xl font-bold text-gray-900">${totalPorMetodo.expensa.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="today">Hoy</option>
            <option value="yesterday">Ayer</option>
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="custom">Personalizado</option>
          </select>

          {dateFilter === 'custom' && (
            <>
              <input
                type="date"
                value={customDateStart}
                onChange={(e) => setCustomDateStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="date"
                value={customDateEnd}
                onChange={(e) => setCustomDateEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente o cancha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Todos los métodos</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="expensa">Expensa</option>
          </select>
        </div>
      </div>

      {/* Lista de transacciones */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Transacciones del Turno ({allTransactions.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recibo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalle/Notas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    transaction.type === 'gasto' ? 'bg-red-50' :
                    transaction.type === 'retiro' ? 'bg-orange-50' : ''
                  }`}
                  onClick={() => { setSelectedTransaction(transaction); setShowTransactionDetail(true); }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(transaction.createdAt).toLocaleString('es-ES')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.type === 'kiosk' ? 'bg-green-100 text-green-800' :
                      transaction.type === 'court' ? 'bg-blue-100 text-blue-800' :
                      transaction.type === 'retiro' ? 'bg-red-100 text-red-800' :
                      transaction.type === 'caja-inicial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.type === 'kiosk' ? (<><Package className="h-3 w-3 mr-1" />Kiosco</>) :
                       transaction.type === 'court' ? (<><Calendar className="h-3 w-3 mr-1" />Cancha</>) :
                       transaction.type === 'retiro' ? (<><Minus className="h-3 w-3 mr-1" />Retiro</>) :
                       transaction.type === 'caja-inicial' ? (<><Plus className="h-3 w-3 mr-1" />Caja Inicial</>) :
                       (<><Package className="h-3 w-3 mr-1" />Otro</>)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transaction.receiptNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.customerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.courtName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    {transaction.notes ? (<div className="truncate" title={transaction.notes}>{transaction.notes}</div>) : (<span className="text-gray-400">-</span>)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${transaction.total.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      {getPaymentIcon(transaction.paymentMethod)}
                      <span className="ml-2 capitalize">
                        {transaction.paymentMethod === 'combinado'
                          ? (() => {
                              const methods: string[] = [];
                              if (transaction.paymentBreakdown?.efectivo > 0) methods.push('Efectivo');
                              if (transaction.paymentBreakdown?.transferencia > 0) methods.push('Transferencia');
                              if (transaction.paymentBreakdown?.expensa > 0) methods.push('Expensa');
                              return methods.join(' + ');
                            })()
                          : transaction.paymentMethod}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {allTransactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay transacciones en el período seleccionado</p>
          </div>
        )}
      </div>

      {/* Cierres anteriores */}
      {turnClosures.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Cierres Anteriores ({turnClosures.length})</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {turnClosures.slice().reverse().map((closure) => (
              <li key={closure.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{closure.adminName}</p>
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {closure.salesCount + closure.courtBillsCount} transacciones
                        </span>
                      </div>
                      <div className="flex items-center mt-1">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        <p className="text-sm text-gray-500">
                          {new Date(closure.startDate).toLocaleDateString('es-ES')} - {new Date(closure.endDate).toLocaleDateString('es-ES')}
                        </p>
                        <DollarSign className="h-4 w-4 text-gray-400 ml-4 mr-1" />
                        <p className="text-sm text-gray-500">Total: ${closure.totals.total}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => printClosure(closure)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Imprimir
                    </button>
                    <button
                      onClick={() => { setSelectedClosure(closure); setShowClosureDetail(true); }}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalle
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal de detalle de cierre */}
      {showClosureDetail && selectedClosure && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowClosureDetail(false)} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Detalle del Cierre - {selectedClosure.adminName}</h2>
              <button onClick={() => setShowClosureDetail(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Cierre</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-gray-600">Administrativo:</span><span className="font-medium">{selectedClosure.adminName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Inicio:</span><span className="font-medium">{new Date(selectedClosure.startDate).toLocaleString('es-ES')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Cierre:</span><span className="font-medium">{new Date(selectedClosure.endDate).toLocaleString('es-ES')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Transacciones:</span><span className="font-medium">{selectedClosure.salesCount + selectedClosure.courtBillsCount}</span></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Totales por Método</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-gray-600">Efectivo:</span><span className="font-medium">${selectedClosure.totals.efectivo}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Transferencia:</span><span className="font-medium">${selectedClosure.totals.transferencia}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Expensa:</span><span className="font-medium">${selectedClosure.totals.expensa}</span></div>
                    <div className="flex justify-between border-t pt-2"><span className="font-semibold">Total:</span><span className="font-bold text-green-600">${selectedClosure.totals.total}</span></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button onClick={() => printClosure(selectedClosure)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </button>
                <button onClick={() => setShowClosureDetail(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de retiro */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowWithdrawalModal(false)} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center">
                <Minus className="h-5 w-5 mr-2 text-orange-600" />
                Retiro de Dinero
              </h2>
              <button onClick={() => setShowWithdrawalModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  Efectivo disponible en caja: <span className="font-bold text-green-600">${totalPorMetodo.efectivo}</span>
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Monto a retirar</label>
                <input
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                  min="0"
                  max={totalPorMetodo.efectivo}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña de administrador</label>
                <input
                  type="password"
                  value={withdrawalPassword}
                  onChange={(e) => setWithdrawalPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ingrese la contraseña"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notas (opcional)</label>
                <textarea
                  value={withdrawalNotes}
                  onChange={(e) => setWithdrawalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Motivo del retiro..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button onClick={() => setShowWithdrawalModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleWithdrawal} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors">
                  Confirmar Retiro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle transacción */}
      {showTransactionDetail && selectedTransaction && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowTransactionDetail(false)} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Detalle de Transacción - {selectedTransaction.receiptNumber}</h2>
              <button onClick={() => setShowTransactionDetail(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Información General</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-gray-600">Tipo:</span><span className="font-medium">{selectedTransaction.type === 'kiosk' ? 'Kiosco' : selectedTransaction.type === 'court' ? 'Cancha' : selectedTransaction.type === 'retiro' ? 'Retiro' : 'Otro'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Recibo:</span><span className="font-medium">{selectedTransaction.receiptNumber}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Cliente:</span><span className="font-medium">{selectedTransaction.customerName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Origen:</span><span className="font-medium">{selectedTransaction.courtName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Fecha:</span><span className="font-medium">{new Date(selectedTransaction.createdAt).toLocaleString('es-ES')}</span></div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Método de Pago:</span>
                      <div className="flex items-center">
                        {getPaymentIcon(selectedTransaction.paymentMethod)}
                        <span className="ml-2 font-medium capitalize">
                          {selectedTransaction.paymentMethod === 'combinado'
                            ? (() => {
                                const methods: string[] = [];
                                if (selectedTransaction.paymentBreakdown?.efectivo > 0) methods.push('Efectivo');
                                if (selectedTransaction.paymentBreakdown?.transferencia > 0) methods.push('Transferencia');
                                if (selectedTransaction.paymentBreakdown?.expensa > 0) methods.push('Expensa');
                                return methods.join(' + ');
                              })()
                            : selectedTransaction.paymentMethod}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedTransaction.paymentBreakdown && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Desglose de Pago</h3>
                    <div className="space-y-2">
                      {selectedTransaction.paymentBreakdown.efectivo > 0 && (
                        <div className="flex justify-between p-2 bg-green-50 rounded">
                          <span className="flex items-center"><Banknote className="h-4 w-4 text-green-600 mr-2" />Efectivo:</span>
                          <span className="font-medium">${selectedTransaction.paymentBreakdown.efectivo}</span>
                        </div>
                      )}
                      {selectedTransaction.paymentBreakdown.transferencia > 0 && (
                        <div className="flex justify-between p-2 bg-blue-50 rounded">
                          <span className="flex items-center"><CreditCard className="h-4 w-4 text-blue-600 mr-2" />Transferencia:</span>
                          <span className="font-medium">${selectedTransaction.paymentBreakdown.transferencia}</span>
                        </div>
                      )}
                      {selectedTransaction.paymentBreakdown.expensa > 0 && (
                        <div className="flex justify-between p-2 bg-purple-50 rounded">
                          <span className="flex items-center"><FileText className="h-4 w-4 text-purple-600 mr-2" />Expensa:</span>
                          <span className="font-medium">${selectedTransaction.paymentBreakdown.expensa}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                      selectedTransaction.items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-gray-900">{item.product?.name || item.service?.name || item.nombre}</p>
                            <p className="text-sm text-gray-500">
                              ${item.product?.price || item.service?.price || item.precio} x {item.quantity || item.cantidad || 1}
                            </p>
                          </div>
                          <span className="font-medium">${item.subtotal}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No hay items detallados</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-green-600">${selectedTransaction.total}</span>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={() => setShowTransactionDetail(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashRegister;
