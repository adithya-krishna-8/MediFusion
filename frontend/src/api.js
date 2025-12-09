import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - Response with access_token
 */
export async function login(email, password) {
  const response = await axios.post(
    `${API_BASE_URL}/login`,
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

/**
 * Submit symptoms for analysis
 * @param {string[]} symptomsList - Array of symptom strings
 * @param {File|null} file - Optional file (image or PDF)
 * @returns {Promise<string>} - Task ID
 */
export async function submitSymptoms(symptomsList, file = null) {
  const formData = new FormData();
  
  // Always append symptoms as text
  formData.append('symptoms', symptomsList.join(', '));
  
  // Only append file if it was selected
  if (file) {
    formData.append('file', file);
  }
  
  const response = await axios.post(
    `${API_BASE_URL}/analyze`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data.task_id;
}

/**
 * Poll for analysis result
 * @param {string} taskId - Task ID from submitSymptoms
 * @returns {Promise<Object>} - Result object with status and data
 */
export async function pollResult(taskId) {
  const response = await axios.get(`${API_BASE_URL}/result/${taskId}`);
  return response.data;
}

