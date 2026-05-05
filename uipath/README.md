# DHL IRRS — UiPath RPA Bot

Automated incident ingestion bot for the DHL Incident Reporting & Resolution System. Polls a Google Drive watch folder, deduplicates by SHA-256 against the IRRS backend, creates incidents with file attached, advances them to `reviewed`, logs every action with a shared `run_id`, captures screenshots on error, and emails a summary after each run.

## Prerequisites

- **UiPath Studio Community Edition** — download from https://www.uipath.com/community (free, requires UiPath account)
- **Google Drive for Desktop** — https://www.google.com/drive/download/ — let it mount your Drive as a local drive letter (e.g. `G:`)
- **Gmail App Password** — required for summary email (see Setup step 3)
- **IRRS backend running on port 8000** — `cd irrs-backend && source venv/bin/activate && uvicorn main:app --reload --port 8000`

## Setup

1. **Install UiPath Studio Community Edition** and sign in with your UiPath account.

2. **Install Google Drive for Desktop**, sign in, and let it mount your Drive (e.g. `G:`).
   Create a watch folder: `G:\My Drive\irrs-watch` (or any path — you will set it in config.json).

3. **Generate a Gmail App Password**:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification if not already enabled
   - Under "2-Step Verification", click "App passwords"
   - Generate a new app password (Mail / Other — label it `IRRS-RPA`)
   - Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

4. **Copy the config template and fill in real values**:
   ```
   cp uipath/config.json.example uipath/config.json
   ```
   Edit `uipath/config.json`:
   - `watch_folder` — absolute path to your Drive watch folder, e.g. `G:\My Drive\irrs-watch`
   - `processed_folder` — absolute path to processed subfolder, e.g. `G:\My Drive\irrs-watch\processed`
   - `screenshots_folder` — absolute path to repo screenshots folder, e.g. `C:\Users\you\repo\uipath\rpa_screenshots`
   - `email_from`, `email_to` — your Gmail address
   - `email_app_password` — the App Password from step 3

   **Important:** `uipath/config.json` is gitignored and must NOT be committed (contains credentials).

5. **Copy demo files from `uipath/test_files/` into your watch folder**:
   ```
   copy uipath\test_files\parcel_damaged_2026.txt "G:\My Drive\irrs-watch\"
   copy uipath\test_files\missing_package_2026.txt "G:\My Drive\irrs-watch\"
   copy uipath\test_files\duplicate_test.txt "G:\My Drive\irrs-watch\"
   ```

6. **Start the IRRS backend**:
   ```
   cd irrs-backend
   source venv/bin/activate   # on Mac/Linux
   # or: venv\Scripts\activate  (on Windows)
   uvicorn main:app --reload --port 8000
   ```
   Confirm http://localhost:8000/docs loads.

## Running the bot

1. Open **UiPath Studio**
2. Click **Open** and navigate to `<repo>/uipath/` — Studio opens the project (reads `project.json`)
3. Open `Main.xaml` in the designer
4. Click **Run** (or press F5)

The bot reads `config.json` from the same folder as `Main.xaml` (`Environment.CurrentDirectory`). No arguments needed.

**Output panel** shows progress: auth login, per-file dedup check, incident creation, status advance, log posts, and final SMTP send.

## Demo script

### Run 1 — Happy path (3 created)

With the three demo files in the watch folder, run the bot. Expected outcome:
- 3 incidents created in IRRS web app (http://localhost:3000/incidents) with status `reviewed` and source `rpa`
- RPA Logs page (http://localhost:3000/logs) shows at least 9 entries sharing one `run_id` — actions: `create` x3, `status_update` x3, plus auth/init events
- Summary email arrives in Gmail: subject `DHL IRRS RPA Run Summary — <run_id>`, body shows `Created: 3 / Duplicates: 0 / Failed: 0`
- All three `.txt` files moved from watch folder into `processed/` subfolder

### Run 2 — Duplicate path (1 skip)

Copy `duplicate_test.txt` back from `processed/` into the watch folder, then run again. Expected outcome:
- No new incident created
- RPA Logs shows action `skip_duplicate`, status `skipped`
- Summary email body: `Created: 0 / Duplicates: 1 / Failed: 0`

### Run 3 — Error path (1 failure)

Place a malformed file in the watch folder (e.g. a zero-byte file):
- Windows: `type nul > "G:\My Drive\irrs-watch\bad.txt"`
- The bot will attempt to process `bad.txt`, hit an error, capture a screenshot

Expected outcome:
- A screenshot file appears in `uipath/rpa_screenshots/` with name pattern `<run_id>_bad.txt.png`
- RPA Logs shows action `error`, status `failed`, `screenshot_path` populated
- Bot did NOT abort — it continued and sent the summary email with `Failed: 1`
- Other files in the watch folder (if any) were still processed normally

## File field name reminder

When the bot sends multipart form-data to `POST /api/incidents`, the file attachment field name MUST be `files` (plural). The FastAPI endpoint declares `files: List[UploadFile] = File(...)` — using `file` (singular) as the field name will result in a 422 Unprocessable Entity error.

This is set in the HTTP Request activity body attachments section: field name = `files`.

## SHA-256 contract

The bot computes the content hash using:

```vb
Dim bytes As Byte() = System.Text.Encoding.UTF8.GetBytes(fileContent)
Dim hash As Byte() = System.Security.Cryptography.SHA256.Create().ComputeHash(bytes)
sha256_result = System.BitConverter.ToString(hash).Replace("-","").ToLower()
```

This matches `irrs-backend/utils/dedup.py` exactly:
```python
hashlib.sha256(content.encode("utf-8")).hexdigest()  # lowercase hex, no separators
```

Both produce a 64-character lowercase hex string. The hash is sent as `content_hash` in both the dedup check and the incident creation request.

## Architecture notes

- Token is fetched once at run start (POST /api/auth/login). JWT expiry is 8 hours — sufficient for a single demo run.
- The Try/Catch is INSIDE the For Each loop, one per file. A single file failure does not abort the run.
- All log POSTs include `Authorization: Bearer {token}` — the `rpa_bot` role is required by the `/api/logs` endpoint.
- `run_id` is a UUID generated at the start of each run — groups all log entries for that run in the IRRS Logs page.
