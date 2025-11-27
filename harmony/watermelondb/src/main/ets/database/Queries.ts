export const SELECT_LOCAL_STORAGE = 'select value from local_storage where key = ?';
export const SELECT_TABLES = "select name from sqlite_master where type='table'";

export function dropTable(table: string): string {
  return `drop table if exists \`${table}\``;
}

