import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#333' }}>LexiLand Read - Test</h1>
      <p>If you can see this, React is working!</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        Count: {count}
      </button>
    </div>
  )
}

export default App
