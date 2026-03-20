/**
 * Seed script: creates a demo NCC company with 3 drivers, 3 vehicles, and realistic trips.
 *
 * Usage:  node scripts/seed-demo.mjs
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import pgModule from 'pg';
const { Pool: PgPool } = pgModule;
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// ── Config ──────────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rideback';
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

const pool = new PgPool({ connectionString: DATABASE_URL });

// ── Helpers ─────────────────────────────────────────────────────────────────
async function sql(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

function uuid() {
  return randomUUID();
}

function futureDate(daysFromNow, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function getRoute(originLng, originLat, destLng, destLat) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.routes?.[0]) throw new Error(`No route found: ${JSON.stringify(data)}`);
  const route = data.routes[0];
  return {
    geometry: route.geometry,
    distanceKm: +(route.distance / 1000).toFixed(2),
    durationMinutes: Math.round(route.duration / 60),
  };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚐 Seeding demo data for RideBack...\n');

  // ── 1. Company ──────────────────────────────────────────────────────────
  const companyId = uuid();
  await sql(
    `INSERT INTO companies (id, name, slug, vat_number, ncc_license_number, ncc_license_expiry,
       address, city, province, region, postal_code, phone, email, description, status, verified_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'verified',NOW())`,
    [
      companyId,
      'Cozza NCC Premium',
      'cozza-ncc-premium',
      'IT12345678901',
      'NCC-RM-2024-0451',
      '2027-12-31',
      'Via Cristoforo Colombo 265',
      'Roma',
      'RM',
      'Lazio',
      '00147',
      '+39 06 5551234',
      'info@cozzancc.it',
      'Servizio NCC premium Roma e Centro Italia. Flotta Mercedes, autisti professionisti.',
    ]
  );
  console.log('✅ Company: Cozza NCC Premium');

  // ── 2. Operator user ────────────────────────────────────────────────────
  const operatorId = uuid();
  const passwordHash = bcrypt.hashSync('CozzaNcc2026!!', 12);
  await sql(
    `INSERT INTO users (id, email, password_hash, display_name, phone, user_type, company_id)
     VALUES ($1,$2,$3,$4,$5,'operator',$6)`,
    [operatorId, 'luca@cozzancc.it', passwordHash, 'Luca Cozza', '+39 333 1234567', companyId]
  );
  console.log('✅ Operator: luca@cozzancc.it / CozzaNcc2026!!');

  // ── 3. Drivers ──────────────────────────────────────────────────────────
  const drivers = [
    { firstName: 'Marco', lastName: 'Bianchi', phone: '+39 338 7001001', license: 'RM8834521A' },
    { firstName: 'Giuseppe', lastName: 'Rossi', phone: '+39 338 7001002', license: 'RM9912387B' },
    { firstName: 'Antonio', lastName: 'Ferraro', phone: '+39 338 7001003', license: 'NA5567234C' },
  ];
  const driverIds = [];
  for (const d of drivers) {
    const id = uuid();
    driverIds.push(id);
    await sql(
      `INSERT INTO drivers (id, company_id, first_name, last_name, phone, license_number, license_expiry)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, companyId, d.firstName, d.lastName, d.phone, d.license, '2028-06-30']
    );
    console.log(`✅ Driver: ${d.firstName} ${d.lastName}`);
  }

  // ── 4. Vehicles ─────────────────────────────────────────────────────────
  const vehicles = [
    {
      type: 'van',
      make: 'Mercedes-Benz',
      model: 'V-Class',
      year: 2024,
      color: 'Nero Ossidiana',
      plate: 'GH 451 RM',
      seats: 7,
      amenities: ['Wi-Fi', 'Aria condizionata', 'Prese USB', 'Acqua minerale'],
    },
    {
      type: 'sedan',
      make: 'Mercedes-Benz',
      model: 'Classe E',
      year: 2025,
      color: 'Grigio Selenite',
      plate: 'FL 892 RM',
      seats: 3,
      amenities: ['Wi-Fi', 'Aria condizionata', 'Prese USB', 'Sedili in pelle'],
    },
    {
      type: 'van',
      make: 'Mercedes-Benz',
      model: 'Sprinter Tourer',
      year: 2023,
      color: 'Bianco Artico',
      plate: 'KN 203 RM',
      seats: 8,
      amenities: ['Wi-Fi', 'Aria condizionata', 'Prese USB', 'Monitor', 'Bagagliera XL'],
    },
  ];
  const vehicleIds = [];
  for (const v of vehicles) {
    const id = uuid();
    vehicleIds.push(id);
    await sql(
      `INSERT INTO vehicles (id, company_id, vehicle_type, make, model, year, color, license_plate, seats_total, amenities)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, companyId, v.type, v.make, v.model, v.year, v.color, v.plate, v.seats, JSON.stringify(v.amenities)]
    );
    console.log(`✅ Vehicle: ${v.make} ${v.model} (${v.plate})`);
  }

  // ── 5. Trips ────────────────────────────────────────────────────────────
  // Realistic Italian NCC return trips
  const tripDefs = [
    // === OGGI (day 0) ===
    {
      day: 0, hour: 14, min: 30,
      origin: { address: 'Aeroporto di Fiumicino (FCO)', city: 'Fiumicino', lat: 41.7999, lng: 12.2462 },
      dest:   { address: 'Roma Termini', city: 'Roma', lat: 41.9013, lng: 12.5024 },
      vehicle: 0, driver: 0, seats: 5, price: 2500, notes: 'Rientro da transfer aeroportuale. Partenza dal Terminal 1.',
    },
    {
      day: 0, hour: 18, min: 0,
      origin: { address: 'EUR Palazzo dei Congressi', city: 'Roma', lat: 41.8356, lng: 12.4722 },
      dest:   { address: 'Stazione di Napoli Centrale', city: 'Napoli', lat: 40.8531, lng: 14.2681 },
      vehicle: 2, driver: 2, seats: 6, price: 3500, notes: 'Rientro dopo evento congressuale. Viaggio diretto A1.',
    },
    // === DOMANI (day 1) ===
    {
      day: 1, hour: 7, min: 0,
      origin: { address: 'Roma Termini', city: 'Roma', lat: 41.9013, lng: 12.5024 },
      dest:   { address: 'Aeroporto di Fiumicino (FCO)', city: 'Fiumicino', lat: 41.7999, lng: 12.2462 },
      vehicle: 1, driver: 0, seats: 2, price: 2000, notes: 'Transfer mattutino verso aeroporto.',
    },
    {
      day: 1, hour: 10, min: 30,
      origin: { address: 'Firenze, Piazza della Stazione', city: 'Firenze', lat: 43.7764, lng: 11.2479 },
      dest:   { address: 'Roma, Piazza del Popolo', city: 'Roma', lat: 41.9106, lng: 12.4764 },
      vehicle: 0, driver: 1, seats: 5, price: 4500, notes: 'Rientro da transfer Firenze. Autostrada A1 del Sole.',
    },
    {
      day: 1, hour: 16, min: 0,
      origin: { address: 'Napoli, Piazza Garibaldi', city: 'Napoli', lat: 40.8531, lng: 14.2681 },
      dest:   { address: 'Roma, Via Veneto', city: 'Roma', lat: 41.9071, lng: 12.4892 },
      vehicle: 2, driver: 2, seats: 7, price: 3000, notes: 'Rientro da Napoli verso Roma centro.',
    },
    // === DOPODOMANI (day 2) ===
    {
      day: 2, hour: 6, min: 30,
      origin: { address: 'Roma, Piazzale Flaminio', city: 'Roma', lat: 41.9137, lng: 12.4765 },
      dest:   { address: 'Aeroporto di Ciampino (CIA)', city: 'Ciampino', lat: 41.7994, lng: 12.5949 },
      vehicle: 1, driver: 0, seats: 3, price: 1800, notes: 'Transfer verso Ciampino per voli low-cost mattutini.',
    },
    {
      day: 2, hour: 9, min: 0,
      origin: { address: 'Civitavecchia, Porto Crociere', city: 'Civitavecchia', lat: 42.0936, lng: 11.7904 },
      dest:   { address: 'Roma, Piazza di Spagna', city: 'Roma', lat: 41.9060, lng: 12.4822 },
      vehicle: 0, driver: 1, seats: 6, price: 2800, notes: 'Rientro da transfer crocieristi al porto.',
    },
    {
      day: 2, hour: 15, min: 0,
      origin: { address: 'Caserta, Reggia di Caserta', city: 'Caserta', lat: 41.0725, lng: 14.3268 },
      dest:   { address: 'Roma, Piazza Venezia', city: 'Roma', lat: 41.8959, lng: 12.4826 },
      vehicle: 2, driver: 2, seats: 7, price: 3200, notes: 'Rientro da escursione alla Reggia.',
    },
    // === day 3 ===
    {
      day: 3, hour: 8, min: 0,
      origin: { address: 'Perugia, Piazza IV Novembre', city: 'Perugia', lat: 43.1107, lng: 12.3891 },
      dest:   { address: 'Roma, Stazione Tiburtina', city: 'Roma', lat: 41.9103, lng: 12.5305 },
      vehicle: 0, driver: 0, seats: 5, price: 3800, notes: 'Rientro da transfer Umbria.',
    },
    {
      day: 3, hour: 13, min: 0,
      origin: { address: "L'Aquila, Piazza Duomo", city: "L'Aquila", lat: 42.3508, lng: 13.3959 },
      dest:   { address: 'Roma, Piazza del Popolo', city: 'Roma', lat: 41.9106, lng: 12.4764 },
      vehicle: 1, driver: 1, seats: 3, price: 3500, notes: "Rientro da L'Aquila via A24.",
    },
    // === day 4 ===
    {
      day: 4, hour: 11, min: 0,
      origin: { address: 'Orvieto, Piazza del Duomo', city: 'Orvieto', lat: 42.7180, lng: 12.1122 },
      dest:   { address: 'Roma, Via del Corso', city: 'Roma', lat: 41.9029, lng: 12.4800 },
      vehicle: 0, driver: 1, seats: 5, price: 3000, notes: 'Rientro da escursione Orvieto.',
    },
    {
      day: 4, hour: 17, min: 30,
      origin: { address: 'Aeroporto di Fiumicino (FCO)', city: 'Fiumicino', lat: 41.7999, lng: 12.2462 },
      dest:   { address: 'Roma, Trastevere', city: 'Roma', lat: 41.8819, lng: 12.4700 },
      vehicle: 2, driver: 2, seats: 6, price: 2200, notes: 'Rientro serale da transfer aeroportuale.',
    },
  ];

  console.log('\n📍 Fetching routes from Mapbox...');

  for (let i = 0; i < tripDefs.length; i++) {
    const t = tripDefs[i];
    console.log(`  Route ${i + 1}/${tripDefs.length}: ${t.origin.city} → ${t.dest.city}...`);

    const route = await getRoute(t.origin.lng, t.origin.lat, t.dest.lng, t.dest.lat);
    const departureAt = futureDate(t.day, t.hour, t.min);
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
      [
        uuid(),
        companyId,
        driverIds[t.driver],
        vehicleIds[t.vehicle],
        t.origin.address, t.origin.lat, t.origin.lng, t.origin.city,
        t.dest.address, t.dest.lat, t.dest.lng, t.dest.city,
        JSON.stringify(route.geometry),
        route.distanceKm,
        route.durationMinutes,
        departureAt,
        arrivalAt,
        t.seats,
        t.price,
        t.notes,
      ]
    );
    console.log(`  ✅ ${t.origin.city} → ${t.dest.city} | ${route.distanceKm} km | ${route.durationMinutes} min | €${(t.price / 100).toFixed(2)}/posto`);
  }

  // ── 6. Passenger user (for testing bookings) ───────────────────────────
  const passengerId = uuid();
  const passengerHash = bcrypt.hashSync('Passeggero2026!', 12);
  await sql(
    `INSERT INTO users (id, email, password_hash, display_name, phone, user_type)
     VALUES ($1,$2,$3,$4,$5,'passenger')`,
    [passengerId, 'mario.rossi@gmail.com', passengerHash, 'Mario Rossi', '+39 340 5556789']
  );
  console.log('\n✅ Test passenger: mario.rossi@gmail.com / Passeggero2026!');

  console.log('\n🎉 Seed completo!');
  console.log('────────────────────────────────────────');
  console.log('OPERATORE NCC:');
  console.log('  Email:    luca@cozzancc.it');
  console.log('  Password: CozzaNcc2026!!');
  console.log('');
  console.log('PASSEGGERO TEST:');
  console.log('  Email:    mario.rossi@gmail.com');
  console.log('  Password: Passeggero2026!');
  console.log('────────────────────────────────────────');

  await pool.end();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  pool.end();
  process.exit(1);
});
