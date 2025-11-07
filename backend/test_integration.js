const axios = require('axios');

async function run() {
  try {
    // register
    const reg = await axios.post('http://localhost:5000/api/auth/register', { name: 'Test', email: 'test@example.com', phone: '123', password: 'pass1234' });
    console.log('register ->', reg.data.user);

    // login
    const login = await axios.post('http://localhost:5000/api/auth/login', { email: 'test@example.com', password: 'pass1234' });
    console.log('login ->', login.data.user);
    const token = login.data.token;

    // call protected
    const me = await axios.get('http://localhost:5000/api/me', { headers: { Authorization: `Bearer ${token}` } });
    console.log('me ->', me.data);

    // predict via backend
    const pred = await axios.post('http://localhost:5000/api/predict/crop', { season: 'kharif' });
    console.log('predict ->', pred.data);
  } catch (err) {
    console.error('integration failed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

run();
