import React from 'react';

export default function Scoreboard({ gameState, statusMessage, isError, onReset, onShowAi }) {
    const { move_count, is_won, selected_disk } = gameState;

    return (
        <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderLeft: `6px solid ${is_won ? '#2a9d8f' : '#005f73'}`
        }}>
            <div>
                <h2 style={{ margin: '0 0 8px 0', color: '#005f73', fontSize: '24px', fontWeight: 'bold' }}>
                    🎮 Vision Tower of Hanoi
                </h2>
                <div style={{ display: 'flex', gap: '24px', fontSize: '15px', color: '#2b2d42' }}>
                    <span>🔢 <strong>Moves Made:</strong> {move_count}</span>
                    <span>open_hands <strong>Holding Disk:</strong> {selected_disk ? `Size ${selected_disk}` : 'None'}</span>
                </div>

                {statusMessage && (
                    <p style={{
                        margin: '12px 0 0 0',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: isError ? '#ef233c' : '#007f5f',
                        background: isError ? '#ffe5e5' : '#e8f5e9',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        display: 'inline-block'
                    }}>
                        {statusMessage === "Placed disk." ? "✅ Disk Placed Successfully!" : statusMessage}
                    </p>
                )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
                {/* Updated Button Text & Emoji */}
                <button
                    onClick={onShowAi}
                    style={{
                        background: '#94d2bd',
                        color: '#005f73',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.opacity = 0.8}
                    onMouseOut={(e) => e.target.style.opacity = 1}
                >
                    💡 Show Me How to Win
                </button>

                {/* Updated Button Emoji */}
                <button
                    onClick={onReset}
                    style={{
                        background: '#ef233c',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.opacity = 0.9}
                    onMouseOut={(e) => e.target.style.opacity = 1}
                >
                    🧹 Restart Game
                </button>
            </div>
        </div>
    );
}