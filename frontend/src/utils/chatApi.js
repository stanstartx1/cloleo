// src/utils/chatApi.js
import axios from 'axios';
import BACKEND_URL, { API_BASE, API_URL } from '../config/api';

// Utilise API_BASE ou API_URL (recommandé)
const API = API_BASE ? `${API_BASE}/api` : `${BACKEND_URL}/api`;

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

// Tu peux ajouter d'autres fonctions ici plus tard...