const assert = require('assert');
const axios = require('axios');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api';
const ML_URL = process.env.TEST_ML_URL || 'http://127.0.0.1:5001';

async function runTests() {
  console.log('🧪 Starting AgroInOne Baseline Automated Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Health Checks
  await test('Express API health check responds with 200 OK', async () => {
    const res = await axios.get(`${BASE_URL}/health`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert.strictEqual(res.data.service, 'backend');
  });

  await test('Flask ML health check responds with 200 OK', async () => {
    const res = await axios.get(`${ML_URL}/health`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
  });

  // 2. Data Endpoints
  await test('GET /api/schemes returns non-empty list of schemes', async () => {
    const res = await axios.get(`${BASE_URL}/schemes`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data), 'Expected array of schemes');
    assert.ok(res.data.length > 0, 'Expected at least 1 scheme');
    assert.ok(res.data[0].Scheme_Name, 'Scheme must have Scheme_Name');
  });

  await test('GET /api/schemes?state=punjab includes both Punjab and All India schemes', async () => {
    const res = await axios.get(`${BASE_URL}/schemes?state=punjab`);
    assert.strictEqual(res.status, 200);
    const hasPunjab = res.data.some(s => (s.State || '').toLowerCase() === 'punjab');
    const hasAllIndia = res.data.some(s => (s.State || '').toLowerCase() === 'all india');
    assert.ok(hasPunjab, 'Expected Punjab schemes');
    assert.ok(hasAllIndia, 'Expected All India schemes alongside state schemes');
  });

  await test('GET /api/helpdesk returns helpdesk articles with contacts', async () => {
    const res = await axios.get(`${BASE_URL}/helpdesk`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data), 'Expected array of helpdesk articles');
    assert.ok(res.data.length > 0, 'Expected at least 1 article');
    assert.ok(res.data[0].title, 'Article must have title');
  });

  // 3. ML Prediction Validation & Error Handling (L004 & L006)
  await test('GET /api/predict/options returns vocabulary arrays', async () => {
    const res = await axios.get(`${BASE_URL}/predict/options`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.state), 'Expected state array');
    assert.ok(Array.isArray(res.data.crop), 'Expected crop array');
    assert.ok(res.data.state.length > 0);
  });

  await test('POST /api/predict/crop with valid inputs calculates yield', async () => {
    const res = await axios.post(`${BASE_URL}/predict/crop`, {
      selected_state: 'Punjab',
      selected_district: 'Ludhiana',
      selected_crop: 'Wheat',
      crop_year: 2024,
      selected_season: 'Rabi',
      area: 100
    });
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.data.answer === 'number', 'Expected numeric yield answer');
    assert.ok(typeof res.data.production === 'number', 'Expected numeric production');
  });

  await test('POST /api/predict/crop with unknown crop rejects with 400 Bad Request (L004 fix)', async () => {
    try {
      await axios.post(`${BASE_URL}/predict/crop`, {
        selected_state: 'Punjab',
        selected_district: 'Ludhiana',
        selected_crop: 'NonExistentCrop123',
        crop_year: 2024,
        selected_season: 'Rabi',
        area: 100
      });
      assert.fail('Should have rejected unknown crop with 400');
    } catch (err) {
      assert.strictEqual(err.response?.status, 400);
      assert.ok(err.response.data?.error?.includes('Unsupported options') || err.response.data?.details?.includes('Unsupported options'));
    }
  });

  await test('POST /api/predict/crop with non-positive area rejects with 400 Bad Request (L006 fix)', async () => {
    try {
      await axios.post(`${BASE_URL}/predict/crop`, {
        selected_state: 'Punjab',
        selected_district: 'Ludhiana',
        selected_crop: 'Wheat',
        crop_year: 2024,
        selected_season: 'Rabi',
        area: 0
      });
      assert.fail('Should have rejected area <= 0 with 400');
    } catch (err) {
      assert.strictEqual(err.response?.status, 400);
    }
  });

  // 4. Authentication & Security (L001 & L002)
  const testEmail = `test_user_${Date.now()}@example.com`;

  await test('POST /api/auth/register creates new account and returns JWT', async () => {
    const res = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Automated Test User',
      email: testEmail,
      phone: '9876543210',
      password: 'testPassword123'
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.token, 'Expected JWT token');
    assert.strictEqual(res.data.user.email, testEmail);
  });

  await test('POST /api/auth/register with invalid email rejects with 400 Bad Request', async () => {
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Invalid Email User',
        email: 'invalid-email-format',
        password: 'ValidPassword123!'
      });
      assert.fail('Should have rejected invalid email format');
    } catch (err) {
      assert.strictEqual(err.response?.status, 400);
      assert.strictEqual(err.response.data?.error, 'Please enter a valid email address');
    }
  });

  await test('POST /api/auth/register with short password (<8 chars) rejects with 400 Bad Request', async () => {
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Short Password User',
        email: `short_pw_${Date.now()}@example.com`,
        password: 'short'
      });
      assert.fail('Should have rejected password under 8 characters');
    } catch (err) {
      assert.strictEqual(err.response?.status, 400);
      assert.strictEqual(err.response.data?.error, 'Password must be at least 8 characters long');
    }
  });

  await test('POST /api/auth/register with no number/special char password rejects with 400 Bad Request', async () => {
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Simple Password User',
        email: `simple_pw_${Date.now()}@example.com`,
        password: 'onlylettersnopunct'
      });
      assert.fail('Should have rejected password without numbers or special chars');
    } catch (err) {
      assert.strictEqual(err.response?.status, 400);
      assert.strictEqual(err.response.data?.error, 'Password must contain at least one number or special character');
    }
  });

  await test('POST /api/auth/register with duplicate email returns sanitized 409 Conflict (L002 fix)', async () => {
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Duplicate Test User',
        email: testEmail,
        phone: '9876543210',
        password: 'testPassword123'
      });
      assert.fail('Should have rejected duplicate email');
    } catch (err) {
      assert.strictEqual(err.response?.status, 409);
      assert.strictEqual(err.response.data?.error, 'An account with this email already exists.');
    }
  });

  await test('POST /api/auth/login with valid credentials succeeds and accesses protected /api/me', async () => {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail,
      password: 'testPassword123'
    });
    assert.strictEqual(loginRes.status, 200);
    const token = loginRes.data.token;
    assert.ok(token);

    const meRes = await axios.get(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data.user.email, testEmail);
  });

  // Summary
  console.log(`\n========================================`);
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
