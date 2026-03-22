import React, { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { Activity, Zap, Trash2, Square } from 'lucide-react';
import './App.css';

const App: React.FC = () => {
    const [thesis, setThesis] = useState('Love');
    const [antithesis, setAntithesis] = useState('Hate');
    const [isPlaying, setIsPlaying] = useState(false);
    const [status, setStatus] = useState('SYSTEM_READY');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyzerRef = useRef<Tone.Analyser | null>(null);
    const requestRef = useRef<number>(0);
    const synthRef = useRef<Tone.PolySynth | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    const draw = () => {
        if (!canvasRef.current || !analyzerRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;
        const values = analyzerRef.current.getValue() as Float32Array;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = isPlaying ? '#00ff41' : '#004400';
        ctx.shadowBlur = isPlaying ? 15 : 0;
        ctx.shadowColor = '#00ff41';

        const sliceWidth = canvas.width / values.length;
        let x = 0;

        for (let i = 0; i < values.length; i++) {
            const v = values[i] * 0.5;
            const y = (v + 0.5) * canvas.height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.stroke();
        requestRef.current = requestAnimationFrame(draw);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [isPlaying]);

    const synthesize = async () => {
        if (isPlaying || !thesis.trim() || !antithesis.trim()) return;
        await Tone.start();

        const analyzer = new Tone.Analyser('waveform', 256);
        analyzerRef.current = analyzer;

        const reverb = new Tone.Reverb(2).toDestination();
        const synth = new Tone.PolySynth(Tone.Synth).connect(analyzer).connect(reverb);
        synthRef.current = synth;

        setIsPlaying(true);
        setStatus('CALCULATING_SYNTHESIS...');

        const getFreq = (str: string) => {
            const sum = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            return (sum % 440) + 110;
        };

        const f1 = getFreq(thesis);
        const f2 = getFreq(antithesis);
        const synthesisFreq = (f1 + f2) / 2;

        const now = Tone.now();
        synth.triggerAttackRelease(f1, '4n', now);
        synth.triggerAttackRelease(f2, '4n', now + 0.5);
        synth.triggerAttackRelease([f1, f2, synthesisFreq], '1n', now + 1.2);

        timeoutRef.current = setTimeout(() => {
            setIsPlaying(false);
            setStatus('SYNTHESIS_COMPLETE');
        }, 4000);
    };

    const stopSynthesis = () => {
        if (synthRef.current) {
            synthRef.current.releaseAll();
            synthRef.current.dispose();
            synthRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        Tone.getTransport().stop();
        setIsPlaying(false);
        setStatus('SYNTHESIS_ABORTED');
    };

    // Global keyboard toggle: Enter + Space = play/stop
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                // Ignore if user is typing in an input field
                if (document.activeElement?.tagName === 'INPUT') return;
                e.preventDefault();
                if (isPlaying) {
                    stopSynthesis();
                } else {
                    btnRef.current?.click();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying]);

    // Enter key inside input fields
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isPlaying) stopSynthesis();
            else btnRef.current?.click();
        }
    };

    const clearInputs = () => {
        setThesis('');
        setAntithesis('');
        setStatus('INPUT_VECTORS_CLEARED');
    };

    return (
        <div className="dc-wrapper">
            <div className="dc-inner">

                <header>
                    <h1 className="dc-title">DIALECTIC_COMPOSER</h1>
                    <div className="dc-badge">CORE_STABLE_v1.2</div>
                </header>

                <p className="dc-status">
                    ENGINE: TONE.JS | STATUS:{' '}
                    <span style={{ color: isPlaying ? '#fff' : '#00ff41' }}>{status}</span>
                </p>

                <div className="dc-canvas-wrap">
                    <canvas ref={canvasRef} width={900} height={160} style={{ width: '100%', display: 'block' }} />
                    <div className="dc-canvas-label">SIGNAL_ANALYZER_V1.2</div>
                </div>

                <div className="dc-inputs">
                    <div className="dc-input-box thesis">
                        <h3><Zap size={14} /> [ THESIS ]</h3>
                        <input
                            value={thesis}
                            onChange={e => setThesis(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter concept..."
                        />
                    </div>

                    <div className="dc-input-box antithesis">
                        <h3><Zap size={14} /> [ ANTITHESIS ]</h3>
                        <input
                            value={antithesis}
                            onChange={e => setAntithesis(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter opposite..."
                        />
                    </div>
                </div>

                <div className="dc-buttons">
                    <button ref={btnRef} className="dc-btn-primary" onClick={synthesize} disabled={isPlaying}>
                        <Activity size={18} /> {isPlaying ? 'SYNTHESIZING...' : 'EXECUTE_SYNTHESIS'}
                    </button>

                    {isPlaying && (
                        <button className="dc-btn-stop" onClick={stopSynthesis}>
                            <Square size={16} /> STOP
                        </button>
                    )}

                    {!isPlaying && (
                        <button className="dc-btn-clear" onClick={clearInputs}>
                            <Trash2 size={16} /> CLEAR
                        </button>
                    )}
                </div>

            </div>

            <footer className="dc-footer">
                © {new Date().getFullYear()} RainbowDev — DIALECTIC_COMPOSER
            </footer>
        </div>
    );
};

export default App;