# ✈️ Viaggi · Around the World

Un diario personale per i tuoi viaggi, con spese, grafico per categoria, anni cronologici, cartina e backup.

## Cosa contiene questo ZIP

- `index.html`, `styles.css`, `app.js`: l'applicazione web completa, senza compilazione e senza pacchetti da installare.
- `assets/diary-background.png`: lo sfondo tratto dalla pagina finale del tuo PDF; `icon.svg`: l'icona dell'aereo e del globo.
- `data/viaggi-storici.js` e `.json`: **22 viaggi** ricavati dal PDF originale, con le categorie e i totali storici. Le note dei 16 TXT sono conservate nelle schede corrispondenti.
- `firebase-config.js`: luogo dove incollare i dati della tua app web di Firebase.
- `firestore.rules`: regole di sicurezza per tenere privati i tuoi dati di viaggio.
- `manifest.webmanifest`: consente di aggiungere l'app alla schermata Home del telefono.

## Guida passo per passo (GitHub Pages + Firebase)

### 1. GitHub: pubblicare l'app

1. Vai su https://github.com/ ed entra nel tuo account.
2. Premi **+ → New repository**, chiamalo `viaggi`, scegli **Public** e crea il repository (non spuntare “Add a README file”, dato che è già incluso).
3. Premi **Add file → Upload files** e carica **tutti i file e tutte le cartelle** estratti dallo ZIP, mantenendo la struttura. In alternativa usa GitHub Desktop o git per conservare facilmente le cartelle (e i file nascosti).
4. Premi **Commit changes**.
5. Vai in **Settings → Pages** e scegli **Deploy from a branch → main → /(root) → Save**.
6. Quando GitHub pubblica il sito, lo trovi all'indirizzo `https://TUO-USERNAME.github.io/viaggi/`.

> Attenzione: su GitHub Pages con repository pubblico, codice e archivio storico incluso nei file sono pubblicamente visibili. Se vuoi mantenere **privati** dati e codice, puoi usare un'altra soluzione di hosting. Le **nuove spese salvate in Firestore** non vengono inserite nel repository pubblico.

### 2. Firebase: account e database privato

1. Vai su https://console.firebase.google.com/ e seleziona **Create/Add project**. Chiamalo `viaggi-personali` o come preferisci.
2. Dentro il progetto, vai in **Build → Authentication → Get started → Sign-in method** e **abilita Google** come provider. Imposta l'email di supporto se richiesta.
3. Vai in **Build → Firestore Database → Create database**, scegli una regione e **Production mode** (le regole verranno impostate subito dopo).
4. Dentro Firestore vai nella scheda **Rules**, sostituisci il testo con il contenuto del file `firestore.rules` e premi **Publish**.
5. Torna in **Project overview → ⚙️ Project settings → Your apps**, crea una **Web app** (`</>`). Puoi darle il nome `Viaggi`.
6. Copia l'oggetto `firebaseConfig` mostrato da Firebase; apri `firebase-config.js` nel repository GitHub, premi l'icona matita e sostituisci `export const firebaseConfig = null;` con `export const firebaseConfig = { ... };` utilizzando **solo** i dati reali restituiti da Firebase. Poi salva (**Commit changes**).
7. Torna in **Authentication → Settings → Authorized domains**. Aggiungi `TUO-USERNAME.github.io`. Se userai anche Firebase Hosting, aggiungi anche il dominio effettivo se non è già autorizzato.
8. Apri il sito GitHub Pages e premi **Accedi con Google**. Ora le modifiche saranno salvate nei documenti privati del tuo account sotto `users/{uid}/trips`.
9. Al primo accesso Google vedrai l'archivio cloud vuoto: dalla **Home** clicca **Importa viaggi storici**. Questo pulsante copia i 22 viaggi dal file incluso al tuo Firestore personale **senza duplicare i record con lo stesso ID**.

### 3. Usare l'app

- Dalla Home scegli un anno e poi il viaggio, oppure premi **+ Nuovo viaggio**.
- Inserisci nome, date, luogo e tappe; salva, poi usa **+ Aggiungi spesa** per ogni importo.
- Le categorie e il grafico a ciambella si aggiornano automaticamente.
- La posizione del luogo nuovo è ricercata tramite OpenStreetMap Nominatim quando salvi il viaggio; se la ricerca non riesce puoi comunque salvare il viaggio, ma la mappa potrebbe restare generica. Le tappe già note hanno coordinate; quelle non note devono essere georeferenziate in una futura versione.
- Dalla Home puoi **Esporta backup JSON** e **Ripristina backup**. Fai backup regolarmente, specialmente in modalità locale.
- Per installarla su iPhone, apri il sito in Safari → Condividi → **Aggiungi alla schermata Home**.

## Importante: provenienza e verifica dati

I totali e gli importi **di riepilogo** provengono da *Around the World: Cost Diary*, non sono ricostruiti ripartendo da tutti i singoli pagamenti dei TXT, che a volte registrano importi condivisi o somme approssimate. I TXT completi sono preservati come **note originali non contabilizzate** nelle schede: questo evita di conteggiare due volte le medesime spese. Le righe categoriali sono modificabili e si possono aggiungere i singoli movimenti in futuro.

- Il PDF colloca **Ios nel 2023**, mentre `IOS 2022.txt` suggerisce il 2022.
- Il PDF colloca **Tenerife nel 2023**, mentre `TENERIFE 2021.txt` suggerisce il 2021.

Per non cambiare silenziosamente il riepilogo storico, l'app mantiene le date del PDF e segnala i due viaggi da verificare.

Le date, gli itinerari e i costi vengono mantenuti dalle fonti quando disponibili; alcuni punti mappa sono posizioni generali della destinazione e le linee tratteggiate **non** sono tracciati di strade o voli realmente effettuati.

## Sicurezza, privacy e connessione

- In modalità **Locale** i dati sono salvati sul singolo browser mediante `localStorage`; cancellando i dati del browser potresti perderli. Usa il backup JSON.
- In modalità **Cloud** devi accedere con Google e i dati vengono salvati in Firebase Firestore con regole basate sull'UID dell'utente.
- L'accesso Google con popup può essere bloccato da alcuni browser o impostazioni. Consenti i popup sul sito o prova Safari/Chrome.
- La configurazione Firebase contiene identificatori pubblici dell'app client, **non** una password amministrativa. Non mettere nel repository credenziali private, service account o chiavi server.
- Grafici, mappa e caratteri sono caricati da servizi CDN esterni; richiedono connessione. La PWA non garantisce funzionamento offline.
- L'app supporta backup/import e cancellazione. Non è un sistema bancario, non gestisce automaticamente conversioni valutarie e non calcola rimborsi tra persone.
