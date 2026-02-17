
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxxGLEeAmAK3QGt9sJ-8J23o1wCQwkJKIeuWFQD1WpzJ-iUZzDnfvhCdBvP9mDYseuZ/exec';

window.dataSdk = {
  init: async (handler) => {
    window.dataHandler = handler;
    console.log('SDK: Connecting to...', GOOGLE_SHEET_URL);
    return await window.dataSdk.refresh();
  },

  refresh: async () => {
    try {
      if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes('กรุณาใส่')) {
        alert('❌ ยังไม่ได้ใส่ URL ของ Google Sheets!');
        return { isOk: false };
      }

      const response = await fetch(GOOGLE_SHEET_URL + '?action=read');

      // ตรวจสอบว่าได้ข้อมูลเป็น JSON จริงไหม
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('SDK Server Error:', text);
        alert('❌ ข้อมูลจาก Google Sheets ไม่ถูกต้อง (อาจหน้าจอขาวหรือติด Error ที่ Script)');
        return { isOk: false };
      }

      if (window.dataHandler) window.dataHandler.onDataChanged(data);
      console.log('SDK: Data loaded successfully');
      return { isOk: true };
    } catch (error) {
      console.error('SDK Fetch Error:', error);
      alert('❌ ไม่สามารถเชื่อมต่อ Google Sheets ได้ (ตรวจสอบอินเทอร์เน็ต หรือการตั้งค่า CORS)');
      return { isOk: false, error };
    }
  },

  createBatch: async (items) => {
    try {
      // Optimistic Update
      if (window.dataHandler && window.allData) {
        const tempItems = items.map(it => ({ ...it, __backendId: 'temp_' + Date.now() }));
        window.dataHandler.onDataChanged([...window.allData, ...tempItems]);
      }

      const response = await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'batchCreate', data: items })
      });

      setTimeout(() => window.dataSdk.refresh(), 2500);
      return { isOk: true };
    } catch (error) {
      alert('❌ บันทึกข้อมูลไม่สำเร็จ');
      return { isOk: false, error };
    }
  },

  update: async (item) => {
    try {
      await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'update', data: item })
      });
      setTimeout(() => window.dataSdk.refresh(), 1500);
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
      setTimeout(() => window.dataSdk.refresh(), 1500);
      return { isOk: true };
    } catch (error) {
      return { isOk: false, error };
    }
  }
};
