import { useState, useEffect } from 'react';

const SHEETS_ID = '1ydoIpAzJrPUQ-wiYHiqRLSzF5wltilDrloY_iu34Nj8';

export const useGoogleSheets = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('google_access_token');
    if (token) {
      setAccessToken(token);
      setIsConnected(true);
    }
  }, []);

  const disconnect = () => {
    localStorage.removeItem('google_access_token');
    setAccessToken(null);
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
    if (res.status === 401) {
      disconnect();
      throw new Error('Token expirado, volvé a iniciar sesión con Google');
    }
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
      monto: parseFloat(row[3]) || 0,
      medio: row[4] || '',
      cuota: row[5] || '',
      moneda: row[6] || '',
      descripcion: row[7] || '',
    }));
  };

  const getHojaAnual = async (año) => {
    const data = await sheetsRequest(`/values/Gastos ${año}!A1:N50`);
    return data.values || [];
  };

  const getComparacion = async () => {
    const data = await sheetsRequest('/values/Comparacion de Gastos!A1:Z100');
    return data.values || [];
  };

  const agregarMovimiento = async (movimiento) => {
    const fila = [
      movimiento.fecha,
      movimiento.tipo,
      movimiento.categoria,
      movimiento.monto,
      movimiento.medio || '-',
      movimiento.cuota || '-',
      movimiento.moneda || 'Pesos',
      movimiento.descripcion || '-',
    ];
    return await sheetsRequest(
      '/values/Movimientos!A:H:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
      {
        method: 'POST',
        body: JSON.stringify({ values: [fila] }),
      }
    );
  };

  const analizarTicket = async (imageBase64) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('google_access_token');
      const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          }],
        }),
      });
      const data = await res.json();
      return data.responses?.[0]?.fullTextAnnotation?.text || '';
    } finally {
      setLoading(false);
    }
  };

  return {
    isConnected,
    accessToken,
    loading,
    disconnect,
    getMovimientos,
    getHojaAnual,
    getComparacion,
    agregarMovimiento,
    analizarTicket,
  };
};