import React, { useState, useEffect, useRef } from 'react';
import Scoreboard from './components/Scoreboard';

export default function App() {
    const [diskCount, setDiskCount] = useState(3);
    const [gameState, setGameState] = useState({ pegs: [[3, 2, 1], [], []], move_count: 0, selected_disk: null, source_peg_idx: null, is_won: false });
    const [statusMessage, setStatusMessage] = useState('Point your index finger at a peg zone!');
    const [isError, setIsError] = useState(false);
    const [activeZone, setActiveZone] = useState(-1);
    const [pointer, setPointer] = useState(null);
    const [annotatedFrame, setAnnotatedFrame] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const activeZoneRef = useRef(-1);
    const gameStateRef = useRef(gameState);
    const mainDivRef = useRef(null);

    const BACKEND_URL = 'http://localhost:8001';

    useEffect(() => { activeZoneRef.current = activeZone; }, [activeZone]);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const playSound = (type) => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            if (type === 'grab') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                osc.start(); osc.stop(ctx.currentTime + 0.1);
            } else if (type === 'drop') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                osc.start(); osc.stop(ctx.currentTime + 0.15);
            } else if (type === 'error') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(120, ctx.currentTime);
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
                osc.start(); osc.stop(ctx.currentTime + 0.25);
            } else if (type === 'undo') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(500, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(350, ctx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
                osc.start(); osc.stop(ctx.currentTime + 0.12);
            }
        } catch (e) { console.warn(e); }
    };

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
            .then((stream) => { if (videoRef.current) videoRef.current.srcObject = stream; })
            .catch(() => { setStatusMessage("Camera access denied."); setIsError(true); });
    }, []);

    useEffect(() => {
        const interval = setInterval(() => captureAndProcessFrame(), 150);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (mainDivRef.current) mainDivRef.current.focus();
    }, []);

    const captureAndProcessFrame = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        if (video.readyState < 2) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameData = canvas.toDataURL('image/jpeg', 0.8);
        fetch(`${BACKEND_URL}/api/process-frame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: frameData })
        })
            .then(res => res.json())
            .then(data => {
                setPointer(data.pointer);
                setActiveZone(data.active_zone);
                activeZoneRef.current = data.active_zone;
                setGameState(data.game_state);
                gameStateRef.current = data.game_state;
                if (data.annotated_frame) {
                    setAnnotatedFrame(data.annotated_frame);
                }
            })
            .catch(() => console.log("Waiting for backend..."));
    };

    const triggerInteraction = () => {
        const zone = activeZoneRef.current;
        if (zone === -1) {
            setStatusMessage("No zone detected! Point finger at a peg.");
            setIsError(true);
            playSound('error');
            return;
        }
        const isGrabbing = gameStateRef.current.selected_disk === null;
        fetch(`${BACKEND_URL}/api/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'interact', zone: zone })
        })
            .then(res => res.json())
            .then(data => {
                setGameState(data.state);
                gameStateRef.current = data.state;
                setStatusMessage(data.message);
                setIsError(!data.success);
                if (!data.success) playSound('error');
                else if (isGrabbing) playSound('grab');
                else playSound('drop');
            });
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                e.stopPropagation();
                triggerInteraction();
            }
        };
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, []);

    const handleReset = (forcedDisks = diskCount) => {
        fetch(`${BACKEND_URL}/api/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'reset', disks: forcedDisks })
        })
            .then(res => res.json())
            .then(data => {
                setGameState(data.state);
                setStatusMessage(`Game reset with ${forcedDisks} disks.`);
                setIsError(false);
                playSound('drop');
            });
    };

    const handleUndo = () => {
        fetch(`${BACKEND_URL}/api/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'undo' })
        })
            .then(res => res.json())
            .then(data => {
                setGameState(data.state);
                setStatusMessage(data.message);
                setIsError(!data.success);
                if (data.success) playSound('undo');
                else playSound('error');
            });
    };

    const handleLevelToggle = (e) => {
        const newCount = parseInt(e.target.value, 10);
        setDiskCount(newCount);
        handleReset(newCount);
    };

    const handleShowAiSolution = () => {
        fetch(`${BACKEND_URL}/api/ai-solution`)
            .then(res => res.json())
            .then(data => {
                const stepStrings = data.steps.map((s, idx) => `Step ${idx + 1}: Peg ${chr(65 + s.from)} ➔ Peg ${chr(65 + s.to)}`);
                alert(`📋 Optimal Steps (${diskCount} Disks):\n\n` + stepStrings.join("\n"));
            });
    };

    const chr = (code) => String.fromCharCode(code);

    const getDiskColor = (size) => {
        if (size === 4) return '#7209b7';
        if (size === 3) return '#ef233c';
        if (size === 2) return '#00b4d8';
        return '#007f5f';
    };

    return (
        <div
            ref={mainDivRef}
            tabIndex={0}
            onKeyDown={(e) => { if (e.code === 'Space') { e.preventDefault(); triggerInteraction(); } }}
            style={{ maxWidth: '1000px', margin: '0 auto', padding: '10px', fontFamily: 'sans-serif', outline: 'none' }}
        >
            {/* Hidden video + canvas for capture */}
            <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />
            <canvas ref={canvasRef} width="640" height="480" style={{ display: 'none' }} />

            {/* Control Strip */}
            <div style={{
                background: '#ffffff', padding: '15px 20px', borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#2b2d42', fontWeight: 'bold' }}>
                    <span>🎮 Difficulty:</span>
                    <select value={diskCount} onChange={handleLevelToggle} style={{ padding: '6px 12px', borderRadius: '6px', border: '2px solid #005f73', fontWeight: 'bold', color: '#005f73', cursor: 'pointer' }}>
                        <option value={3}>⭐ 3 Disks</option>
                        <option value={4}>🔥 4 Disks</option>
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleUndo}
                        disabled={gameState.move_count === 0 || gameState.selected_disk !== null}
                        style={{
                            background: (gameState.move_count === 0 || gameState.selected_disk !== null) ? '#e0e0e0' : '#ca6702',
                            color: '#ffffff', border: 'none', padding: '8px 16px',
                            borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'
                        }}
                    >
                        ↩️ Undo
                    </button>
                    <button
                        onClick={triggerInteraction}
                        style={{
                            background: activeZone === -1 ? '#adb5bd' : (gameState.selected_disk === null ? '#007f5f' : '#ef233c'),
                            color: '#ffffff', border: 'none', padding: '8px 20px',
                            borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
                            boxShadow: activeZone !== -1 ? '0 0 10px rgba(0,0,0,0.2)' : 'none'
                        }}
                    >
                        {gameState.selected_disk === null ? '👆 Grab Disk' : '📥 Drop Disk'}
                    </button>
                </div>
            </div>

            <Scoreboard
                gameState={gameState}
                statusMessage={statusMessage}
                isError={isError}
                onReset={() => handleReset(diskCount)}
                onShowAi={handleShowAiSolution}
            />

            {/* MAIN GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>

                {/* LEFT — Annotated Camera Feed */}
                <div style={{ position: 'relative', background: '#2b2d42', borderRadius: '12px', overflow: 'hidden', height: '400px' }}>

                    {/* Annotated frame from backend (has skeleton drawn on it) */}
                    {annotatedFrame ? (
                        <img
                            src={annotatedFrame}
                            alt="camera"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '14px' }}>
                            Starting camera...
                        </div>
                    )}

                    {/* Zone label */}
                    <div style={{
                        position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
                        background: activeZone === -1 ? 'rgba(0,0,0,0.5)' : 'rgba(0,127,95,0.85)',
                        color: '#fff', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold'
                    }}>
                        {activeZone === -1 ? 'No zone detected' : `Peg ${chr(65 + activeZone)} zone active`}
                    </div>

                    {/* Zone indicator bar */}
                    <div style={{ position: 'absolute', bottom: '10px', left: '5%', width: '90%', display: 'flex', gap: '4px' }}>
                        {[0, 1, 2].map(z => (
                            <div key={z} style={{
                                flex: 1, height: '8px', borderRadius: '4px',
                                background: activeZone === z ? '#ef233c' : 'rgba(255,255,255,0.2)',
                                transition: 'background 0.15s'
                            }} />
                        ))}
                    </div>
                </div>

                {/* RIGHT — Game Board */}
                <div style={{
                    display: 'flex', background: '#f8f9fa', borderRadius: '12px',
                    border: '2px solid #e9ecef', boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    height: '400px', position: 'relative', padding: '0 20px'
                }}>
                    {gameState.pegs.map((peg, idx) => (
                        <div key={idx} style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                            position: 'relative',
                            background: activeZone === idx ? 'rgba(148,210,189,0.2)' : 'transparent',
                            borderRadius: '8px', transition: 'background 0.2s'
                        }}>
                            <div style={{ position: 'absolute', bottom: '50px', width: '12px', height: '240px', background: '#bc6c25', borderRadius: '6px', zIndex: 1 }} />
                            <div style={{ position: 'absolute', bottom: '50px', display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: '4px', zIndex: 2 }}>
                                {peg.map((diskSize) => (
                                    <div key={diskSize} style={{
                                        width: `${diskSize * 35 + 40}px`, height: '24px',
                                        background: getDiskColor(diskSize), borderRadius: '6px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        color: '#ffffff', fontSize: '12px', fontWeight: 'bold',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>{diskSize}</div>
                                ))}
                            </div>
                            <div style={{ position: 'absolute', bottom: '15px', fontSize: '14px', fontWeight: 'bold', color: '#005f73' }}>
                                Peg {chr(65 + idx)}
                            </div>
                        </div>
                    ))}

                    {gameState.selected_disk !== null && (
                        <div style={{
                            position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
                            background: getDiskColor(gameState.selected_disk),
                            padding: '6px 20px', borderRadius: '20px',
                            color: '#fff', fontWeight: 'bold', fontSize: '13px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                        }}>
                            Holding Disk {gameState.selected_disk} 🖐️
                        </div>
                    )}
                </div>
            </div>

            <p style={{ textAlign: 'center', color: '#6c757d', fontSize: '13px', marginTop: '16px' }}>
                💡 Point finger at a peg zone → press <strong>Spacebar</strong> or click <strong>Grab/Drop</strong> to interact.
            </p>

            {gameState.is_won && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(43,45,66,0.85)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <div style={{ background: '#ffffff', padding: '40px', borderRadius: '16px', textAlign: 'center', maxWidth: '360px' }}>
                        <h1 style={{ fontSize: '40px', margin: '0 0 10px 0' }}>🎉</h1>
                        <h2 style={{ color: '#007f5f', margin: '0 0 10px 0' }}>Puzzle Solved!</h2>
                        <p style={{ color: '#2b2d42', marginBottom: '20px' }}>You moved all disks in <strong>{gameState.move_count}</strong> moves!</p>
                        <button onClick={() => handleReset(diskCount)} style={{ background: '#005f73', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Play Again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}