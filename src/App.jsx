import React from 'react'
import FlappyBird from './FlappyBird.jsx'

export default function App() {
  return (
    <div style={{minHeight: '100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(#f8fafc, #e2e8f0)'}}>
      <div style={{width: 360}}>
        <FlappyBird />
        <p style={{textAlign:'center', color:'#475569', fontSize:12, marginTop:12}}>Built with React + Vite • Azure Static Web Apps ready</p>
      </div>
    </div>
  )
}
