import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const kitchens=sqliteTable('kitchens',{owner:text('owner').primaryKey(),payload:text('payload').notNull(),version:integer('version').notNull()});
