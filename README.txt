Road to Berlin — PWA

Cel: Berlin Half Marathon, 04.04.2027.
Aktualny plan: 12–18.10.2026 — regeneracja po półmaratonie w Krakowie.

Jak uruchomić:
1. Umieść cały folder na serwerze HTTPS (np. GitHub Pages, Netlify, Cloudflare Pages).
2. Otwórz index.html przez adres HTTPS w Chrome na Androidzie.
3. W menu Chrome wybierz „Dodaj do ekranu głównego” / „Zainstaluj aplikację”.
4. Po instalacji aplikacja działa także offline.

Ikona i nazwa na urządzeniu:
Manifest ustawia nazwę i nazwę skróconą „Road to Berlin”. Nowe ikony z biegaczem
i Bramą Brandenburską używają niemieckich kolorów: czarnego, czerwonego i złotego.
Mają rozmiary 192 × 192 i 512 × 512 oraz obsługują maski
ikon Androida. Wersjonowane nazwy plików pozwalają pobrać nowe grafiki.
Service worker odświeża manifest z sieci i zachowuje jego kopię do pracy offline.
Adres startowy i lokalny klucz hmDone są zachowane.

Aktualizacja planu:
Edytuj tylko plan.json i opublikuj ten plik pod dotychczasowym adresem.
Format: appName, goal (name, date, location), week (start, end, title, note)
oraz days — siedem kolejnych dni od week.start do week.end.
Każdy dzień ma d (RRRR-MM-DD), title, meta, tag oraz details (tekst).
Opcjonalne done (true/false) określa stan początkowy; lokalny zapis ma pierwszeństwo.
Daty muszą być poprawne, a wszystkie pola tekstowe niepuste.

Plan jest pobierany przy otwarciu, po odzyskaniu połączenia i po wybraniu
„Odśwież plan”. Service worker próbuje pobrać świeży plan z sieci, pomijając
cache HTTP. Bez sieci używa ostatniej poprawnej kopii, także po aktualizacji
aplikacji. Pierwsze otwarcie wymaga sieci.

Wykonanie zapisuje się w localStorage pod dotychczasowym kluczem hmDone,
według daty dnia. Aktualizacja planu nie usuwa starych oznaczeń.
Można oznaczać i cofać wykonanie także offline. Dane pozostają na urządzeniu
i w tej samej przeglądarce; wyczyszczenie danych witryny je usuwa.

Uwaga: pliki PWA otwarte bezpośrednio z pamięci telefonu (file://) nie mogą zarejestrować service workera,
więc instalacja jak normalnej aplikacji wymaga hostowania przez HTTPS.

