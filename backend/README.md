AgroInOne Backend Server

This minimal Express server serves the static JSON files that the frontend used previously and proxies prediction requests to the ML server.

Run:

1. Install dependencies:

```
cd backend
npm install
```

2. Start the server:

```
npm start
```

By default the server runs on port 5000 and forwards prediction requests to the ML server at http://localhost:5001. Set ML_SERVER_URL to change that.
