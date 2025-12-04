import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://localhost:11434' });

async function testOllama() {
  try {
    console.log('Testing Ollama connection...');
    console.log('Host: http://localhost:11434');
    
    // Test 1: List models
    console.log('\n1. Listing available models...');
    const models = await ollama.list();
    console.log('Available models:', models.models.map(m => m.name).join(', '));
    
    // Test 2: Simple chat
    console.log('\n2. Testing chat with llama3.2...');
    const response = await ollama.chat({
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'Say "Ollama is working!" in one sentence.' }],
      stream: false,
    });
    
    console.log('Response:', response.message.content);
    console.log('\n✅ Ollama service is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Error connecting to Ollama:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 Solution: Make sure Ollama is running');
      console.error('   Run: ollama serve');
    } else if (error.message.includes('model')) {
      console.error('\n🔧 Solution: Make sure llama3.2 model is installed');
      console.error('   Run: ollama pull llama3.2');
    }
  }
}

testOllama();
