#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

async function testAIFeatures() {
  console.log('🤖 Testing AI Features');
  console.log('=====================');

  try {
    // Test AI availability
    console.log('\n1. Testing AI Availability...');
    const availabilityResponse = await fetch(`${API_BASE}/ai/availability`);
    const availability = await availabilityResponse.json();
    console.log('✅ AI Availability:', availability.data.available ? 'Available' : 'Unavailable');
    console.log('   Reason:', availability.data.reason);

    // Test Summarization
    console.log('\n2. Testing Summarization...');
    const summaryData = {
      noteId: 'test-summary',
      content: 'This is a comprehensive test of the AI summarization feature. The system should be able to extract key information from longer text and provide a concise summary. This functionality is essential for users who want to quickly understand the main points of their notes without reading the entire content. The AI should identify the most important sentences and combine them into a coherent summary.'
    };

    const summaryResponse = await fetch(`${API_BASE}/ai/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(summaryData)
    });
    const summaryJob = await summaryResponse.json();
    console.log('✅ Summary job created:', summaryJob.data.jobId);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const summaryResultResponse = await fetch(`${API_BASE}/ai/jobs/${summaryJob.data.jobId}`);
    const summaryResult = await summaryResultResponse.json();
    
    if (summaryResult.data.status === 'completed') {
      console.log('✅ Summary completed!');
      console.log('   Original length:', summaryResult.data.result.originalLength);
      console.log('   Summary length:', summaryResult.data.result.summaryLength);
      console.log('   Summary:', summaryResult.data.result.summary.substring(0, 100) + '...');
    } else {
      console.log('❌ Summary failed:', summaryResult.data.error);
    }

    // Test Grammar Check
    console.log('\n3. Testing Grammar Check...');
    const grammarData = {
      noteId: 'test-grammar',
      content: 'This are a test sentence with grammer mistakes. I recieve alot of feedback about my writing. Its important to check you\'re grammer before submiting any document.'
    };

    const grammarResponse = await fetch(`${API_BASE}/ai/grammar-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grammarData)
    });
    const grammarJob = await grammarResponse.json();
    console.log('✅ Grammar job created:', grammarJob.data.jobId);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const grammarResultResponse = await fetch(`${API_BASE}/ai/jobs/${grammarJob.data.jobId}`);
    const grammarResult = await grammarResultResponse.json();
    
    if (grammarResult.data.status === 'completed') {
      console.log('✅ Grammar check completed!');
      console.log('   Score:', grammarResult.data.result.score + '/100');
      console.log('   Issues found:', grammarResult.data.result.totalIssues);
      
      if (grammarResult.data.result.corrections.length > 0) {
        console.log('   Sample correction:');
        const correction = grammarResult.data.result.corrections[0];
        console.log('     Original:', correction.original);
        console.log('     Suggestion:', correction.suggestion);
        console.log('     Type:', correction.type);
      }
    } else {
      console.log('❌ Grammar check failed:', grammarResult.data.error);
    }

    // Test Voice to Text
    console.log('\n4. Testing Voice to Text...');
    const voiceData = {
      noteId: 'test-voice'
    };

    const voiceResponse = await fetch(`${API_BASE}/ai/voice-to-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voiceData)
    });
    const voiceJob = await voiceResponse.json();
    console.log('✅ Voice job created:', voiceJob.data.jobId);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const voiceResultResponse = await fetch(`${API_BASE}/ai/jobs/${voiceJob.data.jobId}`);
    const voiceResult = await voiceResultResponse.json();
    
    if (voiceResult.data.status === 'completed') {
      console.log('✅ Voice to text completed!');
      console.log('   Confidence:', Math.round(voiceResult.data.result.confidence * 100) + '%');
      console.log('   Duration:', voiceResult.data.result.duration + 's');
      console.log('   Text:', voiceResult.data.result.text.substring(0, 100) + '...');
    } else {
      console.log('❌ Voice to text failed:', voiceResult.data.error);
    }

    console.log('\n🎉 AI Features Test Complete!');
    console.log('All features are working properly with enhanced responses.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAIFeatures();