import axiosClient from '../api/axiosClient';

/**
 * Submit symptoms for analysis
 * @param {string} symptoms - Symptoms text or string
 * @param {File|null} file - Optional file (image or PDF)
 * @returns {Promise<Object>} - Response with task_id and consultation_id
 */
export async function submitAnalysis(symptoms, file = null) {
  const formData = new FormData();
  
  // Always append symptoms as text
  formData.append('symptoms', typeof symptoms === 'string' ? symptoms : symptoms.join(', '));
  
  // Only append file if it was selected
  if (file) {
    formData.append('file', file);
  }
  
  const response = await axiosClient.post('/disease/predict', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Check the result of an analysis task
 * @param {string} taskId - Task ID from submitAnalysis
 * @param {number|null} consultationId - Optional consultation ID
 * @param {number} timeout - Timeout in seconds (default: 60)
 * @returns {Promise<Object>} - Response with task_id, status, and result
 */
export async function checkAnalysisResult(taskId, consultationId = null, timeout = 60) {
  const params = new URLSearchParams();
  if (consultationId) {
    params.append('consultation_id', consultationId);
  }
  params.append('timeout', timeout);
  
  const response = await axiosClient.get(`/disease/result/${taskId}?${params.toString()}`);
  return response.data;
}

/**
 * Poll for analysis result until completion or timeout
 * @param {string} taskId - Task ID from submitAnalysis
 * @param {number|null} consultationId - Optional consultation ID
 * @param {number} maxAttempts - Maximum polling attempts (default: 30)
 * @param {number} intervalMs - Polling interval in milliseconds (default: 2000)
 * @returns {Promise<Object>} - Final result object
 */
export async function pollAnalysisResult(taskId, consultationId = null, maxAttempts = 30, intervalMs = 2000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await checkAnalysisResult(taskId, consultationId, 60);
    
    if (result.status === 'SUCCESS' || result.status === 'FAILURE') {
      return result;
    }
    
    // Wait before next poll (except on last attempt)
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  // Return last result if max attempts reached
  return await checkAnalysisResult(taskId, consultationId, 60);
}
