// src/utils/chatApi.js
import axios from 'axios';
import { API_URL } from '../config/api';

const API = API_URL;

export async function deleteChatMessage(token, conversationId, messageId) {
  const response = await axios.delete(
    `${API}/conversations/${conversationId}/messages/${messageId}`,
    { 
      headers: { 
        Authorization: `Bearer ${token}` 
      } 
    }
  );
  return response.data;
}