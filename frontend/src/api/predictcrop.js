const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const getPredictCropOptions = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/predict/options`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data?.error || 'Failed to load prediction options');
      error.response = { data };
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Prediction options load failed:', error.response?.data || error.message);
    throw error;
  }
};

export const PredictCrop = async (inputData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/predict/crop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(inputData),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data?.error || 'Crop prediction failed');
      error.response = { data };
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Crop prediction failed:', error.response?.data || error.message);
    throw error;
  }
};