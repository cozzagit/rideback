/**
 * Seed: 10 operatori NCC aggiuntivi
 *
 * 1. "Milano Executive NCC" — Milano, Malpensa, Linate, Monza, Bergamo
 * 2. "Roma Capital Transfer" — Roma, Fiumicino, Ciampino, Castelli, Orvieto
 * 3. "Sardegna VIP Transfer" — Cagliari, Olbia, Costa Smeralda, Alghero
 * 4. "Bologna NCC Service" — Bologna, Modena, Rimini, Ravenna, Ferrara
 * 5. "Puglia Exclusive" — Bari, Lecce, Ostuni, Alberobello, Polignano
 * 6. "Genova Mare NCC" — Genova, Portofino, Cinque Terre, La Spezia
 * 7. "Verona Arena Transfer" — Verona, Garda, Mantova, Brescia
 * 8. "Calabria Sun NCC" — Lamezia, Tropea, Reggio Calabria, Cosenza
 * 9. "Trieste Transfer" — Trieste, Udine, Gorizia, Slovenia border
 * 10. "Umbria Green NCC" — Perugia, Assisi, Orvieto, Spoleto, Terni
 *
 * Usage: node scripts/seed-10-operators.mjs
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
async function sql(text, params = []) { return (await pool.query(text, params)).rows; }
const uuid = () => randomUUID();

function futureDate(d, h, m = 0) {
  const dt = new Date(); dt.setDate(dt.getDate() + d); dt.setHours(h, m, 0, 0); return dt.toISOString();
}

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
    const dep = futureDate(t.dy, t.h, t.m||0);
    const arr = new Date(new Date(dep).getTime() + r.durationMinutes*60000).toISOString();
    await sql(`INSERT INTO trips (id,company_id,driver_id,vehicle_id,origin_address,origin_lat,origin_lng,origin_city,destination_address,destination_lat,destination_lng,destination_city,route_geometry,route_distance_km,route_duration_minutes,departure_at,estimated_arrival_at,seats_available,seats_booked,price_per_seat,allows_intermediate_stops,notes,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,0,$19,true,$20,'scheduled')`,
      [uuid(),cId,dIds[t.dr],vIds[t.v],t.o.address,t.o.lat,t.o.lng,t.o.city,t.d.address,t.d.lat,t.d.lng,t.d.city,JSON.stringify(r.geometry),r.distanceKm,r.durationMinutes,dep,arr,t.se,t.pr,t.n]);
    console.log(` ✅ ${r.distanceKm}km`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
const L = {
  // Milano
  milCentrale:  { address: 'Milano Centrale', city: 'Milano', lat: 45.4861, lng: 9.2044 },
  milDuomo:     { address: 'Milano, Piazza Duomo', city: 'Milano', lat: 45.4642, lng: 9.1900 },
  milFiera:     { address: 'Milano, Fiera Rho', city: 'Rho', lat: 45.5195, lng: 9.0854 },
  malpensa:     { address: 'Aeroporto di Malpensa (MXP)', city: 'Ferno', lat: 45.6286, lng: 8.7231 },
  linate:       { address: 'Aeroporto di Milano Linate (LIN)', city: 'Milano', lat: 45.4520, lng: 9.2783 },
  monza:        { address: 'Monza, Piazza Trento e Trieste', city: 'Monza', lat: 45.5845, lng: 9.2744 },
  bergamo:      { address: 'Bergamo, Piazza Vecchia', city: 'Bergamo', lat: 45.7037, lng: 9.6623 },
  orio:         { address: 'Aeroporto di Orio al Serio (BGY)', city: 'Orio al Serio', lat: 45.6685, lng: 9.7004 },
  como:         { address: 'Como, Piazza Cavour', city: 'Como', lat: 45.8107, lng: 9.0847 },
  stresa:       { address: 'Stresa, Piazzale Lido', city: 'Stresa', lat: 45.8841, lng: 8.5336 },

  // Roma
  romaTermini:  { address: 'Roma Termini', city: 'Roma', lat: 41.9013, lng: 12.5024 },
  romaPopolo:   { address: 'Roma, Piazza del Popolo', city: 'Roma', lat: 41.9106, lng: 12.4764 },
  romaTrastevere:{ address: 'Roma, Trastevere', city: 'Roma', lat: 41.8819, lng: 12.4700 },
  romaEur:      { address: 'Roma EUR', city: 'Roma', lat: 41.8356, lng: 12.4722 },
  fiumicino:    { address: 'Aeroporto di Fiumicino (FCO)', city: 'Fiumicino', lat: 41.7999, lng: 12.2462 },
  ciampino:     { address: 'Aeroporto di Ciampino (CIA)', city: 'Ciampino', lat: 41.7994, lng: 12.5949 },
  frascati:     { address: 'Frascati, Piazza Marconi', city: 'Frascati', lat: 41.8061, lng: 12.6810 },
  orvieto:      { address: 'Orvieto, Piazza del Duomo', city: 'Orvieto', lat: 42.7180, lng: 12.1122 },
  civitavecchia:{ address: 'Civitavecchia, Porto Crociere', city: 'Civitavecchia', lat: 42.0936, lng: 11.7904 },
  viterbo:      { address: 'Viterbo, Piazza del Plebiscito', city: 'Viterbo', lat: 42.4168, lng: 12.1045 },

  // Sardegna
  cagliari:     { address: 'Cagliari, Via Roma', city: 'Cagliari', lat: 39.2175, lng: 9.1164 },
  cagliariAero: { address: 'Aeroporto di Cagliari Elmas', city: 'Cagliari', lat: 39.2515, lng: 9.0544 },
  olbiaAero:    { address: 'Aeroporto di Olbia Costa Smeralda', city: 'Olbia', lat: 40.8987, lng: 9.5176 },
  portoCervo:   { address: 'Porto Cervo, Piazzetta', city: 'Arzachena', lat: 41.0917, lng: 9.5324 },
  alghero:      { address: 'Alghero, Centro Storico', city: 'Alghero', lat: 40.5579, lng: 8.3190 },
  algheroAero:  { address: 'Aeroporto di Alghero Fertilia', city: 'Alghero', lat: 40.6321, lng: 8.2907 },
  villasimius:  { address: 'Villasimius, Piazza Incani', city: 'Villasimius', lat: 39.1422, lng: 9.5405 },
  oristano:     { address: 'Oristano, Piazza Roma', city: 'Oristano', lat: 39.9038, lng: 8.5899 },

  // Bologna area
  bologna:      { address: 'Bologna, Piazza Maggiore', city: 'Bologna', lat: 44.4939, lng: 11.3430 },
  bolognaSt:    { address: 'Bologna Centrale', city: 'Bologna', lat: 44.5058, lng: 11.3427 },
  bolognaAero:  { address: 'Aeroporto di Bologna Marconi', city: 'Bologna', lat: 44.5354, lng: 11.2887 },
  modena:       { address: 'Modena, Piazza Grande', city: 'Modena', lat: 44.6471, lng: 10.9252 },
  rimini:       { address: 'Rimini, Piazzale Fellini', city: 'Rimini', lat: 44.0620, lng: 12.5682 },
  ravenna:      { address: 'Ravenna, Piazza del Popolo', city: 'Ravenna', lat: 44.4175, lng: 12.1996 },
  ferrara:      { address: 'Ferrara, Piazza Trento e Trieste', city: 'Ferrara', lat: 44.8364, lng: 11.6198 },
  maranello:    { address: 'Maranello, Museo Ferrari', city: 'Maranello', lat: 44.5300, lng: 10.8642 },
  parma:        { address: 'Parma, Piazza Garibaldi', city: 'Parma', lat: 44.8015, lng: 10.3279 },

  // Puglia
  bari:         { address: 'Bari, Piazza Aldo Moro', city: 'Bari', lat: 41.1187, lng: 16.8718 },
  bariAero:     { address: 'Aeroporto di Bari Palese', city: 'Bari', lat: 41.1389, lng: 16.7606 },
  lecce:        { address: 'Lecce, Piazza Sant\'Oronzo', city: 'Lecce', lat: 40.3529, lng: 18.1710 },
  ostuni:       { address: 'Ostuni, Piazza della Libertà', city: 'Ostuni', lat: 40.7295, lng: 17.5776 },
  alberobello:  { address: 'Alberobello, Rione Monti', city: 'Alberobello', lat: 40.7848, lng: 17.2370 },
  polignano:    { address: 'Polignano a Mare, Centro', city: 'Polignano a Mare', lat: 40.9961, lng: 17.2210 },
  brindisiAero: { address: 'Aeroporto di Brindisi Salento', city: 'Brindisi', lat: 40.6576, lng: 17.9470 },
  gallipoli:    { address: 'Gallipoli, Centro Storico', city: 'Gallipoli', lat: 40.0559, lng: 17.9929 },
  trani:        { address: 'Trani, Porto', city: 'Trani', lat: 41.2764, lng: 16.4175 },

  // Genova / Liguria
  genova:       { address: 'Genova, Piazza De Ferrari', city: 'Genova', lat: 44.4072, lng: 8.9345 },
  genovaAero:   { address: 'Aeroporto di Genova', city: 'Genova', lat: 44.4133, lng: 8.8375 },
  portofino:    { address: 'Santa Margherita Ligure', city: 'Santa Margherita Ligure', lat: 44.3352, lng: 9.2107 },
  cinqueTerre:  { address: 'La Spezia, Via del Prione', city: 'La Spezia', lat: 44.1025, lng: 9.8241 },
  rapallo:      { address: 'Rapallo, Lungomare', city: 'Rapallo', lat: 44.3493, lng: 9.2311 },
  savona:       { address: 'Savona, Porto Crociere', city: 'Savona', lat: 44.3064, lng: 8.4823 },

  // Verona / Garda
  verona:       { address: 'Verona, Piazza Bra', city: 'Verona', lat: 45.4385, lng: 10.9917 },
  veronaAero:   { address: 'Aeroporto di Verona Villafranca', city: 'Verona', lat: 45.3957, lng: 10.8885 },
  sirmione:     { address: 'Sirmione, Piazza Castello', city: 'Sirmione', lat: 45.4926, lng: 10.6068 },
  mantova:      { address: 'Mantova, Piazza delle Erbe', city: 'Mantova', lat: 45.1585, lng: 10.7915 },
  brescia:      { address: 'Brescia, Piazza della Loggia', city: 'Brescia', lat: 45.5398, lng: 10.2177 },
  riva:         { address: 'Riva del Garda, Porto', city: 'Riva del Garda', lat: 45.8854, lng: 10.8413 },
  desenzano:    { address: 'Desenzano del Garda, Porto', city: 'Desenzano del Garda', lat: 45.4709, lng: 10.5346 },

  // Calabria
  lamezia:      { address: 'Aeroporto di Lamezia Terme', city: 'Lamezia Terme', lat: 38.9054, lng: 16.2423 },
  tropea:       { address: 'Tropea, Piazza Ercole', city: 'Tropea', lat: 38.6789, lng: 15.8972 },
  reggioC:      { address: 'Reggio Calabria, Lungomare', city: 'Reggio Calabria', lat: 38.1147, lng: 15.6501 },
  cosenza:      { address: 'Cosenza, Corso Mazzini', city: 'Cosenza', lat: 39.3005, lng: 16.2510 },
  pizzo:        { address: 'Pizzo Calabro, Centro', city: 'Pizzo', lat: 38.7369, lng: 16.1599 },
  sila:         { address: 'Camigliatello Silano', city: 'Camigliatello Silano', lat: 39.2833, lng: 16.4667 },

  // Trieste / FVG
  trieste:      { address: 'Trieste, Piazza Unità d\'Italia', city: 'Trieste', lat: 45.6495, lng: 13.7678 },
  triesteAero:  { address: 'Aeroporto di Trieste FVG', city: 'Ronchi dei Legionari', lat: 45.8275, lng: 13.4722 },
  udine:        { address: 'Udine, Piazza della Libertà', city: 'Udine', lat: 46.0654, lng: 13.2355 },
  gorizia:      { address: 'Gorizia, Piazza della Vittoria', city: 'Gorizia', lat: 45.9408, lng: 13.6218 },
  grado:        { address: 'Grado, Lungomare', city: 'Grado', lat: 45.6787, lng: 13.3866 },
  pordenone:    { address: 'Pordenone, Corso Vittorio Emanuele', city: 'Pordenone', lat: 45.9564, lng: 12.6615 },
  venezia:      { address: 'Venezia, Piazzale Roma', city: 'Venezia', lat: 45.4375, lng: 12.3194 },
  lubiana:      { address: 'Trieste, Valico Fernetti', city: 'Trieste', lat: 45.6875, lng: 13.8406 },

  // Umbria
  perugia:      { address: 'Perugia, Piazza IV Novembre', city: 'Perugia', lat: 43.1107, lng: 12.3891 },
  assisi:       { address: 'Assisi, Piazza del Comune', city: 'Assisi', lat: 43.0707, lng: 12.6164 },
  orvietoU:     { address: 'Orvieto, Piazza del Duomo', city: 'Orvieto', lat: 42.7180, lng: 12.1122 },
  spoleto:      { address: 'Spoleto, Piazza del Mercato', city: 'Spoleto', lat: 42.7319, lng: 12.7367 },
  terni:        { address: 'Terni, Piazza Europa', city: 'Terni', lat: 42.5593, lng: 12.6418 },
  gubbio:       { address: 'Gubbio, Piazza Grande', city: 'Gubbio', lat: 43.3511, lng: 12.5777 },
  todi:         { address: 'Todi, Piazza del Popolo', city: 'Todi', lat: 42.7810, lng: 12.4069 },
  norcia:       { address: 'Norcia, Piazza San Benedetto', city: 'Norcia', lat: 42.7924, lng: 13.0929 },
  firenze:      { address: 'Firenze, Piazza della Stazione', city: 'Firenze', lat: 43.7764, lng: 11.2479 },
  roma:         { address: 'Roma Termini', city: 'Roma', lat: 41.9013, lng: 12.5024 },
};

async function main() {
  console.log('🇮🇹 Seeding 10 operatori NCC...\n');

  // ─── 1. MILANO EXECUTIVE NCC ──────────────────────────────────────────
  await createOp({
    company: { name:'Milano Executive NCC', slug:'milano-executive-ncc', vat:'IT10020030040', license:'NCC-MI-2024-1001', address:'Via Monte Napoleone 8', city:'Milano', province:'MI', region:'Lombardia', cap:'20121', phone:'+39 02 5551001', email:'info@milanoexecutive.it', desc:'NCC premium Milano. Transfer aeroportuali, Fiera, Monza, lago di Como.' },
    operator: { email:'ops@milanoexecutive.it', pw:'MilanoNcc2026!', name:'Franco Colombo' },
    drivers: [
      { f:'Stefano', l:'Colombo', p:'+39 335 1010101', lic:'MI1001001A' },
      { f:'Roberto', l:'Ferretti', p:'+39 335 1010102', lic:'MI1001002B' },
      { f:'Enrico', l:'Villa', p:'+39 335 1010103', lic:'MI1001003C' },
    ],
    vehicles: [
      { t:'sedan', mk:'Mercedes-Benz', md:'Classe S', y:2025, c:'Nero Ossidiana', pl:'MI 101 EX', s:3, am:['Wi-Fi','Aria condizionata','Champagne','Giornali','Sedili massaggianti'] },
      { t:'van', mk:'Mercedes-Benz', md:'V-Class Extra Long', y:2024, c:'Nero Magnetite', pl:'MI 102 EX', s:7, am:['Wi-Fi','Aria condizionata','Prese USB','Monitor','Acqua','Snack'] },
      { t:'sedan', mk:'BMW', md:'Serie 7', y:2024, c:'Grigio Bernina', pl:'MI 103 EX', s:3, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua'] },
    ],
    trips: [
      { dy:0, h:14, o:L.malpensa, d:L.milCentrale, v:1, dr:0, se:6, pr:3500, n:'Rientro da transfer Malpensa T1.' },
      { dy:0, h:17, o:L.linate, d:L.milDuomo, v:0, dr:1, se:3, pr:2000, n:'Rientro da Linate centro.' },
      { dy:0, h:19, o:L.milFiera, d:L.milCentrale, v:2, dr:2, se:3, pr:1500, n:'Rientro da Fiera Rho dopo evento.' },
      { dy:1, h:5, m:30, o:L.milCentrale, d:L.malpensa, v:0, dr:0, se:3, pr:3000, n:'Transfer early morning Malpensa.' },
      { dy:1, h:8, o:L.malpensa, d:L.como, v:1, dr:1, se:7, pr:4000, n:'Rientro da Malpensa verso Como.' },
      { dy:1, h:11, o:L.milCentrale, d:L.bergamo, v:2, dr:2, se:3, pr:2500, n:'Transfer Milano → Bergamo alta.' },
      { dy:1, h:16, o:L.orio, d:L.milCentrale, v:1, dr:0, se:6, pr:3000, n:'Rientro da Orio al Serio.' },
      { dy:2, h:7, o:L.milCentrale, d:L.stresa, v:0, dr:0, se:3, pr:3500, n:'Transfer verso Lago Maggiore / Stresa.' },
      { dy:2, h:15, o:L.stresa, d:L.milCentrale, v:0, dr:0, se:3, pr:3500, n:'Rientro dal Lago Maggiore.' },
      { dy:2, h:9, o:L.malpensa, d:L.monza, v:1, dr:1, se:6, pr:3000, n:'Transfer Malpensa → Monza.' },
      { dy:3, h:6, o:L.milDuomo, d:L.linate, v:2, dr:2, se:3, pr:1500, n:'Transfer mattutino Linate.' },
      { dy:3, h:10, o:L.linate, d:L.bergamo, v:0, dr:0, se:3, pr:3000, n:'Rientro da Linate verso Bergamo.' },
      { dy:3, h:14, o:L.milCentrale, d:L.milFiera, v:1, dr:1, se:7, pr:1500, n:'Shuttle per fiera.' },
      { dy:4, h:7, o:L.milCentrale, d:L.malpensa, v:1, dr:0, se:7, pr:3500, n:'Shuttle gruppo Malpensa.' },
      { dy:4, h:12, o:L.malpensa, d:L.milDuomo, v:0, dr:1, se:3, pr:3000, n:'Rientro mezzogiorno Malpensa.' },
    ],
  });

  // ─── 2. ROMA CAPITAL TRANSFER ─────────────────────────────────────────
  await createOp({
    company: { name:'Roma Capital Transfer', slug:'roma-capital-transfer', vat:'IT20030040050', license:'NCC-RM-2024-2002', address:'Via del Corso 150', city:'Roma', province:'RM', region:'Lazio', cap:'00186', phone:'+39 06 5552002', email:'info@romacapitaltransfer.it', desc:'NCC Roma. Aeroporti, Castelli Romani, crociere Civitavecchia, tours.' },
    operator: { email:'ops@romacapitaltransfer.it', pw:'RomaNcc2026!!', name:'Gianluca Ricci' },
    drivers: [
      { f:'Paolo', l:'Ricci', p:'+39 338 2020201', lic:'RM2002001A' },
      { f:'Fabio', l:'Marchetti', p:'+39 338 2020202', lic:'RM2002002B' },
      { f:'Simone', l:'De Luca', p:'+39 338 2020203', lic:'RM2002003C' },
    ],
    vehicles: [
      { t:'sedan', mk:'Mercedes-Benz', md:'Classe E', y:2024, c:'Nero Ossidiana', pl:'RM 201 CT', s:3, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua'] },
      { t:'van', mk:'Mercedes-Benz', md:'Sprinter Tourer', y:2023, c:'Bianco Artico', pl:'RM 202 CT', s:8, am:['Wi-Fi','Aria condizionata','Prese USB','Monitor','Bagagliera XL'] },
    ],
    trips: [
      { dy:0, h:13, o:L.fiumicino, d:L.romaTermini, v:0, dr:0, se:3, pr:2500, n:'Rientro da Fiumicino.' },
      { dy:0, h:16, o:L.civitavecchia, d:L.romaPopolo, v:1, dr:1, se:7, pr:3500, n:'Rientro da transfer crocieristi.' },
      { dy:0, h:19, o:L.romaEur, d:L.frascati, v:0, dr:2, se:3, pr:1800, n:'Rientro serale verso Castelli Romani.' },
      { dy:1, h:6, o:L.romaTrastevere, d:L.fiumicino, v:0, dr:0, se:3, pr:2500, n:'Transfer early morning Fiumicino.' },
      { dy:1, h:9, o:L.fiumicino, d:L.romaTrastevere, v:0, dr:0, se:3, pr:2500, n:'Rientro da FCO mattina.' },
      { dy:1, h:11, o:L.romaTermini, d:L.civitavecchia, v:1, dr:1, se:8, pr:3500, n:'Transfer gruppo verso porto crociere.' },
      { dy:1, h:17, o:L.civitavecchia, d:L.romaTermini, v:1, dr:1, se:8, pr:3500, n:'Rientro da Civitavecchia.' },
      { dy:2, h:8, o:L.romaTermini, d:L.orvieto, v:0, dr:0, se:3, pr:3500, n:'Transfer Roma → Orvieto.' },
      { dy:2, h:15, o:L.orvieto, d:L.romaPopolo, v:0, dr:0, se:3, pr:3500, n:'Rientro da Orvieto.' },
      { dy:2, h:7, o:L.romaTermini, d:L.viterbo, v:1, dr:2, se:7, pr:3000, n:'Transfer Roma → Viterbo / Tuscia.' },
      { dy:3, h:5, m:30, o:L.romaTermini, d:L.ciampino, v:0, dr:0, se:3, pr:1800, n:'Transfer Ciampino early morning.' },
      { dy:3, h:9, o:L.ciampino, d:L.romaTermini, v:0, dr:0, se:3, pr:1800, n:'Rientro da Ciampino.' },
      { dy:3, h:14, o:L.fiumicino, d:L.frascati, v:1, dr:1, se:7, pr:3000, n:'Transfer FCO → Castelli Romani.' },
      { dy:4, h:7, o:L.romaTrastevere, d:L.civitavecchia, v:1, dr:2, se:8, pr:3500, n:'Transfer crociera mattutino.' },
      { dy:4, h:16, o:L.civitavecchia, d:L.romaTrastevere, v:1, dr:2, se:8, pr:3500, n:'Rientro serale Civitavecchia.' },
    ],
  });

  // ─── 3. SARDEGNA VIP TRANSFER ─────────────────────────────────────────
  await createOp({
    company: { name:'Sardegna VIP Transfer', slug:'sardegna-vip-transfer', vat:'IT30040050060', license:'NCC-CA-2024-3003', address:'Via Roma 80', city:'Cagliari', province:'CA', region:'Sardegna', cap:'09124', phone:'+39 070 5553003', email:'info@sardegnavip.it', desc:'NCC luxury Sardegna. Costa Smeralda, Cagliari, Alghero, spiagge esclusive.' },
    operator: { email:'ops@sardegnavip.it', pw:'SardegnaNcc2026', name:'Marco Piras' },
    drivers: [
      { f:'Andrea', l:'Piras', p:'+39 347 3030301', lic:'CA3003001A' },
      { f:'Matteo', l:'Sanna', p:'+39 347 3030302', lic:'SS3003002B' },
    ],
    vehicles: [
      { t:'sedan', mk:'Maserati', md:'Quattroporte', y:2024, c:'Blu Emozione', pl:'CA 301 VP', s:3, am:['Wi-Fi','Aria condizionata','Champagne','Prese USB'] },
      { t:'van', mk:'Mercedes-Benz', md:'V-Class', y:2024, c:'Bianco Diamante', pl:'CA 302 VP', s:7, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua','Frigobar'] },
    ],
    trips: [
      { dy:0, h:15, o:L.cagliariAero, d:L.cagliari, v:0, dr:0, se:3, pr:1500, n:'Rientro da Elmas centro.' },
      { dy:1, h:8, o:L.olbiaAero, d:L.portoCervo, v:1, dr:1, se:6, pr:3500, n:'Transfer aeroporto → Costa Smeralda.' },
      { dy:1, h:17, o:L.portoCervo, d:L.olbiaAero, v:1, dr:1, se:6, pr:3500, n:'Rientro da Porto Cervo.' },
      { dy:1, h:10, o:L.cagliariAero, d:L.villasimius, v:0, dr:0, se:3, pr:3000, n:'Transfer aeroporto → Villasimius.' },
      { dy:2, h:7, o:L.cagliari, d:L.oristano, v:0, dr:0, se:3, pr:3000, n:'Transfer Cagliari → Oristano.' },
      { dy:2, h:9, o:L.olbiaAero, d:L.portoCervo, v:1, dr:1, se:7, pr:3500, n:'Gruppo VIP aeroporto → Costa Smeralda.' },
      { dy:3, h:8, o:L.algheroAero, d:L.alghero, v:0, dr:0, se:3, pr:1500, n:'Transfer aeroporto Fertilia → Centro.' },
      { dy:3, h:11, o:L.alghero, d:L.oristano, v:0, dr:0, se:3, pr:3500, n:'Transfer Alghero → Oristano.' },
      { dy:4, h:9, o:L.cagliari, d:L.villasimius, v:1, dr:0, se:6, pr:2500, n:'Shuttle spiaggia Villasimius.' },
      { dy:4, h:17, o:L.villasimius, d:L.cagliari, v:1, dr:0, se:6, pr:2500, n:'Rientro serale da Villasimius.' },
    ],
  });

  // ─── 4. BOLOGNA NCC SERVICE ────────────────────────────────────────────
  await createOp({
    company: { name:'Bologna NCC Service', slug:'bologna-ncc-service', vat:'IT40050060070', license:'NCC-BO-2024-4004', address:'Via dell\'Indipendenza 30', city:'Bologna', province:'BO', region:'Emilia-Romagna', cap:'40121', phone:'+39 051 5554004', email:'info@bolognanccs.it', desc:'NCC Bologna. Aeroporto Marconi, Motor Valley, Riviera Romagnola, Ferrara.' },
    operator: { email:'ops@bolognanccs.it', pw:'BolognaNcc2026!', name:'Massimo Tosi' },
    drivers: [
      { f:'Alessandro', l:'Tosi', p:'+39 345 4040401', lic:'BO4004001A' },
      { f:'Federico', l:'Galli', p:'+39 345 4040402', lic:'BO4004002B' },
    ],
    vehicles: [
      { t:'sedan', mk:'Maserati', md:'Ghibli', y:2024, c:'Rosso Magma', pl:'BO 401 NS', s:3, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua'] },
      { t:'van', mk:'Mercedes-Benz', md:'V-Class', y:2023, c:'Nero', pl:'BO 402 NS', s:7, am:['Wi-Fi','Aria condizionata','Prese USB','Monitor'] },
    ],
    trips: [
      { dy:0, h:14, o:L.bolognaAero, d:L.bologna, v:0, dr:0, se:3, pr:1500, n:'Rientro da Marconi centro.' },
      { dy:0, h:18, o:L.modena, d:L.bologna, v:0, dr:0, se:3, pr:2000, n:'Rientro da Modena.' },
      { dy:1, h:8, o:L.bologna, d:L.maranello, v:0, dr:0, se:3, pr:2500, n:'Transfer Motor Valley / Museo Ferrari.' },
      { dy:1, h:14, o:L.maranello, d:L.bolognaAero, v:0, dr:0, se:3, pr:2500, n:'Rientro da Maranello.' },
      { dy:1, h:9, o:L.bologna, d:L.rimini, v:1, dr:1, se:7, pr:3500, n:'Transfer Bologna → Riviera Romagnola.' },
      { dy:1, h:18, o:L.rimini, d:L.bologna, v:1, dr:1, se:7, pr:3500, n:'Rientro dalla Riviera.' },
      { dy:2, h:7, o:L.bologna, d:L.ferrara, v:0, dr:0, se:3, pr:2000, n:'Transfer Bologna → Ferrara.' },
      { dy:2, h:10, o:L.bologna, d:L.ravenna, v:1, dr:1, se:6, pr:2500, n:'Transfer Bologna → Ravenna.' },
      { dy:3, h:8, o:L.bologna, d:L.parma, v:0, dr:0, se:3, pr:2500, n:'Transfer Bologna → Parma. Food tour.' },
      { dy:3, h:16, o:L.parma, d:L.bologna, v:0, dr:0, se:3, pr:2500, n:'Rientro da Parma.' },
      { dy:4, h:9, o:L.bolognaAero, d:L.rimini, v:1, dr:1, se:7, pr:4000, n:'Transfer aeroporto → Rimini.' },
    ],
  });

  // ─── 5. PUGLIA EXCLUSIVE ───────────────────────────────────────────────
  await createOp({
    company: { name:'Puglia Exclusive', slug:'puglia-exclusive', vat:'IT50060070080', license:'NCC-BA-2024-5005', address:'Corso Vittorio Emanuele 40', city:'Bari', province:'BA', region:'Puglia', cap:'70122', phone:'+39 080 5555005', email:'info@pugliaexclusive.it', desc:'NCC Puglia. Trulli, masserie, Salento, spiagge. Transfer aeroportuali Bari e Brindisi.' },
    operator: { email:'ops@pugliaexclusive.it', pw:'PugliaNcc2026!', name:'Antonio Ferrante' },
    drivers: [
      { f:'Nicola', l:'Ferrante', p:'+39 320 5050501', lic:'BA5005001A' },
      { f:'Domenico', l:'Caputo', p:'+39 320 5050502', lic:'BA5005002B' },
    ],
    vehicles: [
      { t:'sedan', mk:'BMW', md:'Serie 5', y:2024, c:'Nero Zaffiro', pl:'BA 501 PE', s:3, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua'] },
      { t:'van', mk:'Mercedes-Benz', md:'Vito Tourer', y:2023, c:'Bianco', pl:'BA 502 PE', s:8, am:['Wi-Fi','Aria condizionata','Prese USB','Bagagliera XL'] },
    ],
    trips: [
      { dy:0, h:14, o:L.bariAero, d:L.bari, v:0, dr:0, se:3, pr:1500, n:'Rientro da Palese centro.' },
      { dy:0, h:17, o:L.alberobello, d:L.bari, v:1, dr:1, se:7, pr:2500, n:'Rientro da tour Trulli.' },
      { dy:1, h:8, o:L.bari, d:L.lecce, v:1, dr:0, se:7, pr:4500, n:'Transfer Bari → Salento.' },
      { dy:1, h:17, o:L.lecce, d:L.bari, v:1, dr:0, se:7, pr:4500, n:'Rientro da Lecce.' },
      { dy:1, h:10, o:L.bariAero, d:L.ostuni, v:0, dr:1, se:3, pr:3000, n:'Transfer aeroporto → Ostuni, la città bianca.' },
      { dy:2, h:9, o:L.bari, d:L.polignano, v:0, dr:0, se:3, pr:2000, n:'Transfer Bari → Polignano a Mare.' },
      { dy:2, h:15, o:L.polignano, d:L.alberobello, v:0, dr:0, se:3, pr:2000, n:'Transfer Polignano → Trulli.' },
      { dy:2, h:8, o:L.brindisiAero, d:L.lecce, v:1, dr:1, se:8, pr:2500, n:'Transfer Brindisi aeroporto → Lecce.' },
      { dy:3, h:9, o:L.bari, d:L.trani, v:0, dr:0, se:3, pr:2000, n:'Transfer Bari → Trani porto.' },
      { dy:3, h:8, o:L.lecce, d:L.gallipoli, v:1, dr:1, se:7, pr:2500, n:'Transfer Lecce → Gallipoli.' },
      { dy:4, h:7, o:L.bari, d:L.bariAero, v:0, dr:0, se:3, pr:1200, n:'Transfer aeroporto Palese.' },
      { dy:4, h:10, o:L.bariAero, d:L.alberobello, v:1, dr:0, se:7, pr:2500, n:'Transfer gruppo → Trulli.' },
    ],
  });

  // ─── 6. GENOVA MARE NCC ────────────────────────────────────────────────
  await createOp({
    company: { name:'Genova Mare NCC', slug:'genova-mare-ncc', vat:'IT60070080090', license:'NCC-GE-2024-6006', address:'Via XX Settembre 100', city:'Genova', province:'GE', region:'Liguria', cap:'16121', phone:'+39 010 5556006', email:'info@genovamare.it', desc:'NCC Genova. Portofino, Cinque Terre, crociere, aeroporto, Riviera di Levante.' },
    operator: { email:'ops@genovamare.it', pw:'GenovaNcc2026!', name:'Luca Parodi' },
    drivers: [
      { f:'Marco', l:'Parodi', p:'+39 349 6060601', lic:'GE6006001A' },
      { f:'Andrea', l:'Costa', p:'+39 349 6060602', lic:'GE6006002B' },
    ],
    vehicles: [
      { t:'sedan', mk:'Audi', md:'A8', y:2024, c:'Nero Mythos', pl:'GE 601 MN', s:3, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua minerale'] },
      { t:'van', mk:'Mercedes-Benz', md:'V-Class', y:2023, c:'Grigio Selenite', pl:'GE 602 MN', s:7, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua'] },
    ],
    trips: [
      { dy:0, h:14, o:L.genovaAero, d:L.genova, v:0, dr:0, se:3, pr:1500, n:'Rientro da aeroporto.' },
      { dy:0, h:17, o:L.portofino, d:L.genova, v:0, dr:1, se:3, pr:3000, n:'Rientro serale da Portofino.' },
      { dy:1, h:9, o:L.genova, d:L.cinqueTerre, v:1, dr:0, se:6, pr:4000, n:'Transfer Genova → Cinque Terre / La Spezia.' },
      { dy:1, h:17, o:L.cinqueTerre, d:L.genova, v:1, dr:0, se:6, pr:4000, n:'Rientro dalle Cinque Terre.' },
      { dy:1, h:10, o:L.genova, d:L.portofino, v:0, dr:1, se:3, pr:2500, n:'Transfer Genova → Portofino.' },
      { dy:2, h:8, o:L.genova, d:L.savona, v:1, dr:0, se:7, pr:2500, n:'Transfer verso porto crociere Savona.' },
      { dy:2, h:15, o:L.savona, d:L.genova, v:1, dr:0, se:7, pr:2500, n:'Rientro da Savona.' },
      { dy:3, h:9, o:L.genova, d:L.rapallo, v:0, dr:1, se:3, pr:2000, n:'Transfer Genova → Rapallo.' },
      { dy:3, h:16, o:L.rapallo, d:L.genovaAero, v:0, dr:1, se:3, pr:2500, n:'Transfer Rapallo → aeroporto.' },
      { dy:4, h:8, o:L.genovaAero, d:L.cinqueTerre, v:1, dr:0, se:7, pr:4500, n:'Transfer aeroporto → Cinque Terre.' },
    ],
  });

  // ─── 7. VERONA ARENA TRANSFER ─────────────────────────────────────────
  await createOp({
    company: { name:'Verona Arena Transfer', slug:'verona-arena-transfer', vat:'IT70080090100', license:'NCC-VR-2024-7007', address:'Piazza Bra 1', city:'Verona', province:'VR', region:'Veneto', cap:'37121', phone:'+39 045 5557007', email:'info@veronaarena.it', desc:'NCC Verona. Lago di Garda, Arena, Mantova, Brescia, aeroporto Villafranca.' },
    operator: { email:'ops@veronaarena.it', pw:'VeronaNcc2026!', name:'Diego Zanetti' },
    drivers: [
      { f:'Mattia', l:'Zanetti', p:'+39 340 7070701', lic:'VR7007001A' },
      { f:'Simone', l:'Brighenti', p:'+39 340 7070702', lic:'VR7007002B' },
    ],
    vehicles: [
      { t:'sedan', mk:'Audi', md:'A6', y:2024, c:'Grigio Nardo', pl:'VR 701 AT', s:3, am:['Wi-Fi','Aria condizionata','Prese USB'] },
      { t:'van', mk:'Mercedes-Benz', md:'V-Class', y:2024, c:'Nero', pl:'VR 702 AT', s:7, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua'] },
    ],
    trips: [
      { dy:0, h:15, o:L.veronaAero, d:L.verona, v:0, dr:0, se:3, pr:1500, n:'Rientro da Villafranca.' },
      { dy:0, h:18, o:L.sirmione, d:L.verona, v:1, dr:1, se:6, pr:2500, n:'Rientro da Sirmione.' },
      { dy:1, h:9, o:L.verona, d:L.sirmione, v:1, dr:0, se:7, pr:2500, n:'Transfer Garda / Sirmione.' },
      { dy:1, h:14, o:L.verona, d:L.mantova, v:0, dr:1, se:3, pr:2500, n:'Transfer Verona → Mantova.' },
      { dy:1, h:18, o:L.mantova, d:L.verona, v:0, dr:1, se:3, pr:2500, n:'Rientro da Mantova.' },
      { dy:2, h:8, o:L.verona, d:L.riva, v:1, dr:0, se:7, pr:3500, n:'Transfer Verona → Riva del Garda.' },
      { dy:2, h:16, o:L.riva, d:L.verona, v:1, dr:0, se:7, pr:3500, n:'Rientro da Riva.' },
      { dy:3, h:9, o:L.veronaAero, d:L.desenzano, v:0, dr:1, se:3, pr:2000, n:'Transfer aeroporto → Desenzano / Garda sud.' },
      { dy:3, h:10, o:L.verona, d:L.brescia, v:1, dr:0, se:6, pr:3000, n:'Transfer Verona → Brescia.' },
      { dy:4, h:7, o:L.verona, d:L.veronaAero, v:0, dr:0, se:3, pr:1500, n:'Transfer aeroporto mattutino.' },
    ],
  });

  // ─── 8. CALABRIA SUN NCC ──────────────────────────────────────────────
  await createOp({
    company: { name:'Calabria Sun NCC', slug:'calabria-sun-ncc', vat:'IT80090100110', license:'NCC-CZ-2024-8008', address:'Corso Mazzini 50', city:'Lamezia Terme', province:'CZ', region:'Calabria', cap:'88046', phone:'+39 0968 555800', email:'info@calabriasun.it', desc:'NCC Calabria. Tropea, Costa degli Dei, aeroporto Lamezia, Sila, Reggio Calabria.' },
    operator: { email:'ops@calabriasun.it', pw:'CalabriaNcc2026', name:'Francesco Catanzaro' },
    drivers: [
      { f:'Giuseppe', l:'Catanzaro', p:'+39 327 8080801', lic:'CZ8008001A' },
      { f:'Antonio', l:'Greco', p:'+39 327 8080802', lic:'RC8008002B' },
    ],
    vehicles: [
      { t:'sedan', mk:'BMW', md:'Serie 5 Touring', y:2023, c:'Nero Zaffiro', pl:'CZ 801 SN', s:3, am:['Wi-Fi','Aria condizionata','Prese USB'] },
      { t:'van', mk:'Mercedes-Benz', md:'Vito Tourer', y:2023, c:'Bianco', pl:'CZ 802 SN', s:8, am:['Wi-Fi','Aria condizionata','Prese USB','Bagagliera XL'] },
    ],
    trips: [
      { dy:0, h:14, o:L.lamezia, d:L.tropea, v:1, dr:0, se:7, pr:3000, n:'Rientro da transfer aeroporto → Tropea.' },
      { dy:1, h:8, o:L.lamezia, d:L.cosenza, v:0, dr:0, se:3, pr:2500, n:'Transfer aeroporto → Cosenza.' },
      { dy:1, h:15, o:L.cosenza, d:L.lamezia, v:0, dr:0, se:3, pr:2500, n:'Rientro da Cosenza.' },
      { dy:1, h:9, o:L.tropea, d:L.reggioC, v:1, dr:1, se:7, pr:4000, n:'Transfer Tropea → Reggio Calabria.' },
      { dy:2, h:7, o:L.lamezia, d:L.reggioC, v:1, dr:1, se:8, pr:4500, n:'Transfer aeroporto → Reggio Calabria.' },
      { dy:2, h:16, o:L.reggioC, d:L.lamezia, v:1, dr:1, se:8, pr:4500, n:'Rientro da Reggio.' },
      { dy:2, h:10, o:L.lamezia, d:L.pizzo, v:0, dr:0, se:3, pr:1500, n:'Transfer aeroporto → Pizzo Calabro.' },
      { dy:3, h:8, o:L.cosenza, d:L.sila, v:0, dr:0, se:3, pr:2000, n:'Transfer Cosenza → Sila / Camigliatello.' },
      { dy:3, h:15, o:L.sila, d:L.cosenza, v:0, dr:0, se:3, pr:2000, n:'Rientro dalla Sila.' },
      { dy:4, h:9, o:L.lamezia, d:L.tropea, v:1, dr:0, se:8, pr:3000, n:'Shuttle spiaggia Tropea.' },
      { dy:4, h:18, o:L.tropea, d:L.lamezia, v:1, dr:0, se:8, pr:3000, n:'Rientro serale da Tropea.' },
    ],
  });

  // ─── 9. TRIESTE TRANSFER ──────────────────────────────────────────────
  await createOp({
    company: { name:'Trieste Transfer', slug:'trieste-transfer', vat:'IT90100110120', license:'NCC-TS-2024-9009', address:'Riva del Mandracchio 4', city:'Trieste', province:'TS', region:'Friuli Venezia Giulia', cap:'34124', phone:'+39 040 5559009', email:'info@triestetransfer.it', desc:'NCC Trieste e FVG. Aeroporto FVG, Udine, Gorizia, Grado, confine Slovenia.' },
    operator: { email:'ops@triestetransfer.it', pw:'TriesteNcc2026', name:'Sergio Furlan' },
    drivers: [
      { f:'Michele', l:'Furlan', p:'+39 333 9090901', lic:'TS9009001A' },
      { f:'Igor', l:'Babic', p:'+39 333 9090902', lic:'TS9009002B' },
    ],
    vehicles: [
      { t:'sedan', mk:'Audi', md:'A6', y:2024, c:'Blu Navarra', pl:'TS 901 TT', s:3, am:['Wi-Fi','Aria condizionata','Prese USB'] },
      { t:'van', mk:'Mercedes-Benz', md:'V-Class', y:2023, c:'Grigio', pl:'TS 902 TT', s:7, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua'] },
    ],
    trips: [
      { dy:0, h:15, o:L.triesteAero, d:L.trieste, v:0, dr:0, se:3, pr:2000, n:'Rientro da aeroporto FVG.' },
      { dy:0, h:18, o:L.gorizia, d:L.trieste, v:0, dr:1, se:3, pr:2000, n:'Rientro da Gorizia.' },
      { dy:1, h:8, o:L.trieste, d:L.venezia, v:1, dr:0, se:6, pr:5000, n:'Transfer Trieste → Venezia.' },
      { dy:1, h:16, o:L.venezia, d:L.trieste, v:1, dr:0, se:6, pr:5000, n:'Rientro da Venezia.' },
      { dy:1, h:9, o:L.trieste, d:L.udine, v:0, dr:1, se:3, pr:2500, n:'Transfer Trieste → Udine.' },
      { dy:2, h:7, o:L.trieste, d:L.triesteAero, v:0, dr:0, se:3, pr:1500, n:'Transfer aeroporto FVG mattutino.' },
      { dy:2, h:10, o:L.triesteAero, d:L.grado, v:0, dr:0, se:3, pr:2500, n:'Transfer aeroporto → Grado.' },
      { dy:2, h:9, o:L.trieste, d:L.pordenone, v:1, dr:1, se:6, pr:3500, n:'Transfer Trieste → Pordenone.' },
      { dy:3, h:8, o:L.trieste, d:L.lubiana, v:0, dr:0, se:3, pr:1500, n:'Transfer verso confine Slovenia / Fernetti.' },
      { dy:3, h:10, o:L.udine, d:L.triesteAero, v:1, dr:1, se:7, pr:3000, n:'Transfer Udine → aeroporto FVG.' },
      { dy:4, h:9, o:L.triesteAero, d:L.udine, v:1, dr:0, se:7, pr:3000, n:'Transfer aeroporto → Udine.' },
      { dy:4, h:15, o:L.udine, d:L.trieste, v:0, dr:1, se:3, pr:2500, n:'Rientro da Udine.' },
    ],
  });

  // ─── 10. UMBRIA GREEN NCC ─────────────────────────────────────────────
  await createOp({
    company: { name:'Umbria Green NCC', slug:'umbria-green-ncc', vat:'IT10110120130', license:'NCC-PG-2024-1010', address:'Corso Vannucci 25', city:'Perugia', province:'PG', region:'Umbria', cap:'06121', phone:'+39 075 5551010', email:'info@umbriagreen.it', desc:'NCC Umbria. Assisi, Orvieto, Spoleto, Norcia, Cascata delle Marmore. Transfer Roma e Firenze.' },
    operator: { email:'ops@umbriagreen.it', pw:'UmbriaNcc2026!', name:'Giovanni Bianchi' },
    drivers: [
      { f:'Claudio', l:'Bianchi', p:'+39 342 1010101', lic:'PG1010001A' },
      { f:'Daniele', l:'Rossi', p:'+39 342 1010102', lic:'PG1010002B' },
    ],
    vehicles: [
      { t:'sedan', mk:'Volvo', md:'S90', y:2024, c:'Nero Onyx', pl:'PG 101 GN', s:3, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua'] },
      { t:'van', mk:'Mercedes-Benz', md:'V-Class', y:2023, c:'Verde Oliva', pl:'PG 102 GN', s:7, am:['Wi-Fi','Aria condizionata','Prese USB','Acqua','Guida turistica'] },
    ],
    trips: [
      { dy:0, h:14, o:L.perugia, d:L.assisi, v:0, dr:0, se:3, pr:1500, n:'Transfer Perugia → Assisi.' },
      { dy:0, h:17, o:L.assisi, d:L.perugia, v:0, dr:0, se:3, pr:1500, n:'Rientro da Assisi.' },
      { dy:1, h:7, o:L.perugia, d:L.roma, v:1, dr:0, se:6, pr:5000, n:'Transfer Perugia → Roma Termini.' },
      { dy:1, h:15, o:L.roma, d:L.perugia, v:1, dr:0, se:6, pr:5000, n:'Rientro da Roma.' },
      { dy:1, h:9, o:L.perugia, d:L.orvietoU, v:0, dr:1, se:3, pr:3000, n:'Transfer Perugia → Orvieto.' },
      { dy:1, h:16, o:L.orvietoU, d:L.perugia, v:0, dr:1, se:3, pr:3000, n:'Rientro da Orvieto.' },
      { dy:2, h:8, o:L.perugia, d:L.firenze, v:0, dr:0, se:3, pr:5000, n:'Transfer Perugia → Firenze.' },
      { dy:2, h:16, o:L.firenze, d:L.perugia, v:0, dr:0, se:3, pr:5000, n:'Rientro da Firenze.' },
      { dy:2, h:9, o:L.perugia, d:L.spoleto, v:1, dr:1, se:7, pr:2000, n:'Transfer Perugia → Spoleto.' },
      { dy:3, h:8, o:L.perugia, d:L.norcia, v:1, dr:0, se:6, pr:3000, n:'Transfer Perugia → Norcia / Sibillini.' },
      { dy:3, h:16, o:L.norcia, d:L.perugia, v:1, dr:0, se:6, pr:3000, n:'Rientro da Norcia.' },
      { dy:3, h:10, o:L.perugia, d:L.gubbio, v:0, dr:1, se:3, pr:2000, n:'Transfer Perugia → Gubbio.' },
      { dy:4, h:9, o:L.perugia, d:L.todi, v:0, dr:0, se:3, pr:1800, n:'Transfer Perugia → Todi.' },
      { dy:4, h:8, o:L.perugia, d:L.terni, v:1, dr:1, se:7, pr:2500, n:'Transfer Perugia → Terni / Cascata Marmore.' },
    ],
  });

  console.log('\n\n🎉 10 operatori creati con successo!');
  console.log('════════════════════════════════════════════');
  console.log('ops@milanoexecutive.it      / MilanoNcc2026!');
  console.log('ops@romacapitaltransfer.it  / RomaNcc2026!!');
  console.log('ops@sardegnavip.it          / SardegnaNcc2026');
  console.log('ops@bolognanccs.it          / BolognaNcc2026!');
  console.log('ops@pugliaexclusive.it      / PugliaNcc2026!');
  console.log('ops@genovamare.it           / GenovaNcc2026!');
  console.log('ops@veronaarena.it          / VeronaNcc2026!');
  console.log('ops@calabriasun.it          / CalabriaNcc2026');
  console.log('ops@triestetransfer.it      / TriesteNcc2026');
  console.log('ops@umbriagreen.it          / UmbriaNcc2026!');
  console.log('════════════════════════════════════════════');

  await pool.end();
}

main().catch((e) => { console.error('❌', e); pool.end(); process.exit(1); });
