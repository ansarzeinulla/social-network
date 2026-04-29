import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import Avatar from '../../../components/Avatar';
import { fetchApi, assetURL } from '../../../services/api';

export default function EditPost() {
    const router = useRouter();
    const { id } = router.query;
    const [content, setContent] = useState('');
    const [privacy, setPrivacy] = useState('public');
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [existingImage, setExistingImage] = useState(null);
    const [followers, setFollowers] = useState([]);
    const [selectedViewers, setSelectedViewers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const folRes = await fetchApi('/followers');
                if (folRes.ok) setFollowers((await folRes.json()) || []);
                const r = await fetchApi(`/post?id=${id}`);
                if (r.ok) {
                    const data = await r.json();
                    const post = data.post;
                    const meRes = await fetchApi('/profile');
                    const me = await meRes.json();
                    if (me.id !== post.user_id) { router.push(`/post/${id}`); return; }
                    setContent(post.content);
                    setPrivacy(post.privacy);
                    setExistingImage(post.image_url);
                    setSelectedViewers(data.viewers || []);
                } else setError('Post not found');
            } catch (_) { setError('Failed to fetch'); }
            finally { setLoading(false); }
        })();
    }, [id]);

    const handleImage = (e) => {
        const f = e.target.files[0];
        if (f) { setImage(f); setPreview(URL.createObjectURL(f)); }
    };

    const submit = async (e) => {
        e.preventDefault();
        if (content.trim().length === 0 || content.length > 10000) {
            setError('Контент должен быть от 1 до 10 000 символов');
            return;
        }
        setSubmitting(true);
        const fd = new FormData();
        fd.append('id', id);
        fd.append('content', content);
        fd.append('privacy', privacy);
        if (image) fd.append('image', image);
        selectedViewers.forEach((v) => fd.append('viewers', v));
        try {
            const r = await fetchApi('/posts/update', { method: 'POST', body: fd });
            if (r.ok) router.push(`/post/${id}`);
            else setError((await r.text()) || 'Не удалось обновить');
        } finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!confirm('Удалить пост?')) return;
        setSubmitting(true);
        try {
            const r = await fetchApi(`/posts/delete?id=${id}`, { method: 'POST' });
            if (r.ok) router.push('/');
            else setError((await r.text()) || 'Не удалось удалить');
        } finally { setSubmitting(false); }
    };

    const toggleViewer = (id) => {
        setSelectedViewers((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    if (loading) return <Layout><div className="empty-state">Loading…</div></Layout>;

    return (
        <Layout title="Редактирование">
            <form onSubmit={submit} className="card form">
                {error && <div className="error">{error}</div>}

                <textarea
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

                {privacy === 'private' && followers.length > 0 && (
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

                <label className="image-row">
                    <span className="material-symbols-outlined" style={{ color: 'var(--accent)' }}>photo_library</span>
                    <span>{image ? image.name : (existingImage ? 'Сменить изображение' : 'Прикрепить изображение')}</span>
                    <input type="file" accept="image/*" onChange={handleImage} hidden />
                </label>
                {(preview || existingImage) && (
                    <div className="preview">
                        <img src={preview || assetURL(existingImage)} alt="" />
                    </div>
                )}

                <div className="form-actions">
                    <button type="submit" className="btn" disabled={submitting}>
                        {submitting ? 'Сохраняем…' : 'Сохранить'}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={submitting}>
                        Удалить
                    </button>
                </div>
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
                }
                .privacy-btn.active { background: rgba(var(--primary-rgb), 0.12); color: var(--primary); }
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
                }
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
                }
                .preview { border-radius: var(--radius); overflow: hidden; }
                .preview img { width: 100%; max-height: 400px; object-fit: cover; display: block; }
                .form-actions { display: flex; gap: 8px; }
                .form-actions .btn { flex: 1; padding: 12px; }
            `}</style>
        </Layout>
    );
}
