import { neon } from '@neondatabase/serverless';
import { application } from '../functions/app.mjs';

function createNeonDb(connectionString) {
  const sql = neon(connectionString);

  function buildQuery(table) {
    const state = {
      table,
      columns: '*',
      filters: [],
      orderBy: null,
      limitCount: null,
      mode: 'select',
      payload: null,
    };

    const builder = {
      select(cols = '*') {
        state.mode = 'select';
        state.columns = cols;
        return builder;
      },
      insert(values) {
        state.mode = 'insert';
        state.payload = Array.isArray(values) ? values : [values];
        return builder;
      },
      update(values) {
        state.mode = 'update';
        state.payload = values;
        return builder;
      },
      delete() {
        state.mode = 'delete';
        return builder;
      },
      eq(column, value) {
        state.filters.push({ column, value });
        return builder;
      },
      order(column, { ascending = true } = {}) {
        state.orderBy = { column, ascending };
        return builder;
      },
      limit(n) {
        state.limitCount = Number(n);
        return builder;
      },
      async then(resolve, reject) {
        try {
          const res = await execute(state, sql);
          resolve(res);
        } catch (err) {
          reject(err);
        }
      },
    };

    return builder;
  }

  async function execute(state, sqlClient) {
    const fullTable = state.table.includes('.') ? state.table : `app.${state.table}`;
    const params = [];
    const whereClauses = state.filters.map((f) => {
      params.push(f.value);
      return `"${f.column}" = $${params.length}`;
    });
    const whereSql = whereClauses.length ? ` WHERE ${whereClauses.join(' AND ')}` : '';

    if (state.mode === 'select') {
      let queryText = `SELECT ${state.columns} FROM ${fullTable}${whereSql}`;
      if (state.orderBy) {
        queryText += ` ORDER BY "${state.orderBy.column}" ${state.orderBy.ascending ? 'ASC' : 'DESC'}`;
      }
      if (state.limitCount) {
        queryText += ` LIMIT ${state.limitCount}`;
      }
      const data = await sqlClient.query(queryText, params);
      return { data, error: null };
    }

    if (state.mode === 'insert') {
      const rowsToInsert = state.payload || [];
      if (!rowsToInsert.length) return { data: [], error: null };
      const keys = Object.keys(rowsToInsert[0]);
      const valuePlaceholders = rowsToInsert.map((row) => {
        const rowParams = keys.map((k) => {
          params.push(row[k]);
          return `$${params.length}`;
        });
        return `(${rowParams.join(', ')})`;
      });
      const queryText = `INSERT INTO ${fullTable} ("${keys.join('", "')}") VALUES ${valuePlaceholders.join(', ')} RETURNING *`;
      const data = await sqlClient.query(queryText, params);
      return { data, error: null };
    }

    if (state.mode === 'update') {
      const entries = Object.entries(state.payload || {});
      const setClauses = entries.map(([k, v]) => {
        params.push(v);
        return `"${k}" = $${params.length}`;
      });
      const queryText = `UPDATE ${fullTable} SET ${setClauses.join(', ')}${whereSql} RETURNING *`;
      const data = await sqlClient.query(queryText, params);
      return { data, error: null };
    }

    if (state.mode === 'delete') {
      const queryText = `DELETE FROM ${fullTable}${whereSql} RETURNING *`;
      const data = await sqlClient.query(queryText, params);
      return { data, error: null };
    }

    return { data: [], error: null };
  }

  return { from: buildQuery };
}

const db = createNeonDb(process.env.DATABASE_URL);
const handle = application({ db });

export default async function handler(req, res) {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const url = `${protocol}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
      }
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const body = hasBody
      ? typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body ?? {})
      : undefined;

    const webRequest = new Request(url, {
      method: req.method,
      headers,
      body,
    });

    const response = await handle(webRequest);
    res.status(response.status);

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        const existing = res.getHeader('Set-Cookie');
        const list = Array.isArray(existing) ? existing : existing ? [String(existing)] : [];
        list.push(value);
        res.setHeader('Set-Cookie', list);
      } else {
        res.setHeader(key, value);
      }
    });

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
}