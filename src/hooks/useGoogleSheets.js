import { useState, useEffect } from 'react';

const SHEETS_ID = '1ydoIpAzJrPUQ-wiYHiqRLSzF5wltilDrloY_iu34Nj8';

export const useGoogleSheets = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('google_access_token');
    setIsConnected(!!token);
  }, []);

  const disconnect = () => {
    localStorage.removeItem('google_access_token');
    setIsConnected(false);
  };

  const sheetsRequest = async (endpoint, options = {}) => {
    const token = localStorage.getItem('google_access_token');
    if (!token) throw new Error('No conectado a Google');
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (res.status === 401) { disconnect(); throw new Error('Token expirado'); }
    return res.json();
  };

  const getMovimientos = async () => {
    const data = await sheetsRequest('/values/Movimientos!A2:H');
    const rows = data.values || [];
    return rows.map((row, i) => ({
      id: i,
      fecha: row[0] || '',
      tipo: row[1] || '',
      categoria: row[2] || '',
      monto: parseFloat((row[3] || '0').replace(/[$,]/g, '')) || 0,
      medio: row[4] || '',
      cuota: row[5] || '',
      moneda: row[6] || '',
      descripcion: row[7] || '',
    }));
  };

  // Hoja "Año XXXX":
  // Fila 1 (idx 0): header ingresos
  // Fila 2 (idx 1): Sin Categoria
  // Fila 3 (idx 2): Total Mensual ingresos → ingresos por mes
  // Fila 6 (idx 5): header balance
  // Fila 7 (idx 6): Ingresos - Gastos → balance por mes
  // Fila 10 (idx 9): header gastos
  // Filas 11-21 (idx 10-20): 11 categorias
  // Fila 22 (idx 21): Total Mensual gastos
  // Fila 25 (idx 24): header medios
  // Filas 26-31 (idx 25-30): 6 medios
  const getHojaAnual = async (año) => {
    const data = await sheetsRequest(`/values/Año ${año}!A1:N35`);
    return data.values || [];
  };

  // Hoja "Comparacion":
  // Misma estructura que anual pero desplazada 1 fila (empieza en fila 2)
  // Fila 1 (idx 0): headers años/meses
  // Fila 2 (idx 1): Categorias / meses elegidos en H2(idx[7]) e I2(idx[8])
  // Fila 3 (idx 2): Sin Categoria
  // Fila 4 (idx 3): Total Mensual ingresos
  // Fila 7 (idx 6): header balance
  // Fila 8 (idx 7): Ingresos - Gastos
  // Fila 11 (idx 10): header gastos
  // Filas 12-22 (idx 11-21): 11 categorias
  // Fila 23 (idx 22): Total Mensual gastos
  // Fila 26 (idx 25): header medios
  // Filas 27-32 (idx 26-31): 6 medios
  const getComparacion = async () => {
    const data = await sheetsRequest('/values/Comparacion!A1:K32');
    return data.values || [];
  };

  const setComparacionMeses = async (mes1, mes2) => {
    await sheetsRequest(
      '/values/Comparacion!H2:I2?valueInputOption=USER_ENTERED',
      { method: 'PUT', body: JSON.stringify({ values: [[mes1, mes2]] }) }
    );
    await new Promise(r => setTimeout(r, 1500));
    return await getComparacion();
  };

  const agregarMovimiento = async (movimiento) => {
    const fila = [
      movimiento.fecha, movimiento.tipo, movimiento.categoria,
      movimiento.monto, movimiento.medio || '-',
      movimiento.cuota || '-', movimiento.moneda || 'Pesos',
      movimiento.descripcion || '-',
    ];
    return await sheetsRequest(
      '/values/Movimientos!A:H:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
      { method: 'POST', body: JSON.stringify({ values: [fila] }) }
    );
  };

  const analizarTicket = async (imageBase64) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('google_access_token');
      const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ image: { content: imageBase64 }, features: [{ type: 'TEXT_DETECTION', maxResults: 1 }] }],
        }),
      });
      const data = await res.json();
      return data.responses?.[0]?.fullTextAnnotation?.text || '';
    } finally { setLoading(false); }
  };

  return { isConnected, loading, disconnect, getMovimientos, getHojaAnual, getComparacion, setComparacionMeses, agregarMovimiento, analizarTicket };
};
