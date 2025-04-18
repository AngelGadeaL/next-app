'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

interface ResourceGroup {
  id: string;
  name: string;
  location: string;
}

interface AzureResource {
  id: string;
  name: string;
  type: string;
  location: string;
  resourceGroup: string;
}

/*  Hack rápido para que TypeScript no proteste por window.AP          */
declare global {
  interface Window {
    AP?: { resize: (w: string | number, h: string | number) => void };
  }
}

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */

export default function AzureDashboard() {
  /* ---------------------- estado ---------------------------------- */
  const [groups, setGroups] = useState<ResourceGroup[]>([]);
  const [resources, setResources] = useState<AzureResource[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  /* ---------------------- helpers --------------------------------- */
  const fetchGroups = async () => {
    setLoadingGroups(true);
    setError(null);
    try {
      const r = await fetch('/api/azure/resource-groups');
      if (!r.ok) throw new Error(`Error ${r.status}`);
      const data = await r.json();
      setGroups(data.groups || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchResources = async (query = '') => {
    setLoadingResources(true);
    setError(null);
    try {
      const url = query
        ? `/api/azure/resources?q=${encodeURIComponent(query)}`
        : '/api/azure/resources';
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Error ${r.status}`);
      const data = await r.json();
      setResources(data.resources || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingResources(false);
    }
  };

  /* ---------------------- efectos --------------------------------- */
  // carga inicial
  useEffect(() => {
    fetchGroups().then(() => fetchResources());
  }, []);

  // refetch con debounce 400 ms
  useEffect(() => {
    const id = setTimeout(() => fetchResources(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  /* ----------   bridge Atlassian Connect   ------------------------ */
  useEffect(() => {
    const onReady = () => window.AP?.resize('100%', '100%');

    // AP puede estar listo antes o después de que se cargue React
    if (window.AP) onReady();
    window.addEventListener('apIframeInitialized', onReady);

    return () => window.removeEventListener('apIframeInitialized', onReady);
  }, []);

  /* ---------------------- derivados UI ---------------------------- */
  const shownResources = resources.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(s) ||
      r.type.toLowerCase().includes(s) ||
      r.resourceGroup.toLowerCase().includes(s)
    );
  });

  const grouped = shownResources.reduce<Record<string, AzureResource[]>>(
    (acc, res) => {
      (acc[res.resourceGroup] ||= []).push(res);
      return acc;
    },
    {},
  );

  /* ---------------------- render ---------------------------------- */
  return (
    <>
      {/* Bridge de Atlassian Connect: imprescindible para que Jira quite el loader */}
      <Script
        src="https://connect-cdn.atl-paas.net/all.js"
        strategy="beforeInteractive"
      />

      <main className="flex min-h-screen flex-col items-center p-6 bg-white">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
          Integración RSC con Azure
        </h1>

        {/* ----------  acciones  ---------- */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl mb-6">
          <button
            onClick={() => fetchGroups()}
            disabled={loadingGroups}
            className="flex-1 rounded-lg border border-blue-500 bg-blue-500 px-5 py-2 text-white font-semibold hover:bg-blue-600 disabled:opacity-50"
          >
            {loadingGroups ? 'Actualizando RG…' : 'Actualizar Resource Groups'}
          </button>

          <input
            type="text"
            placeholder="Filtrar recursos (nombre, tipo o RG)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {error && (
          <p className="text-red-600 bg-red-100 border border-red-400 rounded p-4 mb-4 max-w-2xl text-center">
            <strong>Error:</strong> {error}
          </p>
        )}

        {/* ----------  listado de RG  ---------- */}
        <section className="w-full max-w-2xl mb-10">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">
            Resource Groups ({groups.length})
          </h2>
          {loadingGroups ? (
            <p className="text-gray-600">Cargando RG…</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1">
              {groups.map((g) => (
                <li key={g.id}>
                  <span className="font-medium">{g.name}</span>{' '}
                  <span className="text-sm text-gray-500">({g.location})</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ----------  listado de recursos  ---------- */}
        <section className="w-full max-w-4xl">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">
            Recursos / Servicios ({shownResources.length})
          </h2>

          {loadingResources && (
            <p className="text-gray-600">Cargando recursos…</p>
          )}

          {Object.keys(grouped).length === 0 && !loadingResources && (
            <p className="text-gray-500">No se encontraron recursos.</p>
          )}

          {Object.entries(grouped).map(([rgName, resList]) => (
            <div key={rgName} className="mb-6">
              <h3
                className={`font-semibold ${
                  rgName.toLowerCase() === 'rsgyape001'
                    ? 'text-blue-600'
                    : 'text-gray-800'
                }`}
              >
                {rgName} ({resList.length})
              </h3>
              <ul className="border border-gray-200 rounded bg-gray-50 divide-y divide-gray-100">
                {resList.map((r) => (
                  <li
                    key={r.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-sm text-gray-500">{r.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
