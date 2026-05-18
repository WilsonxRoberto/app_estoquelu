import { useState, useEffect, useMemo } from 'react';
import { Package, Search, CloudDownload, AlertCircle, Plus, Minus, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSheetData, type Product } from './services/googleSheets';

const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1WkmVkfNAu83_Sc7AfFnofP-1oSpdJxdjOmlyTcLcvTc/export?format=csv&gid=247051946';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);

  // Load from local storage on initial render
  useEffect(() => {
    const savedProducts = localStorage.getItem('estoqueProducts');
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
      setIsLoading(false);
    } else {
      // If nothing in local storage, automatically try to import
      handleImport();
    }
  }, []);

  // Save to local storage whenever products change
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('estoqueProducts', JSON.stringify(products));
    }
  }, [products]);

  const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setIsLoading(true);
    showNotification("Importando dados da planilha...", "warning");
    try {
      const data = await fetchSheetData(DEFAULT_SHEET_URL);
      setProducts(data);
      showNotification(`Sucesso! ${data.length} itens importados.`, "success");
    } catch (error) {
      console.error("Import error:", error);
      showNotification("Erro ao importar da planilha.", "error");
    } finally {
      setIsImporting(false);
      setIsLoading(false);
    }
  };

  const adjustStock = (product: Product, delta: number) => {
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        if (p.id === product.id) {
          const newStock = Math.max(0, p.stock + delta);
          
          if (newStock <= p.minStock && newStock > 0) {
            showNotification(`${p.name} está com estoque baixo (${newStock})!`, "warning");
          } else if (newStock === 0) {
            showNotification(`${p.name} esgotou!`, "error");
          }
          
          return { ...p, stock: newStock };
        }
        return p;
      });
    });
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // Group by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [filteredProducts]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="glass-panel p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-600 flex items-center gap-3">
              <Package className="w-8 h-8" />
              App Estoque PRO 🚀
            </h1>
            <p className="mt-2 text-slate-500">Sistema moderno (Modo Offline)</p>
          </div>
          
          <button 
            onClick={handleImport}
            disabled={isImporting}
            className="btn-primary"
          >
            <CloudDownload className="w-5 h-5" />
            {isImporting ? 'Importando...' : 'Sincronizar da Planilha'}
          </button>
        </header>

        {/* Notifications */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-xl flex items-center gap-3 shadow-lg border ${
                notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                notification.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {notification.type === 'warning' ? <Bell className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="font-medium">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="glass-panel overflow-hidden">
          <div className="panel-header bg-slate-100/50">
            <h2 className="panel-title">
              <Search className="w-5 h-5 text-blue-500" />
              Inventário
            </h2>
            <div className="w-full max-w-sm ml-auto">
              <input
                type="text"
                placeholder="Buscar por nome, SKU ou categoria..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg">Nenhum produto no banco de dados.</p>
                <p className="text-sm mt-2">Clique em "Sincronizar da Planilha" para começar.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedProducts).map(([category, items]) => (
                  <div key={category} className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2 flex justify-between items-end">
                      {category}
                      <span className="text-sm font-normal text-slate-500">{items.length} itens</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map(product => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={product.id} 
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                        >
                          <div className={`absolute top-0 left-0 w-1 h-full ${
                            product.stock === 0 ? 'bg-red-500' : 
                            product.stock <= product.minStock ? 'bg-amber-400' : 'bg-emerald-500'
                          }`} />
                          
                          <div className="pl-2">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                                {product.sku}
                              </span>
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                product.stock === 0 ? 'bg-red-100 text-red-700' : 
                                product.stock <= product.minStock ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {product.stock === 0 ? 'Zerado' : product.stock <= product.minStock ? 'Baixo' : 'OK'}
                              </span>
                            </div>
                            
                            <h4 className="font-semibold text-slate-800 line-clamp-2 min-h-[3rem]">{product.name}</h4>
                            
                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-2xl font-bold text-blue-600">{product.stock} <span className="text-sm font-normal text-slate-500">{product.unit}</span></span>
                                <span className="text-xs text-slate-400">Máx: {product.maxStock || '-'}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                <button 
                                  onClick={() => adjustStock(product, -1)}
                                  disabled={product.stock <= 0}
                                  className="p-2 text-slate-600 hover:bg-white hover:text-red-600 rounded-md transition-colors disabled:opacity-50"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => adjustStock(product, 1)}
                                  className="p-2 text-slate-600 hover:bg-white hover:text-emerald-600 rounded-md transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
