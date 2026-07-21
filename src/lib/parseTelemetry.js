// CSV parser for drone telemetry logs (ArduPilot/PX4-style exports).
// Input: raw CSV text with a header row.
// Expected columns: timestamp, battery_voltage, gps_lat, gps_lon, gps_hdop,
//                  satellites_visible, altitude, roll, pitch, yaw, vibration
// Output: a single structured JSON summary object (NOT raw row data) suitable
// for passing to an LLM and for rendering charts.
//
// Robustness: skips malformed/missing rows, tolerates extra whitespace, accepts
// headers in any case, and tolerates alternate column names (e.g. "vibration"
// may be "vibration_x" or "vib_z"). Never throws on bad input — returns a
// best-effort summary with whatever rows parsed successfully.

const REQUIRED_FIELDS = [
  'timestamp',
  'battery_voltage',
  'gps_lat',
  'gps_lon',
  'gps_hdop',
  'satellites_visible',
  'altitude',
  'roll',
  'pitch',
  'yaw',
  'vibration',
]

// Anomaly thresholds (tuned for a typical small quadcopter flight).
const BATTERY_SAG_DROP_V = 0.4 // voltage drop over a short window counts as a sag
const BATTERY_SAG_WINDOW_S = 20 // ...within this many seconds
const BATTERY_LOW_V = 10.5 // absolute low-voltage warning
const VIBRATION_HIGH = 15.0 // mm/s^2 above which vibration is "high"
const HDOP_POOR = 2.0 // HDOP above this is degraded GPS

const COLUMN_ALIASES = {
  timestamp: ['timestamp', 'time', 'time_s', 't', 'time_boot_s'],
  battery_voltage: ['battery_voltage', 'voltage', 'batt_voltage', 'vbat', 'voltage_battery'],
  gps_lat: ['gps_lat', 'lat', 'latitude'],
  gps_lon: ['gps_lon', 'lon', 'lng', 'longitude'],
  gps_hdop: ['gps_hdop', 'hdop', 'gps_hdop_val'],
  satellites_visible: ['satellites_visible', 'sats', 'satellites', 'num_sats', 'gps_satellites'],
  altitude: ['altitude', 'alt', 'rel_alt'],
  roll: ['roll', 'roll_deg'],
  pitch: ['pitch', 'pitch_deg'],
  yaw: ['yaw', 'yaw_deg', 'heading'],
  vibration: ['vibration', 'vibration_x', 'vibration_y', 'vibration_z', 'vib', 'vib_z'],
}

