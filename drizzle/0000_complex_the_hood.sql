CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."company_status" AS ENUM('pending', 'verified', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."recurrence_type" AS ENUM('none', 'daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('scheduled', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('passenger', 'operator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('sedan', 'van', 'minibus');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"display_name" text NOT NULL,
	"phone" text,
	"avatar_url" text,
	"user_type" "user_type" DEFAULT 'passenger' NOT NULL,
	"company_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"vat_number" text,
	"fiscal_code" text,
	"ncc_license_number" text NOT NULL,
	"ncc_license_expiry" date,
	"address" text,
	"city" text,
	"province" text,
	"region" text,
	"postal_code" text,
	"phone" text,
	"email" text,
	"pec_email" text,
	"logo_url" text,
	"description" text,
	"status" "company_status" DEFAULT 'pending' NOT NULL,
	"rating_avg" numeric(3, 2) DEFAULT '0' NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"commission_rate" numeric(4, 2) DEFAULT '15.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"license_number" text NOT NULL,
	"license_expiry" date,
	"photo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"vehicle_type" "vehicle_type" NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer,
	"color" text,
	"license_plate" text NOT NULL,
	"seats_total" integer NOT NULL,
	"photo_url" text,
	"amenities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"driver_id" uuid,
	"vehicle_id" uuid NOT NULL,
	"origin_address" text NOT NULL,
	"origin_lat" numeric(10, 7) NOT NULL,
	"origin_lng" numeric(10, 7) NOT NULL,
	"origin_city" text NOT NULL,
	"destination_address" text NOT NULL,
	"destination_lat" numeric(10, 7) NOT NULL,
	"destination_lng" numeric(10, 7) NOT NULL,
	"destination_city" text NOT NULL,
	"route_geometry" jsonb NOT NULL,
	"route_distance_km" numeric(8, 2) NOT NULL,
	"route_duration_minutes" integer NOT NULL,
	"departure_at" timestamp with time zone NOT NULL,
	"estimated_arrival_at" timestamp with time zone NOT NULL,
	"seats_available" integer NOT NULL,
	"seats_booked" integer DEFAULT 0 NOT NULL,
	"price_per_seat" integer NOT NULL,
	"allows_intermediate_stops" boolean DEFAULT true NOT NULL,
	"notes" text,
	"status" "trip_status" DEFAULT 'scheduled' NOT NULL,
	"recurrence_type" "recurrence_type" DEFAULT 'none' NOT NULL,
	"recurrence_parent_id" uuid,
	"recurrence_end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trip_waypoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"lat" numeric(10, 7) NOT NULL,
	"lng" numeric(10, 7) NOT NULL,
	"route_fraction" numeric(5, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"passenger_id" uuid NOT NULL,
	"seats_count" integer DEFAULT 1 NOT NULL,
	"boarding_waypoint_id" uuid,
	"alighting_waypoint_id" uuid,
	"price_total" integer NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"passenger_notes" text,
	"operator_notes" text,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"driver_id" uuid,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_waypoints" ADD CONSTRAINT "trip_waypoints_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_passenger_id_users_id_fk" FOREIGN KEY ("passenger_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_boarding_waypoint_id_trip_waypoints_id_fk" FOREIGN KEY ("boarding_waypoint_id") REFERENCES "public"."trip_waypoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_alighting_waypoint_id_trip_waypoints_id_fk" FOREIGN KEY ("alighting_waypoint_id") REFERENCES "public"."trip_waypoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_company_id_idx" ON "users" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_slug_unique" ON "companies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "companies_vat_number_idx" ON "companies" USING btree ("vat_number");--> statement-breakpoint
CREATE INDEX "companies_status_idx" ON "companies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "companies_deleted_at_idx" ON "companies" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "drivers_company_id_idx" ON "drivers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "drivers_user_id_idx" ON "drivers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "drivers_deleted_at_idx" ON "drivers" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "vehicles_company_id_idx" ON "vehicles" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_license_plate_unique" ON "vehicles" USING btree ("license_plate");--> statement-breakpoint
CREATE INDEX "vehicles_deleted_at_idx" ON "vehicles" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "trips_company_id_idx" ON "trips" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "trips_driver_id_idx" ON "trips" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "trips_vehicle_id_idx" ON "trips" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "trips_departure_at_idx" ON "trips" USING btree ("departure_at");--> statement-breakpoint
CREATE INDEX "trips_status_idx" ON "trips" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trips_origin_city_idx" ON "trips" USING btree ("origin_city");--> statement-breakpoint
CREATE INDEX "trips_destination_city_idx" ON "trips" USING btree ("destination_city");--> statement-breakpoint
CREATE INDEX "trips_status_departure_idx" ON "trips" USING btree ("status","departure_at");--> statement-breakpoint
CREATE INDEX "trips_deleted_at_idx" ON "trips" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "trip_waypoints_trip_id_idx" ON "trip_waypoints" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "bookings_trip_id_idx" ON "bookings" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "bookings_passenger_id_idx" ON "bookings" USING btree ("passenger_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_deleted_at_idx" ON "bookings" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_booking_id_unique" ON "reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "reviews_company_id_idx" ON "reviews" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "reviews_driver_id_idx" ON "reviews" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "reviews_reviewer_id_idx" ON "reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications" USING btree ("user_id","read_at");