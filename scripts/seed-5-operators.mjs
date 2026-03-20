/**
 * Seed: 5 operatori NCC in diverse zone d'Italia
 *
 * 1. "NCC Napoli Executive" — Napoli, Costiera, Puglia, Roma
 * 2. "Torino Transfer" — Torino, Valle d'Aosta, Liguria, Milano
 * 3. "Firenze Luxury Ride" — Firenze, Toscana, Umbria, Roma
 * 4. "Sicilia NCC" — Catania, Palermo, Taormina, aeroporti siciliani
 * 5. "Venezia Transfer" — Venezia, Treviso, Verona, Dolomiti, laghi
 *
 * Usage: node scripts/seed-5-operators.mjs
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

function futureDate(daysFromNow, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function getRoute(oLng, oLat, dLng, dLat) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${oLng},${oLat};${dLng},${dLat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
  const data = await (await fetch(url)).json();
  if (!data.routes?.[0]) throw new Error(`No route: ${JSON.stringify(data)}`);
  const r = data.routes[0];
  return { geometry: r.geometry, distanceKm: +(r.distance / 1000).toFixed(2), durationMinutes: Math.round(r.duration / 60) };
}

async function createOperator({ company, operator, drivers, vehicles, trips: tripDefs }) {
  console.log(`\n🚐 ${company.name} — ${company.city} (${company.province})`);

  // Company
  const companyId = uuid();
  await sql(
    `INSERT INTO companies (id, name, slug, vat_number, ncc_license_number, ncc_license_expiry,
       address, city, province, region, postal_code, phone, email, description, status, verified_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'verified',NOW())`,
    [companyId, company.name, company.slug, company.vat, company.license, '2028-06-30',
     company.address, company.city, company.province, company.region, company.cap,
     company.phone, company.email, company.description]
  );

  // Operator user
  const opId = uuid();
  const pwHash = bcrypt.hashSync(operator.password, 12);
  await sql(
    `INSERT INTO users (id, email, password_hash, display_name, phone, user_type, company_id)
     VALUES ($1,$2,$3,$4,$5,'operator',$6)`,
    [opId, operator.email, pwHash, operator.name, company.phone, companyId]
  );
  console.log(`  ✅ Operator: ${operator.email} / ${operator.password}`);

  // Drivers
  const driverIds = [];
  for (const d of drivers) {
    const id = uuid();
    driverIds.push(id);
    await sql(
      `INSERT INTO drivers (id, company_id, first_name, last_name, phone, license_number, license_expiry)
       VALUES ($1,$2,$3,$4,$5,$6,'2029-06-30')`,
      [id, companyId, d.first, d.last, d.phone, d.license]
    );
  }

  // Vehicles
  const vehicleIds = [];
  for (const v of vehicles) {
    const id = uuid();
    vehicleIds.push(id);
    await sql(
      `INSERT INTO vehicles (id, company_id, vehicle_type, make, model, year, color, license_plate, seats_total, amenities)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, companyId, v.type, v.make, v.model, v.year, v.color, v.plate, v.seats, JSON.stringify(v.amenities)]
    );
  }

  // Trips
  for (let i = 0; i < tripDefs.length; i++) {
    const t = tripDefs[i];
    process.stdout.write(`  ${i + 1}/${tripDefs.length} ${t.origin.city} → ${t.dest.city}...`);
    const route = await getRoute(t.origin.lng, t.origin.lat, t.dest.lng, t.dest.lat);
    const departureAt = futureDate(t.day, t.hour, t.min || 0);
    const arrivalAt = new Date(new Date(departureAt).getTime() + route.durationMinutes * 60000).toISOString();

    await sql(
      `INSERT INTO trips (id, company_id, driver_id, vehicle_id,
         origin_address, origin_lat, origin_lng, origin_city,
         destination_address, destination_lat, destination_lng, destination_city,
         route_geometry, route_distance_km, route_duration_minutes,
         departure_at, estimated_arrival_at,
         seats_available, seats_booked, price_per_seat,
         allows_intermediate_stops, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,0,$19,true,$20,'scheduled')`,
      [uuid(), companyId, driverIds[t.driver], vehicleIds[t.vehicle],
       t.origin.address, t.origin.lat, t.origin.lng, t.origin.city,
       t.dest.address, t.dest.lat, t.dest.lng, t.dest.city,
       JSON.stringify(route.geometry), route.distanceKm, route.durationMinutes,
       departureAt, arrivalAt, t.seats, t.price, t.notes]
    );
    console.log(` ✅ ${route.distanceKm}km ${route.durationMinutes}min €${(t.price/100).toFixed(0)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// LOCATIONS
// ═══════════════════════════════════════════════════════════════════════

const L = {
  // Napoli area
  napoli:       { address: 'Napoli, Piazza Garibaldi', city: 'Napoli', lat: 40.8531, lng: 14.2681 },
  napoliAero:   { address: 'Aeroporto di Napoli Capodichino', city: 'Napoli', lat: 40.8860, lng: 14.2908 },
  sorrento:     { address: 'Sorrento, Piazza Tasso', city: 'Sorrento', lat: 40.6263, lng: 14.3757 },
  amalfi:       { address: 'Amalfi, Piazza Duomo', city: 'Amalfi', lat: 40.6340, lng: 14.6027 },
  positano:     { address: 'Positano, Via Pasitea', city: 'Positano', lat: 40.6281, lng: 14.4850 },
  bari:         { address: 'Bari, Piazza Aldo Moro (Stazione)', city: 'Bari', lat: 41.1187, lng: 16.8718 },
  salerno:      { address: 'Salerno, Piazza della Concordia', city: 'Salerno', lat: 40.6749, lng: 14.7590 },
  romaTermini:  { address: 'Roma Termini', city: 'Roma', lat: 41.9013, lng: 12.5024 },
  pompeii:      { address: 'Pompei, Piazza Anfiteatro', city: 'Pompei', lat: 40.7509, lng: 14.4869 },
  lecce:        { address: 'Lecce, Piazza SantOronzo', city: 'Lecce', lat: 40.3529, lng: 18.1710 },

  // Torino area
  torino:       { address: 'Torino, Piazza Castello', city: 'Torino', lat: 45.0708, lng: 7.6851 },
  torinoAero:   { address: 'Aeroporto di Torino Caselle', city: 'Caselle Torinese', lat: 45.2008, lng: 7.6496 },
  aosta:        { address: 'Aosta, Piazza Chanoux', city: 'Aosta', lat: 45.7372, lng: 7.3209 },
  courmayeur:   { address: 'Courmayeur, Via Roma', city: 'Courmayeur', lat: 45.7953, lng: 6.9710 },
  sanremo:      { address: 'Sanremo, Corso Imperatrice', city: 'Sanremo', lat: 43.8160, lng: 7.7750 },
  milCentrale:  { address: 'Milano Centrale', city: 'Milano', lat: 45.4861, lng: 9.2044 },
  bardonecchia: { address: 'Bardonecchia, Piazza Europa', city: 'Bardonecchia', lat: 45.0793, lng: 6.7045 },
  alba:         { address: 'Alba, Piazza Risorgimento', city: 'Alba', lat: 44.7001, lng: 8.0355 },
  sestriere:    { address: 'Sestriere, Via Louset', city: 'Sestriere', lat: 44.9567, lng: 6.8800 },

  // Firenze area
  firenze:      { address: 'Firenze, Piazza della Stazione', city: 'Firenze', lat: 43.7764, lng: 11.2479 },
  firenzeAero:  { address: 'Aeroporto di Firenze Peretola', city: 'Firenze', lat: 43.8100, lng: 11.2051 },
  pisa:         { address: 'Aeroporto di Pisa Galileo Galilei', city: 'Pisa', lat: 43.6839, lng: 10.3927 },
  siena:        { address: 'Siena, Piazza del Campo', city: 'Siena', lat: 43.3186, lng: 11.3317 },
  sanGimignano: { address: 'San Gimignano, Piazza della Cisterna', city: 'San Gimignano', lat: 43.4677, lng: 11.0441 },
  montepulciano:{ address: 'Montepulciano, Piazza Grande', city: 'Montepulciano', lat: 43.0991, lng: 11.7827 },
  perugia:      { address: 'Perugia, Piazza IV Novembre', city: 'Perugia', lat: 43.1107, lng: 12.3891 },
  romaPopolo:   { address: 'Roma, Piazza del Popolo', city: 'Roma', lat: 41.9106, lng: 12.4764 },
  lucca:        { address: 'Lucca, Piazza Anfiteatro', city: 'Lucca', lat: 43.8439, lng: 10.5060 },
  forte:        { address: 'Forte dei Marmi, Piazza Garibaldi', city: 'Forte dei Marmi', lat: 43.9614, lng: 10.1711 },

  // Sicilia
  catania:      { address: 'Catania, Piazza Duomo', city: 'Catania', lat: 37.5024, lng: 15.0870 },
  cataniaAero:  { address: 'Aeroporto di Catania Fontanarossa', city: 'Catania', lat: 37.4668, lng: 15.0664 },
  palermoAero:  { address: 'Aeroporto di Palermo Punta Raisi', city: 'Palermo', lat: 38.1763, lng: 13.0910 },
  palermo:      { address: 'Palermo, Piazza Politeama', city: 'Palermo', lat: 38.1220, lng: 13.3560 },
  taormina:     { address: 'Taormina, Corso Umberto', city: 'Taormina', lat: 37.8525, lng: 15.2884 },
  siracusa:     { address: 'Siracusa, Ortigia', city: 'Siracusa', lat: 37.0614, lng: 15.2929 },
  cefalu:       { address: 'Cefalù, Corso Ruggero', city: 'Cefalù', lat: 38.0383, lng: 14.0224 },
  agrigento:    { address: 'Agrigento, Valle dei Templi', city: 'Agrigento', lat: 37.2907, lng: 13.5874 },
  ragusa:       { address: 'Ragusa Ibla, Piazza Duomo', city: 'Ragusa', lat: 36.9269, lng: 14.7314 },

  // Veneto / Trentino
  venezia:      { address: 'Venezia, Piazzale Roma', city: 'Venezia', lat: 45.4375, lng: 12.3194 },
  veneziaAero:  { address: 'Aeroporto Marco Polo di Venezia', city: 'Venezia', lat: 45.5053, lng: 12.3519 },
  trevisoAero:  { address: 'Aeroporto di Treviso Canova', city: 'Treviso', lat: 45.6484, lng: 12.1944 },
  verona:       { address: 'Verona, Piazza Bra', city: 'Verona', lat: 45.4385, lng: 10.9917 },
  padova:       { address: 'Padova, Prato della Valle', city: 'Padova', lat: 45.3987, lng: 11.8766 },
  cortina:      { address: "Cortina d'Ampezzo, Corso Italia", city: "Cortina d'Ampezzo", lat: 46.5369, lng: 12.1357 },
  trento:       { address: 'Trento, Piazza Duomo', city: 'Trento', lat: 46.0677, lng: 11.1217 },
  bolzano:      { address: 'Bolzano, Piazza Walther', city: 'Bolzano', lat: 46.4981, lng: 11.3548 },
  gardalake:    { address: 'Sirmione, Piazza Castello', city: 'Sirmione', lat: 45.4926, lng: 10.6068 },
  bassano:      { address: 'Bassano del Grappa, Ponte Vecchio', city: 'Bassano del Grappa', lat: 45.7659, lng: 11.7350 },
};

// ═══════════════════════════════════════════════════════════════════════
// OPERATORS
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🇮🇹 Seeding 5 operatori NCC in tutta Italia...');

  // ─── 1. NCC NAPOLI EXECUTIVE ───────────────────────────────────────────
  await createOperator({
    company: {
      name: 'NCC Napoli Executive', slug: 'ncc-napoli-executive', vat: 'IT55566677788',
      license: 'NCC-NA-2024-0892', address: 'Via Partenope 32', city: 'Napoli',
      province: 'NA', region: 'Campania', cap: '80121', phone: '+39 081 5550101',
      email: 'info@nccnapoliexecutive.it',
      description: 'Transfer premium Napoli, Costiera Amalfitana, Puglia. Flotta Mercedes e BMW.',
    },
    operator: { email: 'ops@nccnapoliexecutive.it', password: 'NapoliNcc2026!', name: 'Roberto Esposito' },
    drivers: [
      { first: 'Salvatore', last: 'Esposito', phone: '+39 333 5001001', license: 'NA1234567A' },
      { first: 'Gennaro', last: 'Russo', phone: '+39 333 5001002', license: 'NA7654321B' },
      { first: 'Vincenzo', last: 'Amato', phone: '+39 333 5001003', license: 'NA9988776C' },
    ],
    vehicles: [
      { type: 'sedan', make: 'BMW', model: 'Serie 7', year: 2024, color: 'Nero Zaffiro', plate: 'NA 501 EX', seats: 3, amenities: ['Wi-Fi','Aria condizionata','Prese USB','Acqua','Giornali'] },
      { type: 'van', make: 'Mercedes-Benz', model: 'V-Class', year: 2023, color: 'Nero Ossidiana', plate: 'NA 502 EX', seats: 7, amenities: ['Wi-Fi','Aria condizionata','Prese USB','Acqua','Monitor'] },
    ],
    trips: [
      // Oggi
      { day: 0, hour: 14, min: 0, origin: L.napoliAero, dest: L.sorrento, vehicle: 1, driver: 0, seats: 6, price: 4500, notes: 'Rientro da transfer aeroportuale verso Costiera Sorrentina.' },
      { day: 0, hour: 17, min: 30, origin: L.amalfi, dest: L.napoli, vehicle: 0, driver: 1, seats: 3, price: 3500, notes: 'Rientro serale dalla Costiera Amalfitana.' },
      // +1
      { day: 1, hour: 6, min: 30, origin: L.napoli, dest: L.romaTermini, vehicle: 0, driver: 0, seats: 3, price: 5000, notes: 'Transfer mattutino Napoli → Roma. A1 diretta.' },
      { day: 1, hour: 10, min: 0, origin: L.romaTermini, dest: L.napoli, vehicle: 0, driver: 0, seats: 3, price: 5000, notes: 'Rientro da Roma.' },
      { day: 1, hour: 15, min: 0, origin: L.positano, dest: L.napoliAero, vehicle: 1, driver: 1, seats: 6, price: 4000, notes: 'Transfer Positano → Aeroporto Napoli.' },
      // +2
      { day: 2, hour: 8, min: 0, origin: L.napoli, dest: L.bari, vehicle: 1, driver: 2, seats: 7, price: 5500, notes: 'Transfer Napoli → Bari via A16. 3h circa.' },
      { day: 2, hour: 16, min: 0, origin: L.bari, dest: L.napoli, vehicle: 1, driver: 2, seats: 7, price: 5500, notes: 'Rientro da Bari.' },
      { day: 2, hour: 9, min: 30, origin: L.napoliAero, dest: L.pompeii, vehicle: 0, driver: 0, seats: 3, price: 2500, notes: 'Transfer aeroporto → Pompei per turisti.' },
      // +3
      { day: 3, hour: 7, min: 0, origin: L.napoli, dest: L.lecce, vehicle: 1, driver: 1, seats: 7, price: 7000, notes: 'Transfer Napoli → Lecce. Viaggio lungo ma confortevole.' },
      { day: 3, hour: 17, min: 0, origin: L.salerno, dest: L.amalfi, vehicle: 0, driver: 0, seats: 3, price: 2000, notes: 'Rientro corto Salerno → Amalfi via costiera.' },
      // +4
      { day: 4, hour: 9, min: 0, origin: L.napoliAero, dest: L.positano, vehicle: 1, driver: 2, seats: 6, price: 4500, notes: 'Transfer aeroporto → Costiera. Panoramica mozzafiato.' },
      { day: 4, hour: 18, min: 0, origin: L.sorrento, dest: L.napoli, vehicle: 0, driver: 0, seats: 3, price: 3000, notes: 'Rientro serale da Sorrento.' },
    ],
  });

  // ─── 2. TORINO TRANSFER ────────────────────────────────────────────────
  await createOperator({
    company: {
      name: 'Torino Transfer', slug: 'torino-transfer', vat: 'IT11122233344',
      license: 'NCC-TO-2023-0445', address: 'Corso Vittorio Emanuele II 80', city: 'Torino',
      province: 'TO', region: 'Piemonte', cap: '10121', phone: '+39 011 5550202',
      email: 'info@torinotransfer.it',
      description: 'NCC Torino. Transfer aeroportuali, stazioni sciistiche, Milano e Liguria.',
    },
    operator: { email: 'ops@torinotransfer.it', password: 'TorinoNcc2026!', name: 'Alessandro Ferraris' },
    drivers: [
      { first: 'Massimo', last: 'Ferraris', phone: '+39 339 6001001', license: 'TO5566778A' },
      { first: 'Davide', last: 'Gallo', phone: '+39 339 6001002', license: 'TO9900112B' },
    ],
    vehicles: [
      { type: 'sedan', make: 'Audi', model: 'A8 L', year: 2024, color: 'Nero Mythos', plate: 'TO 201 TT', seats: 3, amenities: ['Wi-Fi','Aria condizionata','Prese USB','Sedili massaggianti'] },
      { type: 'van', make: 'Mercedes-Benz', model: 'Sprinter Tourer', year: 2023, color: 'Bianco Artico', plate: 'TO 202 TT', seats: 8, amenities: ['Wi-Fi','Aria condizionata','Prese USB','Porta sci','Monitor','Bagagliera XL'] },
    ],
    trips: [
      { day: 0, hour: 15, min: 0, origin: L.torinoAero, dest: L.torino, vehicle: 0, driver: 0, seats: 3, price: 2000, notes: 'Rientro da transfer aeroporto Caselle.' },
      { day: 0, hour: 19, min: 0, origin: L.milCentrale, dest: L.torino, vehicle: 0, driver: 0, seats: 3, price: 4000, notes: 'Rientro da Milano Centrale.' },
      { day: 1, hour: 7, min: 0, origin: L.torino, dest: L.milCentrale, vehicle: 0, driver: 0, seats: 3, price: 4000, notes: 'Transfer mattutino Torino → Milano.' },
      { day: 1, hour: 10, min: 0, origin: L.torino, dest: L.courmayeur, vehicle: 1, driver: 1, seats: 7, price: 5000, notes: 'Transfer verso Courmayeur. Porta sci disponibile.' },
      { day: 1, hour: 16, min: 0, origin: L.courmayeur, dest: L.torino, vehicle: 1, driver: 1, seats: 7, price: 5000, notes: 'Rientro da Courmayeur.' },
      { day: 2, hour: 8, min: 0, origin: L.torino, dest: L.sanremo, vehicle: 0, driver: 0, seats: 3, price: 5500, notes: 'Transfer Torino → Sanremo via A6+A10.' },
      { day: 2, hour: 17, min: 0, origin: L.sanremo, dest: L.torino, vehicle: 0, driver: 0, seats: 3, price: 5500, notes: 'Rientro dalla Riviera.' },
      { day: 2, hour: 7, min: 30, origin: L.torino, dest: L.sestriere, vehicle: 1, driver: 1, seats: 8, price: 4000, notes: 'Transfer sciatori verso Sestriere. Via Lattea.' },
      { day: 3, hour: 6, min: 0, origin: L.torino, dest: L.torinoAero, vehicle: 0, driver: 0, seats: 3, price: 1500, notes: 'Transfer early morning verso Caselle.' },
      { day: 3, hour: 9, min: 0, origin: L.torinoAero, dest: L.alba, vehicle: 0, driver: 0, seats: 3, price: 3500, notes: 'Rientro da aeroporto verso Langhe. Wine tour transfer.' },
      { day: 3, hour: 14, min: 0, origin: L.alba, dest: L.torino, vehicle: 0, driver: 0, seats: 3, price: 3000, notes: 'Rientro dalle Langhe.' },
      { day: 4, hour: 8, min: 0, origin: L.torino, dest: L.aosta, vehicle: 1, driver: 1, seats: 7, price: 4500, notes: 'Transfer verso Valle d\'Aosta.' },
      { day: 4, hour: 16, min: 0, origin: L.aosta, dest: L.torino, vehicle: 1, driver: 1, seats: 7, price: 4500, notes: 'Rientro da Aosta.' },
    ],
  });

  // ─── 3. FIRENZE LUXURY RIDE ────────────────────────────────────────────
  await createOperator({
    company: {
      name: 'Firenze Luxury Ride', slug: 'firenze-luxury-ride', vat: 'IT77788899900',
      license: 'NCC-FI-2024-0331', address: 'Via dei Tornabuoni 15', city: 'Firenze',
      province: 'FI', region: 'Toscana', cap: '50123', phone: '+39 055 5550303',
      email: 'info@firenzeluxuryride.it',
      description: 'NCC premium Firenze. Tour Toscana, transfer Roma, Umbria e aeroporti.',
    },
    operator: { email: 'ops@firenzeluxuryride.it', password: 'FirenzeNcc2026', name: 'Marco Bianchi' },
    drivers: [
      { first: 'Filippo', last: 'Martini', phone: '+39 340 7001001', license: 'FI4455667A' },
      { first: 'Lorenzo', last: 'Conti', phone: '+39 340 7001002', license: 'FI8899001B' },
    ],
    vehicles: [
      { type: 'sedan', make: 'Mercedes-Benz', model: 'Classe S', year: 2024, color: 'Nero Ossidiana', plate: 'FI 301 LR', seats: 3, amenities: ['Wi-Fi','Aria condizionata','Champagne','Giornali','Sedili in pelle'] },
      { type: 'van', make: 'Mercedes-Benz', model: 'V-Class', year: 2024, color: 'Grigio Selenite', plate: 'FI 302 LR', seats: 7, amenities: ['Wi-Fi','Aria condizionata','Prese USB','Acqua','Snack'] },
    ],
    trips: [
      { day: 0, hour: 13, min: 30, origin: L.pisa, dest: L.firenze, vehicle: 1, driver: 0, seats: 6, price: 3500, notes: 'Rientro da Pisa aeroporto. Via FI-PI-LI.' },
      { day: 0, hour: 18, min: 0, origin: L.siena, dest: L.firenze, vehicle: 0, driver: 1, seats: 3, price: 3000, notes: 'Rientro serale da Siena. Via Chiantigiana.' },
      { day: 1, hour: 7, min: 0, origin: L.firenze, dest: L.romaPopolo, vehicle: 0, driver: 0, seats: 3, price: 5500, notes: 'Transfer Firenze → Roma. A1 del Sole.' },
      { day: 1, hour: 13, min: 0, origin: L.romaPopolo, dest: L.firenze, vehicle: 0, driver: 0, seats: 3, price: 5500, notes: 'Rientro da Roma.' },
      { day: 1, hour: 9, min: 0, origin: L.firenze, dest: L.sanGimignano, vehicle: 1, driver: 1, seats: 7, price: 3000, notes: 'Transfer wine tour San Gimignano.' },
      { day: 1, hour: 16, min: 0, origin: L.sanGimignano, dest: L.firenze, vehicle: 1, driver: 1, seats: 7, price: 3000, notes: 'Rientro da San Gimignano.' },
      { day: 2, hour: 8, min: 0, origin: L.firenze, dest: L.montepulciano, vehicle: 0, driver: 0, seats: 3, price: 4000, notes: 'Transfer Montepulciano, Val d\'Orcia.' },
      { day: 2, hour: 17, min: 0, origin: L.montepulciano, dest: L.firenze, vehicle: 0, driver: 0, seats: 3, price: 4000, notes: 'Rientro dalla Val d\'Orcia.' },
      { day: 2, hour: 10, min: 0, origin: L.firenzeAero, dest: L.lucca, vehicle: 1, driver: 1, seats: 6, price: 3500, notes: 'Transfer aeroporto → Lucca.' },
      { day: 3, hour: 7, min: 30, origin: L.firenze, dest: L.perugia, vehicle: 0, driver: 0, seats: 3, price: 4500, notes: 'Transfer Firenze → Perugia via E45.' },
      { day: 3, hour: 15, min: 0, origin: L.perugia, dest: L.firenze, vehicle: 0, driver: 0, seats: 3, price: 4500, notes: 'Rientro da Perugia.' },
      { day: 3, hour: 9, min: 0, origin: L.firenze, dest: L.forte, vehicle: 1, driver: 1, seats: 7, price: 4000, notes: 'Transfer verso Versilia / Forte dei Marmi.' },
      { day: 4, hour: 6, min: 0, origin: L.firenze, dest: L.pisa, vehicle: 0, driver: 0, seats: 3, price: 3000, notes: 'Transfer early morning verso aeroporto Pisa.' },
      { day: 4, hour: 11, min: 0, origin: L.pisa, dest: L.siena, vehicle: 1, driver: 1, seats: 6, price: 4000, notes: 'Transfer Pisa → Siena per turisti.' },
    ],
  });

  // ─── 4. SICILIA NCC ────────────────────────────────────────────────────
  await createOperator({
    company: {
      name: 'Sicilia NCC', slug: 'sicilia-ncc', vat: 'IT22233344455',
      license: 'NCC-CT-2024-0567', address: 'Via Etnea 112', city: 'Catania',
      province: 'CT', region: 'Sicilia', cap: '95131', phone: '+39 095 5550404',
      email: 'info@siciliancc.it',
      description: 'NCC Sicilia. Transfer aeroportuali Catania e Palermo, tour Taormina, Siracusa, Agrigento.',
    },
    operator: { email: 'ops@siciliancc.it', password: 'SiciliaNcc2026', name: 'Giovanni Ferrara' },
    drivers: [
      { first: 'Calogero', last: 'Ferrara', phone: '+39 320 8001001', license: 'CT6677889A' },
      { first: 'Salvatore', last: 'Ferrara', phone: '+39 320 8001002', license: 'CT1122334B' },
      { first: 'Giuseppe', last: 'Cataldo', phone: '+39 320 8001003', license: 'PA5544332C' },
    ],
    vehicles: [
      { type: 'sedan', make: 'BMW', model: 'Serie 5', year: 2024, color: 'Blu Imperial', plate: 'CT 401 SC', seats: 3, amenities: ['Wi-Fi','Aria condizionata','Prese USB','Acqua'] },
      { type: 'van', make: 'Mercedes-Benz', model: 'Vito Tourer', year: 2023, color: 'Nero', plate: 'CT 402 SC', seats: 8, amenities: ['Wi-Fi','Aria condizionata','Prese USB','Monitor','Bagagliera XL'] },
    ],
    trips: [
      { day: 0, hour: 14, min: 0, origin: L.cataniaAero, dest: L.taormina, vehicle: 0, driver: 0, seats: 3, price: 3500, notes: 'Rientro da transfer aeroporto → Taormina.' },
      { day: 0, hour: 18, min: 0, origin: L.taormina, dest: L.catania, vehicle: 0, driver: 0, seats: 3, price: 3000, notes: 'Rientro serale Taormina → Catania.' },
      { day: 1, hour: 8, min: 0, origin: L.catania, dest: L.siracusa, vehicle: 0, driver: 0, seats: 3, price: 3000, notes: 'Transfer Catania → Siracusa / Ortigia.' },
      { day: 1, hour: 15, min: 0, origin: L.siracusa, dest: L.cataniaAero, vehicle: 0, driver: 0, seats: 3, price: 3500, notes: 'Transfer Siracusa → Aeroporto Catania.' },
      { day: 1, hour: 7, min: 0, origin: L.catania, dest: L.palermo, vehicle: 1, driver: 1, seats: 7, price: 6000, notes: 'Transfer Catania → Palermo via A19. 2.5h.' },
      { day: 1, hour: 16, min: 0, origin: L.palermo, dest: L.catania, vehicle: 1, driver: 1, seats: 7, price: 6000, notes: 'Rientro da Palermo.' },
      { day: 2, hour: 9, min: 0, origin: L.palermoAero, dest: L.cefalu, vehicle: 1, driver: 2, seats: 7, price: 3000, notes: 'Transfer aeroporto Palermo → Cefalù.' },
      { day: 2, hour: 16, min: 0, origin: L.cefalu, dest: L.palermo, vehicle: 1, driver: 2, seats: 7, price: 2500, notes: 'Rientro da Cefalù.' },
      { day: 2, hour: 8, min: 0, origin: L.cataniaAero, dest: L.ragusa, vehicle: 0, driver: 0, seats: 3, price: 4500, notes: 'Transfer aeroporto → Ragusa Ibla. Barocco siciliano.' },
      { day: 3, hour: 7, min: 30, origin: L.catania, dest: L.agrigento, vehicle: 1, driver: 1, seats: 7, price: 5500, notes: 'Transfer Catania → Valle dei Templi, Agrigento.' },
      { day: 3, hour: 16, min: 0, origin: L.agrigento, dest: L.catania, vehicle: 1, driver: 1, seats: 7, price: 5500, notes: 'Rientro da Agrigento.' },
      { day: 4, hour: 6, min: 30, origin: L.catania, dest: L.cataniaAero, vehicle: 0, driver: 0, seats: 3, price: 1500, notes: 'Transfer early morning aeroporto Fontanarossa.' },
      { day: 4, hour: 10, min: 0, origin: L.cataniaAero, dest: L.taormina, vehicle: 1, driver: 0, seats: 7, price: 3500, notes: 'Transfer gruppo aeroporto → Taormina.' },
    ],
  });

  // ─── 5. VENEZIA TRANSFER ───────────────────────────────────────────────
  await createOperator({
    company: {
      name: 'Venezia Transfer', slug: 'venezia-transfer', vat: 'IT99988877766',
      license: 'NCC-VE-2023-0712', address: 'Via Forte Marghera 191', city: 'Mestre',
      province: 'VE', region: 'Veneto', cap: '30173', phone: '+39 041 5550505',
      email: 'info@veneziatransfer.it',
      description: 'NCC Venezia. Transfer aeroporti Marco Polo e Treviso, Dolomiti, Lago di Garda, Verona.',
    },
    operator: { email: 'ops@veneziatransfer.it', password: 'VeneziaNcc2026', name: 'Paolo Zanetti' },
    drivers: [
      { first: 'Andrea', last: 'Zanetti', phone: '+39 348 9001001', license: 'VE3344556A' },
      { first: 'Luca', last: 'Pavan', phone: '+39 348 9001002', license: 'VE7788990B' },
    ],
    vehicles: [
      { type: 'sedan', make: 'Audi', model: 'A6 Avant', year: 2024, color: 'Grigio Nardo', plate: 'VE 501 VT', seats: 3, amenities: ['Wi-Fi','Aria condizionata','Prese USB','Acqua'] },
      { type: 'van', make: 'Mercedes-Benz', model: 'V-Class Extra Long', year: 2024, color: 'Nero Ossidiana', plate: 'VE 502 VT', seats: 7, amenities: ['Wi-Fi','Aria condizionata','Prese USB','Monitor','Acqua','Porta sci'] },
    ],
    trips: [
      { day: 0, hour: 14, min: 0, origin: L.veneziaAero, dest: L.venezia, vehicle: 0, driver: 0, seats: 3, price: 2000, notes: 'Rientro da Marco Polo → Piazzale Roma.' },
      { day: 0, hour: 17, min: 0, origin: L.trevisoAero, dest: L.venezia, vehicle: 0, driver: 0, seats: 3, price: 2500, notes: 'Rientro da Treviso Canova.' },
      { day: 1, hour: 7, min: 0, origin: L.venezia, dest: L.cortina, vehicle: 1, driver: 1, seats: 7, price: 6000, notes: 'Transfer Venezia → Cortina d\'Ampezzo. Dolomiti!' },
      { day: 1, hour: 16, min: 0, origin: L.cortina, dest: L.venezia, vehicle: 1, driver: 1, seats: 7, price: 6000, notes: 'Rientro da Cortina.' },
      { day: 1, hour: 9, min: 0, origin: L.veneziaAero, dest: L.verona, vehicle: 0, driver: 0, seats: 3, price: 4000, notes: 'Transfer Marco Polo → Verona.' },
      { day: 2, hour: 8, min: 0, origin: L.venezia, dest: L.gardalake, vehicle: 1, driver: 0, seats: 6, price: 5000, notes: 'Transfer Venezia → Lago di Garda / Sirmione.' },
      { day: 2, hour: 17, min: 0, origin: L.gardalake, dest: L.venezia, vehicle: 1, driver: 0, seats: 6, price: 5000, notes: 'Rientro dal Garda.' },
      { day: 2, hour: 6, min: 30, origin: L.venezia, dest: L.veneziaAero, vehicle: 0, driver: 0, seats: 3, price: 1500, notes: 'Transfer early morning Marco Polo.' },
      { day: 2, hour: 10, min: 0, origin: L.veneziaAero, dest: L.padova, vehicle: 0, driver: 0, seats: 3, price: 2500, notes: 'Transfer Marco Polo → Padova.' },
      { day: 3, hour: 8, min: 0, origin: L.venezia, dest: L.trento, vehicle: 1, driver: 1, seats: 7, price: 5500, notes: 'Transfer Venezia → Trento via A4+A22.' },
      { day: 3, hour: 16, min: 0, origin: L.trento, dest: L.venezia, vehicle: 1, driver: 1, seats: 7, price: 5500, notes: 'Rientro da Trento.' },
      { day: 3, hour: 9, min: 0, origin: L.venezia, dest: L.bassano, vehicle: 0, driver: 0, seats: 3, price: 3000, notes: 'Transfer Venezia → Bassano del Grappa.' },
      { day: 4, hour: 7, min: 0, origin: L.venezia, dest: L.bolzano, vehicle: 1, driver: 1, seats: 7, price: 7000, notes: 'Transfer Venezia → Bolzano via A22. Alto Adige.' },
      { day: 4, hour: 17, min: 0, origin: L.bolzano, dest: L.venezia, vehicle: 1, driver: 1, seats: 7, price: 7000, notes: 'Rientro da Bolzano. Viaggio lungo ma panoramico.' },
    ],
  });

  console.log('\n🎉 Tutti e 5 gli operatori creati!');
  console.log('────────────────────────────────────────');
  console.log('ops@nccnapoliexecutive.it / NapoliNcc2026!');
  console.log('ops@torinotransfer.it     / TorinoNcc2026!');
  console.log('ops@firenzeluxuryride.it  / FirenzeNcc2026');
  console.log('ops@siciliancc.it         / SiciliaNcc2026');
  console.log('ops@veneziatransfer.it    / VeneziaNcc2026');
  console.log('────────────────────────────────────────');

  await pool.end();
}

main().catch((err) => { console.error('❌ Seed failed:', err); pool.end(); process.exit(1); });
