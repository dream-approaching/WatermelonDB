import relationalStore from '@ohos.data.relationalStore';

export type QueryArg = number | string | null | boolean;

export function arrayContains(columns: string[], target: string): boolean {
  return columns.some((column) => column === target);
}

export function currentRowToObject(result: relationalStore.ResultSet): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  const columnCount = result.columnCount;
  for (let index = 0; index < columnCount; index += 1) {
    const columnName = result.getColumnName(index);
    const columnType = result.getColumnType(index);
    switch (columnType) {
      // case relationalStore.ColumnType.TYPE_NULL:
      //   record[columnName] = null;
      //   break;
      // case relationalStore.ColumnType.TYPE_INTEGER:
      //   record[columnName] = result.getLong(index);
      //   break;
      // case relationalStore.ColumnType.TYPE_FLOAT:
      //   record[columnName] = result.getDouble(index);
      //   break;
      // case relationalStore.ColumnType.TYPE_STRING:
      //   record[columnName] = result.getString(index);
      //   break;
      // case relationalStore.ColumnType.TYPE_BLOB:
      //   record[columnName] = Array.from(result.getBlob(index));
      //   break;
      default:
        record[columnName] = result.getString(index);
    }
  }
  return record;
}

export function resultColumns(result: relationalStore.ResultSet): string[] {
  const names: string[] = [];
  const columnCount = result.columnCount;
  for (let index = 0; index < columnCount; index += 1) {
    names.push(result.getColumnName(index));
  }
  return names;
}

