-- Reference data. endangers_citizens drives the "citoyens en danger secourus" stat:
-- a theft doesn't count, an attempted murder or a kidnapping does.
INSERT INTO "incident_types" ("code", "label", "endangers_citizens") VALUES
  ('THEFT', 'Vol', false),
  ('BURGLARY', 'Cambriolage', false),
  ('MURDER', 'Meurtre', true),
  ('ATTEMPTED_MURDER', 'Tentative de meurtre', true),
  ('TERROR_ATTACK', 'Attentat', true),
  ('HOSTAGE_TAKING', 'Prise d''otages', true),
  ('KIDNAPPING', 'Séquestration', true),
  ('ATTEMPTED_KIDNAPPING', 'Tentative de séquestration', true),
  ('OTHER', 'Autre', false);