function parseCSVLine(line) {
  // Simple CSV splitter that handles quoted fields.
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function buildColumnMap(header) {
  const map = {}
  const normalized = header.map((h) => h.toLowerCase().trim())
  for (const canon of REQUIRED_FIELDS) {
    const aliases = COLUMN_ALIASES[canon]
    for (const alias of aliases) {
      const idx = normalized.indexOf(alias)
      if (idx !== -1) {
        map[canon] = idx
        break
      }
    }
  }
  return map
}

function toNum(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Haversine distance in meters between two lat/lon points.
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Downsample a series to at most `maxPoints` evenly-spaced samples for charts.
function downsample(points, maxPoints) {
  if (!points || points.length <= maxPoints) return points || []
  const step = (points.length - 1) / (maxPoints - 1)
  const out = []
  for (let i = 0; i < maxPoints; i++) {
    out.push(points[Math.round(i * step)])
  }
  return out
}

/**
 * Parse a drone telemetry CSV string into a structured summary JSON object.
 * @param {string} csvText
 * @returns {{ ok: boolean, error?: string, summary?: object }}
 */
export function parseTelemetryCSV(csvText) {
  if (!csvText || !csvText.trim()) {
    return { ok: false, error: 'Empty CSV input.' }
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) {
    return { ok: false, error: 'CSV has no data rows.' }
  }

  const header = parseCSVLine(lines[0])
  const col = buildColumnMap(header)

  // Validate that we have the bare minimum to produce a useful summary.
  if (col.battery_voltage == null && col.altitude == null) {
    return {
      ok: false,
      error: 'CSV is missing required columns (battery_voltage and altitude not found).',
    }
  }

  const rows = []
  let skipped = 0
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i])
    const row = {}
    for (const canon of REQUIRED_FIELDS) {
      const idx = col[canon]
      row[canon] = idx != null ? toNum(cells[idx]) : null
    }
    // Require at least a timestamp and one real measurement to keep the row.
    if (row.timestamp == null || (row.battery_voltage == null && row.altitude == null)) {
      skipped++
      continue
    }
    rows.push(row)
  }

  if (rows.length === 0) {
    return { ok: false, error: 'No valid telemetry rows could be parsed.' }
  }

  rows.sort((a, b) => a.timestamp - b.timestamp)

  const durationS =
    rows.length > 1 ? rows[rows.length - 1].timestamp - rows[0].timestamp : 0

  // ---- Battery ----
  const batteryRows = rows.filter((r) => r.battery_voltage != null)
  const voltages = batteryRows.map((r) => r.battery_voltage)
  const minVoltage = voltages.length ? Math.min(...voltages) : null
  const maxVoltage = voltages.length ? Math.max(...voltages) : null
  const avgVoltage = voltages.length
    ? voltages.reduce((s, v) => s + v, 0) / voltages.length
    : null

  // Voltage drop rate: overall (start vs end) and max short-window rate.
  let voltageDropRate = null
  let totalVoltageDrop = null
  if (batteryRows.length > 1) {
    const start = batteryRows[0].battery_voltage
    const end = batteryRows[batteryRows.length - 1].battery_voltage
    totalVoltageDrop = +(start - end).toFixed(3)
    voltageDropRate = durationS > 0 ? +(totalVoltageDrop / durationS).toFixed(5) : 0
  }

  // ---- Altitude ----
  const altRows = rows.filter((r) => r.altitude != null)
  const maxAltitude = altRows.length ? Math.max(...altRows.map((r) => r.altitude)) : null
  const avgAltitude = altRows.length
    ? +(altRows.map((r) => r.altitude).reduce((s, v) => s + v, 0) / altRows.length).toFixed(2)
    : null

  // ---- Distance (haversine over lat/lon) ----
  let totalDistance = 0
  const gpsRows = rows.filter(
    (r) => r.gps_lat != null && r.gps_lon != null && Math.abs(r.gps_lat) > 0,
  )
  for (let i = 1; i < gpsRows.length; i++) {
    totalDistance += haversine(
      gpsRows[i - 1].gps_lat,
      gpsRows[i - 1].gps_lon,
      gpsRows[i].gps_lat,
      gpsRows[i].gps_lon,
    )
  }
  totalDistance = +totalDistance.toFixed(1)

  // ---- GPS quality ----
  const hdopRows = rows.filter((r) => r.gps_hdop != null)
  const avgHdop = hdopRows.length
    ? +(hdopRows.map((r) => r.gps_hdop).reduce((s, v) => s + v, 0) / hdopRows.length).toFixed(2)
    : null
  const maxHdop = hdopRows.length ? Math.max(...hdopRows.map((r) => r.gps_hdop)) : null
  const satRows = rows.filter((r) => r.satellites_visible != null)
  const avgSats = satRows.length
    ? +(satRows.map((r) => r.satellites_visible).reduce((s, v) => s + v, 0) / satRows.length).toFixed(1)
    : null
  const minSats = satRows.length ? Math.min(...satRows.map((r) => r.satellites_visible)) : null

  // GPS quality score: 0-100. Lower HDOP and more sats => higher score.
  let gpsQualityScore = null
  if (avgHdop != null && avgSats != null) {
    const hdopScore = Math.max(0, 100 - avgHdop * 30) // hdop 0 => 100, hdop 3.3 => 0
    const satScore = Math.min(100, (avgSats / 14) * 100) // 14 sats => 100
    gpsQualityScore = Math.round(hdopScore * 0.6 + satScore * 0.4)
  }

  // ---- Vibration / stability ----
  const vibRows = rows.filter((r) => r.vibration != null)
  const avgVibration = vibRows.length
    ? +(vibRows.map((r) => r.vibration).reduce((s, v) => s + v, 0) / vibRows.length).toFixed(2)
    : null
  const peakVibration = vibRows.length ? Math.max(...vibRows.map((r) => r.vibration)) : null

  const rollRows = rows.filter((r) => r.roll != null)
  const pitchRows = rows.filter((r) => r.pitch != null)
  const yawRows = rows.filter((r) => r.yaw != null)
  const maxRoll = rollRows.length ? Math.max(...rollRows.map((r) => Math.abs(r.roll))) : null
  const maxPitch = pitchRows.length ? Math.max(...pitchRows.map((r) => Math.abs(r.pitch))) : null
  const maxYawRate = (() => {
    if (yawRows.length < 2) return null
    let maxRate = 0
    for (let i = 1; i < yawRows.length; i++) {
      const dt = yawRows[i].timestamp - yawRows[i - 1].timestamp
      if (dt > 0) {
        const rate = Math.abs(yawRows[i].yaw - yawRows[i - 1].yaw) / dt
        if (rate > maxRate) maxRate = rate
      }
    }
    return +maxRate.toFixed(2)
  })()

  // ---- Anomaly windows ----
  const anomalies = { battery_sag: [], high_vibration: [], gps_degraded: [], low_battery: [] }

  // Battery sag: scan a sliding window for a drop >= BATTERY_SAG_DROP_V within BATTERY_SAG_WINDOW_S.
  if (batteryRows.length > 2) {
    let i = 0
    while (i < batteryRows.length - 1) {
      let j = i + 1
      while (
        j < batteryRows.length &&
        batteryRows[j].timestamp - batteryRows[i].timestamp <= BATTERY_SAG_WINDOW_S
      ) {
        const drop = batteryRows[i].battery_voltage - batteryRows[j].battery_voltage
        if (drop >= BATTERY_SAG_DROP_V) {
          anomalies.battery_sag.push({
            start_s: +batteryRows[i].timestamp.toFixed(1),
            end_s: +batteryRows[j].timestamp.toFixed(1),
            start_v: +batteryRows[i].battery_voltage.toFixed(2),
            end_v: +batteryRows[j].battery_voltage.toFixed(2),
            drop_v: +drop.toFixed(2),
          })
          i = j // skip ahead to avoid overlapping windows
          break
        }
        j++
      }
      i++
    }
  }

  // Low battery (absolute threshold).
  for (const r of batteryRows) {
    if (r.battery_voltage <= BATTERY_LOW_V) {
      anomalies.low_battery.push({ t_s: +r.timestamp.toFixed(1), voltage: +r.battery_voltage.toFixed(2) })
      break // one event is enough to flag
    }
  }

  // High vibration windows (consecutive samples above threshold).
  if (vibRows.length) {
    let start = null
    for (let k = 0; k < vibRows.length; k++) {
      const r = vibRows[k]
      if (r.vibration >= VIBRATION_HIGH) {
        if (start == null) start = r.timestamp
      } else if (start != null) {
        anomalies.high_vibration.push({
          start_s: +start.toFixed(1),
          end_s: +r.timestamp.toFixed(1),
          peak: +Math.max(...vibRows.slice(Math.max(0, k - 1), k).map((x) => x.vibration)).toFixed(2),
        })
        start = null
      }
    }
    if (start != null) {
      const last = vibRows[vibRows.length - 1]
      anomalies.high_vibration.push({
        start_s: +start.toFixed(1),
        end_s: +last.timestamp.toFixed(1),
        peak: +last.vibration.toFixed(2),
      })
    }
  }

  // GPS degraded windows (consecutive samples with HDOP > HDOP_POOR).
  if (hdopRows.length) {
    let start = null
    let peak = 0
    for (let k = 0; k < hdopRows.length; k++) {
      const r = hdopRows[k]
      if (r.gps_hdop != null && r.gps_hdop > HDOP_POOR) {
        if (start == null) start = r.timestamp
        if (r.gps_hdop > peak) peak = r.gps_hdop
      } else if (start != null) {
        anomalies.gps_degraded.push({
          start_s: +start.toFixed(1),
          end_s: +r.timestamp.toFixed(1),
          peak_hdop: +peak.toFixed(2),
        })
        start = null
        peak = 0
      }
    }
    if (start != null) {
      const last = hdopRows[hdopRows.length - 1]
      anomalies.gps_degraded.push({
        start_s: +start.toFixed(1),
        end_s: +last.timestamp.toFixed(1),
        peak_hdop: +peak.toFixed(2),
      })
    }
  }

  // ---- Downsampled series for charts (max 120 points each) ----
  const MAX_CHART_POINTS = 120
  const batterySeries = downsample(
    batteryRows.map((r) => ({ t: +r.timestamp.toFixed(1), voltage: +r.battery_voltage.toFixed(2) })),
    MAX_CHART_POINTS,
  )
  const altitudeSeries = downsample(
    altRows.map((r) => ({ t: +r.timestamp.toFixed(1), alt: +r.altitude.toFixed(1) })),
    MAX_CHART_POINTS,
  )
  const gpsSeries = downsample(
    rows
      .filter((r) => r.gps_hdop != null || r.satellites_visible != null)
      .map((r) => ({
        t: +r.timestamp.toFixed(1),
        hdop: r.gps_hdop != null ? +r.gps_hdop.toFixed(2) : null,
        sats: r.satellites_visible,
      })),
    MAX_CHART_POINTS,
  )
  const stabilitySeries = downsample(
    rows
      .filter((r) => r.vibration != null || r.roll != null)
      .map((r) => ({
        t: +r.timestamp.toFixed(1),
        vibration: r.vibration != null ? +r.vibration.toFixed(2) : null,
        roll: r.roll != null ? +r.roll.toFixed(2) : null,
        pitch: r.pitch != null ? +r.pitch.toFixed(2) : null,
      })),
    MAX_CHART_POINTS,
  )

  const summary = {
    meta: {
      filename: null, // set by caller
      row_count: rows.length,
      rows_skipped: skipped,
      duration_s: +durationS.toFixed(1),
      parsed_at: new Date().toISOString(),
    },
    battery: {
      min_voltage: minVoltage != null ? +minVoltage.toFixed(2) : null,
      max_voltage: maxVoltage != null ? +maxVoltage.toFixed(2) : null,
      avg_voltage: avgVoltage != null ? +avgVoltage.toFixed(2) : null,
      total_voltage_drop: totalVoltageDrop,
      voltage_drop_rate_v_per_s: voltageDropRate,
      low_battery_event: anomalies.low_battery[0] ?? null,
    },
    altitude: {
      max_altitude: maxAltitude != null ? +maxAltitude.toFixed(1) : null,
      avg_altitude: avgAltitude,
    },
    distance: {
      total_distance_m: totalDistance,
      total_distance_km: +(totalDistance / 1000).toFixed(3),
    },
    gps: {
      avg_hdop: avgHdop,
      max_hdop: maxHdop != null ? +maxHdop.toFixed(2) : null,
      avg_satellites: avgSats,
      min_satellites: minSats,
      quality_score: gpsQualityScore,
    },
    stability: {
      avg_vibration: avgVibration,
      peak_vibration: peakVibration != null ? +peakVibration.toFixed(2) : null,
      max_roll: maxRoll != null ? +maxRoll.toFixed(2) : null,
      max_pitch: maxPitch != null ? +maxPitch.toFixed(2) : null,
      max_yaw_rate: maxYawRate,
    },
    anomalies: {
      battery_sag: anomalies.battery_sag,
      high_vibration: anomalies.high_vibration,
      gps_degraded: anomalies.gps_degraded,
      low_battery: anomalies.low_battery,
    },
    series: {
      battery: batterySeries,
      altitude: altitudeSeries,
      gps: gpsSeries,
      stability: stabilitySeries,
    },
  }

  return { ok: true, summary }
}

