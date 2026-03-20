/**
 * Seed: "La Navetta" NCC — base Inverigo (CO), opera su aeroporti milanesi e medio-lunghe tratte Nord Italia
 *
 * Usage:  node scripts/seed-la-navetta.mjs
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

async function sql(text, params = []) {
  return (await pool.query(text, params)).rows;
}

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
  return {
    geometry: r.geometry,
    distanceKm: +(r.distance / 1000).toFixed(2),
    durationMinutes: Math.round(r.duration / 60),
  };
}

async function main() {
  console.log('🚐 Seeding "La Navetta" NCC — Inverigo (CO)\n');

  // ── Company ─────────────────────────────────────────────────────────────
  const companyId = uuid();
  await sql(
    `INSERT INTO companies (id, name, slug, vat_number, ncc_license_number, ncc_license_expiry,
       address, city, province, region, postal_code, phone, email, description, status, verified_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'verified',NOW())`,
    [
      companyId,
      'La Navetta',
      'la-navetta',
      'IT98765432109',
      'NCC-CO-2023-1187',
      '2027-09-30',
      'Via Roma 42',
      'Inverigo',
      'CO',
      'Lombardia',
      '22044',
      '+39 031 5559876',
      'info@lanavetta.it',
      'NCC premium con base a Inverigo (CO). Transfer aeroportuali Linate, Malpensa, Orio al Serio e viaggi Nord Italia.',
    ]
  );
  console.log('✅ Company: La Navetta');

  // ── Operator user ───────────────────────────────────────────────────────
  const operatorId = uuid();
  const pwHash = bcrypt.hashSync('LaNavetta2026!!', 12);
  await sql(
    `INSERT INTO users (id, email, password_hash, display_name, phone, user_type, company_id)
     VALUES ($1,$2,$3,$4,$5,'operator',$6)`,
    [operatorId, 'admin@lanavetta.it', pwHash, 'Admin La Navetta', '+39 031 5559876', companyId]
  );
  console.log('✅ Operator: admin@lanavetta.it / LaNavetta2026!!');

  // ── Drivers ─────────────────────────────────────────────────────────────
  const driverIds = [];
  const drivers = [
    { firstName: 'Cristian', lastName: 'Colombo', phone: '+39 345 8001001', license: 'CO2245671A' },
    { firstName: 'Giangi', lastName: 'Brambilla', phone: '+39 345 8001002', license: 'CO3398842B' },
  ];
  for (const d of drivers) {
    const id = uuid();
    driverIds.push(id);
    await sql(
      `INSERT INTO drivers (id, company_id, first_name, last_name, phone, license_number, license_expiry)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, companyId, d.firstName, d.lastName, d.phone, d.license, '2029-03-31']
    );
    console.log(`✅ Driver: ${d.firstName} ${d.lastName}`);
  }

  // ── Vehicles ────────────────────────────────────────────────────────────
  const vehicleIds = [];
  const vehicles = [
    {
      type: 'van', make: 'Mercedes-Benz', model: 'V-Class Extra Long',
      year: 2024, color: 'Nero Ossidiana', plate: 'FT 310 CO', seats: 7,
      amenities: ['Wi-Fi', 'Aria condizionata', 'Prese USB', 'Acqua', 'Giornali'],
    },
    {
      type: 'minibus', make: 'Mercedes-Benz', model: 'Sprinter 519 CDI',
      year: 2023, color: 'Grigio Tenorite', plate: 'GM 718 CO', seats: 8,
      amenities: ['Wi-Fi', 'Aria condizionata', 'Prese USB', 'Monitor', 'Bagagliera XL', 'Porta sci'],
    },
  ];
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

  // ── Locations ───────────────────────────────────────────────────────────
  const LOC = {
    inverigo:   { address: 'Via Roma 42, Inverigo',              city: 'Inverigo',      lat: 45.7350, lng: 9.2106 },
    linate:     { address: 'Aeroporto di Milano Linate (LIN)',   city: 'Milano',         lat: 45.4520, lng: 9.2783 },
    malpensa:   { address: 'Aeroporto di Malpensa (MXP)',        city: 'Ferno',          lat: 45.6286, lng: 8.7231 },
    orio:       { address: 'Aeroporto di Orio al Serio (BGY)',   city: 'Orio al Serio',  lat: 45.6685, lng: 9.7004 },
    milCentrale:{ address: 'Milano Centrale',                    city: 'Milano',         lat: 45.4861, lng: 9.2044 },
    como:       { address: 'Como, Piazza Cavour',                city: 'Como',           lat: 45.8107, lng: 9.0847 },
    lecco:      { address: 'Lecco, Piazza XX Settembre',         city: 'Lecco',          lat: 45.8566, lng: 9.3928 },
    bergamo:    { address: 'Bergamo, Piazza Vecchia',             city: 'Bergamo',        lat: 45.7037, lng: 9.6623 },
    genova:     { address: 'Genova, Piazza De Ferrari',           city: 'Genova',         lat: 44.4072, lng: 8.9345 },
    portofino:  { address: 'Santa Margherita Ligure, Porto',     city: 'Santa Margherita Ligure', lat: 44.3352, lng: 9.2107 },
    bormio:     { address: 'Bormio, Via Roma',                    city: 'Bormio',         lat: 46.4685, lng: 10.3709 },
    livigno:    { address: 'Livigno, Via Plan',                   city: 'Livigno',        lat: 46.5381, lng: 10.1357 },
    madesimo:   { address: 'Madesimo, Piazza Caduti',             city: 'Madesimo',       lat: 46.4302, lng: 9.3555 },
    stmoritz:   { address: 'Chiavenna, Piazza Pestalozzi',        city: 'Chiavenna',      lat: 46.3213, lng: 9.3988 },
    tirano:     { address: 'Tirano, Piazza Stazione',             city: 'Tirano',         lat: 46.2157, lng: 10.1698 },
  };

  // ── Trips ───────────────────────────────────────────────────────────────
  const tripDefs = [
    // === OGGI ===
    {
      day: 0, hour: 15, min: 0,
      origin: LOC.malpensa, dest: LOC.inverigo,
      vehicle: 0, driver: 0, seats: 5, price: 2800,
      notes: 'Rientro da transfer Malpensa. Disponibile fermate intermedie Saronno/Cantù.',
    },
    {
      day: 0, hour: 19, min: 30,
      origin: LOC.linate, dest: LOC.como,
      vehicle: 1, driver: 1, seats: 6, price: 3200,
      notes: 'Rientro da transfer Linate verso Como. Passaggio per Monza e Cantù.',
    },
    // === DOMANI ===
    {
      day: 1, hour: 5, min: 30,
      origin: LOC.inverigo, dest: LOC.malpensa,
      vehicle: 0, driver: 0, seats: 5, price: 2500,
      notes: 'Transfer mattutino verso Malpensa T1. Partenza puntualissima.',
    },
    {
      day: 1, hour: 9, min: 0,
      origin: LOC.malpensa, dest: LOC.bergamo,
      vehicle: 0, driver: 0, seats: 5, price: 3500,
      notes: 'Rientro da Malpensa verso Bergamo, passando da Inverigo.',
    },
    {
      day: 1, hour: 14, min: 0,
      origin: LOC.orio, dest: LOC.inverigo,
      vehicle: 1, driver: 1, seats: 7, price: 2200,
      notes: 'Rientro da Orio al Serio. Fermate a Bergamo e Lecco su richiesta.',
    },
    {
      day: 1, hour: 18, min: 0,
      origin: LOC.milCentrale, dest: LOC.lecco,
      vehicle: 0, driver: 0, seats: 5, price: 2800,
      notes: 'Rientro da Milano Centrale verso Lecco. Passaggio Monza, Inverigo.',
    },
    // === +2 GIORNI ===
    {
      day: 2, hour: 6, min: 0,
      origin: LOC.como, dest: LOC.linate,
      vehicle: 0, driver: 0, seats: 5, price: 3000,
      notes: 'Transfer mattutino Como → Linate. Pickup anche a Inverigo.',
    },
    {
      day: 2, hour: 10, min: 0,
      origin: LOC.linate, dest: LOC.inverigo,
      vehicle: 0, driver: 0, seats: 5, price: 2500,
      notes: 'Rientro base dopo transfer Linate.',
    },
    {
      day: 2, hour: 13, min: 0,
      origin: LOC.inverigo, dest: LOC.genova,
      vehicle: 1, driver: 1, seats: 7, price: 4500,
      notes: 'Transfer verso Genova via A7. Viaggio diretto, circa 2h.',
    },
    {
      day: 2, hour: 18, min: 30,
      origin: LOC.genova, dest: LOC.inverigo,
      vehicle: 1, driver: 1, seats: 7, price: 4500,
      notes: 'Rientro serale da Genova. Posti disponibili.',
    },
    // === +3 GIORNI ===
    {
      day: 3, hour: 7, min: 0,
      origin: LOC.inverigo, dest: LOC.bormio,
      vehicle: 1, driver: 1, seats: 7, price: 5500,
      notes: 'Transfer verso Bormio / Alta Valtellina. Porta sci disponibile. Fermata Tirano su richiesta.',
    },
    {
      day: 3, hour: 15, min: 0,
      origin: LOC.bormio, dest: LOC.inverigo,
      vehicle: 1, driver: 1, seats: 7, price: 5500,
      notes: 'Rientro da Bormio. Fermata a Tirano e Lecco.',
    },
    {
      day: 3, hour: 8, min: 30,
      origin: LOC.inverigo, dest: LOC.orio,
      vehicle: 0, driver: 0, seats: 5, price: 2000,
      notes: 'Transfer mattutino verso Orio al Serio.',
    },
    {
      day: 3, hour: 12, min: 0,
      origin: LOC.orio, dest: LOC.como,
      vehicle: 0, driver: 0, seats: 5, price: 2800,
      notes: 'Rientro da Orio verso Como/Inverigo.',
    },
    // === +4 GIORNI ===
    {
      day: 4, hour: 6, min: 30,
      origin: LOC.inverigo, dest: LOC.malpensa,
      vehicle: 0, driver: 0, seats: 5, price: 2500,
      notes: 'Transfer early morning Malpensa T2.',
    },
    {
      day: 4, hour: 10, min: 0,
      origin: LOC.malpensa, dest: LOC.como,
      vehicle: 0, driver: 0, seats: 5, price: 3000,
      notes: 'Rientro da Malpensa verso Como, passaggio Varese.',
    },
    {
      day: 4, hour: 9, min: 0,
      origin: LOC.inverigo, dest: LOC.portofino,
      vehicle: 1, driver: 1, seats: 7, price: 5000,
      notes: 'Transfer esclusivo verso Santa Margherita Ligure / Portofino. Viaggio panoramico.',
    },
    {
      day: 4, hour: 17, min: 0,
      origin: LOC.portofino, dest: LOC.inverigo,
      vehicle: 1, driver: 1, seats: 7, price: 5000,
      notes: 'Rientro serale dalla Riviera Ligure.',
    },
    // === +5 GIORNI ===
    {
      day: 5, hour: 7, min: 0,
      origin: LOC.inverigo, dest: LOC.livigno,
      vehicle: 1, driver: 1, seats: 7, price: 6000,
      notes: 'Transfer Livigno via Bormio. Porta sci e bagagliera XL. Viaggio lungo ma panoramico.',
    },
    {
      day: 5, hour: 16, min: 0,
      origin: LOC.livigno, dest: LOC.milCentrale,
      vehicle: 1, driver: 1, seats: 7, price: 6500,
      notes: 'Rientro da Livigno verso Milano Centrale. Fermate a Tirano, Lecco, Monza.',
    },
    {
      day: 5, hour: 5, min: 45,
      origin: LOC.lecco, dest: LOC.linate,
      vehicle: 0, driver: 0, seats: 5, price: 2800,
      notes: 'Transfer presto mattina Lecco → Linate.',
    },
    {
      day: 5, hour: 11, min: 0,
      origin: LOC.linate, dest: LOC.stmoritz,
      vehicle: 0, driver: 0, seats: 5, price: 4800,
      notes: 'Transfer Linate → Chiavenna (per St. Moritz). Passaggio Como e lago.',
    },
  ];

  console.log('\n📍 Fetching routes from Mapbox...');

  for (let i = 0; i < tripDefs.length; i++) {
    const t = tripDefs[i];
    process.stdout.write(`  ${i + 1}/${tripDefs.length} ${t.origin.city} → ${t.dest.city}...`);

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
        uuid(), companyId, driverIds[t.driver], vehicleIds[t.vehicle],
        t.origin.address, t.origin.lat, t.origin.lng, t.origin.city,
        t.dest.address, t.dest.lat, t.dest.lng, t.dest.city,
        JSON.stringify(route.geometry), route.distanceKm, route.durationMinutes,
        departureAt, arrivalAt, t.seats, t.price, t.notes,
      ]
    );
    console.log(` ✅ ${route.distanceKm} km | ${route.durationMinutes} min | €${(t.price / 100).toFixed(2)}/posto`);
  }

  console.log('\n🎉 Seed "La Navetta" completo!');
  console.log('────────────────────────────────────────');
  console.log('OPERATORE:');
  console.log('  Email:    admin@lanavetta.it');
  console.log('  Password: LaNavetta2026!!');
  console.log('────────────────────────────────────────');

  await pool.end();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  pool.end();
  process.exit(1);
});
