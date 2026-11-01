'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';

/**
 * Simulador del canal de WhatsApp: conversa con el bot "como" cualquier
 * teléfono, sin Meta. Usa POST /api/whatsapp/simulador, que recorre el mismo
 * camino que un mensaje real. Plan B de la demo.
 *
 * Cada teléfono tiene su propia conversación. Si el bot le escribe a otro
 * teléfono (ej. el aviso al operario), el mensaje aparece en el chat de ese
 * teléfono con un contador de no leídos.
 */

/** Convierte el formato de WhatsApp (*negrita*) en elementos de React. */
function Formato({ texto }) {
  return String(texto).split('\n').map((linea, i) => (
    <span key={i} className="block min-h-[1em]">
      {linea.split(/(\*[^*\n]+\*)/g).map((parte, j) => (
        parte.startsWith('*') && parte.endsWith('*') && parte.length > 2
          ? <b key={j}>{parte.slice(1, -1)}</b>
          : <span key={j}>{parte}</span>
      ))}
    </span>
  ));
}

function MensajeBot({ m, onOpcion, deshabilitado }) {
  const [abierta, setAbierta] = useState(false);
  if (m.type === 'text') return <Formato texto={m.text.body} />;
  const i = m.interactive;
  return (
    <>
      <Formato texto={i.body.text} />
      {i.type === 'button' && (
        <div className="flex flex-col gap-1 mt-2 -mx-1">
          {i.action.buttons.map((b) => (
            <button
              key={b.reply.id}
              type="button"
              disabled={deshabilitado}
              onClick={() => onOpcion(b.reply.id, b.reply.title)}
              className="border-0 border-t border-border bg-transparent text-[var(--secondary)] font-semibold text-xs py-1.5 cursor-pointer hover:bg-surface disabled:opacity-50"
            >
              {b.reply.title}
            </button>
          ))}
        </div>
      )}
      {i.type === 'list' && (
        <div className="mt-2 -mx-1 border-t border-border">
          <button
            type="button"
            onClick={() => setAbierta(!abierta)}
            className="w-full border-0 bg-transparent text-[var(--secondary)] font-semibold text-xs py-1.5 cursor-pointer hover:bg-surface"
          >
            ☰ {i.action.button}
          </button>
          {abierta && (
            <ul className="m-0 p-0 list-none">
              {i.action.sections.flatMap((s) => s.rows).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={deshabilitado}
                    onClick={() => { setAbierta(false); onOpcion(r.id, r.title); }}
                    className="w-full text-left border-0 border-t border-border bg-transparent px-2 py-1.5 cursor-pointer hover:bg-surface disabled:opacity-50"
                  >
                    <span className="block text-xs text-text-primary">{r.title}</span>
                    {r.description && <span className="block text-[10.5px] text-text-muted">{r.description}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

export default function SimuladorChat() {
  const [personas, setPersonas] = useState([]);
  const [telefono, setTelefono] = useState('');
  const [numeroNuevo, setNumeroNuevo] = useState('');
  const [chats, setChats] = useState({});       // telefono → [{ de: 'yo' | 'bot', ... }]
  const [noLeidos, setNoLeidos] = useState({});
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const chatRef = useRef(null);

  /** Personal y clientes con teléfono. Los números nuevos agregados a mano se conservan. */
  const cargarPersonas = () => Promise.all([api.get('/clientes'), api.get('/usuarios')])
    .then(([clientes, usuarios]) => {
      const lista = [
        ...usuarios.filter((u) => u.telefono).map((u) => ({ telefono: u.telefono, nombre: u.nombre, perfil: u.rol })),
        ...clientes.filter((c) => c.telefono).map((c) => ({ telefono: c.telefono, nombre: c.nombre, perfil: 'Cliente' })),
      ];
      setPersonas((antes) => [...lista, ...antes.filter((p) => p.perfil === 'Número nuevo' && !lista.some((l) => l.telefono === p.telefono))]);
      if (lista.length) setTelefono((t) => t || lista[0].telefono);
    })
    .catch((e) => setError(e.message));

  useEffect(() => { cargarPersonas(); }, []);

  // Solo se desplaza el área del chat (no la página entera).
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chats, telefono]);

  const elegir = (tel) => {
    setTelefono(tel);
    setNoLeidos((n) => ({ ...n, [tel]: 0 }));
    setError('');
  };

  const agregarNumero = (e) => {
    e.preventDefault();
    const digitos = numeroNuevo.replace(/\D/g, '');
    if (digitos.length < 10) return setError('Escribe un celular de 10 dígitos.');
    const tel = digitos.length === 10 ? `57${digitos}` : digitos;
    if (!personas.some((p) => p.telefono === tel)) setPersonas((p) => [...p, { telefono: tel, nombre: `+${tel}`, perfil: 'Número nuevo' }]);
    setNumeroNuevo('');
    elegir(tel);
  };

  const enviar = async (contenido, mostrado) => {
    if (!telefono || enviando) return;
    setEnviando(true);
    setError('');
    setChats((c) => ({ ...c, [telefono]: [...(c[telefono] || []), { de: 'yo', texto: mostrado }] }));
    try {
      const { respuestas } = await api.post('/whatsapp/simulador', { telefono, ...contenido });
      setChats((c) => {
        const nuevo = { ...c };
        for (const m of respuestas) nuevo[m.to] = [...(nuevo[m.to] || []), { de: 'bot', m }];
        return nuevo;
      });
      // Un número nuevo puede haber terminado su registro: se actualiza su nombre en la lista.
      if (personas.find((p) => p.telefono === telefono)?.perfil === 'Número nuevo') cargarPersonas();
      const otros = respuestas.filter((m) => m.to !== telefono);
      if (otros.length) {
        setNoLeidos((n) => {
          const r = { ...n };
          for (const m of otros) r[m.to] = (r[m.to] || 0) + 1;
          return r;
        });
      }
    } catch (e) {
      setError(/Error 404/.test(e.message)
        ? 'El simulador está apagado. En satella-backend/.env pon ENABLE_WA_SIMULATOR=true y reinicia el backend.'
        : e.message);
    } finally {
      setEnviando(false);
    }
  };

  const enviarTexto = (e) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setTexto('');
    enviar({ texto: t }, t);
  };

  const actual = personas.find((p) => p.telefono === telefono);
  const mensajes = chats[telefono] || [];

  return (
    <div className="grid gap-5 md:grid-cols-[260px_1fr] items-start">
      <aside className="bg-surface border border-border rounded-card shadow-card p-4">
        <h2 className="m-0 mb-1 text-[13px]">Escribir como…</h2>
        <p className="m-0 mb-3 text-[11px] text-text-muted leading-relaxed">
          El bot decide el perfil por el teléfono, igual que con WhatsApp real.
        </p>
        <ul className="m-0 p-0 list-none flex flex-col gap-1">
          {personas.map((p) => (
            <li key={p.telefono}>
              <button
                type="button"
                onClick={() => elegir(p.telefono)}
                className={`w-full text-left border border-transparent rounded-[8px] px-2.5 py-2 cursor-pointer flex items-center justify-between gap-2 ${
                  p.telefono === telefono ? 'bg-surface-2 border-border' : 'bg-transparent hover:bg-surface-2'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-text-primary truncate">{p.nombre}</span>
                  <span className="block text-[10.5px] text-text-muted">{p.perfil} · +{p.telefono}</span>
                </span>
                {noLeidos[p.telefono] > 0 && (
                  <span className="shrink-0 rounded-full bg-[var(--accent)] text-[#1A1533] text-[10px] font-bold px-1.5">{noLeidos[p.telefono]}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={agregarNumero} className="mt-3 pt-3 border-t border-border">
          <label htmlFor="numero-nuevo" className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">Número nuevo</label>
          <div className="flex gap-1.5">
            <input
              id="numero-nuevo"
              value={numeroNuevo}
              onChange={(e) => setNumeroNuevo(e.target.value)}
              placeholder="320 999 8877"
              inputMode="tel"
              className="min-w-0 flex-1 border border-border bg-surface rounded-[8px] px-2.5 py-2 text-xs text-text-primary outline-none"
            />
            <button type="submit" className="border border-border bg-surface rounded-[8px] px-2.5 text-xs cursor-pointer hover:bg-surface-2">+</button>
          </div>
        </form>
      </aside>

      <section className="bg-surface border border-border rounded-card shadow-card flex flex-col h-[min(640px,calc(100vh-220px))] min-h-[420px]">
        <header className="px-4 py-3 border-b border-border">
          <div className="text-sm font-semibold">{actual?.nombre || 'Elige un teléfono'}</div>
          {actual && <div className="text-[11px] text-text-muted">+{actual.telefono} · {actual.perfil}</div>}
        </header>

        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-bg">
          {mensajes.length === 0 && (
            <p className="m-auto text-center text-xs text-text-muted max-w-[280px]">
              Escribe "hola" para empezar. Prueba también <b>menu</b> y <b>cancelar</b>.
            </p>
          )}
          {mensajes.map((msg, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-[12px] px-3 py-2 text-xs leading-relaxed shadow-card ${
                msg.de === 'yo'
                  ? 'self-end bg-[var(--primary)] text-[var(--on-primary)] rounded-br-[4px]'
                  : 'self-start bg-surface text-text-primary border border-border rounded-bl-[4px]'
              }`}
            >
              {msg.de === 'yo'
                ? msg.texto
                : <MensajeBot m={msg.m} deshabilitado={enviando} onOpcion={(id, titulo) => enviar({ opcionId: id, opcionTexto: titulo }, titulo)} />}
            </div>
          ))}
        </div>

        {error && <p role="alert" className="m-0 px-4 py-2 text-xs text-red-600 dark:text-red-400 border-t border-border">{error}</p>}

        <form onSubmit={enviarTexto} className="flex gap-2 p-3 border-t border-border">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={telefono ? 'Escribe un mensaje' : 'Elige un teléfono'}
            disabled={!telefono}
            aria-label="Mensaje"
            className="flex-1 border border-border bg-surface rounded-[18px] px-3.5 py-2 text-xs text-text-primary outline-none"
          />
          <button
            type="submit"
            disabled={!telefono || enviando || !texto.trim()}
            className="border-0 bg-[var(--primary)] text-[var(--on-primary)] rounded-[18px] px-4 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {enviando ? '…' : 'Enviar'}
          </button>
        </form>
      </section>
    </div>
  );
}
