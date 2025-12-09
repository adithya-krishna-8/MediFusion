import axiosClient from '../api/axiosClient';

/**
 * Submit symptoms for disease prediction
 * @param {string} text - Symptoms text
 * @returns {Promise<Object>} - Response with task_id and status
 */
export async function submitSymptoms(text) {
  const response = await axiosClient.post('/disease/predict', {
    text: text
  });
  return response.data;
}

/**
 * Check the result of a disease prediction task
 * @param {string} taskId - Task ID from submitSymptoms
 * @returns {Promise<Object>} - Response with task_id, status, and result
 */
export async function checkResult(taskId) {
  const response = await axiosClient.get(`/disease/result/${taskId}`);
  return response.data;
}
