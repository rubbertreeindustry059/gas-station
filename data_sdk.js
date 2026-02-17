const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxxGLEeAmAK3QGt9sJ-8J23o1wCQwkJKIeuWFQD1WpzJ-iUZzDnfvhCdBvP9mDYseuZ/exec';

// Local Storage Key
const PENDING_KEY = 'gas_station_pending_v2';

// Helper to get local pending items
function getPending() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  } catch (e) { return []; }
}

// Helper to save pending items
function savePending(items) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(items));
}

window.dataSdk = {
  // Initialize and load data
  init: async (handler) => {
    window.dataHandler = handler;
    // Initial load: Try to get data from cache first if available (optional), then fetch
    await window.dataSdk.refresh();
    return { isOk: true };
  },

  // Fetch data from server and merge with local pending
  refresh: async () => {
    try {
      // 1. Fetch latest data from server
      const resp = await fetch(GOOGLE_SHEET_URL + '?action=read');
      const serverData = await resp.json();

      // 2. Get local pending items
      let pending = getPending();

      // 3. Deduplicate: Remove items from pending if they are now in serverData
      // We match loosely based on content for robustness (or timestamp if available)
      if (pending.length > 0) {
        const newPending = pending.filter(pItem => {
          // Check if this pending item exists in serverData
          // We assume 'timestamp' is a good unique key if it exists
          const exists = serverData.some(sItem =>
            (sItem.timestamp && sItem.timestamp === pItem.timestamp) &&
            (sItem.type === pItem.type)
          );
          return !exists; // Keep if NOT found in server data
        });

        // Update pending storage if changed
        if (newPending.length !== pending.length) {
          savePending(newPending);
          pending = newPending;
        }
      }

      // 4. Merge: Server Data + Remaining Pending Data
      // Add a flag to pending items so UI can optionally show them differently
      const mergedData = [
        ...serverData,
        ...pending.map(item => ({ ...item, _isPending: true }))
      ];

      // 5. Notify UI
      if (window.dataHandler) {
        window.dataHandler.onDataChanged(mergedData);
        window.allData = mergedData; // Keep a reference
      }

      return { isOk: true, data: mergedData };
    } catch (e) {
      console.error('Refresh Error:', e);
      // On error, still show pending + cached data if we had it? 
      // For now, minimal change: just return error
      return { isOk: false, error: e };
    }
  },

  // Internal helper to send data
  sendPayload: async (payload) => {
    try {
      fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      return { isOk: true };
    } catch (e) {
      console.error('Send Error:', e);
      return { isOk: false, error: e };
    }
  },

  // Create single item
  create: async (item) => {
    // 1. Add to pending immediately
    const pending = getPending();
    pending.push(item);
    savePending(pending);

    // 2. Refresh UI immediately to show it
    await window.dataSdk.refresh();

    // 3. Send to server in background
    window.dataSdk.sendPayload({ action: 'create', data: item });

    // 4. Schedule a check later to see if it synced
    setTimeout(() => window.dataSdk.refresh(), 2000);

    return { isOk: true };
  },

  // Create batch items
  createBatch: async (items) => {
    // 1. Add all to pending
    const pending = getPending();
    const newItems = items.map(it => ({ ...it, timestamp: it.timestamp || new Date().toISOString() }));
    pending.push(...newItems);
    savePending(pending);

    // 2. Refresh UI immediately
    await window.dataSdk.refresh();

    // 3. Send to server
    window.dataSdk.sendPayload({ action: 'batchCreate', data: newItems });

    // 4. Schedule checks
    setTimeout(() => window.dataSdk.refresh(), 2000);
    setTimeout(() => window.dataSdk.refresh(), 5000); // Double check for Batch

    return { isOk: true };
  },

  // Update Item (Note: Updates are trickier for pending, simplistic approach here)
  update: async (item) => {
    // For updates, we just send to server and wait. 
    // Implementing sophisticated optimistic updates for 'edit' is complex 
    // without a stable ID system.
    await window.dataSdk.sendPayload({ action: 'update', data: item });
    setTimeout(() => window.dataSdk.refresh(), 1500);
    return { isOk: true };
  },

  // Delete Item
  delete: async (item) => {
    // Optimistic delete: could filter from existing data
    await window.dataSdk.sendPayload({ action: 'delete', id: item.__backendId });
    setTimeout(() => window.dataSdk.refresh(), 1500);
    return { isOk: true };
  }
};