/**
 * Generate a realistic sample telemetry CSV (for the demo "try a sample" button).
 * Simulates a ~6 minute flight with a battery sag after 220s, a GPS degradation
 * window around 140-190s, and a vibration spike around 200-260s.
 */
export function generateSampleCSV() {
  const header = REQUIRED_FIELDS.join(',')
  const lines = [header]
  const points = 120
  for (let i = 0; i < points; i++) {
    const t = +(i * 3).toFixed(1) // 0..357s, ~6min
    let v = 12.6 - i * 0.0135
    if (t > 220 && t <= 240) v -= (t - 220) * 0.025 // steep sag: ~0.5V drop in 20s
    else if (t > 240) v -= 0.5 // hold the sag drop
    v = +v.toFixed(2)
    const alt =
      i < 6 ? i * 9 : i > points - 8 ? Math.max(0, (points - i) * 11) : 54 + Math.sin(i / 4) * 7
    const lat = 12.967 + i * 0.00009 + Math.sin(i / 5) * 0.0004
    const lon = 77.5946 + i * 0.00008 + Math.cos(i / 6) * 0.0003
    const hdop = i > 46 && i < 63 ? +(2.4 + Math.sin(i) * 0.4).toFixed(2) : +(0.9 + Math.sin(i / 3) * 0.2).toFixed(2)
    const sats = Math.max(6, Math.round(14 - hdop))
    const roll = +(Math.sin(i / 2) * 4).toFixed(2)
    const pitch = +(Math.cos(i / 3) * 3).toFixed(2)
    const yaw = +((i * 1.5) % 360).toFixed(2)
    const vib = i > 66 && i < 87 ? +(22 + Math.sin(i) * 6).toFixed(2) : +(6 + Math.sin(i / 2) * 2).toFixed(2)
    lines.push([t, v, lat.toFixed(6), lon.toFixed(6), hdop, sats, alt.toFixed(1), roll, pitch, yaw, vib].join(','))
  }
  return lines.join('\n')
}
