# Funding Rate Arbitrage Bot

Bot de arbitraje sobre Binance que captura el funding rate cada 8 horas sin exposición direccional al precio.

---

## ¿Cómo funciona?

En los mercados de futuros perpetuos existe un mecanismo llamado **funding rate**: cada 8 horas (00:00, 08:00 y 16:00 UTC), los traders con posiciones largas le pagan a los que tienen posiciones cortas, o viceversa, dependiendo de si el mercado está alcista o bajista.

Cuando el funding es **positivo**, los longs pagan a los shorts. El bot aprovecha esto abriendo dos posiciones simultáneas:

1. **Compra el activo en spot** (long real)
2. **Abre un short en futuros perpetuos** por la misma cantidad

El resultado es una posición **delta-neutral**: si el precio sube o baja, las dos posiciones se compensan entre sí. La ganancia viene exclusivamente del **funding rate cobrado** cada 8 horas por mantener el short en futuros.

### ¿Cuándo entra el bot?

El bot entra cuando el **predicted funding rate** supera el 0.05%. El predicted es el estimado del próximo pago, calculado en tiempo real como la diferencia entre el precio mark y el precio index de Binance. Es la señal más temprana disponible antes de que se concrete el pago.

### ¿Cuándo sale?

El bot cierra la posición si ocurre alguna de estas condiciones, en orden de prioridad:

1. La posición cae más del **1.5%** (stop loss)
2. El funding rate **se invierte** contra la posición
3. El funding rate **cae por debajo del 0.02%** (ya no es rentable)
4. Se cumplieron al menos **3 ciclos de funding cobrados** y ya no hay señal
5. La posición lleva más de **7 días abierta**
6. Cierre **manual** desde el dashboard

### ¿Por qué solo mercados alcistas?

Para operar en mercados bajistas (funding negativo) se necesitaría vender en corto en spot, lo que requiere préstamo de activos. El bot opera únicamente cuando el funding es positivo, con long spot + short futuro, que es la operación más simple y segura.

---

## El dashboard

### Header

El encabezado muestra el estado actual del bot y los controles principales.

**Indicador de estado:**
- 🟢 **ACTIVO** — el bot está corriendo, escaneando y puede abrir posiciones
- 🔴 **DETENIDO** — el bot está parado, no abre nada nuevo
- 🟠 **CIRCUIT BREAKER** — pausa automática por volatilidad extrema (se reactiva solo)

**Botones:**
- **▶ INICIAR / ⏹ DETENER** — activa o desactiva el bot. Requiere contraseña.
- **🚨 EMERGENCIA** — detiene el bot instantáneamente. Usar si ves algo muy raro en el mercado. No cierra las posiciones abiertas, solo frena nuevas entradas. Requiere contraseña.

---

### Tab Dashboard

Vista general del estado del portfolio.

**Tarjetas superiores:**

| Tarjeta | Qué muestra |
|---|---|
| PnL Realizado | Ganancia o pérdida acumulada de todos los trades cerrados |
| Funding Cobrado | Total de funding rate cobrado desde que arrancó el bot |
| Posiciones Activas | Cuántas posiciones hay abiertas en este momento |
| Balance Spot | USDT disponible en la wallet spot |
| Balance Futuros | USDT en la wallet de futuros + PnL no realizado |
| BNB Balance | BNB disponible para pagar comisiones reducidas |

**Tabla de posiciones abiertas:**

| Columna | Descripción |
|---|---|
| Par | El activo operado |
| Dirección | Siempre ▲ LONG SPOT (compramos spot, shorteamos futuros) |
| Capital | USDT asignado a esta posición |
| Entrada | Precio al que se compró en spot |
| Precio Act. | Precio actual del activo |
| PnL Precio | Ganancia o pérdida por movimiento de precio (debería ser ~0 por ser delta-neutral) |
| Funding | Funding cobrado acumulado en esta posición |
| Ciclos | Cuántos pagos de funding se cobraron (cada 8hs = 1 ciclo) |
| Acción | Botón para cerrar manualmente la posición |

---

### Tab Scanner

Muestra los 10 pares monitoreados en tiempo real, ordenados por score de mayor a menor.

| Columna | Descripción |
|---|---|
| Par | Símbolo del activo |
| Precio | Precio actual en spot |
| Funding Actual | Último funding rate cobrado (se actualiza cada 8hs) |
| Predicted | Estimado del próximo funding — esta es la señal que usa el bot |
| Score | Puntaje compuesto 0-100: funding (50%) + volumen (30%) + estabilidad histórica (20%) |
| Volumen 24h | Volumen negociado en las últimas 24 horas |
| Señal | Dirección recomendada según el predicted |
| Estado | Estado actual del par (ver abajo) |

**Estados posibles:**

| Estado | Significado |
|---|---|
| 🟢 OPORTUNIDAD ▲ | Funding positivo supera el threshold — el bot puede entrar |
| ⬜ BEAR (no op.) | Funding negativo — no operable sin short en spot |
| 🟠 ANÓMALO | El funding es más de 5x el promedio histórico — sospechoso, se ignora |
| 🟡 EN POSICIÓN | Ya hay una posición abierta en este par |
| 🔴 BLOQUEADO | El par está en lista negra por 24hs tras un stop loss |
| ⬛ BAJO THRESHOLD | El funding no supera el mínimo del 0.05% |

---

### Tab Historial

Registro de todas las operaciones cerradas, ordenadas de más reciente a más antigua.

| Columna | Descripción |
|---|---|
| Par | El activo operado |
| Dirección | Siempre ▲ LONG SPOT |
| Apertura | Hora en que se abrió la posición |
| Cierre | Hora en que se cerró |
| Razón | Por qué se cerró (stop loss, funding bajo, manual, etc.) |
| Funding Cobrado | Total de funding cobrado durante la posición |
| PnL Final | Resultado neto incluyendo precio + funding − comisiones |

---

## Protecciones automáticas

El bot tiene varios mecanismos de protección que actúan sin intervención manual:

- **Stop loss por posición**: cierra automáticamente si una posición cae más del 1.5%
- **Stop loss global**: si el portfolio pierde más del 5%, el bot se detiene solo
- **Pérdida diaria máxima**: si se pierde más del 3% en un día, el bot pausa hasta el día siguiente
- **Circuit breaker**: si un activo se mueve más del 5% en 5 minutos, el bot pausa 30 minutos
- **Lista negra**: un par queda bloqueado 24hs después de cerrar con stop loss
- **Rollback automático**: si una de las dos órdenes falla al abrir, se cancela la otra automáticamente

---

## Rentabilidad esperada

| Escenario de mercado | APR estimado |
|---|---|
| Mercado lateral tranquilo | ~12% |
| Bull o bear moderado | ~30% |
| Euforia o pánico | 60%+ |

En mercados sin tendencia clara el bot simplemente espera sin operar. La estrategia es más rentable cuanto más extremo sea el sentimiento del mercado.
