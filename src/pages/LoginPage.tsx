import React, { useState } from 'react';
import { login as apiLogin } from '../api/auth';
import { authStorage } from '../storage';

export function LoginPage(){
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await apiLogin(email, password);
            authStorage.setToken(res.jwt_token);
            authStorage.setUser({user_id: res.user_id, username: res.username, role: res.role});
            window.location.href = '/';
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{maxWidth:420, margin:'2rem auto'}}>
            <h2>Login</h2>
            <form onSubmit={submit}>
                <div style={{marginBottom:8}}>
                    <label>Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} type="email" required style={{width:'100%'}} />
                </div>
                <div style={{marginBottom:8}}>
                    <label>Password</label>
                    <input value={password} onChange={e => setPassword(e.target.value)} type="password" required style={{width:'100%'}} />
                </div>
                {error && <div style={{color:'red', marginBottom:8}}>{error}</div>}
                <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
            </form>
        </div>
    )
}
