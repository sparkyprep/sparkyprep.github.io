# Sparky Prep

Capstone revision for NZ electrical pre-trade students: four-option quizzes for all 8 capstone
units, spaced review that brings back what you get wrong, a maths trainer with fresh numbers and
worked answers, a timed 40-question mock exam, badges, streaks and an opt-in class leaderboard.

No npm dependencies. Node's `http` module serves the site and a small JSON API.

## Run it locally

```
npm run dev      # http://localhost:8080, saves to .data/dev.json
npm test         # account API end-to-end tests
```

## How it's built

| Piece | Where |
| --- | --- |
| Server, API, security headers, rate limits | `server.js` |
| Users, sessions (scrypt passwords, hashed tokens), progress | `src/store.js` |
| Saving: Cloud Storage in production, a file locally | `src/persist.js` |
| Question bank, one file per unit | `public/data/u*.js` |
| Maths question generators | `public/js/maths.js` |
| App (routes, spaced repetition, sessions, XP) | `public/js/app.js` |
| Icons (custom SVG set) | `public/js/icons.js` |
| Design system | `public/css/app.css` |

### Adding questions

Each line in a unit file is `[question, [correct, wrong, wrong, wrong], explanation, topic]`.
The correct answer always goes first; options are shuffled on screen. **Only append** new questions
to the end of a file: ids are based on position, and inserting in the middle would mix up people's
saved review schedules. For a new unit, add it to `UNITS` in `public/js/qb.js` and a `<script>` tag
in `public/index.html`.

## Deploy to Google Cloud Run

Progress is saved as one JSON file in a Cloud Storage bucket, so run a single instance.

```
PROJECT=sparky-prep-nz           # pick a unique id
REGION=australia-southeast1
gcloud projects create $PROJECT
gcloud billing projects link $PROJECT --billing-account=XXXXXX-XXXXXX-XXXXXX
gcloud config set project $PROJECT
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com storage.googleapis.com
gcloud storage buckets create gs://$PROJECT-data --location=$REGION --uniform-bucket-level-access
PN=$(gcloud projects describe $PROJECT --format='value(projectNumber)')
gcloud storage buckets add-iam-policy-binding gs://$PROJECT-data \
  --member=serviceAccount:$PN-compute@developer.gserviceaccount.com --role=roles/storage.objectAdmin
gcloud run deploy sparky-prep --source . --region $REGION --allow-unauthenticated \
  --max-instances=1 --memory=256Mi --set-env-vars STORAGE_BUCKET=$PROJECT-data
```

Fonts: Plus Jakarta Sans and JetBrains Mono, both SIL Open Font License (see `public/fonts/`).
