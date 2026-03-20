/**
 * Seed: 2 operatori NCC costa adriatica + collegamenti Marche/Umbria/Emilia
 *
 * 1. "Adriatica NCC" — Ancona, Pesaro, Rimini, San Marino, Urbino, Fano
 * 2. "Marche & Umbria Transfer" — Ancona, Perugia, Macerata, Ascoli, Civitanova
 *
 * + viaggi extra per Bologna NCC Service (già esistente) verso costa adriatica
 *
 * Usage: node scripts/seed-adriatica.mjs
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import pgModule from 'pg';
const { Pool: PgPool } = pgModule;
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rideback';
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const pool = new PgPool({ connectionString: DATABASE_URL });
async function sql(t, p = []) { return (await pool.query(t, p)).rows; }
const uuid = () => randomUUID();
function fd(d, h, m = 0) { const dt = new Date(); dt.setDate(dt.getDate() + d); dt.setHours(h, m, 0, 0); return dt.toISOString(); }

async function getRoute(oLng, oLat, dLng, dLat) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${oLng},${oLat};${dLng},${dLat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
  const data = await (await fetch(url)).json();
  if (!data.routes?.[0]) throw new Error(`No route: ${JSON.stringify(data)}`);
  const r = data.routes[0];
  return { geometry: r.geometry, distanceKm: +(r.distance / 1000).toFixed(2), durationMinutes: Math.round(r.duration / 60) };
}

async function createOp({ company, operator, drivers, vehicles, trips: td }) {
  console.log(`\n🚐 ${company.name} — ${company.city}`);
  const cId = uuid();
  await sql(`INSERT INTO companies (id,name,slug,vat_number,ncc_license_number,ncc_license_expiry,address,city,province,region,postal_code,phone,email,description,status,verified_at) VALUES ($1,$2,$3,$4,$5,'2028-12-31',$6,$7,$8,$9,$10,$11,$12,$13,'verified',NOW())`,
    [cId, company.name, company.slug, company.vat, company.license, company.address, company.city, company.province, company.region, company.cap, company.phone, company.email, company.desc]);
  const oId = uuid();
  await sql(`INSERT INTO users (id,email,password_hash,display_name,phone,user_type,company_id) VALUES ($1,$2,$3,$4,$5,'operator',$6)`,
    [oId, operator.email, bcrypt.hashSync(operator.pw, 12), operator.name, company.phone, cId]);
  console.log(`  ✅ ${operator.email} / ${operator.pw}`);
  const dIds = [];
  for (const d of drivers) { const id = uuid(); dIds.push(id); await sql(`INSERT INTO drivers (id,company_id,first_name,last_name,phone,license_number,license_expiry) VALUES ($1,$2,$3,$4,$5,$6,'2029-12-31')`, [id, cId, d.f, d.l, d.p, d.lic]); }
  const vIds = [];
  for (const v of vehicles) { const id = uuid(); vIds.push(id); await sql(`INSERT INTO vehicles (id,company_id,vehicle_type,make,model,year,color,license_plate,seats_total,amenities) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [id, cId, v.t, v.mk, v.md, v.y, v.c, v.pl, v.s, JSON.stringify(v.am)]); }
  for (let i = 0; i < td.length; i++) {
    const t = td[i];
    process.stdout.write(`  ${i+1}/${td.length} ${t.o.city}→${t.d.city}...`);
    const r = await getRoute(t.o.lng, t.o.lat, t.d.lng, t.d.lat);
    const dep = fd(t.dy, t.h, t.m||0);
    const arr = new Date(new Date(dep).getTime() + r.durationMinutes*60000).toISOString();
    await sql(`INSERT INTO trips (id,company_id,driver_id,vehicle_id,origin_address,origin_lat,origin_lng,origin_city,destination_address,destination_lat,destination_lng,destination_city,route_geometry,route_distance_km,route_duration_minutes,departure_at,estimated_arrival_at,seats_available,seats_booked,price_per_seat,allows_intermediate_stops,notes,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,0,$19,true,$20,'scheduled')`,
      [uuid(),cId,dIds[t.dr],vIds[t.v],t.o.address,t.o.lat,t.o.lng,t.o.city,t.d.address,t.d.lat,t.d.lng,t.d.city,JSON.stringify(r.geometry),r.distanceKm,r.durationMinutes,dep,arr,t.se,t.pr,t.n]);
    console.log(` ✅ ${r.distanceKm}km`);
  }
  return { companyId: cId, driverIds: dIds, vehicleIds: vIds };
}

// Funzione per aggiungere viaggi a un operatore esistente
async function addTripsToExisting(companySlug, td) {
  const [company] = await sql(`SELECT id FROM companies WHERE slug=$1`, [companySlug]);
  if (!company) { console.log(`  ⚠ Company ${companySlug} non trovata, skip`); return; }
  const driverRows = await sql(`SELECT id FROM drivers WHERE company_id=$1 ORDER BY created_at`, [company.id]);
  const vehicleRows = await sql(`SELECT id FROM vehicles WHERE company_id=$1 ORDER BY created_at`, [company.id]);
  if (!driverRows.length || !vehicleRows.length) { console.log(`  ⚠ Nessun driver/vehicle per ${companySlug}`); return; }
  const dIds = driverRows.map(r => r.id);
  const vIds = vehicleRows.map(r => r.id);

  console.log(`\n📌 Viaggi extra per "${companySlug}" (${td.length} trips)`);
  for (let i = 0; i < td.length; i++) {
    const t = td[i];
    process.stdout.write(`  ${i+1}/${td.length} ${t.o.city}→${t.d.city}...`);
    const r = await getRoute(t.o.lng, t.o.lat, t.d.lng, t.d.lat);
    const dep = fd(t.dy, t.h, t.m||0);
    const arr = new Date(new Date(dep).getTime() + r.durationMinutes*60000).toISOString();
    await sql(`INSERT INTO trips (id,company_id,driver_id,vehicle_id,origin_address,origin_lat,origin_lng,origin_city,destination_address,destination_lat,destination_lng,destination_city,route_geometry,route_distance_km,route_duration_minutes,departure_at,estimated_arrival_at,seats_available,seats_booked,price_per_seat,allows_intermediate_stops,notes,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,0,$19,true,$20,'scheduled')`,
      [uuid(),company.id,dIds[t.dr % dIds.length],vIds[t.v % vIds.length],t.o.address,t.o.lat,t.o.lng,t.o.city,t.d.address,t.d.lat,t.d.lng,t.d.city,JSON.stringify(r.geometry),r.distanceKm,r.durationMinutes,dep,arr,t.se,t.pr,t.n]);
    console.log(` ✅ ${r.distanceKm}km`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
const L = {
  // Marche
  ancona:       { address: 'Ancona, Piazza del Plebiscito', city: 'Ancona', lat: 43.6158, lng: 13.5185 },
  anconaAero:   { address: 'Aeroporto di Ancona Falconara', city: 'Falconara Marittima', lat: 43.6163, lng: 13.3623 },
  anconaPorto:  { address: 'Ancona, Porto Crociere', city: 'Ancona', lat: 43.6253, lng: 13.5050 },
  pesaro:       { address: 'Pesaro, Piazzale della Libertà', city: 'Pesaro', lat: 43.9103, lng: 12.9133 },
  urbino:       { address: 'Urbino, Piazza della Repubblica', city: 'Urbino', lat: 43.7263, lng: 12.6366 },
  fano:         { address: 'Fano, Lungomare Sassonia', city: 'Fano', lat: 43.8400, lng: 13.0190 },
  senigallia:   { address: 'Senigallia, Rotonda a Mare', city: 'Senigallia', lat: 43.7115, lng: 13.2164 },
  macerata:     { address: 'Macerata, Piazza della Libertà', city: 'Macerata', lat: 43.2987, lng: 13.4528 },
  ascoliP:      { address: 'Ascoli Piceno, Piazza del Popolo', city: 'Ascoli Piceno', lat: 42.8537, lng: 13.5754 },
  civitanova:   { address: 'Civitanova Marche, Lungomare', city: 'Civitanova Marche', lat: 43.3034, lng: 13.7270 },
  sanBenedetto: { address: 'San Benedetto del Tronto, Lungomare', city: 'San Benedetto del Tronto', lat: 42.9449, lng: 13.8926 },
  recanati:     { address: 'Recanati, Piazza Leopardi', city: 'Recanati', lat: 43.4036, lng: 13.5497 },
  loreto:       { address: 'Loreto, Piazza della Madonna', city: 'Loreto', lat: 43.4407, lng: 13.6075 },
  numana:       { address: 'Numana, Spiaggia', city: 'Numana', lat: 43.5098, lng: 13.6206 },
  sanMarino:    { address: 'San Marino, Piazza della Libertà', city: 'San Marino', lat: 43.9363, lng: 12.4468 },
  gabicce:      { address: 'Gabicce Mare, Lungomare', city: 'Gabicce Mare', lat: 43.9662, lng: 12.7577 },

  // Emilia / Romagna
  bologna:      { address: 'Bologna, Piazza Maggiore', city: 'Bologna', lat: 44.4939, lng: 11.3430 },
  bolognaSt:    { address: 'Bologna Centrale', city: 'Bologna', lat: 44.5058, lng: 11.3427 },
  bolognaAero:  { address: 'Aeroporto di Bologna Marconi', city: 'Bologna', lat: 44.5354, lng: 11.2887 },
  rimini:       { address: 'Rimini, Piazzale Fellini', city: 'Rimini', lat: 44.0620, lng: 12.5682 },
  cesena:       { address: 'Cesena, Piazza del Popolo', city: 'Cesena', lat: 44.1396, lng: 12.2427 },
  riccione:     { address: 'Riccione, Viale Ceccarini', city: 'Riccione', lat: 44.0011, lng: 12.6551 },
  cattolica:    { address: 'Cattolica, Piazza I Maggio', city: 'Cattolica', lat: 43.9613, lng: 12.7391 },
  ravenna:      { address: 'Ravenna, Piazza del Popolo', city: 'Ravenna', lat: 44.4175, lng: 12.1996 },
  forli:        { address: 'Forlì, Piazza Saffi', city: 'Forlì', lat: 44.2218, lng: 12.0407 },

  // Umbria / Lazio
  perugia:      { address: 'Perugia, Piazza IV Novembre', city: 'Perugia', lat: 43.1107, lng: 12.3891 },
  assisi:       { address: 'Assisi, Piazza del Comune', city: 'Assisi', lat: 43.0707, lng: 12.6164 },
  spoleto:      { address: 'Spoleto, Piazza del Mercato', city: 'Spoleto', lat: 42.7319, lng: 12.7367 },
  foligno:      { address: 'Foligno, Piazza della Repubblica', city: 'Foligno', lat: 42.9492, lng: 12.7112 },
  terni:        { address: 'Terni, Piazza Europa', city: 'Terni', lat: 42.5593, lng: 12.6418 },
  orvieto:      { address: 'Orvieto, Piazza del Duomo', city: 'Orvieto', lat: 42.7180, lng: 12.1122 },

  // Roma / Firenze (per collegamenti)
  roma:         { address: 'Roma Termini', city: 'Roma', lat: 41.9013, lng: 12.5024 },
  fiumicino:    { address: 'Aeroporto di Fiumicino (FCO)', city: 'Fiumicino', lat: 41.7999, lng: 12.2462 },
  firenze:      { address: 'Firenze, Piazza della Stazione', city: 'Firenze', lat: 43.7764, lng: 11.2479 },
};

async function main() {
  console.log('🏖️ Seeding operatori costa adriatica + Marche...\n');

  // ─── 1. ADRIATICA NCC ─────────────────────────────────────────────────
  await createOp({
    company: { name:'Adriatica NCC', slug:'adriatica-ncc', vat:'IT11011011011', license:'NCC-AN-2024-1101', address:'Corso Garibaldi 50', city:'Pesaro', province:'PU', region:'Marche', cap:'61121', phone:'+39 0721 555110', email:'info@adriaticancc.it', desc:'NCC costa adriatica. Pesaro, Fano, Senigallia, Urbino, Rimini, San Marino. Transfer aeroporto Falconara e Bologna.' },
    operator: { email:'ops@adriaticancc.it', pw:'AdriaticaNcc2026', name:'Davide Mancini' },
    drivers: [
      { f:'Davide', l:'Mancini', p:'+39 328 1101001', lic:'PU1101001A' },
      { f:'Simone', l:'Galli', p:'+39 328 1101002', lic:'PU1101002B' },
      { f:'Luca', l:'Bartoli', p:'+39 328 1101003', lic:'RN1101003C' },
    ],
    vehicles: [
      { t:'sedan', mk:'Mercedes-Benz', md:'Classe E', y:2024, c:'Nero Ossidiana', pl:'PU 110 AN', s:3, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua'] },
      { t:'van', mk:'Mercedes-Benz', md:'V-Class', y:2023, c:'Grigio Selenite', pl:'PU 111 AN', s:7, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua','Monitor'] },
      { t:'minibus', mk:'Mercedes-Benz', md:'Sprinter Tourer', y:2023, c:'Bianco', pl:'PU 112 AN', s:8, am:['Wi-Fi','Aria condizionata','Prese USB','Bagagliera XL'] },
    ],
    trips: [
      // Oggi
      { dy:0, h:14, o:L.anconaAero, d:L.pesaro, v:0, dr:0, se:3, pr:3000, n:'Rientro da Falconara verso Pesaro.' },
      { dy:0, h:17, o:L.rimini, d:L.pesaro, v:0, dr:1, se:3, pr:2000, n:'Rientro serale dalla Riviera Romagnola.' },
      // +1
      { dy:1, h:7, o:L.pesaro, d:L.bolognaAero, v:1, dr:0, se:6, pr:5000, n:'Transfer Pesaro → Aeroporto Bologna Marconi.' },
      { dy:1, h:12, o:L.bolognaAero, d:L.pesaro, v:1, dr:0, se:6, pr:5000, n:'Rientro da Bologna Marconi.' },
      { dy:1, h:9, o:L.pesaro, d:L.urbino, v:0, dr:1, se:3, pr:1800, n:'Transfer Pesaro → Urbino. Città ducale, UNESCO.' },
      { dy:1, h:15, o:L.urbino, d:L.fano, v:0, dr:1, se:3, pr:2000, n:'Rientro da Urbino verso costa.' },
      { dy:1, h:10, o:L.rimini, d:L.sanMarino, v:2, dr:2, se:8, pr:1500, n:'Shuttle Rimini → San Marino.' },
      { dy:1, h:16, o:L.sanMarino, d:L.rimini, v:2, dr:2, se:8, pr:1500, n:'Rientro da San Marino.' },
      // +2
      { dy:2, h:8, o:L.pesaro, d:L.ancona, v:0, dr:0, se:3, pr:2500, n:'Transfer Pesaro → Ancona lungo la costa.' },
      { dy:2, h:14, o:L.anconaPorto, d:L.senigallia, v:1, dr:1, se:7, pr:2000, n:'Transfer porto crociere → Senigallia. Spiaggia di velluto.' },
      { dy:2, h:9, o:L.gabicce, d:L.urbino, v:0, dr:2, se:3, pr:2000, n:'Transfer Gabicce → Urbino. Salita nel Montefeltro.' },
      { dy:2, h:17, o:L.senigallia, d:L.pesaro, v:0, dr:0, se:3, pr:2000, n:'Rientro da Senigallia via litoranea.' },
      // +3
      { dy:3, h:7, o:L.pesaro, d:L.rimini, v:1, dr:0, se:7, pr:2000, n:'Shuttle costa Pesaro → Rimini.' },
      { dy:3, h:9, o:L.rimini, d:L.cesena, v:0, dr:1, se:3, pr:1800, n:'Transfer Rimini → Cesena.' },
      { dy:3, h:14, o:L.cesena, d:L.riccione, v:0, dr:1, se:3, pr:2000, n:'Transfer Cesena → Riccione.' },
      { dy:3, h:10, o:L.cattolica, d:L.pesaro, v:2, dr:2, se:8, pr:1200, n:'Shuttle Cattolica → Pesaro.' },
      { dy:3, h:17, o:L.anconaAero, d:L.senigallia, v:1, dr:0, se:6, pr:2000, n:'Rientro da Falconara verso Senigallia.' },
      // +4
      { dy:4, h:6, m:30, o:L.pesaro, d:L.anconaAero, v:0, dr:0, se:3, pr:2500, n:'Transfer early morning Pesaro → Falconara.' },
      { dy:4, h:8, o:L.rimini, d:L.bologna, v:1, dr:2, se:7, pr:4000, n:'Transfer Rimini → Bologna.' },
      { dy:4, h:15, o:L.bologna, d:L.rimini, v:1, dr:2, se:7, pr:4000, n:'Rientro da Bologna verso Riviera.' },
      { dy:4, h:10, o:L.fano, d:L.ancona, v:0, dr:1, se:3, pr:2000, n:'Transfer Fano → Ancona.' },
      // +5
      { dy:5, h:8, o:L.pesaro, d:L.firenze, v:0, dr:0, se:3, pr:6000, n:'Transfer Pesaro → Firenze via E45/A1.' },
      { dy:5, h:16, o:L.firenze, d:L.pesaro, v:0, dr:0, se:3, pr:6000, n:'Rientro da Firenze.' },
      { dy:5, h:9, o:L.rimini, d:L.ravenna, v:1, dr:1, se:6, pr:2500, n:'Transfer Rimini → Ravenna. Mosaici bizantini.' },
      { dy:5, h:15, o:L.ravenna, d:L.rimini, v:1, dr:1, se:6, pr:2500, n:'Rientro da Ravenna.' },
    ],
  });

  // ─── 2. MARCHE & UMBRIA TRANSFER ──────────────────────────────────────
  await createOp({
    company: { name:'Marche & Umbria Transfer', slug:'marche-umbria-transfer', vat:'IT12012012012', license:'NCC-AN-2024-1202', address:'Via XXIX Settembre 15', city:'Ancona', province:'AN', region:'Marche', cap:'60122', phone:'+39 071 555120', email:'info@marchumbria.it', desc:'NCC Marche e Umbria. Ancona, Macerata, Ascoli Piceno, Perugia, Assisi. Transfer aeroporto Falconara, porto Ancona, Roma.' },
    operator: { email:'ops@marchumbria.it', pw:'MarcheNcc2026!!', name:'Paolo Marchetti' },
    drivers: [
      { f:'Paolo', l:'Marchetti', p:'+39 329 1201001', lic:'AN1202001A' },
      { f:'Andrea', l:'Fabbri', p:'+39 329 1201002', lic:'MC1202002B' },
    ],
    vehicles: [
      { t:'sedan', mk:'Audi', md:'A6 Avant', y:2024, c:'Grigio Nardo', pl:'AN 120 MU', s:3, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua'] },
      { t:'van', mk:'Mercedes-Benz', md:'V-Class', y:2024, c:'Nero', pl:'AN 121 MU', s:7, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua','Guida turistica'] },
    ],
    trips: [
      // Oggi
      { dy:0, h:15, o:L.anconaAero, d:L.ancona, v:0, dr:0, se:3, pr:1500, n:'Rientro da Falconara centro.' },
      { dy:0, h:18, o:L.civitanova, d:L.ancona, v:0, dr:1, se:3, pr:2500, n:'Rientro da Civitanova Marche.' },
      // +1
      { dy:1, h:7, o:L.ancona, d:L.roma, v:1, dr:0, se:6, pr:6500, n:'Transfer Ancona → Roma Termini via A14+A1.' },
      { dy:1, h:15, o:L.roma, d:L.ancona, v:1, dr:0, se:6, pr:6500, n:'Rientro da Roma.' },
      { dy:1, h:9, o:L.ancona, d:L.macerata, v:0, dr:1, se:3, pr:2500, n:'Transfer Ancona → Macerata.' },
      { dy:1, h:16, o:L.macerata, d:L.civitanova, v:0, dr:1, se:3, pr:2000, n:'Transfer Macerata → Civitanova.' },
      // +2
      { dy:2, h:8, o:L.ancona, d:L.perugia, v:0, dr:0, se:3, pr:4500, n:'Transfer Ancona → Perugia. Attraversamento Appennino.' },
      { dy:2, h:16, o:L.perugia, d:L.ancona, v:0, dr:0, se:3, pr:4500, n:'Rientro da Perugia.' },
      { dy:2, h:9, o:L.anconaPorto, d:L.loreto, v:1, dr:1, se:7, pr:2000, n:'Transfer porto crociere → Santuario di Loreto.' },
      { dy:2, h:14, o:L.loreto, d:L.recanati, v:0, dr:1, se:3, pr:1000, n:'Transfer Loreto → Recanati. Casa Leopardi.' },
      { dy:2, h:17, o:L.recanati, d:L.ancona, v:0, dr:1, se:3, pr:2000, n:'Rientro da Recanati.' },
      // +3
      { dy:3, h:7, o:L.ancona, d:L.ascoliP, v:1, dr:0, se:6, pr:4000, n:'Transfer Ancona → Ascoli Piceno.' },
      { dy:3, h:15, o:L.ascoliP, d:L.sanBenedetto, v:0, dr:0, se:3, pr:2000, n:'Transfer Ascoli → San Benedetto del Tronto.' },
      { dy:3, h:9, o:L.ancona, d:L.numana, v:0, dr:1, se:3, pr:1500, n:'Transfer Ancona → Numana / Riviera del Conero.' },
      { dy:3, h:17, o:L.numana, d:L.ancona, v:0, dr:1, se:3, pr:1500, n:'Rientro dal Conero.' },
      // +4
      { dy:4, h:6, m:30, o:L.ancona, d:L.anconaAero, v:0, dr:0, se:3, pr:1200, n:'Transfer mattutino Falconara.' },
      { dy:4, h:8, o:L.ancona, d:L.assisi, v:1, dr:0, se:7, pr:4000, n:'Transfer Ancona → Assisi. San Francesco.' },
      { dy:4, h:16, o:L.assisi, d:L.ancona, v:1, dr:0, se:7, pr:4000, n:'Rientro da Assisi.' },
      { dy:4, h:10, o:L.civitanova, d:L.macerata, v:0, dr:1, se:3, pr:1500, n:'Transfer costa → entroterra.' },
      // +5
      { dy:5, h:8, o:L.ancona, d:L.firenze, v:0, dr:0, se:3, pr:6500, n:'Transfer Ancona → Firenze.' },
      { dy:5, h:16, o:L.firenze, d:L.ancona, v:0, dr:0, se:3, pr:6500, n:'Rientro da Firenze.' },
      { dy:5, h:9, o:L.ancona, d:L.spoleto, v:1, dr:1, se:6, pr:3500, n:'Transfer Ancona → Spoleto. Festival dei Due Mondi.' },
      { dy:5, h:10, o:L.sanBenedetto, d:L.ascoliP, v:0, dr:0, se:3, pr:1800, n:'Transfer costa → Ascoli.' },
    ],
  });

  // ─── 3. VIAGGI EXTRA per Bologna NCC Service ──────────────────────────
  await addTripsToExisting('bologna-ncc-service', [
    { dy:0, h:16, o:L.bologna, d:L.ancona, v:0, dr:0, se:3, pr:5500, n:'Transfer Bologna → Ancona via A14.' },
    { dy:1, h:8, o:L.bologna, d:L.pesaro, v:1, dr:1, se:7, pr:4500, n:'Transfer Bologna → Pesaro. Costa adriatica.' },
    { dy:1, h:17, o:L.pesaro, d:L.bologna, v:1, dr:1, se:7, pr:4500, n:'Rientro da Pesaro.' },
    { dy:2, h:9, o:L.bologna, d:L.senigallia, v:0, dr:0, se:3, pr:5000, n:'Transfer Bologna → Senigallia via A14.' },
    { dy:2, h:17, o:L.senigallia, d:L.bologna, v:0, dr:0, se:3, pr:5000, n:'Rientro da Senigallia.' },
    { dy:3, h:8, o:L.rimini, d:L.ancona, v:1, dr:0, se:6, pr:3500, n:'Transfer costa Rimini → Ancona.' },
    { dy:3, h:16, o:L.ancona, d:L.rimini, v:1, dr:0, se:6, pr:3500, n:'Rientro Ancona → Rimini.' },
    { dy:4, h:7, o:L.bologna, d:L.sanMarino, v:0, dr:1, se:3, pr:3500, n:'Transfer Bologna → San Marino.' },
    { dy:4, h:14, o:L.sanMarino, d:L.bolognaSt, v:0, dr:1, se:3, pr:3500, n:'Rientro San Marino → Bologna Centrale.' },
    { dy:5, h:9, o:L.forli, d:L.pesaro, v:1, dr:0, se:7, pr:3000, n:'Transfer Forlì → Pesaro lungo la E45 bis.' },
    { dy:5, h:15, o:L.cesena, d:L.ancona, v:0, dr:1, se:3, pr:4000, n:'Transfer Cesena → Ancona via A14.' },
  ]);

  // ─── 4. VIAGGI EXTRA per Umbria Green NCC ─────────────────────────────
  await addTripsToExisting('umbria-green-ncc', [
    { dy:0, h:16, o:L.perugia, d:L.ancona, v:0, dr:0, se:3, pr:4500, n:'Transfer Perugia → Ancona. Appennino marchigiano.' },
    { dy:1, h:8, o:L.perugia, d:L.macerata, v:1, dr:1, se:6, pr:4000, n:'Transfer Perugia → Macerata.' },
    { dy:1, h:16, o:L.macerata, d:L.perugia, v:1, dr:1, se:6, pr:4000, n:'Rientro da Macerata.' },
    { dy:2, h:9, o:L.foligno, d:L.ancona, v:0, dr:0, se:3, pr:4000, n:'Transfer Foligno → Ancona via SS76.' },
    { dy:3, h:8, o:L.perugia, d:L.civitanova, v:1, dr:0, se:7, pr:4500, n:'Transfer Perugia → Civitanova Marche. Mare!' },
    { dy:3, h:17, o:L.civitanova, d:L.perugia, v:1, dr:0, se:7, pr:4500, n:'Rientro dalla costa marchigiana.' },
    { dy:4, h:9, o:L.spoleto, d:L.ascoliP, v:0, dr:1, se:3, pr:3500, n:'Transfer Spoleto → Ascoli Piceno via Valnerina.' },
    { dy:5, h:8, o:L.assisi, d:L.ancona, v:1, dr:0, se:7, pr:4000, n:'Transfer Assisi → Ancona.' },
  ]);

  console.log('\n\n🎉 Costa adriatica + Marche seedata!');
  console.log('════════════════════════════════════════════');
  console.log('ops@adriaticancc.it    / AdriaticaNcc2026');
  console.log('ops@marchumbria.it     / MarcheNcc2026!!');
  console.log('+ 11 viaggi extra per Bologna NCC Service');
  console.log('+ 8 viaggi extra per Umbria Green NCC');
  console.log('════════════════════════════════════════════');

  await pool.end();
}

main().catch((e) => { console.error('❌', e); pool.end(); process.exit(1); });
