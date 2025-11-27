# TSD GL Search Sandbox

This repository contains configuration files for setting up the Panoptes generic browser with a GL
testing dataset.

## Steps to run

### 1. Clone this repository and run docker

```bash
docker compose up -d
```

This will also seed the MongoDB with configuration optiosn for the panoptes back-end.

### 2. Fill ES with data

First install necessary dependencies:

```bash
uv sync
```

Then run the index script:
```bash
uv run index.py
```
Can take some time, as all full-text documets are also retrieved from the object store and indexed.
This has some duplications at the moment, as there are multiple documents referencing the same file url.

### 3. Run the front-end

Clone the front-end repository from https://github.com/knaw-huc/panoptes-react

In the repository run:

```bash
VITE_PANOPTES_URL="http://localhost:8000" npm run dev
```

Visit http://localhost:5173/search-sandbox. Could be that the port is different, check the npm output.