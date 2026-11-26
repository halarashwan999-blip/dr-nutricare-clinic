// Local preview backend: real routes with an in-memory database. Never deployed.
import { createServer } from 'node:http';
import { application } from '../functions/app.mjs';

process.env.APP_DIETITIAN_CODE ||= 'GHIZAI-DEV-2026';

const tables = {
  users: [], sessions: [], auth_limiter: [], meal_logs: [], vitals: [],
  plans: [], appointments: [], subscriptions: [], payments: [], notes: [], questions: [], inbody_reports: [],
  notifications: [],
};

function createMemoryDb() {
  return {
    from(table) {
      if (!tables[table]) throw new Error(`unknown_table:${table}`);
      let mode = 'read';
      let values;
      let conflictColumns = null;
      let columns = null;
      let limit = 1000;
      const filters = [];
      const order = [];

      const matches = (row) => filters.every(([op, key, value]) => {
        if (op === 'eq') return row[key] === value;
        if (op === 'gte') return String(row[key]) >= String(value);
        if (op === 'lte') return String(row[key]) <= String(value);
        if (op === 'in') return Array.isArray(value) && value.includes(row[key]);
        return true;
      });

      const query = {
        select(list) { columns = list; return query; },
        eq(key, value) { filters.push(['eq', key, value]); return query; },
        gte(key, value) { filters.push(['gte', key, value]); return query; },
        lte(key, value) { filters.push(['lte', key, value]); return query; },
        in(key, value) { filters.push(['in', key, value]); return query; },
        order(key, options = {}) { order.push([key, options.ascending !== false]); return query; },
        limit(value) { limit = value; return query; },
        insert(row) { mode = 'insert'; values = row; return query; },
        insertIfAbsent(row, options) {
          mode = 'insert';
          values = row;
          conflictColumns = options.onConflict.split(',');
          return query;
        },
        update(patch) { mode = 'update'; values = patch; return query; },
        delete() { mode = 'delete'; return query; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            let result;
            if (mode === 'insert') {
              const duplicate = conflictColumns
                && tables[table].some((row) => conflictColumns.every((key) => row[key] === values[key]));
              if (duplicate) {
                result = [];
              } else {
                const row = structuredClone(values);
                tables[table].push(row);
                result = [{ ...row }];
              }
            } else {
              const matched = tables[table].filter(matches);
              if (mode === 'update') {
                for (const row of matched) Object.assign(row, structuredClone(values));
                result = matched.map((row) => ({ ...row }));
              } else if (mode === 'delete') {
                result = matched.map((row) => ({ ...row }));
                for (const row of matched) {
                  const index = tables[table].indexOf(row);
                  if (index >= 0) tables[table].splice(index, 1);
                }
              } else {
                result = matched.map((row) => ({ ...row }));
              }
            }
            for (const [key, ascending] of [...order].reverse()) {
              result = [...result].sort((a, b) => {
                const left = a[key] ?? '';
                const right = b[key] ?? '';
                if (left === right) return 0;
                return (left < right ? -1 : 1) * (ascending ? 1 : -1);
              });
            }
            result = result.slice(0, limit);
            if (columns) {
              result = result.map((row) => Object.fromEntries(
                columns.split(',').map((key) => [key.trim(), row[key.trim()]]),
              ));
            }
            return { data: result, error: null };
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

const handle = application({ db: createMemoryDb() });
const port = Number(process.env.PORT ?? 8000);

createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : Buffer.concat(chunks);
  const url = `http://127.0.0.1:${port}${request.url}`;
  try {
    const result = await handle(new Request(url, { method: request.method, headers, body }));
    const responseHeaders = Object.fromEntries(result.headers);
    response.writeHead(result.status, responseHeaders);
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    console.error('local request failed:', error);
    response.writeHead(500, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'local_server_failure' }));
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Local API ready on http://127.0.0.1:${port} (dietitian code: ${process.env.APP_DIETITIAN_CODE})`);
});
