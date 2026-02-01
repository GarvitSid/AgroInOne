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

  await test('POST /api/predict/crop with 11-parameter payload executes two-stage pipeline and returns dual advisory', async () => {
    const res = await axios.post(`${BASE_URL}/predict/crop`, {
      N: 90,
      P: 42,
      K: 43,
      temperature: 20.88,
      humidity: 82.0,
      ph: 6.5,
      rainfall: 202.94,
      selected_state: 'Punjab',
      selected_district: 'Ludhiana',
      selected_season: 'Kharif',
      crop_year: 2020,
      area: 10
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.recommended_crop, 'Rice');
    assert.ok(typeof res.data.yield_tonnes_per_hectare === 'number', 'Expected numeric yield_tonnes_per_hectare');
    assert.ok(res.data.yield_tonnes_per_hectare > 0, 'Expected positive yield');
    assert.ok(typeof res.data.production_tonnes === 'number', 'Expected numeric production_tonnes');
    assert.ok(typeof res.data.confidence === 'number' && res.data.confidence > 0, 'Expected positive confidence score');
    assert.strictEqual(res.data.answer, res.data.yield_tonnes_per_hectare, 'Expected answer backward compatibility');
    assert.strictEqual(res.data.production, res.data.production_tonnes, 'Expected production backward compatibility');
    assert.strictEqual(res.data.input_metrics.N, 90);
    assert.strictEqual(res.data.input_metrics.state, 'Punjab');
  });

  await test('POST /api/predict/recommend returns crop recommendation with confidence', async () => {
    const res = await axios.post(`${BASE_URL}/predict/recommend`, {
      N: 40,
      P: 60,
      K: 80,
      temperature: 18.0,
      humidity: 16.0,
      ph: 7.2,
      rainfall: 75.0
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.recommended_crop, 'Chickpea');
    assert.ok(typeof res.data.confidence === 'number' && res.data.confidence > 0.8);
  });

  await test('POST /api/predict/crop with out-of-bounds pH rejects with 400 Bad Request', async () => {
    try {
      await axios.post(`${BASE_URL}/predict/crop`, {
        N: 90,
        P: 42,
        K: 43,
        temperature: 20.88,
        humidity: 82.0,
        ph: 16.0,
        rainfall: 200,
        selected_state: 'Punjab',
        selected_district: 'Ludhiana',
        selected_season: 'Kharif',
        area: 10
      });
      assert.fail('Should have rejected pH > 14 with 400');
    } catch (err) {
      assert.strictEqual(err.response?.status, 400);
      assert.ok(err.response.data?.error?.includes('Soil pH') || err.response.data?.details?.includes('Soil pH'));
    }
  });

  await test('POST /api/predict/crop with negative nutrients rejects with 400 Bad Request', async () => {
    try {
      await axios.post(`${BASE_URL}/predict/crop`, {
        N: -10,
        P: 42,
        K: 43,
        temperature: 20,
        humidity: 80,
        ph: 6.5,
        rainfall: 200,
        selected_state: 'Punjab',
        selected_district: 'Ludhiana',
        selected_season: 'Kharif',
        area: 10
      });
      assert.fail('Should have rejected negative N with 400');
    } catch (err) {
      assert.strictEqual(err.response?.status, 400);
      assert.ok(err.response.data?.error?.includes('Nutrient metrics') || err.response.data?.details?.includes('Nutrient metrics'));
    }
  });

  await test('POST /api/predict/crop with legacy payload (no soil) calculates yield for backward compatibility', async () => {
    const res = await axios.post(`${BASE_URL}/predict/crop`, {
      selected_state: 'Punjab',
      selected_district: 'Ludhiana',
      selected_crop: 'Wheat',
      crop_year: 2024,
      selected_season: 'Rabi',
      area: 100
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.recommended_crop, 'Wheat');
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
      password: 'TestPassword123!'
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

  await test('POST /api/auth/login with wrong password rejects with 401 Unauthorized', async () => {
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: testEmail,
        password: 'wrongPassword999!'
      });
      assert.fail('Should have rejected incorrect password');
    } catch (err) {
      assert.strictEqual(err.response?.status, 401);
      assert.strictEqual(err.response.data?.error, 'Invalid email or password');
    }
  });

  await test('POST /api/auth/login with non-existent email rejects with 401 Unauthorized', async () => {
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: `nonexistent_${Date.now()}@example.com`,
        password: 'ValidPassword123!'
      });
      assert.fail('Should have rejected non-existent user');
    } catch (err) {
      assert.strictEqual(err.response?.status, 401);
      assert.strictEqual(err.response.data?.error, 'Invalid email or password');
    }
  });

  let validAuthToken = '';

  await test('POST /api/auth/login with valid credentials succeeds and returns JWT', async () => {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail,
      password: 'TestPassword123!'
    });
    assert.strictEqual(loginRes.status, 200);
    validAuthToken = loginRes.data.token;
    assert.ok(validAuthToken, 'Expected JWT token from login');
    assert.strictEqual(loginRes.data.user.email, testEmail);
  });

  await test('GET /api/auth/profile with valid token returns fresh user profile without password', async () => {
    const profileRes = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${validAuthToken}` }
    });
    assert.strictEqual(profileRes.status, 200);
    assert.strictEqual(profileRes.data.user.email, testEmail);
    assert.strictEqual(profileRes.data.user.password, undefined, 'Profile response MUST NOT leak hashed password');
    assert.ok(profileRes.data.user.id);
  });

  await test('GET /api/auth/profile without token rejects with 401 Unauthorized', async () => {
    try {
      await axios.get(`${BASE_URL}/auth/profile`);
      assert.fail('Should have rejected request missing Authorization header');
    } catch (err) {
      assert.strictEqual(err.response?.status, 401);
      assert.strictEqual(err.response.data?.error, 'Authorization header is missing');
    }
  });

  await test('GET /api/auth/profile with malformed header (no Bearer prefix) rejects with 401 Unauthorized', async () => {
    try {
      await axios.get(`${BASE_URL}/auth/profile`, {
        headers: { Authorization: validAuthToken }
      });
      assert.fail('Should have rejected header missing Bearer prefix');
    } catch (err) {
      assert.strictEqual(err.response?.status, 401);
      assert.strictEqual(err.response.data?.error, 'Invalid token format. Expected "Bearer <token>"');
    }
  });

  await test('GET /api/auth/profile with corrupted token rejects with 401 and INVALID_TOKEN code', async () => {
    try {
      await axios.get(`${BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer invalid.tampered.signature` }
      });
      assert.fail('Should have rejected corrupted token');
    } catch (err) {
      assert.strictEqual(err.response?.status, 401);
      assert.strictEqual(err.response.data?.code, 'INVALID_TOKEN');
    }
  });

  await test('GET /api/auth/profile with expired token rejects with 401 and TOKEN_EXPIRED code', async () => {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'dev-secret-key-agro-in-one';
    // Generate token expired 10 minutes ago
    const expiredToken = jwt.sign(
      { id: 9999, email: 'expired@example.com' },
      secret,
      { expiresIn: '-10m' }
    );

    try {
      await axios.get(`${BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });
      assert.fail('Should have rejected expired token');
    } catch (err) {
      assert.strictEqual(err.response?.status, 401);
      assert.strictEqual(err.response.data?.code, 'TOKEN_EXPIRED');
      assert.strictEqual(err.response.data?.error, 'Your session has expired. Please log in again.');
      assert.ok(err.response.data?.expiredAt);
    }
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
