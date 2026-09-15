# Indian Lunch Order

Responsive GitHub-Pages-App mit zentralem Supabase-Backend. Teilnehmer benötigen nur Link, Bestellcode und Namen. Der Manager-Bereich verwendet Supabase Auth plus eine Datenbankrolle.

## Schnellstart
1. Supabase-Projekt erstellen.
2. Im SQL Editor zuerst `supabase/schema.sql`, danach `supabase/seed.sql` ausführen.
3. In Supabase Authentication einen Manager-Benutzer anlegen.
4. Dessen UUID mit dem am Ende von `seed.sql` gezeigten Insert als `manager` in `profiles` eintragen.
5. `js/config.js` mit Project URL und **Publishable/Anon Key** befüllen. Niemals den `service_role`-Key eintragen.
6. Inhalt dieses Ordners in ein GitHub-Repository hochladen.
7. In GitHub unter **Settings → Pages** die Veröffentlichung aus dem Branch `main` und Ordner `/root` aktivieren.
8. Den Pages-Link und den aktuellen Bestellcode teilen.

## Sicherheitsmodell
- Der Bestellcode öffnet nur eine aktive, noch nicht abgelaufene Runde.
- Öffentliche Teilnehmer schreiben nicht direkt in Tabellen, sondern über `submit_lunch_order`.
- Preise werden serverseitig aus `menu_items` übernommen.
- Manager-Tabellenzugriffe werden per RLS und `profiles.role` geschützt.
- Der öffentliche Anon-/Publishable-Key darf im Browser stehen. Sicherheit entsteht durch Grants, RLS und RPC-Regeln.
- `service_role` ist geheim und darf nie in GitHub oder Browsercode stehen.
- Die Bearbeitungs-ID wird lokal gespeichert, aber Bestellungen liegen zentral. Bearbeiten/Stornieren per Bearbeitungs-ID ist als nächste Ausbaustufe vorgesehen.

## GitHub Pages
Die App verwendet relative Pfade und funktioniert daher auch unter `https://ACCOUNT.github.io/REPOSITORY/`. `404.html` ist für direkte Einstiege vorhanden.

## Interne Alternative
Wenn externe SaaS-Dienste oder öffentliche GitHub Pages im Unternehmen nicht freigegeben sind, kann dieselbe Oberfläche gegen ein internes REST-Backend betrieben werden. Geeignete interne Plattform, Identitätsanbieter, Hostingzone, Datenschutzfreigabe und Betriebsverantwortung müssen durch eure IT festgelegt werden. Die aktuelle Version implementiert ausschließlich Supabase.

## Grenzen dieser Version
- OCR und Menü-Upload sind nicht enthalten; die Karte wird per SQL gepflegt.
- Teilnehmer können eine abgesendete Bestellung noch nicht über die Bearbeitungs-ID ändern.
- Bestellcode ist Zugangsschutz, aber keine persönliche Authentifizierung.
- Vor produktiver Nutzung: Datenschutz, Aufbewahrung, Rate Limiting/CAPTCHA, Backup und Security Review klären.
