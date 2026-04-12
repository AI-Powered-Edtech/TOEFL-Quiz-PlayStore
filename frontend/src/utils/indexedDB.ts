import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface EssayDojoDB extends DBSchema {
    essays: {
        key: string;
        value: any;
    };
}

const DB_NAME = 'essay-dojo-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EssayDojoDB>>;

const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<EssayDojoDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('essays')) {
                    db.createObjectStore('essays', { keyPath: 'id' });
                }
            },
        });
    }
    return dbPromise;
};

export const idb = {
    async get(storeName: 'essays', key: string) {
        const db = await getDB();
        return db.get(storeName, key);
    },

    async getAll(storeName: 'essays') {
        const db = await getDB();
        return db.getAll(storeName);
    },

    async put(storeName: 'essays', value: any) {
        const db = await getDB();
        return db.put(storeName, value);
    },

    async delete(storeName: 'essays', key: string) {
        const db = await getDB();
        return db.delete(storeName, key);
    },

    async clear(storeName: 'essays') {
        const db = await getDB();
        return db.clear(storeName);
    }
};
