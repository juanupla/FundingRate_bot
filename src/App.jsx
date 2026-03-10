import { useState, useEffect, useCallback } from "react";

// =============================================================================
// Config — cambiá esta URL por la IP de tu droplet
// =============================================================================
const API_URL = import.meta.env.VITE_API_URL || "http://178.128.231.61:8000";
const POLL_MS = 5000;

// =============================================================================
// Helpers
// =============================================================================
function fmt$(n) { return n == null ? "—" : `$${Number(n).toFixed(2)}`; }
function fmtPct(n) { return n == null ? "—" : `${(n * 100).toFixed(4)}%`; }
function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-AR", { hour12: false });
}

async function apiFetch(path) {
  const r = await fetch(`${API_URL}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function apiPost(path, body = {}) {
  const r = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// =============================================================================
// Sub-componentes
// =============================================================================
function GlowDot({ active, color }) {
  const c = color || (active ? "#00ff88" : "#ff4444");
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: c, boxShadow: `0 0 8px ${c}, 0 0 16px ${c}40`,
      marginRight: 6, flexShrink: 0,
    }} />
  );
}

function Badge({ label, color, bg }) {
  return (
    <span style={{
      fontSize: 10, fontFamily: "'Space Mono', monospace", fontWeight: 700,
      color, background: bg || `${color}15`,
      border: `1px solid ${color}30`, padding: "2px 8px", borderRadius: 3,
      letterSpacing: 1, whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function StatCard({ label, value, sub, accent, loading }) {
  return (
    <div style={{
      background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 8,
      padding: "20px 24px", flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace",
        letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent || "#fff",
        fontFamily: "'Space Mono', monospace", letterSpacing: -1,
        opacity: loading ? 0.4 : 1, transition: "opacity 0.3s" }}>
        {loading ? "···" : value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function DireccionBadge({ dir }) {
  const map = {
    LONG_SPOT_SHORT_FUTURO: { label: "▲ LONG SPOT", color: "#00ff88" },
    SHORT_SPOT_LONG_FUTURO: { label: "▼ SHORT SPOT", color: "#ff6b6b" },
    NEUTRAL:                { label: "— NEUTRAL",    color: "#555"    },
    DESCONOCIDA:            { label: "? RECUPERADA", color: "#f7931a" },
  };
  const c = map[dir] || map.NEUTRAL;
  return <Badge label={c.label} color={c.color} />;
}

// =============================================================================
// App principal
// =============================================================================
export default function App() {
  const [status, setStatus]       = useState(null);
  const [scanner, setScannerData] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [tab, setTab]             = useState("dashboard");
  const [accionando, setAccionando] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [s, sc, h] = await Promise.all([
        apiFetch("/api/status"),
        apiFetch("/api/scanner"),
        apiFetch("/api/historial"),
      ]);
      setStatus(s);
      setScannerData(sc);
      setHistorial(h.trades || []);
      setError(null);
    } catch (e) {
      setError("No se puede conectar al backend — verificá que el servidor esté corriendo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const controlarBot = async (accion) => {
    const pwd = prompt("🔐 Contraseña requerida:");
    if (pwd !== "ellobo126") {
      alert("❌ Contraseña incorrecta");
      return;
    }
    setAccionando(true);
    try {
      await apiPost("/api/bot/control", { accion });
      await fetchAll();
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setAccionando(false);
    }
  };

  const cerrarPosicion = async (symbol) => {
    if (!confirm(`¿Cerrar posición ${symbol} manualmente?`)) return;
    setAccionando(true);
    try {
      await apiPost(`/api/posiciones/${symbol.replace("/", "-")}/cerrar`);
      await fetchAll();
    } catch (e) {
      alert(`Error cerrando ${symbol}: ${e.message}`);
    } finally {
      setAccionando(false);
    }
  };

  const botActivo         = status?.bot_activo || false;
  const circuitBreaker    = status?.circuit_breaker || false;
  const posicionesActivas = Object.values(status?.posiciones || {});

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#e0e0e0",
      fontFamily: "'Inter', sans-serif", margin: 0, padding: 0, width: "100%", boxSizing: "border-box" }}>

      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: "1px solid #161616", padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10,
        background: "#0a0a0a", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #f7931a, #ff6b00)",
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 900 }}>₿</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Funding Rate Arbitrage</div>
            <div style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>
              Binance Spot × Perpetuals
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {error ? (
            <div style={{ fontSize: 11, color: "#ff4444", fontFamily: "'Space Mono', monospace" }}>
              <GlowDot active={false} /> OFFLINE
            </div>
          ) : circuitBreaker ? (
            <div style={{ fontSize: 11, color: "#f7931a", fontFamily: "'Space Mono', monospace" }}>
              <GlowDot active={false} color="#f7931a" /> CIRCUIT BREAKER
            </div>
          ) : (
            <div style={{ fontSize: 11, color: botActivo ? "#00ff88" : "#555",
              fontFamily: "'Space Mono', monospace" }}>
              <GlowDot active={botActivo} /> {botActivo ? "ACTIVO" : "DETENIDO"}
            </div>
          )}
          <button onClick={() => controlarBot("pausa_emergencia")} disabled={accionando}
            style={{ padding: "6px 14px", borderRadius: 5, border: "1px solid #ff444440",
              background: "#1a0505", color: "#ff4444", cursor: "pointer",
              fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
            🚨 EMERGENCIA
          </button>
          <button onClick={() => controlarBot(botActivo ? "detener" : "iniciar")} disabled={accionando}
            style={{ padding: "8px 20px", borderRadius: 6, border: "none", cursor: "pointer",
              fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1,
              background: botActivo ? "#1a0a0a" : "#0a1a0a",
              color: botActivo ? "#ff4444" : "#00ff88",
              border: `1px solid ${botActivo ? "#ff444440" : "#00ff8840"}`,
              opacity: accionando ? 0.5 : 1 }}>
            {botActivo ? "⏹ DETENER" : "▶ INICIAR"}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: "#1a0505", borderBottom: "1px solid #ff444430",
          padding: "10px 28px", fontSize: 12, color: "#ff6666" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #161616", padding: "0 28px",
        display: "flex", gap: 4, background: "#0a0a0a" }}>
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "scanner",   label: "Scanner" },
          { id: "historial", label: "Historial" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "12px 18px", background: "none", border: "none",
              borderBottom: tab === t.id ? "2px solid #f7931a" : "2px solid transparent",
              color: tab === t.id ? "#fff" : "#555", cursor: "pointer",
              fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
              transition: "all 0.15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <StatCard label="PnL Realizado" loading={loading}
                value={fmt$(status?.pnl_realizado_total)} sub="Trades cerrados"
                accent={status?.pnl_realizado_total >= 0 ? "#00ff88" : "#ff6b6b"} />
              <StatCard label="Funding Cobrado" loading={loading}
                value={fmt$(status?.funding_cobrado_total)} sub="Acumulado total" accent="#f7931a" />
              <StatCard label="Posiciones Activas" loading={loading}
                value={posicionesActivas.length} sub={`Máx ${status?.max_posiciones || 4}`} />
              <StatCard label="Balance Spot" loading={loading}
                value={fmt$(status?.balance_spot?.USDT)} sub="USDT disponible" />
              <StatCard label="Balance Futuros" loading={loading}
                value={fmt$(status?.balance_futures?.USDT)}
                sub={`PnL no real: ${fmt$(status?.balance_futures?.unrealized_pnl)}`}
                accent={status?.balance_futures?.unrealized_pnl >= 0 ? "#a78bfa" : "#ff9966"} />
              <StatCard label="BNB Balance" loading={loading}
                value={`${status?.bnb?.bnb_balance || 0} BNB`}
                sub={`≈ ${fmt$(status?.bnb?.bnb_valor_usdt)} | Ahorro: ${fmt$(status?.bnb?.ahorro_estimado)}/op`}
                accent="#f3ba2f" />
            </div>

            <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #161616",
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace",
                  letterSpacing: 2, color: "#888", textTransform: "uppercase" }}>Posiciones Abiertas</span>
                <span style={{ fontSize: 11, color: "#444", fontFamily: "'Space Mono', monospace" }}>
                  {posicionesActivas.length} / {status?.max_posiciones || 4}
                </span>
              </div>
              {posicionesActivas.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#333",
                  fontFamily: "'Space Mono', monospace", fontSize: 12 }}>Sin posiciones abiertas</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #161616" }}>
                      {["Par", "Dirección", "Capital", "Entrada", "Precio Act.", "PnL Precio", "Funding", "Ciclos", "Acción"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10,
                          color: "#444", fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                          textTransform: "uppercase", fontWeight: 400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {posicionesActivas.map(pos => (
                      <tr key={pos.symbol} style={{ borderBottom: "1px solid #111" }}>
                        <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700 }}>{pos.symbol}</td>
                        <td style={{ padding: "12px 14px" }}><DireccionBadge dir={pos.direccion} /></td>
                        <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#ccc" }}>{fmt$(pos.capital)}</td>
                        <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888" }}>{fmt$(pos.precio_entrada_spot)}</td>
                        <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#ccc" }}>{fmt$(pos.precio_actual)}</td>
                        <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: pos.pnl_precio >= 0 ? "#00ff88" : "#ff6b6b", fontWeight: 700 }}>{fmt$(pos.pnl_precio)}</td>
                        <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#f7931a" }}>{fmt$(pos.funding_cobrado)}</td>
                        <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888" }}>{pos.ciclos_cobrados || 0}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <button onClick={() => cerrarPosicion(pos.symbol)} disabled={accionando}
                            style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid #ff444430",
                              background: "#1a0505", color: "#ff4444", cursor: "pointer",
                              fontSize: 10, fontFamily: "'Space Mono', monospace" }}>CERRAR</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {(circuitBreaker || (status?.lista_negra?.length > 0)) && (
              <div style={{ display: "flex", gap: 14 }}>
                {circuitBreaker && (
                  <div style={{ flex: 1, background: "#1a0a00", border: "1px solid #f7931a30", borderRadius: 8, padding: "16px 20px" }}>
                    <div style={{ fontSize: 11, color: "#f7931a", fontFamily: "'Space Mono', monospace", letterSpacing: 2, marginBottom: 8 }}>⚡ CIRCUIT BREAKER ACTIVO</div>
                    <div style={{ fontSize: 12, color: "#888" }}>Hasta: {status?.circuit_breaker_hasta ? fmtTime(status.circuit_breaker_hasta) : "—"}</div>
                  </div>
                )}
                {status?.lista_negra?.length > 0 && (
                  <div style={{ flex: 1, background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 8, padding: "16px 20px" }}>
                    <div style={{ fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace", letterSpacing: 2, marginBottom: 8 }}>🚫 LISTA NEGRA</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {status.lista_negra.map(s => <Badge key={s} label={s} color="#ff6b6b" />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* SCANNER */}
        {tab === "scanner" && (
          <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #161616",
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, color: "#888", textTransform: "uppercase" }}>
                Scanner de Funding Rate — {scanner?.pares?.length || 0} pares
              </span>
              <span style={{ fontSize: 10, color: "#444", fontFamily: "'Space Mono', monospace" }}>
                Actualiza cada {POLL_MS/1000}s
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #161616" }}>
                  {["Par", "Precio", "Funding Actual", "Predicted", "Score", "Volumen 24h", "Señal", "Estado"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10,
                      color: "#444", fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                      textTransform: "uppercase", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([...(scanner?.pares || [])].sort((a, b) => (b.predicted_funding_rate || 0) - (a.predicted_funding_rate || 0))).map(p => {
                  const isBull = (p.predicted_funding_rate || 0) >= 0.0005;
                  const isBear = (p.predicted_funding_rate || 0) <= -0.0005;
                  const isAnom = p.es_anomalo;
                  return (
                    <tr key={p.symbol}
                      onMouseEnter={e => e.currentTarget.style.background = "#161616"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      style={{ borderBottom: "1px solid #111", transition: "background 0.15s", cursor: "default" }}>
                      <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700 }}>
                        {isBull && !isAnom && <span style={{ color: "#f7931a", marginRight: 6 }}>●</span>}
                        {isAnom && <span style={{ color: "#ff4444", marginRight: 6 }}>⚠</span>}
                        {p.symbol}
                      </td>
                      <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#ccc" }}>${Number(p.precio || 0).toLocaleString()}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12,
                        color: p.funding_rate > 0 ? "#00ff88" : p.funding_rate < 0 ? "#ff6b6b" : "#555", fontWeight: 700 }}>
                        {fmtPct(p.funding_rate)}
                      </td>
                      <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12,
                        color: p.predicted_funding_rate > 0 ? "#a78bfa" : p.predicted_funding_rate < 0 ? "#ff9966" : "#555", fontWeight: 700 }}>
                        {fmtPct(p.predicted_funding_rate)}
                      </td>
                      <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888" }}>
                        {p.score ? (p.score * 100).toFixed(1) : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#555" }}>
                        {p.volumen_24h ? `$${(p.volumen_24h / 1e6).toFixed(0)}M` : "—"}
                      </td>
                      <td style={{ padding: "12px 14px" }}><DireccionBadge dir={p.direccion} /></td>
                      <td style={{ padding: "12px 14px" }}>
                        {p.en_lista_negra  ? <Badge label="BLOQUEADO"      color="#ff4444" /> :
                         p.es_anomalo      ? <Badge label="ANÓMALO"        color="#ff9966" /> :
                         p.ya_en_posicion  ? <Badge label="EN POSICIÓN"    color="#f7931a" /> :
                         isBull            ? <Badge label="OPORTUNIDAD ▲"  color="#00ff88" /> :
                         isBear            ? <Badge label="BEAR (no op.)"  color="#555"    /> :
                                             <Badge label="BAJO THRESHOLD" color="#333"    />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        {tab === "historial" && (
          <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #161616",
              fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2, color: "#888", textTransform: "uppercase" }}>
              Historial de Operaciones — {historial.length} trades
            </div>
            {historial.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#333",
                fontFamily: "'Space Mono', monospace", fontSize: 12 }}>Sin trades cerrados aún</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #161616" }}>
                    {["Par", "Dirección", "Apertura", "Cierre", "Razón", "Funding Cobrado", "PnL Final"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10,
                        color: "#444", fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                        textTransform: "uppercase", fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...historial].reverse().map((t, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #111" }}>
                      <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700 }}>{t.symbol}</td>
                      <td style={{ padding: "12px 14px" }}><DireccionBadge dir={t.direccion} /></td>
                      <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#555" }}>{fmtTime(t.timestamp_apertura)}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#555" }}>{fmtTime(t.timestamp_cierre)}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <Badge label={t.razon_cierre || "—"}
                          color={t.razon_cierre === "STOP_LOSS" ? "#ff4444" : t.razon_cierre === "MANUAL_DASHBOARD" ? "#f7931a" : "#888"} />
                      </td>
                      <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#f7931a" }}>{fmt$(t.funding_cobrado)}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "'Space Mono', monospace", fontSize: 12,
                        color: t.pnl_final >= 0 ? "#00ff88" : "#ff6b6b", fontWeight: 700 }}>{fmt$(t.pnl_final)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
