import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  mobile?: "row" | "stack";
};

export function Table<T>({
  columns,
  data,
  rowKey,
  caption,
  empty,
}: {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  caption: string;
  empty: string;
}) {
  return (
    <div>
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface shadow-card md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-muted text-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-3 font-semibold">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                  {empty}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={rowKey(row)} className="border-t border-border">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 align-middle">
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden" aria-label={caption}>
        {data.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            {empty}
          </p>
        ) : (
          data.map((row) => (
            <article key={rowKey(row)} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
              <dl className="grid gap-2">
                {columns
                  .filter((column) => column.mobile !== "stack")
                  .map((column) => (
                    <div key={column.key} className="grid grid-cols-[7.5rem_1fr] gap-3 text-sm">
                      <dt className="text-muted">{column.header}</dt>
                      <dd className="text-right font-medium text-foreground">{column.cell(row)}</dd>
                    </div>
                  ))}
              </dl>
              {columns.some((column) => column.mobile === "stack") ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  {columns
                    .filter((column) => column.mobile === "stack")
                    .map((column) => (
                      <div key={column.key}>{column.cell(row)}</div>
                    ))}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
