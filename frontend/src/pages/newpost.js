import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import { fetchApi } from '../services/api';

export default function NewPost() {
    const router = useRouter();
    const [content, setContent] = useState('');
    const [privacy, setPrivacy] = useState('public');
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [followers, setFollowers] = useState([]);
    const [selectedViewers, setSelectedViewers] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const r = await fetchApi('/followers');
                if (r.ok) setFollowers((await r.json()) || []);
            } catch (_) {}
        })();
    }, []);

    const handleImage = (e) => {
        const f = e.target.files[0];
        if (f) { setImage(f); setPreview(URL.createObjectURL(f)); }
    };

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (content.trim().length === 0 || content.length > 10000) {
            setError('Контент должен быть от 1 до 10 000 символов');
            return;
        }
        setLoading(true);
        const fd = new FormData();
        fd.append('content', content);
        fd.append('privacy', privacy);
        if (image) fd.append('image', image);
        selectedViewers.forEach((id) => fd.append('viewers', id));
        try {
            const r = await fetchApi('/posts/create', { method: 'POST', body: fd });
            if (r.status === 401) { router.push('/login'); return; }
            if (r.ok) router.push('/');
            else setError((await r.text()) || 'Не удалось создать пост');
        } catch (err) { setError('Сервер недоступен'); }
        finally { setLoading(false); }
    };

    const toggleViewer = (id) => {
        setSelectedViewers((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    return (
        <Layout title="Новый пост">
            <form onSubmit={submit} className="card form">
                {error && <div className="error">{error}</div>}

                <textarea
                    placeholder="Что у вас нового?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={10000}
                    rows={5}
                    required
                />

                <div className="privacy-row">
                    {[
                        { v: 'public', icon: 'public', label: 'Public' },
                        { v: 'almost_private', icon: 'group', label: 'Followers' },
                        { v: 'private', icon: 'lock', label: 'Private' },
                    ].map(({ v, icon, label }) => (
                        <button
                            key={v}
                            type="button"
                            className={`privacy-btn ${privacy === v ? 'active' : ''}`}
                            onClick={() => setPrivacy(v)}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
                            {label}
                        </button>
                    ))}
                </div>

                {privacy === 'private' && (
                    <div className="viewers">
                        <div className="viewers-title">
                            Выберите кто увидит пост ({selectedViewers.length})
                        </div>
                        {followers.length === 0 ? (
                            <div className="empty-state" style={{ padding: 16 }}>Нет подписчиков для приватного поста</div>
                        ) : (
                            <div className="viewers-grid">
                                {followers.map((f) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        className={`viewer ${selectedViewers.includes(f.id) ? 'selected' : ''}`}
                                        onClick={() => toggleViewer(f.id)}
                                    >
                                        <Avatar url={f.avatar} name={f.first_name} size={32} />
                                        <span>{f.first_name} {f.last_name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <label className="image-row">
                    <span className="material-symbols-outlined" style={{ color: 'var(--accent)' }}>photo_library</span>
                    <span>{image ? image.name : 'Прикрепить изображение'}</span>
                    <input type="file" accept="image/*" onChange={handleImage} hidden />
                </label>
                {preview && (
                    <div className="preview">
                        <img src={preview} alt="" />
                        <button type="button" className="btn btn-danger remove" onClick={() => { setImage(null); setPreview(null); }}>
                            ×
                        </button>
                    </div>
                )}

                <button type="submit" className="btn submit" disabled={loading}>
                    {loading ? 'Публикуем…' : 'Опубликовать'}
                </button>
            </form>

            <style jsx>{`
                .form { display: flex; flex-direction: column; gap: 12px; padding: 20px; }
                .error {
                    background: #FFEBEE;
                    border: 1px solid #FFCDD2;
                    color: var(--error);
                    padding: 10px 14px;
                    border-radius: var(--radius);
                    font-size: 14px;
                }
                textarea {
                    width: 100%;
                    background: var(--bg);
                    border: 1px solid var(--border);
                    color: var(--text-main);
                    padding: 12px 14px;
                    border-radius: var(--radius);
                    font-size: 15px;
                    resize: vertical;
                    font-family: inherit;
                }
                textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.18);
                }
                .privacy-row { display: flex; gap: 6px; }
                .privacy-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    background: var(--bg);
                    color: var(--text-secondary);
                    padding: 10px;
                    border-radius: var(--radius);
                    font-weight: 600;
                    font-size: 13px;
                    transition: background 0.15s, color 0.15s;
                }
                .privacy-btn:hover { background: var(--bg-hover); }
                .privacy-btn.active { background: rgba(var(--primary-rgb), 0.12); color: var(--primary); }
                .viewers { padding: 8px 0; }
                .viewers-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; }
                .viewers-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                }
                .viewer {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    background: var(--bg);
                    border-radius: var(--radius);
                    text-align: left;
                    font-size: 13px;
                    color: var(--text-main);
                    transition: background 0.15s;
                }
                .viewer:hover { background: var(--bg-hover); }
                .viewer.selected { background: rgba(var(--primary-rgb), 0.12); color: var(--primary); }
                .image-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 14px;
                    background: var(--bg);
                    border-radius: var(--radius);
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    transition: background 0.15s;
                }
                .image-row:hover { background: var(--bg-hover); }
                .preview {
                    position: relative;
                    border-radius: var(--radius);
                    overflow: hidden;
                }
                .preview img { width: 100%; max-height: 400px; object-fit: cover; display: block; }
                .preview .remove {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 32px;
                    height: 32px;
                    padding: 0;
                    border-radius: 50%;
                    font-size: 18px;
                }
                .submit { padding: 12px; font-size: 15px; }
            `}</style>
        </Layout>
    );
}
