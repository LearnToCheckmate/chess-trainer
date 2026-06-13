# Telemetry relay — one-time setup

Goal: the app sends diagnostics + crash reports to a Cloud Function, which writes them into a GitHub repo that Claude reads on its own. No secret ever lives in the app.

You do this once. After it is live, you do nothing: reports flow to Claude automatically (and the in-app "Send Claude a diagnostics report" button also copies to your clipboard as a manual fallback right now, before any of this).

## 1. Make a telemetry repo (public)
Create a new GitHub repo named `chess-trainer-telemetry` under the LearnToCheckmate account. Public is fine (reports are technical only: viewport sizes, build number, error messages, no passwords or game content). Add one file `reports/log.json` containing exactly:

```
[]
```

## 2. Make a write token scoped to ONLY that repo
GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.
- Resource owner: LearnToCheckmate
- Repository access: Only select repositories → `chess-trainer-telemetry`
- Permissions → Repository permissions → Contents: Read and write (nothing else)
Copy the token (starts with `github_pat_`).

## 3. Add the function to your Firebase Functions project
Copy `logReport.js` from this folder into your functions source (e.g. paste its contents into `functions/index.js`, or `require` it). If your GitHub username is not `LearnToCheckmate`, edit the `TELEMETRY_REPO` line.

## 4. Store the token as a secret and deploy
From the functions project folder:

```
firebase functions:secrets:set GITHUB_TELEMETRY_TOKEN
# paste the token from step 2 when prompted

firebase deploy --only functions:logReport
```

## 5. Send Claude the URL
Deploy prints a URL like:
`https://logreport-xxxxxxxx-uc.a.run.app`  (or `https://us-central1-chess-trainer-d3664.cloudfunctions.net/logReport`)

Paste that URL to Claude. Claude sets `LOG_ENDPOINT` in the app and ships a one-line build. From then on, autonomous reporting is on.

## Test (optional)
```
curl -X POST -H "Content-Type: application/json" -d '{"kind":"test","note":"hello"}' <YOUR_FUNCTION_URL>
```
Then check `chess-trainer-telemetry/reports/log.json` has the entry.
