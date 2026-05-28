import axios from 'axios';

import { API_BASE, API_URL } from '../config/api';
const API = `${BACKEND_URL}/api`;

export async function deleteChatMessage(token, conversationId, messageId) {
  const response = await axios.delete(
    `${API}/conversations/${conversationId}/messages/${messageId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}
