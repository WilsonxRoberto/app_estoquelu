import Papa from 'papaparse';

export interface Product {
  id: string;
  category: string;
  sku: string;
  name: string;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
}

export const fetchSheetData = (url: string): Promise<Product[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      complete: (results) => {
        const parsedProducts: Product[] = [];
        
        results.data.forEach((row: any, index: number) => {
          // Check for the expected columns based on the provided CSV
          const category = row['setor'] || 'Sem Categoria';
          const sku = row['codigo'] || `ID-${index}`;
          const name = row['produto'];
          const stock = parseInt(row['qtd']) || 0;
          const minStock = parseInt(row['minimo']) || 0;
          const maxStock = parseInt(row['maximo']) || 0;
          const unit = row['unidade'] || 'un';

          if (name && name.trim() !== '') {
            parsedProducts.push({
              id: sku,
              category,
              sku,
              name,
              stock,
              minStock,
              maxStock,
              unit,
            });
          }
        });

        resolve(parsedProducts);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export interface StockLog {
  date: string;
  time: string;
  sku: string;
  name: string;
  delta: number;
  finalStock: number;
}

export const sendLogsToSheet = async (logs: StockLog[]) => {
  const url = 'https://script.google.com/macros/s/AKfycbzHJbd1lpHpvvsjOlPM92oev0swcFwdvWSYLaPnBhDhgVGwB1W29syjOIDaWLeyGchfrg/exec';
  // Usando mode no-cors e text/plain para evitar bloqueios de CORS do Google Apps Script
  return fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify(logs)
  });
};
