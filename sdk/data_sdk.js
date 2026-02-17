// sdk/data_sdk.js (รุ่นเสถียรที่สุด - แก้ไขปัญหาจุดหมุนค้าง)
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxxGLEeAmAK3QGt9sJ-8J23o1wCQwkJKIeuWFQD1WpzJ-iUZzDnfvhCdBvP9mDYseuZ/exec';

window.dataSdk = {
  init: async (handler) => {
    window.dataHandler = handler;
    return await window.dataSdk.refresh();
  },
  refresh: async () => {
    try {
      const resp = await fetch(GOOGLE_SHEET_URL + '?action=read');
      const data = await resp.json();
      if (window.dataHandler) window.dataHandler.onDataChanged(data);
      return { isOk: true };
    } catch (e) { 
      console.error('Refresh Error:', e);
      return { isOk: false, error: e }; 
    }
  },
  send: async (payload) => {
    try {
      // ส่งข้อมูลแบบ no-cors เพื่อให้ผ่าน GitHub Pages ได้แน่นอน
      fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      return new Promise(res => {
        setTimeout(() => {
          window.dataSdk.refresh();
          res({ isOk: true });
        }, 1500); // รอ 1.5 วินาทีเพื่อให้ Google บันทึกเสร็จแล้วจึงปิดหน้าจอโหลด
      });
    } catch (e) { 
      console.error('Send Error:', e);
      return { isOk: false, error: e }; 
    }
  },
  create: async (item) => {
    return await window.dataSdk.send({ action: 'create', data: item });
  },
  createBatch: async (items) => {
    if (window.dataHandler && window.allData) {
      const temp = items.map(it => ({ ...it, __backendId: 'temp_' + Date.now() }));
      window.dataHandler.onDataChanged([...window.allData, ...temp]);
    }
    return await window.dataSdk.send({ action: 'batchCreate', data: items });
  },
  update: async (item) => {
    return await window.dataSdk.send({ action: 'update', data: item });
  },
  delete: async (item) => {
    return await window.dataSdk.send({ action: 'delete', id: item.__backendId });
  }
};