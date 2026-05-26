import React, { useState } from 'react';
import { register as apiRegister } from '../api/auth';

export function RegisterPage (){
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await apiRegister(email, username, password);
            window.location.href = '/login';
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally { setLoading(false); }
    }

    return (
        <div style={{maxWidth:480, margin:'2rem auto'}}>
            <h2>Register</h2>
            <form onSubmit={submit}>
                <div style={{marginBottom:8}}>
                    <label>Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} type="email" required style={{width:'100%'}} />
                </div>
                <div style={{marginBottom:8}}>
                    <label>Username</label>
                    <input value={username} onChange={e => setUsername(e.target.value)} required style={{width:'100%'}} />
                </div>
                <div style={{marginBottom:8}}>
                    <label>Password</label>
                    <input value={password} onChange={e => setPassword(e.target.value)} type="password" required style={{width:'100%'}} />
                </div>
                {error && <div style={{color:'red', marginBottom:8}}>{error}</div>}
                <button type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
            </form>
        </div>
    )
}
