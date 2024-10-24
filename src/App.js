// src/App.js

import React, { useState, useEffect } from 'react';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import '@tensorflow/tfjs';
import intentsData from './intentsData';
import './styles.css';

function App() {
  const [model, setModel] = useState(null);
  const [intentEmbeddings, setIntentEmbeddings] = useState({});
  const [question, setQuestion] = useState('');
  const [intent, setIntent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load the model and precompute embeddings
  useEffect(() => {
    let isMounted = true;
    const loadModelAndEmbeddings = async () => {
      try {
        const loadedModel = await use.load();
        if (!isMounted) return;
        setModel(loadedModel);

        const embeddings = {};
        for (const [intentName, examples] of Object.entries(intentsData)) {
          const exampleEmbeddings = await loadedModel.embed(examples);
          embeddings[intentName] = exampleEmbeddings;
        }
        if (!isMounted) return;
        setIntentEmbeddings(embeddings);
        setLoading(false);
      } catch (error) {
        console.error('Error loading model:', error);
      }
    };
    loadModelAndEmbeddings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!model || !question.trim()) return;

    setIsProcessing(true);

    // Preprocess the input
    const input = question.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');

    // Embed the user question
    const inputEmbedding = await model.embed([input]);
    const inputEmbeddingArray = inputEmbedding.arraySync()[0];

    let highestScore = -Infinity;
    let detectedIntent = 'Unknown';

    // Iterate over each intent and its precomputed embeddings
    for (const [intentName, embeddings] of Object.entries(intentEmbeddings)) {
      const embeddingsArray = embeddings.arraySync();

      // Calculate cosine similarity scores
      for (const exampleEmbedding of embeddingsArray) {
        const score = cosineSimilarity(inputEmbeddingArray, exampleEmbedding);
        if (score > highestScore) {
          highestScore = score;
          detectedIntent = intentName;
        }
      }
    }

    setIntent(detectedIntent);
    setIsProcessing(false);
  };

  // Function to calculate cosine similarity between two vectors
  const cosineSimilarity = (vecA, vecB) => {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  };

  if (loading) {
    return (
      <div className="container">
        <p>Loading model...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Intent Recognition Service</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter your question..."
        />
        <button type="submit" disabled={isProcessing}>
          {isProcessing ? 'Processing...' : 'Submit'}
        </button>
      </form>
      {intent && (
        <div className="result">
          <p>
            <strong>Identified Intent:</strong> {intent}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
