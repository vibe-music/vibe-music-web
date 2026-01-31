// Add deleteSetting utility to storage.js
export const deleteSetting = async (key) => {
    const db = await openDB();
    await db.delete('settings', key);
};
