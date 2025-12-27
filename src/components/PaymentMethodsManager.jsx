import React, { useState, useEffect } from 'react';
import { getAllMyPaymentMethods, addPaymentMethod, deletePaymentMethod } from '../utils/storage';
import { Trash, Plus, CreditCard } from 'lucide-react';

const PaymentMethodsManager = ({ onClose }) => {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState('NEQUI');
    const [number, setNumber] = useState('');
    const [name, setName] = useState('');

    useEffect(() => {
        loadMethods();
    }, []);

    const loadMethods = async () => {
        const data = await getAllMyPaymentMethods();
        setMethods(data || []);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addPaymentMethod(type, {
                account_number: number,
                account_name: name
            });
            setNumber('');
            setName('');
            await loadMethods();
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Borrar método?")) return;
        try {
            await deletePaymentMethod(id);
            await loadMethods();
        } catch (e) { alert(e.message) }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3>💰 Métodos de Pago</h3>
                    <button onClick={onClose} style={{ background: 'transparent', padding: 0 }}>✖</button>
                </div>

                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', background: 'var(--color-bg)', borderRadius: '8px' }}>
                    <h4>Agregar Nuevo</h4>
                    <select value={type} onChange={e => setType(e.target.value)} style={{ padding: '8px' }}>
                        <option value="NEQUI">Nequi</option>
                        <option value="DAVIPLATA">Daviplata</option>
                        <option value="BANCOLOMBIA">Bancolombia</option>
                        <option value="EFECTIVO">Efectivo</option>
                    </select>
                    <input
                        placeholder="Número de Cuenta / Celular"
                        value={number}
                        onChange={e => setNumber(e.target.value)}
                        required
                        style={{ padding: '8px' }}
                    />
                    <input
                        placeholder="Titular (Opcional)"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{ padding: '8px' }}
                    />
                    <button type="submit" disabled={loading} className="primary">
                        <Plus size={16} /> Agregar
                    </button>
                </form>

                <div style={{ marginTop: '20px' }}>
                    {methods.length === 0 && <p style={{ opacity: 0.6 }}>No tienes métodos configurados.</p>}
                    {methods.map(m => (
                        <div key={m.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px', borderBottom: '1px solid #333'
                        }}>
                            <div>
                                <strong>{m.type}</strong>
                                <div style={{ fontSize: '0.9rem' }}>{m.account_number}</div>
                                {m.account_name && <small style={{ opacity: 0.7 }}>{m.account_name}</small>}
                            </div>
                            <button onClick={() => handleDelete(m.id)} style={{ color: 'red', background: 'transparent' }}>
                                <Trash size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PaymentMethodsManager;
