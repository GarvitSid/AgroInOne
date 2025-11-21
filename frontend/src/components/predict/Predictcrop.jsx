import React, { useEffect, useState } from 'react';
import './pred.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Card from 'react-bootstrap/Card';
import { toast } from 'react-toastify';
import { PredictCrop, getPredictCropOptions } from '../../api/predictcrop';

export default function Predictcrop() {
  const [State, setState] = useState('');
  const [District, setDistrict] = useState('');
  const [Crop, setCrop] = useState('');
  const [Year, setYear] = useState('');
  const [Season, setSeason] = useState('');
  const [Area, setArea] = useState('');

  const [Ans, setAns] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
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

        if (!mounted) {
          return;
        }

        // Handle both new array format (from clean_data.py) and legacy dict format
        const asArray = (val) => Array.isArray(val) ? val : Object.keys(val || {});
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

  const handleClick = async () => {
    // Validation
    const newErrors = {};
    if (!State) newErrors.State = 'State is required';
    if (!District) newErrors.District = 'District is required';
    if (!Crop) newErrors.Crop = 'Crop is required';
    if (!Year) newErrors.Year = 'Year is required';
    if (Year && (isNaN(Year) || Year < 1990 || Year > new Date().getFullYear())) newErrors.Year = 'Enter a valid year';
    if (!Season) newErrors.Season = 'Season is required';
    if (!Area) newErrors.Area = 'Area is required';
    if (Area && (isNaN(Area) || Area <= 0)) newErrors.Area = 'Area must be a positive number';


    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setLoading(true);
      setAns('');
      const ans = {
        selected_state: State,
        selected_district: District,
        selected_crop: Crop,
        crop_year: Year,
        selected_season: Season,
        area: Area,
      };
      const temp = await PredictCrop(ans);
      // ML may return different shapes: { answer: <number> } or { prediction: <str>, confidence: <num> }
      if (temp && temp.answer !== undefined) {
        setAns(`Estimated Yield: ${temp.answer} Tonnes/Hectare | Total Production: ${temp.production} Tonnes`);
      } else if (temp && temp.prediction) {
        const conf = (temp.confidence !== undefined) ? temp.confidence : (temp.probability !== undefined ? temp.probability : null);
        setAns(`Predicted: ${temp.prediction}${conf !== null ? ` (confidence: ${Number(conf).toFixed(2)})` : ''}`);
      } else {
        setAns(JSON.stringify(temp));
      }
      toast.success('Prediction complete');
    } catch (error) {
      setAns('Prediction failed. Please try again.');
      toast.error('Prediction failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <h1 className='page-heading text-center'>Crop Yield Prediction</h1>
      <Row className='justify-content-center'>
        <Col xl={10} xxl={9}>
          <Card className='form-card p-4 p-md-5'>
            <div className='mb-4 text-center'>
              <h2 className='mb-2'>Fill up the details</h2>
              <p className='text-muted mb-0'>A cleaner form layout helps farmers complete the prediction faster.</p>
            </div>

            <div className='row g-3'>
              <div className='col-md-6 form-group'>
                <label htmlFor='stateDropdown'>State</label>
                <select
                  className={`form-select ${errors.State ? 'is-invalid' : ''}`}
                  id='stateDropdown'
                  value={State}
                  onChange={(e) => setState(e.target.value)}
                  disabled={optionsLoading}
                >
                  <option value='' disabled hidden>
                    {optionsLoading ? 'Loading States...' : 'Select State'}
                  </option>
                  {stateData.map((element) => (
                    <option key={element} value={element}>{element}</option>
                  ))}
                </select>
                {errors.State && <div className='invalid-feedback d-block'>{errors.State}</div>}
              </div>

              <div className='col-md-6 form-group'>
                <label htmlFor='districtDropdown'>District</label>
                <select
                  className='form-select'
                  id='districtDropdown'
                  value={District}
                  onChange={(e) => setDistrict(e.target.value)}
                  disabled={optionsLoading}
                >
                  <option value='' disabled hidden>
                    {optionsLoading ? 'Loading Districts...' : 'Select District'}
                  </option>
                  {districtData.map((element) => (
                    <option key={element} value={element}>{element}</option>
                  ))}
                </select>
              </div>

              <div className='col-md-6 form-group'>
                <label htmlFor='cropDropdown'>Crop</label>
                <select
                  className='form-select'
                  id='cropDropdown'
                  value={Crop}
                  onChange={(e) => setCrop(e.target.value)}
                  disabled={optionsLoading}
                >
                  <option value='' disabled hidden>
                    {optionsLoading ? 'Loading Crops...' : 'Select Crop'}
                  </option>
                  {cropData.map((element) => (
                    <option key={element} value={element}>{element}</option>
                  ))}
                </select>
              </div>

              <div className='col-md-6 form-group'>
                <label htmlFor='yearInput'>Crop Year</label>
                <input
                  value={Year}
                  type='number'
                  id='yearInput'
                  className={`form-control ${errors.Year ? 'is-invalid' : ''}`}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder='e.g. 2024'
                />
                {errors.Year && <div className='invalid-feedback d-block'>{errors.Year}</div>}
              </div>

              <div className='col-md-6 form-group'>
                <label htmlFor='seasonDropdown'>Season</label>
                <select
                  className='form-select'
                  id='seasonDropdown'
                  value={Season}
                  onChange={(e) => setSeason(e.target.value)}
                  disabled={optionsLoading}
                >
                  <option value='' disabled hidden>
                    {optionsLoading ? 'Loading Seasons...' : 'Select Season'}
                  </option>
                  {seasonData.map((element) => (
                    <option key={element} value={element}>{element}</option>
                  ))}
                </select>
              </div>

              <div className='col-md-6 form-group'>
                <label htmlFor='areaInput'>Area</label>
                <input
                  value={Area}
                  type='number'
                  id='areaInput'
                  className={`form-control ${errors.Area ? 'is-invalid' : ''}`}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder='Area in hectares'
                />
                {errors.Area && <div className='invalid-feedback d-block'>{errors.Area}</div>}
              </div>


            </div>

            <Button className='mt-4 w-100' variant='primary' onClick={handleClick} disabled={loading || optionsLoading}>
              {loading ? <><Spinner animation="border" size="sm" className="me-2" />Predicting...</> : 'Predict Yield'}
            </Button>

            {Ans && (
              <Card className="mt-4 soft-card">
                <Card.Body>
                  <Card.Title>Prediction Result</Card.Title>
                  <Card.Text className="mb-0">{Ans}</Card.Text>
                </Card.Body>
              </Card>
            )}
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

