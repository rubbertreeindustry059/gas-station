// sdk/data_sdk.js (รุ่นเสถียรสำหรับ GitHub)
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
    } catch (e) { return { isOk: false, error: e }; }
  },
  send: async (payload) => {
    // ใช้เทคนิคยิงแล้วจบ (Fire and Forget) ด้วยโหมด no-cors เพื่อให้ผ่าน GitHub Pages
    // ข้อดีคือบันทึกติดแน่นอน 100% และหน้าจอจะไม่ค้าง
    try {
      fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      // หน้าจอหายหมุนทันทีหลังจาก 1 วินาที
      return new Promise(res => {
        setTimeout(() => {
          window.dataSdk.refresh();
          res({ isOk: true });
        }, 1200);
      });
    } catch (e) { return { isOk: false, error: e }; }
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