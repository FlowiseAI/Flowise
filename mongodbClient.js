const { MongoClient } = require('mongodb');

// Use environment variables or replace with your MongoDB URI.
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://Tony:nCVxZm064SiM7Hag@dexcambro.ldbjx00.mongodb.net/?retryWrites=true&w=majority&appName=DexCambro";

// Create a client instance (configured for latest driver options).
const client = new MongoClient(MONGO_URI);

let isConnected = false;

/**
 * Ensures a single persistent connection to MongoDB.
 */
async function connectDB() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    console.log('Connected to MongoDB');
  }
  return client;
}

/**
 * Retrieves the chat history for a given session ID.
 * This function can be called from within your FlowiseAI flow.
 * @param {string} sessionId - The unique identifier for the user session.
 * @returns {Promise<Object>} - Returns an object containing the sessionId and messages array.
 */
async function getChatHistory(sessionId) {
  try {
    const client = await connectDB();
    const db = client.db('dex_cambro');
    const collection = db.collection('knowledge');

    // Find chat history by sessionId. If none exists, return an empty history.
    const chatHistory = await collection.findOne({ sessionId });
    return chatHistory || { sessionId, messages: [] };
  } catch (error) {
    console.error('Error retrieving chat history:', error);
    throw new Error('Error retrieving chat history: ' + error.message);
  }
}

module.exports = { getChatHistory };
