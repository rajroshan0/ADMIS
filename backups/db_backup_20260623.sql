-- ============================================================
-- DATABASE BACKUP — admis / Supabase project mnscwajiozkqvxuhpuai
-- Generated: 2026-06-23
-- Tables: profiles, brands, campaigns, campaign_applications,
--         deals, conversations, messages, brand_members,
--         brand_tasks, task_messages, team_invites, analyst_reports
-- Excluded: creators (259,811 rows — seeded reference data)
-- ============================================================

-- ── ENUM TYPES ───────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE campaign_status   AS ENUM ('draft','open','paused','closed','filled');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('applied','shortlisted','accepted','rejected','success');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE deal_status AS ENUM ('draft','active','completed','cancelled');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── profiles ─────────────────────────────────────────────────
INSERT INTO public.profiles (id,role,display_name,avatar_url,created_at,updated_at,entity_type,onboarding_completed,verification_status,email) VALUES
('bcc5283f-377b-4d9a-a306-36928b97beb2','brand','testbrand@gmail.com',NULL,'2026-06-20T12:22:06.153382+00:00','2026-06-23T08:37:17.955076+00:00',NULL,true,'unverified','testbrand@gmail.com'),
('a27077da-762a-4f34-9c60-9e7b5670789e','agency','testagenttest1@gmail.com',NULL,'2026-06-20T12:09:05.056996+00:00','2026-06-23T08:37:17.955076+00:00','creator',true,'unverified','testagenttest1@gmail.com'),
('928cc280-515e-477f-a750-36bed74a5078','agency','agent@gmail.com',NULL,'2026-06-21T04:42:57.992256+00:00','2026-06-23T08:39:38.20624+00:00','creator',true,'unverified','agent@gmail.com'),
('1c51dcac-8ac6-47d3-a524-57bcd8a56221','creator','ts@gmail.com',NULL,'2026-06-23T09:21:08.373267+00:00','2026-06-23T09:21:15.095272+00:00','creator',true,'unverified','ts@gmail.com'),
('655e3b7d-a1ac-4311-ae67-5446b2761778','creator','creatortest1@gmail.com',NULL,'2026-06-23T09:22:31.634145+00:00','2026-06-23T09:31:57.445264+00:00','creator',true,'unverified','creatortest1@gmail.com'),
('a0a684de-4903-4908-83d1-e4eb649f5f75','member','testpayment',NULL,'2026-06-23T09:35:51.013402+00:00','2026-06-23T09:35:51.702066+00:00',NULL,true,'unverified','testpaymentdept@gmail.com'),
('358a959a-3c40-4762-bc1b-654ce246f7c2','member','teampayment',NULL,'2026-06-23T10:13:10.869171+00:00','2026-06-23T10:13:11.264358+00:00',NULL,true,'unverified','teampayment@gmail.com'),
('80bb9201-79c9-4080-825e-929a6e8a96dc','brand','alfa',NULL,'2026-06-20T12:41:50.943072+00:00','2026-06-23T17:04:09.661216+00:00','brand',true,'unverified','testbrand1@gmail.com'),
('2e100717-b938-4fec-a1f2-e2c90cececc7','creator','nepal',NULL,'2026-06-20T11:38:26.687996+00:00','2026-06-23T05:19:05.839642+00:00','creator',true,'verified','testyoutube@gmail.com'),
('abd20730-dd25-4677-b6d4-ec360e30c5d9','owner','rkp78925',NULL,'2026-06-19T14:48:46.494206+00:00','2026-06-23T05:19:05.839642+00:00','creator',true,'verified','rkp78925@gmail.com'),
('b6ddea36-804a-4eeb-9b15-ab2b3842b140','creator','testmail@gmail.com',NULL,'2026-06-20T10:48:23.674751+00:00','2026-06-23T05:19:05.839642+00:00','creator',true,'unverified','testmail@gmail.com'),
('a57f084f-4f07-4187-be7a-1c8404d9abd1','creator','testagency@gmail.com',NULL,'2026-06-20T10:53:55.03858+00:00','2026-06-23T05:19:05.839642+00:00','creator',true,'unverified','testagency@gmail.com'),
('917e8137-ab97-45c7-8bca-8d0ff7c08e95','creator','ritikyt@gmail.com',NULL,'2026-06-20T16:38:00.794319+00:00','2026-06-23T05:19:05.839642+00:00','creator',true,'verified','ritikyt@gmail.com'),
('e2831c06-6f1b-4fbd-83a9-a6cbb487f80d','member','afa',NULL,'2026-06-21T12:15:12.398087+00:00','2026-06-23T05:19:05.839642+00:00',NULL,true,'unverified','testmem@gmail.com'),
('73525066-8a27-4785-8d7d-551a56163a62','member','test',NULL,'2026-06-21T11:36:21.718528+00:00','2026-06-23T05:19:05.839642+00:00',NULL,true,'unverified','team@gmail.com'),
('a296a31b-63bc-4d7c-8b63-5bb427455266','member','sulusu',NULL,'2026-06-21T11:44:20.850897+00:00','2026-06-23T05:19:05.839642+00:00',NULL,true,'unverified','sululu@gmail.com'),
('88b07a5a-2cce-40a3-b189-cb249380b97b','creator','omrajadsmb@gmail.com',NULL,'2026-06-20T11:53:27.398248+00:00','2026-06-23T05:19:05.839642+00:00','creator',true,'verified','omrajadsmb@gmail.com'),
('98820303-cee7-4e54-af13-a5ad4335ce9e','member','xotu',NULL,'2026-06-21T17:04:07.755215+00:00','2026-06-23T05:19:05.839642+00:00',NULL,true,'unverified','xotu@gmail.com'),
('2cd94c72-af67-4593-a44a-613a458ce514','creator','xotu54@gmail.com',NULL,'2026-06-21T17:08:53.235722+00:00','2026-06-23T05:19:05.839642+00:00','creator',true,'unverified','xotu54@gmail.com'),
('74282237-cec9-4145-b9a9-d4cce3933d17','brand','g17996351',NULL,'2026-06-19T16:35:03.444072+00:00','2026-06-23T14:35:09.040642+00:00','brand',true,'unverified','g17996351@gmail.com'),
('9fdbd264-d459-4a32-8849-bd6632bfecf5','creator','as@gmail.com',NULL,'2026-06-23T15:11:16.370761+00:00','2026-06-23T15:11:18.109746+00:00','creator',true,'unverified','as@gmail.com'),
('a31c425c-3646-4541-bfd8-19e3db6f2480','creator','rkp7d89@gmail.com',NULL,'2026-06-20T10:46:02.468604+00:00','2026-06-23T15:13:16.85424+00:00',NULL,true,'unverified','rkp7d89@gmail.com'),
('d34d26ac-a76c-45e7-b9f5-089becaf26e8','creator','rkp789@gmail.com',NULL,'2026-06-20T08:39:07.270184+00:00','2026-06-23T15:13:16.85424+00:00',NULL,true,'unverified','rkp789@gmail.com'),
('f746e7dd-0a07-4719-9c0d-7e8941f1909e','creator','g179963531@gmail.com',NULL,'2026-06-20T06:10:13.799019+00:00','2026-06-23T15:13:16.85424+00:00',NULL,true,'unverified','g179963531@gmail.com'),
('15811295-40c0-4e45-83e8-16f2438020aa','creator','test11creator@gmail.com',NULL,'2026-06-23T16:34:53.738347+00:00','2026-06-23T16:34:54.955863+00:00','creator',true,'unverified','test11creator@gmail.com'),
('5dcc4110-b22d-4517-984e-d061ca7a795b','brand','brand',NULL,'2026-06-23T16:36:24.579865+00:00','2026-06-23T16:50:19.446839+00:00','brand',true,'unverified','testbrand11@gmail.com'),
('a0c176ff-d304-403c-92ca-e88fb0971a89','member','alf',NULL,'2026-06-23T16:59:47.357214+00:00','2026-06-23T16:59:47.682212+00:00',NULL,true,'unverified','alf@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- ── brands ───────────────────────────────────────────────────
INSERT INTO public.brands (id,owner_id,name,slug,logo_url,website,category_id,description,country,company_size,is_verified,rating,reviews_count,total_spent,created_at,updated_at,verification_status,budget_range,phone) VALUES
('1bb26b9d-802b-4229-9980-84975344d554','3509985d-598d-4c85-8e3d-90e6bbe29d49','Nexa Finance','nexa-finance',NULL,NULL,'0cba7c98-3313-45ff-a4bf-087140617054',NULL,'US',NULL,true,4.8,0,0,'2026-06-19T03:21:17.554017+00:00','2026-06-19T03:21:17.554017+00:00','unverified',NULL,NULL),
('3aa557d3-5c29-4d27-917d-489a763c86e3','3509985d-598d-4c85-8e3d-90e6bbe29d49','CoinVault','coinvault',NULL,NULL,'9c0ae246-2e71-4354-b028-47cdcecd1101',NULL,'EU',NULL,true,4.6,0,0,'2026-06-19T03:21:17.554017+00:00','2026-06-19T03:21:17.554017+00:00','unverified',NULL,NULL),
('a8a1ead7-f739-4b87-ad59-5a2073814251','3509985d-598d-4c85-8e3d-90e6bbe29d49','PixelPay','pixelpay',NULL,NULL,'4a7a1dc8-677e-4890-ab31-8e7ebeec64ae',NULL,'US',NULL,true,4.9,0,0,'2026-06-19T03:21:17.554017+00:00','2026-06-19T03:21:17.554017+00:00','unverified',NULL,NULL),
('038b394c-b66c-4588-8e80-e7b47bea2dc1','3509985d-598d-4c85-8e3d-90e6bbe29d49','VitalGreens','vitalgreens',NULL,NULL,'cabdf813-e4b7-4e32-890d-046903f8a317',NULL,'UK',NULL,true,5,0,0,'2026-06-19T03:21:17.554017+00:00','2026-06-19T03:21:17.554017+00:00','unverified',NULL,NULL),
('90bc1235-1625-4eda-b331-4499cb534e67',NULL,'NovaTech Labs','novatech-labs',NULL,NULL,'4a7a1dc8-677e-4890-ab31-8e7ebeec64ae','Cutting-edge consumer electronics and smart home devices.','United States','51-200',true,4.8,142,285000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('7c6ab8f5-644e-4b80-9a62-11907a9edf9f',NULL,'GlowUp Beauty','glowup-beauty',NULL,NULL,'0d3799e8-f044-42a1-aa9a-52729644c674','Clean beauty brand focused on sustainable skincare.','United Kingdom','11-50',true,4.6,89,130000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('0af40df3-8da8-4eea-9b98-2b6619634da5',NULL,'FitCore','fitcore',NULL,NULL,'cabdf813-e4b7-4e32-890d-046903f8a317','Premium fitness equipment and nutrition supplements.','United States','51-200',true,4.7,203,420000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('c5ce995b-80bb-4fde-82e2-283ffbc40ab7',NULL,'CryptoVault','cryptovault',NULL,NULL,'9c0ae246-2e71-4354-b028-47cdcecd1101','Secure crypto wallet and DeFi investment platform.','Singapore','11-50',true,4.5,67,98000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('7f8d874b-71c7-4c69-b070-53e7f98f71f5',NULL,'PixelArena','pixelarena',NULL,NULL,'b7311fa0-9f64-46e5-a8ef-a7bed9f9f1cc','Competitive gaming peripherals and accessories.','South Korea','201-500',true,4.9,315,620000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('3bc4faf3-c933-4d15-aafe-d3d5dc4fb633',NULL,'WealthPath','wealthpath',NULL,NULL,'0cba7c98-3313-45ff-a4bf-087140617054','Personal finance and investment coaching platform.','Canada','11-50',false,4.3,44,55000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('7d8ff328-2650-49cb-87de-876ee47761ac',NULL,'ZenMind','zenmind',NULL,NULL,'cabdf813-e4b7-4e32-890d-046903f8a317','Mental wellness and meditation app for busy professionals.','Australia','1-10',false,4.4,31,28000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('8366751c-ff50-47d6-b334-d6476925fba2',NULL,'ByteWear','bytewear',NULL,NULL,'0d3799e8-f044-42a1-aa9a-52729644c674','Tech-inspired streetwear and lifestyle clothing brand.','United States','11-50',true,4.6,78,110000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('407b95d4-c631-445f-8d32-329bc23dfb46',NULL,'AlphaStream','alphastream',NULL,NULL,'b7311fa0-9f64-46e5-a8ef-a7bed9f9f1cc','Game streaming tools and overlay software for content creators.','Germany','51-200',true,4.7,156,190000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('ee486dec-7c31-44e0-af84-20f09e591345',NULL,'HarvestEats','harvestEats',NULL,NULL,'0d3799e8-f044-42a1-aa9a-52729644c674','Farm-to-table meal kit delivery service.','United States','201-500',false,4.2,92,74000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('e44a51dd-ddbc-4243-8576-f172ce9b7bcd',NULL,'LunaFinance','lunafinance',NULL,NULL,'0cba7c98-3313-45ff-a4bf-087140617054','AI-powered budgeting and expense tracking app.','Netherlands','11-50',true,4.5,58,85000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('78229b96-b41b-4a12-897b-8ffc00f7b8f9',NULL,'StellarVPN','stellarvpn',NULL,NULL,'4a7a1dc8-677e-4890-ab31-8e7ebeec64ae','Privacy-first VPN and cybersecurity tools for consumers.','Switzerland','51-200',true,4.8,224,310000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('398e1554-6f5d-4b7e-8ca7-5f28da44bb0f',NULL,'ProGrip','progrip',NULL,NULL,'b7311fa0-9f64-46e5-a8ef-a7bed9f9f1cc','Esports controller accessories and gaming ergonomics.','Japan','11-50',false,4.4,39,47000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('eb2517a1-6f8c-4718-847c-cc88288979af',NULL,'ClearSkin Co.','clearskin-co',NULL,NULL,'0d3799e8-f044-42a1-aa9a-52729644c674','Dermatologist-backed acne treatment and skincare routines.','India','1-10',false,4.1,22,18000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('da57b529-27a7-4795-9874-c905ed8bf7ad',NULL,'TokenTrack','tokentrack',NULL,NULL,'9c0ae246-2e71-4354-b028-47cdcecd1101','Portfolio tracking and analytics for crypto investors.','United States','1-10',false,4.3,35,32000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('14c722fc-5063-4ddd-87a5-f3ef8027168e',NULL,'IronPulse','ironpulse',NULL,NULL,'cabdf813-e4b7-4e32-890d-046903f8a317','Performance gym wear and workout accessories.','Brazil','51-200',true,4.6,101,165000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('64b702af-036c-4a5a-9ad5-fc69112fb2ab',NULL,'CloudDesk','clouddesk',NULL,NULL,'4a7a1dc8-677e-4890-ab31-8e7ebeec64ae','Remote work productivity suite for teams.','United States','51-200',true,4.7,187,240000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('a1c77d81-a70c-4dc2-922c-644e9904665a',NULL,'SolarBites','solarbites',NULL,NULL,'cabdf813-e4b7-4e32-890d-046903f8a317','Plant-based protein snacks and energy bars.','United Kingdom','11-50',false,4.2,48,41000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('b0801c28-e64b-45f9-8506-06279a55e89b',NULL,'StackCoin','stackcoin',NULL,NULL,'9c0ae246-2e71-4354-b028-47cdcecd1101','Automated crypto savings and staking rewards platform.','Dubai','11-50',true,4.5,61,92000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('2b45fdc2-ac12-40cc-bb6c-6b7965cf0286',NULL,'VoxEdit','voxedit',NULL,NULL,'4a7a1dc8-677e-4890-ab31-8e7ebeec64ae','AI-powered video editing software for creators.','France','11-50',true,4.8,139,175000,'2026-06-19T21:18:11.793226+00:00','2026-06-19T21:18:11.793226+00:00','unverified',NULL,NULL),
('2a88595f-a8df-405c-a080-14975404875c','74282237-cec9-4145-b9a9-d4cce3933d17','raj','raj',NULL,NULL,NULL,NULL,NULL,'small',false,0,0,0,'2026-06-20T05:49:24.75229+00:00','2026-06-20T05:49:24.75229+00:00','unverified','<500','+9778732432311'),
('9a64fb55-dfc7-41f7-b1c9-e4dac2ba5fce','74282237-cec9-4145-b9a9-d4cce3933d17','raj','raj-87ae',NULL,NULL,NULL,NULL,NULL,'small',false,0,0,0,'2026-06-20T05:59:56.713723+00:00','2026-06-20T05:59:56.713723+00:00','unverified','<500','9284928492'),
('7139c7fb-652c-448a-879c-d3554b22c8f6','74282237-cec9-4145-b9a9-d4cce3933d17','raj','raj-67e1',NULL,NULL,NULL,NULL,NULL,'small',false,0,0,0,'2026-06-20T06:00:17.506916+00:00','2026-06-20T06:00:17.506916+00:00','unverified','<500','132424211'),
('185d41bd-0e56-4661-b812-bbdcb0740197','bcc5283f-377b-4d9a-a306-36928b97beb2','brand1','brand1-2d33',NULL,NULL,NULL,NULL,NULL,'Small (1–10)',false,0,0,0,'2026-06-20T12:22:08.073437+00:00','2026-06-20T12:22:08.073437+00:00','unverified','$500–$2K','+70288737492'),
('96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','test brand','test-brand-ef86',NULL,NULL,NULL,NULL,NULL,'Small (1–10)',false,0,0,0,'2026-06-20T12:41:52.617386+00:00','2026-06-20T12:41:52.617386+00:00','unverified','$500–$2K','123532'),
('34c4c518-5076-4c37-9f0c-a0906cbcbaeb','5dcc4110-b22d-4517-984e-d061ca7a795b','brand','brand-e33a',NULL,NULL,NULL,NULL,NULL,'Medium (11–50)',false,0,0,0,'2026-06-23T16:50:19.237654+00:00','2026-06-23T16:50:19.237654+00:00','unverified','$500–$2K',NULL)
ON CONFLICT (id) DO NOTHING;

-- ── brand_members ────────────────────────────────────────────
INSERT INTO public.brand_members (id,brand_id,user_id,role,invited_by,joined_at,department) VALUES
('388bb3ac-0145-47a9-bb3b-5aa526698582','2a88595f-a8df-405c-a080-14975404875c','74282237-cec9-4145-b9a9-d4cce3933d17','owner','74282237-cec9-4145-b9a9-d4cce3933d17','2026-06-20T05:49:25.066929+00:00',NULL),
('4b7f0892-1e9e-4f64-b164-e255d6fe21fb','9a64fb55-dfc7-41f7-b1c9-e4dac2ba5fce','74282237-cec9-4145-b9a9-d4cce3933d17','owner','74282237-cec9-4145-b9a9-d4cce3933d17','2026-06-20T05:59:56.989165+00:00',NULL),
('d8e1d1ca-de11-44fb-baa1-cd088a841142','7139c7fb-652c-448a-879c-d3554b22c8f6','74282237-cec9-4145-b9a9-d4cce3933d17','owner','74282237-cec9-4145-b9a9-d4cce3933d17','2026-06-20T06:00:17.759223+00:00',NULL),
('7ae4ebf2-3714-4dab-bfe4-8b93c6953057','185d41bd-0e56-4661-b812-bbdcb0740197','bcc5283f-377b-4d9a-a306-36928b97beb2','owner','bcc5283f-377b-4d9a-a306-36928b97beb2','2026-06-20T12:22:08.211734+00:00',NULL),
('7243109a-24e1-4612-8d07-9a4882fabf6f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','owner','80bb9201-79c9-4080-825e-929a6e8a96dc','2026-06-20T12:41:52.741818+00:00',NULL),
('6fb61423-9f2f-49e0-a2d0-d6b5dc1a60fa','96e26c5f-2aee-492f-840a-05a2fdb7742d','73525066-8a27-4785-8d7d-551a56163a62','member',NULL,'2026-06-21T11:36:22.233594+00:00','internal'),
('2ccd84f5-6f09-43b5-9634-4cb69564abb5','96e26c5f-2aee-492f-840a-05a2fdb7742d','a296a31b-63bc-4d7c-8b63-5bb427455266','member',NULL,'2026-06-21T11:44:21.119103+00:00','internal'),
('814c37b5-632c-4c6f-be6e-92928726c315','96e26c5f-2aee-492f-840a-05a2fdb7742d','e2831c06-6f1b-4fbd-83a9-a6cbb487f80d','member',NULL,'2026-06-21T12:15:13.000661+00:00','internal'),
('81053127-0c0d-4ec9-a92a-02f5c5c247c9','96e26c5f-2aee-492f-840a-05a2fdb7742d','98820303-cee7-4e54-af13-a5ad4335ce9e','manager',NULL,'2026-06-21T17:04:08.201271+00:00','promo'),
('159e0111-f8cc-4cf6-a008-b8a992ebe4be','96e26c5f-2aee-492f-840a-05a2fdb7742d','a0a684de-4903-4908-83d1-e4eb649f5f75','manager',NULL,'2026-06-23T09:35:51.702066+00:00','payment'),
('44c7a92d-38db-42b7-be11-ff152a010ab4','96e26c5f-2aee-492f-840a-05a2fdb7742d','358a959a-3c40-4762-bc1b-654ce246f7c2','member',NULL,'2026-06-23T10:13:11.264358+00:00','payment'),
('bbe942a0-2b23-4026-b399-f89a421c99d2','34c4c518-5076-4c37-9f0c-a0906cbcbaeb','5dcc4110-b22d-4517-984e-d061ca7a795b','owner','5dcc4110-b22d-4517-984e-d061ca7a795b','2026-06-23T16:50:19.357965+00:00',NULL),
('87d243cc-f9f6-4de4-a338-2e205dfc38cd','34c4c518-5076-4c37-9f0c-a0906cbcbaeb','a0c176ff-d304-403c-92ca-e88fb0971a89','member',NULL,'2026-06-23T16:59:47.682212+00:00','internal')
ON CONFLICT (id) DO NOTHING;

-- ── conversations ────────────────────────────────────────────
INSERT INTO public.conversations (id,brand_id,creator_id,last_msg_at,created_at,deal_id,application_id) VALUES
('62592987-29ab-4d82-b040-2b95f682c320','1bb26b9d-802b-4229-9980-84975344d554','11879d3d-086e-435f-baae-ea7fccd5cb82','2026-06-19T03:21:17.554017+00:00','2026-06-19T03:21:17.554017+00:00',NULL,NULL),
('87515df2-f2b5-483c-87d1-1b0c798b81c7','96e26c5f-2aee-492f-840a-05a2fdb7742d','f6123931-4b69-41f5-b8e5-0c633d7b499f','2026-06-21T07:12:41.478826+00:00','2026-06-21T07:12:41.478826+00:00',NULL,NULL),
('98a3f185-1bb2-414b-801e-58d0f1a1f35d','96e26c5f-2aee-492f-840a-05a2fdb7742d','02c3eb47-db2d-4e3a-8124-12d5dc7e101d','2026-06-22T04:52:32.746+00:00','2026-06-22T03:45:43.651448+00:00',NULL,NULL),
('d6d68247-c4a8-4dc9-aff7-1bdd8acebeb0','96e26c5f-2aee-492f-840a-05a2fdb7742d','59c9f9b1-4be3-4c85-9fb0-31f733d44c95','2026-06-23T09:57:15.272717+00:00','2026-06-23T09:57:15.272717+00:00',NULL,NULL),
('58aacde6-5d06-42a4-995b-d47d191da536','96e26c5f-2aee-492f-840a-05a2fdb7742d','b41272b0-3bbb-4817-badb-3a8e7bfd39a5','2026-06-23T17:10:33.426+00:00','2026-06-20T13:01:28.125928+00:00',NULL,NULL)
ON CONFLICT (id) DO NOTHING;

-- ── campaigns ────────────────────────────────────────────────
INSERT INTO public.campaigns (id,brand_id,title,deal_type,payout_model,payout_amount,commission_pct,bonus_note,currency,platforms,category_id,geo_target,min_followers,min_avg_views,min_engagement_rate,deadline,deliverables_spec,brief,slots,applicants_count,budget_total,status,created_at,updated_at) VALUES
('2a364118-347d-4270-88e6-2adccbfa1df7','1bb26b9d-802b-4229-9980-84975344d554','Sponsored finance explainer','paid_post','flat',800,NULL,NULL,'USD',ARRAY['youtube'],'0cba7c98-3313-45ff-a4bf-087140617054',ARRAY[]::text[],50000,20000,NULL,'2026-07-15',NULL,NULL,1,2,NULL,'open','2026-06-19T03:21:17.554017+00:00','2026-06-19T03:21:17.554017+00:00'),
('537770fd-de5f-48c3-8bb6-430104922f80','3aa557d3-5c29-4d27-917d-489a763c86e3','Crypto wallet affiliate','affiliate','commission',NULL,20,NULL,'USD',ARRAY['telegram'],'9c0ae246-2e71-4354-b028-47cdcecd1101',ARRAY[]::text[],30000,15000,NULL,'2026-07-10',NULL,NULL,1,2,NULL,'open','2026-06-19T03:21:17.554017+00:00','2026-06-19T03:21:17.554017+00:00'),
('b9f76520-9239-45d8-879a-6fb611cdc836','a8a1ead7-f739-4b87-ad59-5a2073814251','Product unboxing','gifting','product_cash',200,NULL,NULL,'USD',ARRAY['instagram'],'4a7a1dc8-677e-4890-ab31-8e7ebeec64ae',ARRAY[]::text[],20000,10000,NULL,'2026-07-05',NULL,NULL,1,1,NULL,'open','2026-06-19T03:21:17.554017+00:00','2026-06-19T03:21:17.554017+00:00'),
('46420eac-d8d6-4038-8d72-435dfed1ed99','038b394c-b66c-4588-8e80-e7b47bea2dc1','Wellness review video','paid_post','flat',1000,NULL,NULL,'USD',ARRAY['youtube'],'cabdf813-e4b7-4e32-890d-046903f8a317',ARRAY[]::text[],100000,60000,NULL,'2026-07-20',NULL,NULL,1,1,NULL,'open','2026-06-19T03:21:17.554017+00:00','2026-06-19T03:21:17.554017+00:00'),
('2b5b9201-4499-4baa-88ce-4fc7023c7543','90bc1235-1625-4eda-b331-4499cb534e67','Unboxing Reel — NovaTech Pro Tablet','gifting','product_cash',400,NULL,NULL,'USD',ARRAY['instagram','tiktok'],'4a7a1dc8-677e-4890-ab31-8e7ebeec64ae',ARRAY['United States'],5000,NULL,3,'2026-07-30',NULL,'Unbox and first impressions reel of our new Pro Tablet. Product gifted + $400 cash.',20,0,8000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('85c19868-884a-4e91-a1bb-96e6ba2e7ea5','90bc1235-1625-4eda-b331-4499cb534e67','Smart Home Product Launch — YouTube Review','paid_post','flat',800,NULL,NULL,'USD',ARRAY['youtube'],'4a7a1dc8-677e-4890-ab31-8e7ebeec64ae',ARRAY['United States','Canada'],10000,NULL,2,'2026-08-15',NULL,'Create a detailed review of our new smart speaker.',20,0,16000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('6f88abee-fc8b-49d2-a15d-0274858b2ee2','7c6ab8f5-644e-4b80-9a62-11907a9edf9f','TikTok GRWM — GlowUp Summer Collection','paid_post','flat',600,NULL,NULL,'USD',ARRAY['tiktok'],'0d3799e8-f044-42a1-aa9a-52729644c674',ARRAY['United Kingdom'],8000,NULL,4,'2026-07-20',NULL,'Create a GRWM TikTok featuring our summer collection.',20,0,12000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('c0d720a9-879c-447d-a851-2e7c2426bb2e','7c6ab8f5-644e-4b80-9a62-11907a9edf9f','Skincare Routine — 30-Day Challenge','ambassador','flat',1200,NULL,NULL,'USD',ARRAY['instagram'],'0d3799e8-f044-42a1-aa9a-52729644c674',ARRAY['United Kingdom','Australia'],15000,NULL,3.5,'2026-09-01',NULL,'Document a 30-day skincare journey using GlowUp products.',20,0,24000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('acb54f39-fe86-4046-a280-a68909168a5a','0af40df3-8da8-4eea-9b98-2b6619634da5','Protein Supplement TikTok Review','affiliate','commission',NULL,NULL,NULL,'USD',ARRAY['tiktok'],'cabdf813-e4b7-4e32-890d-046903f8a317',ARRAY['United States'],3000,NULL,5,'2026-07-25',NULL,'15% commission on all sales.',20,0,5000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('728d8bbc-24ba-4dfc-8dfe-48bc61c669c1','0af40df3-8da8-4eea-9b98-2b6619634da5','Home Workout Series — FitCore Equipment','ambassador','flat',2000,NULL,NULL,'USD',ARRAY['youtube','instagram'],'cabdf813-e4b7-4e32-890d-046903f8a317',ARRAY['United States','India'],25000,NULL,2.5,'2026-10-01',NULL,'Host a 4-week home workout series using FitCore equipment.',20,0,40000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('7c5163eb-3f02-4adf-95f0-ea4b253fc635','c5ce995b-80bb-4fde-82e2-283ffbc40ab7','CryptoVault Security Deep Dive — YouTube','paid_post','flat',1500,NULL,NULL,'USD',ARRAY['youtube'],'9c0ae246-2e71-4354-b028-47cdcecd1101',ARRAY['United States','Singapore'],20000,NULL,2,'2026-08-20',NULL,'Explain how CryptoVault keeps your assets safe.',10,0,15000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('5e1cc73f-77fb-4dd1-8d2d-4896a64f838d','7f8d874b-71c7-4c69-b070-53e7f98f71f5','Instagram Gaming Aesthetic Posts','paid_post','flat',500,NULL,NULL,'USD',ARRAY['instagram'],'b7311fa0-9f64-46e5-a8ef-a7bed9f9f1cc',ARRAY['Global'],5000,NULL,4.5,'2026-07-31',NULL,'Create 2 high-quality aesthetic gaming setup photos.',20,0,10000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('372ef4ef-f3ec-4647-ba53-37b3731fdd8f','7f8d874b-71c7-4c69-b070-53e7f98f71f5','Gaming Peripheral Setup Tour','gifting','product_cash',700,NULL,NULL,'USD',ARRAY['youtube','tiktok'],'b7311fa0-9f64-46e5-a8ef-a7bed9f9f1cc',ARRAY['South Korea','United States'],10000,NULL,3,'2026-08-10',NULL,'Showcase PixelArena peripherals in your gaming setup.',20,0,14000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('a74e6ac0-df34-491c-9ce0-7a04e495e8d3','3bc4faf3-c933-4d15-aafe-d3d5dc4fb633','Personal Finance Tips Series — Instagram','ambassador','flat',900,NULL,NULL,'USD',ARRAY['instagram'],'0cba7c98-3313-45ff-a4bf-087140617054',ARRAY['Canada','United States'],12000,NULL,3,'2026-09-15',NULL,'Share 3 personal finance tips per month using WealthPath methodology.',20,0,18000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('7d7a8f15-8855-4e15-b8b4-5b4e1800cf94','407b95d4-c631-445f-8d32-329bc23dfb46','Live Stream Overlay Showcase','paid_post','flat',1000,NULL,NULL,'USD',ARRAY['youtube'],'b7311fa0-9f64-46e5-a8ef-a7bed9f9f1cc',ARRAY['Germany','United States'],5000,NULL,2,'2026-08-05',NULL,'Feature AlphaStream overlays during a live session.',10,0,10000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('3c803003-4890-4c3e-80bc-980ffa93e72a','e44a51dd-ddbc-4243-8576-f172ce9b7bcd','Budgeting App Honest Review — YouTube','paid_post','flat',800,NULL,NULL,'USD',ARRAY['youtube'],'0cba7c98-3313-45ff-a4bf-087140617054',ARRAY['Global'],8000,NULL,2.5,'2026-08-25',NULL,'Walk through LunaFinance app features.',10,0,8000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('a9d255b8-3d24-4706-a47d-0532c6db33bb','78229b96-b41b-4a12-897b-8ffc00f7b8f9','VPN Security Campaign — Multi Platform','affiliate','commission',NULL,NULL,NULL,'USD',ARRAY['youtube','instagram'],'4a7a1dc8-677e-4890-ab31-8e7ebeec64ae',ARRAY['Global'],10000,NULL,3,'2026-09-30',NULL,'30% commission per signup.',20,0,20000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('c757a799-5fc5-4419-a8d1-81083d2b479b','eb2517a1-6f8c-4718-847c-cc88288979af','Skincare Before/After Journey — 8 Weeks','ambassador','flat',700,NULL,NULL,'USD',ARRAY['instagram','tiktok'],'0d3799e8-f044-42a1-aa9a-52729644c674',ARRAY['India'],3000,NULL,4,'2026-09-20',NULL,'Document your 8-week skin transformation.',10,0,7000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('3f274f45-8ab0-4393-834f-1ff81c8f33eb','da57b529-27a7-4795-9874-c905ed8bf7ad','Crypto Portfolio Tour — Instagram Stories','paid_post','flat',600,NULL,NULL,'USD',ARRAY['instagram'],'9c0ae246-2e71-4354-b028-47cdcecd1101',ARRAY['United States','Global'],5000,NULL,3.5,'2026-08-08',NULL,'Walk through crypto portfolio tracking setup using TokenTrack.',10,0,6000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('1712d9b3-3e0f-45b2-a322-bd482ab8a950','14c722fc-5063-4ddd-87a5-f3ef8027168e','Gym Wear Try-On Haul','gifting','product_cash',500,NULL,NULL,'USD',ARRAY['tiktok','instagram'],'cabdf813-e4b7-4e32-890d-046903f8a317',ARRAY['Brazil','United States'],5000,NULL,5,'2026-07-28',NULL,'Try-on haul of IronPulse gym collection.',20,0,10000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('3cb583dd-b734-4d83-a0c6-cae0050388e4','64b702af-036c-4a5a-9ad5-fc69112fb2ab','Remote Work Productivity Review','paid_post','flat',1200,NULL,NULL,'USD',ARRAY['youtube'],'4a7a1dc8-677e-4890-ab31-8e7ebeec64ae',ARRAY['United States','Europe'],8000,NULL,2,'2026-09-10',NULL,'Demonstrate CloudDesk workspace features.',10,0,12000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('2ef4b45c-7026-44b3-b3df-4aa9299ed5af','a1c77d81-a70c-4dc2-922c-644e9904665a','Healthy Snack Taste Test — TikTok','gifting','product_cash',300,NULL,NULL,'USD',ARRAY['tiktok'],'cabdf813-e4b7-4e32-890d-046903f8a317',ARRAY['United Kingdom'],3000,NULL,6,'2026-07-22',NULL,'Taste test SolarBites protein bars on camera.',20,0,6000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('ba219547-394f-4800-b58a-638e5c679915','b0801c28-e64b-45f9-8506-06279a55e89b','Crypto Staking Explained — YouTube Short','paid_post','flat',900,NULL,NULL,'USD',ARRAY['youtube'],'9c0ae246-2e71-4354-b028-47cdcecd1101',ARRAY['Global'],10000,NULL,2,'2026-08-18',NULL,'Create a short explainer on how staking works.',10,0,9000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('16483811-401e-49b5-a0c3-fa2e1fda9de9','2b45fdc2-ac12-40cc-bb6c-6b7965cf0286','AI Video Editing Tutorial — YouTube','ambassador','flat',1500,NULL,NULL,'USD',ARRAY['youtube'],'4a7a1dc8-677e-4890-ab31-8e7ebeec64ae',ARRAY['Global'],15000,NULL,2.5,'2026-10-15',NULL,'Create monthly VoxEdit workflow tutorials.',20,0,30000,'open','2026-06-19T21:19:38.698498+00:00','2026-06-19T21:19:38.698498+00:00'),
('9a1e9c6d-a8d4-44b4-ada1-a290bbe43631','96e26c5f-2aee-492f-840a-05a2fdb7742d','summer camp','paid_post','flat',100,NULL,NULL,'USD',ARRAY['youtube','instagram','tiktok'],NULL,ARRAY['Nepal'],5000,NULL,0,'2026-06-26',NULL,'natural int',100,0,10000,'open','2026-06-21T17:13:54.167007+00:00','2026-06-21T17:13:54.167007+00:00'),
('5b568030-bc07-4c00-a596-498f54279bb7','34c4c518-5076-4c37-9f0c-a0906cbcbaeb','alfa camp','gifting','flat',2221,NULL,NULL,'USD',ARRAY['youtube'],NULL,ARRAY['NP'],1999,NULL,1.1,'2026-07-02',NULL,'any creator can apply',12,0,10000,'open','2026-06-23T16:54:21.257291+00:00','2026-06-23T16:54:21.257291+00:00'),
('53dc621a-d082-44b2-a4c7-4a42bd9e8629','96e26c5f-2aee-492f-840a-05a2fdb7742d','T20 campaign','paid_post','flat',10,NULL,NULL,'USD',ARRAY['youtube','instagram'],NULL,ARRAY['Nepal'],5000,NULL,0.1,'2026-07-12',NULL,'Need natural integration - youtube reels.',15,0,15000,'open','2026-06-20T12:55:39.403084+00:00','2026-06-23T18:11:47.822714+00:00')
ON CONFLICT (id) DO NOTHING;

-- ── campaign_applications ────────────────────────────────────
INSERT INTO public.campaign_applications (id,campaign_id,creator_id,status,bid_amount,message,created_at,assigned_to,conversation_id) VALUES
('25b52c6d-828f-4614-819b-9497f143fb55','2a364118-347d-4270-88e6-2adccbfa1df7','1c657b70-eec5-418b-9ef3-ad5d5f6f1d72','applied',NULL,NULL,'2026-06-19T03:21:17.554017+00:00',NULL,NULL),
('81c4da70-fde8-4cec-a939-6b6b670d2552','2a364118-347d-4270-88e6-2adccbfa1df7','11879d3d-086e-435f-baae-ea7fccd5cb82','accepted',800,'Keen to collaborate','2026-06-19T03:21:17.554017+00:00',NULL,NULL),
('8ab07d24-ef3c-4696-b48a-fc7b8fef91b6','537770fd-de5f-48c3-8bb6-430104922f80','6e14fc0b-5fd2-4ae1-a5b8-068edd4795bf','rejected',NULL,NULL,'2026-06-19T03:21:17.554017+00:00',NULL,NULL),
('cf2f703e-0b7e-49d1-92f4-15266602f96b','537770fd-de5f-48c3-8bb6-430104922f80','02c3eb47-db2d-4e3a-8124-12d5dc7e101d','applied',NULL,'Interested in the affiliate deal','2026-06-19T03:21:17.554017+00:00',NULL,NULL),
('eb82f05d-735f-4aff-b4f9-562ea923a325','b9f76520-9239-45d8-879a-6fb611cdc836','7bd75e2b-adce-406e-9b42-fdcd0bbe6da2','shortlisted',NULL,'Love the product, count me in','2026-06-19T03:21:17.554017+00:00',NULL,NULL),
('008b4524-2274-4aa8-9e14-e3f2a8747ad0','46420eac-d8d6-4038-8d72-435dfed1ed99','ad41f630-243e-4d56-8645-9742c36aed98','applied',1000,'Strong health niche fit','2026-06-19T03:21:17.554017+00:00',NULL,NULL),
('ce9b58df-f197-4c4f-b9ed-01aaebf4aacc','16483811-401e-49b5-a0c3-fa2e1fda9de9','d30933a2-3ed5-4cf2-99e7-64441ca246c7','applied',131,'sdf ewrq wqerqw qrqwer qwer','2026-06-20T11:03:02.040503+00:00',NULL,NULL),
('ef19b62e-46bb-476c-a0e4-030f3c4559ee','1712d9b3-3e0f-45b2-a322-bd482ab8a950','4de78f85-cb17-40b7-b4bb-4333a69a7a78','applied',3,'i will domy besthelpme','2026-06-20T12:03:31.201465+00:00',NULL,NULL),
('6381264e-6bca-482a-aae5-d4f0890b8278','2ef4b45c-7026-44b3-b3df-4aa9299ed5af','b41272b0-3bbb-4817-badb-3a8e7bfd39a5','applied',500,'kjghkjh kjghkjh kjghkjh','2026-06-20T16:22:36.944431+00:00',NULL,NULL),
('5925b9d9-5f0f-4b0f-9c6c-2f486a5bc290','53dc621a-d082-44b2-a4c7-4a42bd9e8629','b41272b0-3bbb-4817-badb-3a8e7bfd39a5','accepted',15,'hkjnkjh','2026-06-20T13:04:28.15251+00:00','e2831c06-6f1b-4fbd-83a9-a6cbb487f80d',NULL),
('0ade2104-0447-4068-a892-85a802b283aa','53dc621a-d082-44b2-a4c7-4a42bd9e8629','59c9f9b1-4be3-4c85-9fb0-31f733d44c95','accepted',88,'hi i want work hi i want work','2026-06-20T16:41:35.844132+00:00',NULL,NULL),
('824fecbc-d5b9-4657-934a-ae35536aa1de','9a1e9c6d-a8d4-44b4-ada1-a290bbe43631','b41272b0-3bbb-4817-badb-3a8e7bfd39a5','accepted',150,'posr posr posr posr posr posr','2026-06-21T17:14:54.922726+00:00',NULL,NULL),
('3c01be44-87d6-43bf-ab98-352858254d3c','9a1e9c6d-a8d4-44b4-ada1-a290bbe43631','7b12ed8f-10c5-4e88-8f9f-1043d0af9013','accepted',222,'hel hel hel hel hel hel','2026-06-22T12:21:41.614399+00:00','a296a31b-63bc-4d7c-8b63-5bb427455266',NULL),
('56018000-ba0e-45b5-8d27-ccfc959962e3','5b568030-bc07-4c00-a596-498f54279bb7','b41272b0-3bbb-4817-badb-3a8e7bfd39a5','applied',332,'hi asldkfjaldfasdfdfadf','2026-06-23T16:56:37.79791+00:00','a0c176ff-d304-403c-92ca-e88fb0971a89',NULL),
('9abcfa87-7ef5-493a-a1af-5289dafbf2b6','5b568030-bc07-4c00-a596-498f54279bb7','60f46d81-a5a5-4e79-b2da-32496f948e25','applied',232,'hello sir, i wnat to work','2026-06-23T17:02:30.946225+00:00',NULL,NULL),
('e0b76dcc-540e-4fc0-ad93-07bfcc1a1437','9a1e9c6d-a8d4-44b4-ada1-a290bbe43631','8b662fd7-27de-4eba-b111-e6ec8610a16e','shortlisted',76,'this is my current pitch .','2026-06-23T09:33:12.15324+00:00',NULL,NULL)
ON CONFLICT (id) DO NOTHING;

-- ── deals ────────────────────────────────────────────────────
INSERT INTO public.deals (id,application_id,campaign_id,brand_id,creator_id,price,currency,status,deadline,created_at,updated_at,channel,delivery_type,deliverables_count,conditions,contact_name,contact_role,contact_value,assigned_to,channel_link,promo_code,payment_status,final_price,payment_details) VALUES
('3d1c34f8-1254-41fa-becf-f7c641264243','81c4da70-fde8-4cec-a939-6b6b670d2552','2a364118-347d-4270-88e6-2adccbfa1df7','1bb26b9d-802b-4229-9980-84975344d554','11879d3d-086e-435f-baae-ea7fccd5cb82',800,'USD','completed','2026-07-15','2026-06-19T03:21:17.554017+00:00','2026-06-22T06:07:51.25028+00:00',NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
('8a774596-0689-4707-8b85-f4c4aea46a8e','0ade2104-0447-4068-a892-85a802b283aa','53dc621a-d082-44b2-a4c7-4a42bd9e8629','96e26c5f-2aee-492f-840a-05a2fdb7742d','59c9f9b1-4be3-4c85-9fb0-31f733d44c95',88,'USD','active',NULL,'2026-06-22T05:01:55.647613+00:00','2026-06-22T06:07:51.25028+00:00',NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,88,NULL),
('53c7615c-d381-43cc-a40d-8043a1897b0b','824fecbc-d5b9-4657-934a-ae35536aa1de','9a1e9c6d-a8d4-44b4-ada1-a290bbe43631','96e26c5f-2aee-492f-840a-05a2fdb7742d','b41272b0-3bbb-4817-badb-3a8e7bfd39a5',150,'USD','active',NULL,'2026-06-22T05:01:55.647613+00:00','2026-06-22T06:07:51.25028+00:00',NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,150,NULL),
('bb93a146-e526-444b-a24d-709479fcd40b','5925b9d9-5f0f-4b0f-9c6c-2f486a5bc290','53dc621a-d082-44b2-a4c7-4a42bd9e8629','96e26c5f-2aee-492f-840a-05a2fdb7742d','b41272b0-3bbb-4817-badb-3a8e7bfd39a5',15,'USD','completed',NULL,'2026-06-22T05:01:55.647613+00:00','2026-06-22T06:07:51.25028+00:00',NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'Creatro10',NULL,15,NULL),
('41f63068-899f-4b82-90c4-2baaefba0cff','3c01be44-87d6-43bf-ab98-352858254d3c','9a1e9c6d-a8d4-44b4-ada1-a290bbe43631','96e26c5f-2aee-492f-840a-05a2fdb7742d','7b12ed8f-10c5-4e88-8f9f-1043d0af9013',222,'USD','active',NULL,'2026-06-23T07:10:28.700595+00:00','2026-06-23T18:12:03.569204+00:00',NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'a0a684de-4903-4908-83d1-e4eb649f5f75',222,NULL)
ON CONFLICT (id) DO NOTHING;

-- ── brand_tasks ──────────────────────────────────────────────
INSERT INTO public.brand_tasks (id,brand_id,assigned_to,created_by,title,description,department,status,priority,due_date,created_at,updated_at) VALUES
('29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc',NULL,'make aff link from row 1 to row 30',NULL,'affiliate','done','high','2026-06-25','2026-06-23T04:15:07.403407+00:00','2026-06-23T04:15:07.403407+00:00'),
('127cca41-b6c4-4273-9354-d5c473ff5fea','34c4c518-5076-4c37-9f0c-a0906cbcbaeb','a0c176ff-d304-403c-92ca-e88fb0971a89','5dcc4110-b22d-4517-984e-d061ca7a795b','test 1',NULL,'internal','todo','normal','2026-07-03','2026-06-23T17:01:26.508761+00:00','2026-06-23T17:01:26.508761+00:00')
ON CONFLICT (id) DO NOTHING;

-- ── task_messages ────────────────────────────────────────────
INSERT INTO public.task_messages (id,task_id,brand_id,sender_id,content,created_at) VALUES
('106b0417-1ad0-4afe-8171-f7c3387fdcc9','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','hi','2026-06-23T05:13:52.716761+00:00'),
('4796528f-b09b-4d4b-9820-5b61b50b7bea','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','hlo','2026-06-23T05:14:15.984793+00:00'),
('07ceafe5-986e-4824-8193-4c6a1a7a79fe','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','kkk','2026-06-23T05:14:21.836424+00:00'),
('c60ceecd-9950-497d-b2cb-d0f5eaa2f91f','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','__status__:in_progress','2026-06-23T05:29:47.419499+00:00'),
('2cd04a23-e7ab-43f7-84a5-6bec53627a74','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','__status__:review','2026-06-23T05:29:50.573282+00:00'),
('b15da097-4203-4415-8b05-2b80da4ac632','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','__status__:done','2026-06-23T05:29:53.038983+00:00'),
('3e55ca8a-035f-401c-98ec-7e294c56c342','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','__status__:todo','2026-06-23T05:29:54.980012+00:00'),
('4e801d69-28a6-42eb-ba9d-1ab947bf4898','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','__status__:in_progress','2026-06-23T05:29:55.539294+00:00'),
('9614ef1e-b32c-461f-a92c-b936be9ff2e9','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','__status__:review','2026-06-23T05:29:56.271629+00:00'),
('827a634e-c73a-48d2-92e5-410eb3c449ba','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','hi','2026-06-23T10:12:48.64336+00:00'),
('231b7ea5-8df2-4294-a23c-c4b10a81d7e8','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','a0a684de-4903-4908-83d1-e4eb649f5f75','I need more detail on it.','2026-06-23T10:19:02.016778+00:00'),
('015e973b-9dcc-4b99-9823-eb3ad4782ce8','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','ok','2026-06-23T10:19:07.72258+00:00'),
('1241a84b-2f84-45fd-9399-d39edf8e1bdf','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','a0a684de-4903-4908-83d1-e4eb649f5f75','__status__:done','2026-06-23T10:19:24.452282+00:00'),
('5b612d67-7510-44d7-8cf5-bc31a5aa65d9','127cca41-b6c4-4273-9354-d5c473ff5fea','34c4c518-5076-4c37-9f0c-a0906cbcbaeb','5dcc4110-b22d-4517-984e-d061ca7a795b','final this today okey','2026-06-23T17:01:36.319807+00:00'),
('521f7036-4176-46dc-b087-847b37e3be27','29418510-8981-4f4d-b8c3-ee98d67b113f','96e26c5f-2aee-492f-840a-05a2fdb7742d','80bb9201-79c9-4080-825e-929a6e8a96dc','is it done?','2026-06-23T17:11:52.800577+00:00')
ON CONFLICT (id) DO NOTHING;

-- ── analyst_reports ──────────────────────────────────────────
INSERT INTO public.analyst_reports (id,deal_id,channel_analysis_id,brand_id,creator_id,analyst_id,channel_name,channel_url,platform,geo,deliveries,creator_price,creator_contact,score,approved,counter_price,notes,created_at,updated_at) VALUES
('3c3902b6-3fcd-477b-baa8-6e316168e80a','8a774596-0689-4707-8b85-f4c4aea46a8e',NULL,'96e26c5f-2aee-492f-840a-05a2fdb7742d','59c9f9b1-4be3-4c85-9fb0-31f733d44c95','80bb9201-79c9-4080-825e-929a6e8a96dc','Hritik Raj','https://youtube.com/@hritikraj1725','youtube','NP',ARRAY['Video','Short','Reel'],88,'no contct',22,false,NULL,NULL,'2026-06-22T07:07:33.058521+00:00','2026-06-22T07:07:32.955+00:00')
ON CONFLICT (id) DO NOTHING;

-- ── END OF BACKUP ─────────────────────────────────────────────
-- NOTE: messages (36 rows), notifications (32 rows), content_submissions (2 rows),
--       and team_invites (12 rows) were not included due to query rejection.
--       Re-export those individually if needed.
-- NOTE: creators table (259,811 rows) excluded — seeded reference data.
