import React, { useState } from 'react';
import { ShoppingCart, X, CreditCard, Banknote, FileText, User, MapPin } from 'lucide-react';
import { useStore } from '../store/useStore';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: (paymentData: {
    paymentMethod: 'efectivo' | 'transferencia' | 'expensa';
    customerName?: string;
    lotNumber?: string;
  }) => void;
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose, onCheckout }) => {
  const { cart, removeFromCart, updateCartQuantity, getCartTotal } = useStore();
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'expensa'>('efectivo');
  const [customerName, setCustomerName] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  
  if (!isOpen) return null;
  
  const total = getCartTotal();
  
  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;
    setShowCheckout(true);
  };
  
  const handleConfirmSale = () => {
    onCheckout({
      paymentMethod,
      customerName: customerName.trim() || undefined,
      lotNumber: lotNumber.trim() || undefined,
    });
    
    // Reset form
    setShowCheckout(false);
    setPaymentMethod('efectivo');
    setCustomerName('');
    setLotNumber('');
  };
  
  const handleCancel = () => {
    setShowCheckout(false);
    setPaymentMethod('efectivo');
    setCustomerName('');
    setLotNumber('');
  };
  
  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'efectivo':
        return <Banknote className="h-5 w-5" />;
      case 'transferencia':
        return <CreditCard className="h-5 w-5" />;
      case 'expensa':
        return <FileText className="h-5 w-5" />;
      default:
        return <Banknote className="h-5 w-5" />;
    }
  };
  
  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'efectivo':
        return 'Efectivo';
      case 'transferencia':
        return 'Transferencia';
      case 'expensa':
        return 'Expensa';
      default:
        return 'Efectivo';
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Carrito ({cart.length})
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {!showCheckout ? (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 mt-8">El carrito está vacío</p>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                        <p className="text-sm text-gray-500">${item.product.price} x {item.quantity}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          -
                        </button>
                        
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock}
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                        >
                          +
                        </button>
                        
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="ml-2 p-1 text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="ml-4 text-right">
                        <p className="font-medium text-gray-900">${item.subtotal}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="border-t p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-xl font-bold text-green-600">${total}</span>
                </div>
                
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Proceder al Pago
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Finalizar Venta</h3>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total a cobrar:</span>
                      <span className="text-2xl font-bold text-green-600">${total}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Método de Pago *
                  </label>
                  <div className="space-y-2">
                    {(['efectivo', 'transferencia', 'expensa'] as const).map((method) => (
                      <label key={method} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method}
                          checked={paymentMethod === method}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="mr-3"
                        />
                        <div className="flex items-center">
                          {getPaymentIcon(method)}
                          <span className="ml-2 font-medium">{getPaymentLabel(method)}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 inline mr-1" />
                    Nombre del Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ingrese el nombre del cliente"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Número de Lote (Opcional)
                  </label>
                  <input
                    type="text"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: Lote 123"
                  />
                </div>
              </div>
            </div>
            
            <div className="border-t p-4">
              <div className="flex space-x-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmSale}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Confirmar Venta
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Cart;