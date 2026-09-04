# IT Lease Hub — Zarządzanie i Inwentaryzacja Sprzętu IT

System do ewidencji sprzętu komputerowego, rozliczania umów leasingowych, kontroli faktur oraz obsługi wydań pracowniczych i transferów między oddziałami.

---

## Szybki start

Wymagania: [Node.js](https://nodejs.org/) (v18+). Baza danych MongoDB jest opcjonalna – jeśli nie jest uruchomiona, aplikacja automatycznie korzysta z lokalnego pliku JSON (`db.json`).

```bash
# 1. Klonowanie repozytorium
git clone https://github.com/kkamilll/Inventory.git
cd Inventory

# 2. Instalacja zależności
npm install

# 3. Wypełnienie bazy przykładowymi danymi
npm run seed

# 4. Uruchomienie aplikacji
npm run dev
```

Aplikacja dostępna jest pod adresem: **http://localhost:3000**

---

## Konta testowe

Po wykonaniu `npm run seed` dostępne są gotowe konta dla poszczególnych ról:

| Rola | Email | Hasło | Uprawnienia |
|---|---|---|---|
| **Administrator IT** | `admin@firma.pl` | `admin123` | Pełny dostęp do systemu, użytkowników i oddziałów |
| **Pracownik IT** | `it@firma.pl` | `it123456` | Ewidencja sprzętu, wydania, zwroty, transfery |
| **Księgowość** | `ksiegowosc@firma.pl` | `ksieg123` | Leasing, faktury, rozliczenia finansowe, kalkulator TCO |

---

## Główne funkcje

- **Zarządzanie sprzętem**: Laptopy, komputery stacjonarne, monitory; filtrowanie po oddziałach, statusie, wyszukiwanie na żywo, eksport raportu PDF.
- **Wydania i zwroty**: Przypisywanie sprzętu do pracowników z terminem zwrotu, weryfikacja stanu technicznego przy zwrocie.
- **Leasing i rozliczenia**: Porównywanie rat umownych z kwotami z faktur (wykrywanie rozbieżności), kalkulator TCO / rat leasingu, powiadomienia o kończących się umowach.
- **Obsługa wielu oddziałów**: Dynamiczne zarządzanie lokalizacjami firmy, oznaczanie centrali, transfery międzymiastowe ze statusem *w transporcie*.
- **Role i uprawnienia (RBAC)**: Dedykowane widoki i uprawnienia dla IT oraz Księgowości.
- **Baza danych bez konfiguracji**: Automatyczne przełączanie między MongoDB a lokalnym plikiem `db.json`.
- **Bezpieczeństwo**: Autoryzacja JWT, haszowanie haseł bcrypt, reset hasła kodem OTP.

---

## Przydatne komendy

| Komenda | Opis |
|---|---|
| `npm run dev` | Uruchomienie serwera z automatycznym przeładowaniem (nodemon) |
| `npm start` | Standardowe uruchomienie serwera |
| `npm run seed` | Zresetowanie bazy i wgranie danych demonstracyjnych |
| `npm run seed:clean` | Wyczyszczenie bazy (pozostawia tylko konto administratora) |

---

## Konfiguracja (`.env`)

Plik `.env` jest opcjonalny w trybie lokalnym – domyślne ustawienia działają od razu po instalacji:

- `PORT` – port serwera (domyślnie `3000`)
- `MONGO_URI` – adres MongoDB (opcjonalny, domyślnie lokalny plik JSON)
- `JWT_SECRET` – klucz do podpisywania tokenów logowania
- `SMTP_*` – opcjonalna konfiguracja skrzynki e-mail do wysyłki kodów resetu hasła (w trybie dev kody wypisywane są w konsoli)

---

## Struktura projektu

```text
├── models/          # Schematy bazy danych (Sprzęt, Wydania, Użytkownicy, Oddziały, Aktywności)
├── public/          # Panel użytkownika (HTML, CSS Dark Glassmorphism, JS)
├── db.js            # Warstwa danych (MongoDB + lokalny fallback JSON)
├── mailer.js        # Moduł wysyłki e-mail / symulator konsolowy
├── seed.js          # Skrypt zasilania bazy danymi testowymi
├── server.js        # Główny serwer Express i API REST
└── package.json     # Zależności i skrypty npm
```

---

## Licencja

Projekt udostępniany na licencji [MIT](LICENSE).
