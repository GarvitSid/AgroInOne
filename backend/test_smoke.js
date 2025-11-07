const axios = require('axios');

async function run() {
  try {
    const ml = await axios.get('http://localhost:5001/health');
    console.log('ML /health ->', ml.data);

    const be = await axios.get('http://localhost:5000/api/health');
    console.log('Backend /api/health ->', be.data);

    const pred = await axios.post('http://localhost:5000/api/predict/crop', { season: 'kharif' }, { headers: { 'Content-Type': 'application/json' } });
    console.log('Predict crop ->', pred.data);
  } catch (err) {
    console.error('Smoke test failed:', err.message);
    if (err.response) console.error('Response:', err.response.data);
    process.exit(1);
  }
}

run();
