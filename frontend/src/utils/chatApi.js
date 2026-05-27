import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

export async function deleteChatMessage(token, conversationId, messageId) {
  const response = await axios.delete(
    `${API}/conversations/${conversationId}/messages/${messageId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}
