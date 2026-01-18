import React, { useEffect, useState, useRef } from 'react';
import './pred.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';
import { toast } from 'react-toastify';
import { PredictCrop, getPredictCropOptions } from '../../api/predictcrop';

const CROP_EMOJIS = {
  Rice: '🌾',
  Wheat: '🌾',
  Maize: '🌽',
  Chickpea: '🫘',
  Gram: '🫘',
  Kidneybeans: '🫘',
  Pigeonpeas: '🫘',
  Mothbeans: '🫘',
  Mungbean: '🫘',
  Blackgram: '🫘',
  Lentil: '🫘',
  Pomegranate: '🍎',
  Banana: '🍌',
  Mango: '🥭',
  Grapes: '🍇',
  Watermelon: '🍉',
  Muskmelon: '🍈',
  Apple: '🍎',
  Orange: '🍊',
  Papaya: '🍈',
  Coconut: '🥥',
  Cotton: '☁️',
  Jute: '🌿',
  Coffee: '☕',
};

export default function Predictcrop() {
  const formRef = useRef(null);
  const resultRef = useRef(null);

  // Section 1: Geographic & Logistics Parameters
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [season, setSeason] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [area, setArea] = useState('');
  const [cropOverride, setCropOverride] = useState('');

  // Section 2: Soil Health Telemetry (N, P, K, pH)
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorus, setPhosphorus] = useState('');
  const [potassium, setPotassium] = useState('');
  const [ph, setPh] = useState('');

  // Section 3: Climate Telemetry (Temp, Humidity, Rainfall)
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [rainfall, setRainfall] = useState('');

  // Execution & UI state
  const [resultData, setResultData] = useState(null);
  const [legacyAns, setLegacyAns] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Options vocabulary
  const [stateData, setStateData] = useState([]);
  const [districtData, setDistrictData] = useState([]);
  const [cropData, setCropData] = useState([]);
  const [seasonData, setSeasonData] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      try {
        const response = await getPredictCropOptions();
        const options = response || {};

        if (!mounted) return;

        const asArray = (val) => (Array.isArray(val) ? val : Object.keys(val || {}));
        setStateData(asArray(options.state));
        setDistrictData(asArray(options.district));
        setCropData(asArray(options.crop));
        setSeasonData(asArray(options.season));
      } catch (error) {
        console.error('Failed to load prediction options:', error);
        if (mounted) {
          toast.error('Failed to load dropdown data');
        }
      } finally {
        if (mounted) {
          setOptionsLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      mounted = false;
    };
  }, []);

  const handleFillSample = () => {
    // Fills balanced Punjab Alluvial Soil & Weather telemetry (ideal for Rice/Kharif)
    setState('Punjab');
    setDistrict('Ludhiana');
    setSeason('Kharif');
    setYear('2024');
    setArea('10');
    setCropOverride('');

    setNitrogen('90');
    setPhosphorus('42');
    setPotassium('43');
    setPh('6.5');

    setTemperature('20.88');
    setHumidity('82.0');
    setRainfall('202.94');

    setErrors({});
    toast.info('Sample Punjab telemetry loaded (Optimal for Rice in Kharif)');
  };

  const handleClear = () => {
    setState('');
    setDistrict('');
    setSeason('');
    setYear(new Date().getFullYear().toString());
    setArea('');
    setCropOverride('');

    setNitrogen('');
    setPhosphorus('');
    setPotassium('');
    setPh('');

    setTemperature('');
    setHumidity('');
    setRainfall('');

    setErrors({});
    setResultData(null);
    setLegacyAns('');
    setIsManualOverride(false);
  };

  const validate = () => {
    const newErrors = {};

    // Logistics validation
    if (!state) newErrors.state = 'State is required';
    if (!district) newErrors.district = 'District is required';
    if (!season) newErrors.season = 'Season is required';
    if (!year) {
      newErrors.year = 'Crop year is required';
    } else if (isNaN(year) || Number(year) < 1990 || Number(year) > new Date().getFullYear() + 2) {
      newErrors.year = `Enter a valid year between 1990 and ${new Date().getFullYear() + 2}`;
    }

    if (!area) {
      newErrors.area = 'Land area is required';
    } else if (isNaN(area) || Number(area) <= 0) {
      newErrors.area = 'Area must be a positive number greater than 0';
    }

    // Determine if user is attempting two-stage agronomic prediction or legacy manual
    const hasAnySoil = nitrogen !== '' || phosphorus !== '' || potassium !== '' || ph !== '';
    const hasAnyClimate = temperature !== '' || humidity !== '' || rainfall !== '';

    if (hasAnySoil || hasAnyClimate || !cropOverride) {
      if (nitrogen === '') newErrors.nitrogen = 'Nitrogen (N) is required';
      else if (isNaN(nitrogen) || Number(nitrogen) < 0) newErrors.nitrogen = 'N must be non-negative';

      if (phosphorus === '') newErrors.phosphorus = 'Phosphorus (P) is required';
      else if (isNaN(phosphorus) || Number(phosphorus) < 0) newErrors.phosphorus = 'P must be non-negative';

      if (potassium === '') newErrors.potassium = 'Potassium (K) is required';
      else if (isNaN(potassium) || Number(potassium) < 0) newErrors.potassium = 'K must be non-negative';

      if (ph === '') newErrors.ph = 'Soil pH is required';
      else if (isNaN(ph) || Number(ph) < 0 || Number(ph) > 14) newErrors.ph = 'Soil pH must be between 0.0 and 14.0';

      if (temperature === '') newErrors.temperature = 'Temperature is required';
      else if (isNaN(temperature)) newErrors.temperature = 'Temperature must be a valid number';

      if (humidity === '') newErrors.humidity = 'Humidity is required';
      else if (isNaN(humidity) || Number(humidity) < 0 || Number(humidity) > 100) newErrors.humidity = 'Humidity must be between 0% and 100%';

      if (rainfall === '') newErrors.rainfall = 'Rainfall is required';
      else if (isNaN(rainfall) || Number(rainfall) < 0) newErrors.rainfall = 'Rainfall must be a non-negative number';
    } else if (!cropOverride) {
      newErrors.cropOverride = 'Select a crop or fill in soil & climate metrics for AI recommendation';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (!validate()) {
      toast.warn('Please resolve validation errors before submitting.');
      return;
    }

    try {
      setLoading(true);
      setResultData(null);
      setLegacyAns('');
      setIsManualOverride(Boolean(cropOverride));

      const payload = {
        selected_state: state,
        selected_district: district,
        selected_season: season,
        crop_year: Number(year),
        area: Number(area),
      };

      if (cropOverride) {
        payload.selected_crop = cropOverride;
      }

      // Add agronomic telemetry if provided
      if (nitrogen !== '' && phosphorus !== '' && potassium !== '' && ph !== '') {
        payload.N = Number(nitrogen);
        payload.P = Number(phosphorus);
        payload.K = Number(potassium);
        payload.ph = Number(ph);
      }

      if (temperature !== '' && humidity !== '' && rainfall !== '') {
        payload.temperature = Number(temperature);
        payload.humidity = Number(humidity);
        payload.rainfall = Number(rainfall);
      }

      const response = await PredictCrop(payload);
      setResultData(response);

      if (response && response.yield_tonnes_per_hectare !== undefined) {
        setLegacyAns(
          `Recommended Crop: ${response.recommended_crop} | Estimated Yield: ${response.yield_tonnes_per_hectare} Tonnes/Ha | Total Production: ${response.production_tonnes} Tonnes`
        );
      } else if (response && response.answer !== undefined) {
        setLegacyAns(`Estimated Yield: ${response.answer} Tonnes/Hectare | Total Production: ${response.production} Tonnes`);
      }

      toast.success(
        response.recommended_crop
          ? `Advisory Complete: Recommended crop is ${response.recommended_crop}!`
          : 'Yield prediction complete'
      );

      // Smooth scroll to results
      setTimeout(() => {
        if (resultRef.current) {
          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    } catch (error) {
      console.error('Crop prediction error:', error);
      const errMsg = error.response?.data?.error || error.message || 'Prediction failed. Please try again.';
      toast.error(errMsg);
      setLegacyAns(`Error: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const cropName = resultData?.recommended_crop || resultData?.prediction || cropOverride || 'Recommended Crop';
  const cropEmoji = CROP_EMOJIS[cropName] || '🌱';
  const confidencePercent = resultData?.confidence ? (resultData.confidence * 100).toFixed(1) : null;
  const yieldValue = resultData?.yield_tonnes_per_hectare ?? resultData?.answer ?? null;
  const productionValue = resultData?.production_tonnes ?? resultData?.production ?? null;

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col xl={10} xxl={9}>
          <div className="text-center mb-4">
            <Badge bg="success" className="px-3 py-2 text-uppercase mb-2" style={{ letterSpacing: '0.05em' }}>
              Proactive Two-Stage AI Advisory System
            </Badge>
            <h1 className="h1-pred-crop mb-2">Crop Recommendation & Yield Advisory</h1>
            <p className="text-muted mx-auto" style={{ maxWidth: '640px' }}>
              Moving from a reactive calculator to an agronomic advisory platform. Enter your soil chemistry, weather conditions,
              and land logistics to classify the optimal crop and forecast expected harvest production.
            </p>
            <div className="d-flex justify-content-center gap-2 mt-3">
              <button type="button" className="quick-fill-btn" onClick={handleFillSample} disabled={optionsLoading}>
                ⚡ Fill Sample Telemetry (Punjab Rice)
              </button>
              <button type="button" className="quick-fill-btn" onClick={handleClear}>
                🔄 Clear All
              </button>
            </div>
          </div>

          <Card className="form-card p-4 p-md-5" ref={formRef}>
            <form onSubmit={handleSubmit} noValidate>
              {/* SECTION 1: Geographic & Logistics Telemetry */}
              <div className="diagnostic-section">
                <div className="diagnostic-header">
                  <span className="step-badge geo">1</span>
                  <h3>Geographic & Logistics Telemetry</h3>
                </div>
                <div className="row g-3">
                  <div className="col-md-6 form-group">
                    <label className="form-label" htmlFor="stateDropdown">State *</label>
                    <select
                      className={`form-select ${errors.state ? 'is-invalid' : ''}`}
                      id="stateDropdown"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      disabled={optionsLoading}
                    >
                      <option value="" disabled hidden>
                        {optionsLoading ? 'Loading States...' : 'Select State'}
                      </option>
                      {stateData.map((element) => (
                        <option key={element} value={element}>{element}</option>
                      ))}
                    </select>
                    {errors.state && <div className="invalid-feedback d-block">{errors.state}</div>}
                  </div>

                  <div className="col-md-6 form-group">
                    <label className="form-label" htmlFor="districtDropdown">District *</label>
                    <select
                      className={`form-select ${errors.district ? 'is-invalid' : ''}`}
                      id="districtDropdown"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      disabled={optionsLoading}
                    >
                      <option value="" disabled hidden>
                        {optionsLoading ? 'Loading Districts...' : 'Select District'}
                      </option>
                      {districtData.map((element) => (
                        <option key={element} value={element}>{element}</option>
                      ))}
                    </select>
                    {errors.district && <div className="invalid-feedback d-block">{errors.district}</div>}
                  </div>

                  <div className="col-md-4 form-group">
                    <label className="form-label" htmlFor="seasonDropdown">Season *</label>
                    <select
                      className={`form-select ${errors.season ? 'is-invalid' : ''}`}
                      id="seasonDropdown"
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      disabled={optionsLoading}
                    >
                      <option value="" disabled hidden>
                        {optionsLoading ? 'Loading Seasons...' : 'Select Season'}
                      </option>
                      {seasonData.map((element) => (
                        <option key={element} value={element}>{element}</option>
                      ))}
                    </select>
                    {errors.season && <div className="invalid-feedback d-block">{errors.season}</div>}
                  </div>

                  <div className="col-md-4 form-group">
                    <label className="form-label" htmlFor="yearInput">Crop Year *</label>
                    <input
                      value={year}
                      type="number"
                      id="yearInput"
                      className={`form-control ${errors.year ? 'is-invalid' : ''}`}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="e.g. 2024"
                    />
                    {errors.year && <div className="invalid-feedback d-block">{errors.year}</div>}
                  </div>

                  <div className="col-md-4 form-group">
                    <label className="form-label" htmlFor="areaInput">Farm Area (Hectares) *</label>
                    <div className="input-group">
                      <input
                        value={area}
                        type="number"
                        step="any"
                        id="areaInput"
                        className={`form-control ${errors.area ? 'is-invalid' : ''}`}
                        onChange={(e) => setArea(e.target.value)}
                        placeholder="e.g. 10"
                      />
                      <span className="input-group-text input-unit">ha</span>
                    </div>
                    {errors.area && <div className="invalid-feedback d-block">{errors.area}</div>}
                  </div>

                  <div className="col-12 form-group">
                    <label className="form-label" htmlFor="cropOverrideDropdown">
                      Target Crop Mode
                    </label>
                    <select
                      className={`form-select ${errors.cropOverride ? 'is-invalid' : ''}`}
                      id="cropOverrideDropdown"
                      value={cropOverride}
                      onChange={(e) => setCropOverride(e.target.value)}
                      disabled={optionsLoading}
                    >
                      <option value="">
                        ✨ Auto (Model 1 will recommend optimal crop based on soil & weather)
                      </option>
                      {cropData.map((element) => (
                        <option key={element} value={element}>
                          Manual Override: {element}
                        </option>
                      ))}
                    </select>
                    <div className="metric-hint">
                      Leave set to Auto to let the AI classifier diagnose the highest-yielding crop for your soil conditions.
                    </div>
                    {errors.cropOverride && <div className="invalid-feedback d-block">{errors.cropOverride}</div>}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Soil Health Telemetry */}
              <div className="diagnostic-section">
                <div className="diagnostic-header">
                  <span className="step-badge soil">2</span>
                  <h3>Soil Health Telemetry (Chemistry Diagnostics)</h3>
                </div>
                <div className="row g-3">
                  <div className="col-md-3 form-group">
                    <label className="form-label" htmlFor="nitrogenInput">Nitrogen (N) *</label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="any"
                        id="nitrogenInput"
                        className={`form-control ${errors.nitrogen ? 'is-invalid' : ''}`}
                        value={nitrogen}
                        onChange={(e) => setNitrogen(e.target.value)}
                        placeholder="e.g. 90"
                      />
                      <span className="input-group-text input-unit">kg/ha</span>
                    </div>
                    <div className="metric-hint">Available soil nitrogen (0 - 140)</div>
                    {errors.nitrogen && <div className="invalid-feedback d-block">{errors.nitrogen}</div>}
                  </div>

                  <div className="col-md-3 form-group">
                    <label className="form-label" htmlFor="phosphorusInput">Phosphorus (P) *</label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="any"
                        id="phosphorusInput"
                        className={`form-control ${errors.phosphorus ? 'is-invalid' : ''}`}
                        value={phosphorus}
                        onChange={(e) => setPhosphorus(e.target.value)}
                        placeholder="e.g. 42"
                      />
                      <span className="input-group-text input-unit">kg/ha</span>
                    </div>
                    <div className="metric-hint">Available soil phosphorus (5 - 145)</div>
                    {errors.phosphorus && <div className="invalid-feedback d-block">{errors.phosphorus}</div>}
                  </div>

                  <div className="col-md-3 form-group">
                    <label className="form-label" htmlFor="potassiumInput">Potassium (K) *</label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="any"
                        id="potassiumInput"
                        className={`form-control ${errors.potassium ? 'is-invalid' : ''}`}
                        value={potassium}
                        onChange={(e) => setPotassium(e.target.value)}
                        placeholder="e.g. 43"
                      />
                      <span className="input-group-text input-unit">kg/ha</span>
                    </div>
                    <div className="metric-hint">Available soil potassium (5 - 205)</div>
                    {errors.potassium && <div className="invalid-feedback d-block">{errors.potassium}</div>}
                  </div>

                  <div className="col-md-3 form-group">
                    <label className="form-label" htmlFor="phInput">Soil pH *</label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="0.1"
                        id="phInput"
                        className={`form-control ${errors.ph ? 'is-invalid' : ''}`}
                        value={ph}
                        onChange={(e) => setPh(e.target.value)}
                        placeholder="e.g. 6.5"
                      />
                      <span className="input-group-text input-unit">pH</span>
                    </div>
                    <div className="metric-hint">Soil acidity scale (0.0 - 14.0)</div>
                    {errors.ph && <div className="invalid-feedback d-block">{errors.ph}</div>}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Climate & Weather Telemetry */}
              <div className="diagnostic-section">
                <div className="diagnostic-header">
                  <span className="step-badge climate">3</span>
                  <h3>Climate & Weather Telemetry</h3>
                </div>
                <div className="row g-3">
                  <div className="col-md-4 form-group">
                    <label className="form-label" htmlFor="tempInput">Average Temperature *</label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="any"
                        id="tempInput"
                        className={`form-control ${errors.temperature ? 'is-invalid' : ''}`}
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        placeholder="e.g. 20.88"
                      />
                      <span className="input-group-text input-unit">°C</span>
                    </div>
                    <div className="metric-hint">Local ambient temperature</div>
                    {errors.temperature && <div className="invalid-feedback d-block">{errors.temperature}</div>}
                  </div>

                  <div className="col-md-4 form-group">
                    <label className="form-label" htmlFor="humidityInput">Relative Humidity *</label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="any"
                        id="humidityInput"
                        className={`form-control ${errors.humidity ? 'is-invalid' : ''}`}
                        value={humidity}
                        onChange={(e) => setHumidity(e.target.value)}
                        placeholder="e.g. 82.0"
                      />
                      <span className="input-group-text input-unit">%</span>
                    </div>
                    <div className="metric-hint">Atmospheric moisture (0 - 100%)</div>
                    {errors.humidity && <div className="invalid-feedback d-block">{errors.humidity}</div>}
                  </div>

                  <div className="col-md-4 form-group">
                    <label className="form-label" htmlFor="rainfallInput">Seasonal Rainfall *</label>
                    <div className="input-group">
                      <input
                        type="number"
                        step="any"
                        id="rainfallInput"
                        className={`form-control ${errors.rainfall ? 'is-invalid' : ''}`}
                        value={rainfall}
                        onChange={(e) => setRainfall(e.target.value)}
                        placeholder="e.g. 202.94"
                      />
                      <span className="input-group-text input-unit">mm</span>
                    </div>
                    <div className="metric-hint">Precipitation amount (non-negative)</div>
                    {errors.rainfall && <div className="invalid-feedback d-block">{errors.rainfall}</div>}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-100 py-3 fw-bold fs-6"
                variant="success"
                disabled={loading || optionsLoading}
                style={{ borderRadius: '0.75rem', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Executing Two-Stage AI Diagnostic Pipeline...
                  </>
                ) : (
                  '🚀 Run AI Crop Advisory & Yield Prediction'
                )}
              </Button>
            </form>

            {/* STEP 5: Dual-Result Visual Cards */}
            {resultData && (
              <div className="advisory-wrapper" ref={resultRef}>
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                  <div>
                    <Badge bg="success" className="me-2">✓ Analysis Complete</Badge>
                    <span className="text-muted small">Generated on {new Date().toLocaleDateString()}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => window.print()}
                  >
                    🖨️ Print / Save Advisory
                  </button>
                </div>

                {isManualOverride && (
                  <div className="degradation-banner">
                    <strong>ℹ️ Manual Crop Override Mode:</strong> The Stage 1 Recommender was bypassed because you selected a specific target crop. The Stage 2 Regressor estimated production specifically for <strong>{cropOverride}</strong>.
                  </div>
                )}

                <div className="row g-4">
                  {/* CARD 1: Stage 1 Recommended Crop Classifier */}
                  <div className="col-lg-6">
                    <div className="advisory-card recommender">
                      <div className="advisory-header-sub">Stage 1 • Agronomic Recommendation</div>
                      <div className="crop-name-hero">
                        <span>{cropEmoji}</span>
                        <span>{cropName}</span>
                      </div>

                      {confidencePercent ? (
                        <>
                          <div className="d-flex justify-content-between align-items-center small text-muted">
                            <span className="fw-semibold">Biochemical Suitability Match</span>
                            <span className="fw-bold text-success">{confidencePercent}%</span>
                          </div>
                          <div className="confidence-bar-container">
                            <div
                              className="confidence-bar-fill"
                              style={{ width: `${Math.min(Number(confidencePercent), 100)}%` }}
                            />
                          </div>
                          <p className="text-muted small mb-0">
                            Evaluated against 22 crop classes. Your soil chemistry (N:P:K ratio, pH {resultData.input_metrics?.ph ?? ph}) and ambient moisture provide peak vegetative & reproductive development conditions for {cropName}.
                          </p>
                        </>
                      ) : (
                        <p className="text-muted small mb-0">
                          Target crop evaluated directly from historical Indian agricultural production modeling.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CARD 2: Stage 2 Yield & Production Forecaster */}
                  <div className="col-lg-6">
                    <div className="advisory-card forecaster">
                      <div className="advisory-header-sub">Stage 2 • Harvest Productivity Forecast</div>

                      <div className="row g-2 mt-1">
                        <div className="col-6">
                          <div className="stat-pill">
                            <div className="text-muted small fw-semibold">Estimated Yield</div>
                            <div className="metric-hero">
                              {yieldValue !== null ? yieldValue : 'N/A'}
                            </div>
                            <div className="metric-unit">Tonnes / Hectare</div>
                          </div>
                        </div>

                        <div className="col-6">
                          <div className="stat-pill">
                            <div className="text-muted small fw-semibold">Total Production</div>
                            <div className="metric-hero text-primary">
                              {productionValue !== null ? productionValue : 'N/A'}
                            </div>
                            <div className="metric-unit">Total Tonnes ({area || resultData.input_metrics?.area || 1} ha)</div>
                          </div>
                        </div>
                      </div>

                      <p className="text-muted small mt-3 mb-0">
                        Forecasted based on {season || resultData.input_metrics?.season} season dynamics in {district || resultData.input_metrics?.district}, {state || resultData.input_metrics?.state}.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CARD 3: Telemetry Breakdown Matrix */}
                <div className="telemetry-summary-card">
                  <div className="fw-semibold small text-muted text-uppercase mb-2" style={{ letterSpacing: '0.04em' }}>
                    Telemetry Audit Record
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <span className="telemetry-chip">📍 {district || resultData.input_metrics?.district}, {state || resultData.input_metrics?.state}</span>
                    <span className="telemetry-chip">📅 {season || resultData.input_metrics?.season} ({year || resultData.input_metrics?.year})</span>
                    <span className="telemetry-chip">📐 Area: {area || resultData.input_metrics?.area} ha</span>
                    {resultData.input_metrics?.N !== undefined && (
                      <>
                        <span className="telemetry-chip">🧪 N: {resultData.input_metrics.N} kg/ha</span>
                        <span className="telemetry-chip">🧪 P: {resultData.input_metrics.P} kg/ha</span>
                        <span className="telemetry-chip">🧪 K: {resultData.input_metrics.K} kg/ha</span>
                        <span className="telemetry-chip">🧪 pH: {resultData.input_metrics.ph}</span>
                        <span className="telemetry-chip">🌡️ Temp: {resultData.input_metrics.temperature}°C</span>
                        <span className="telemetry-chip">💧 Humidity: {resultData.input_metrics.humidity}%</span>
                        <span className="telemetry-chip">🌧️ Rain: {resultData.input_metrics.rainfall} mm</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!resultData && legacyAns && (
              <Card className="mt-4 soft-card">
                <Card.Body>
                  <Card.Title>Prediction Status</Card.Title>
                  <Card.Text className="mb-0">{legacyAns}</Card.Text>
                </Card.Body>
              </Card>
            )}
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
