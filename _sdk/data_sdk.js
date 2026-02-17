
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxxGLEeAmAK3QGt9sJ-8J23o1wCQwkJKIeuWFQD1WpzJ-iUZzDnfvhCdBvP9mDYseuZ/exec';

window.dataSdk = {
  init: async (handler) => {
    window.dataHandler = handler;
    return await window.dataSdk.refresh();
  },

  refresh: async () => {
    try {
      if (GOOGLE_SHEET_URL.includes('กรุณาใส่')) return { isOk: false };
      const response = await fetch(GOOGLE_SHEET_URL + '?action=read');
      const data = await response.json();
      if (window.dataHandler) window.dataHandler.onDataChanged(data);
      return { isOk: true };
    } catch (error) {
      return { isOk: false, error };
    }
  },

  // ส่งข้อมูลเป็นชุดใหญ่ทีเดียว (เร็วขึ้นมาก)
  createBatch: async (items) => {
    try {
      // อัปเดต UI หลอกไว้ก่อนทันที (Optimistic)
      if (window.dataHandler && window.allData) {
        const tempItems = items.map(it => ({ ...it, __backendId: 'temp_' + Date.now() + Math.random() }));
        window.dataHandler.onDataChanged([...window.allData, ...tempItems]);
      }

      await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'batchCreate', data: items })
      });

      // ดึงข้อมูลจริงมาทับอีกทีใน 2 วินาทีข้างหน้า
      setTimeout(() => window.dataSdk.refresh(), 2000);
      return { isOk: true };
    } catch (error) {
      return { isOk: false, error };
    }
  },

  create: async (item) => {
    return await window.dataSdk.createBatch([item]);
  },

  update: async (item) => {
    try {
      await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'update', data: item })
      });
      setTimeout(() => window.dataSdk.refresh(), 1000);
      return { isOk: true };
    } catch (error) {
      return { isOk: false, error };
    }
  },

  delete: async (item) => {
    try {
      await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'delete', id: item.__backendId })
      });
      setTimeout(() => window.dataSdk.refresh(), 1000);
      return { isOk: true };
    } catch (error) {
      return { isOk: false, error };
    }
  }
};
