const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const Predictloan = async (inputData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/predict/loan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(inputData),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data?.error || 'Loan prediction failed');
      error.response = { data };
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Loan prediction failed:', error.response?.data || error.message);
    throw error;
  }
};