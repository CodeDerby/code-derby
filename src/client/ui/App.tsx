import React from 'react';
import Leaderboard from './Leaderboard';
import Draft from './Draft';
import Links from './Links';

export default function App() {
  return (
    <div className="container">
      <div className="header">
        <span className="badge">Devvit Web · React</span>
        <h1 style={{margin:0}}>Code Derby</h1>
        <div style={{opacity:.6}}>Fantasy OSS League</div>
      </div>
      <div className="card"><Draft/></div>
      <div className="card"><Leaderboard/></div>
      <Links/>
    </div>
  );
}
