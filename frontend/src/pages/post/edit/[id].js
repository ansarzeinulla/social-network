import React, { useState, useEffect } from 'react';
import Navbar from '../../../components/Navbar';
import { useRouter } from 'next/router';

export default function EditPost() {
    const router = useRouter();
    const { id } = router.query;
    const [title, setTitle] = useState('');
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

        const fetchData = async () => {
            try {
                // Fetch followers
                const folRes = await fetch('http://localhost:8080/api/followers', { credentials: 'include' });
                if (folRes.ok) {
                    const folData = await folRes.json();
                    setFollowers(folData || []);
                }

                // Fetch post data
                const res = await fetch(`http://localhost:8080/api/post?id=${id}`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    const post = data.post;
                    
                    // Auth check
                    const meRes = await fetch('http://localhost:8080/api/profile', { credentials: 'include' });
                    const meData = await meRes.json();
                    if (meData.id !== post.user_id) {
                        router.push(`/post/${id}`);
                        return;
                    }

                    setTitle(post.title);
                    setContent(post.content);
                    setPrivacy(post.privacy);
                    setExistingImage(post.image_url);
                    setSelectedViewers(data.viewers || []);
                } else {
                    setError('Post not found');
                }
            } catch (err) {
                setError('Failed to fetch data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const validateForm = () => {
        if (title.trim().length === 0 || title.length > 100) {
            setError('Title must be between 1 and 100 characters.');
            return false;
        }
        if (content.trim().length === 0 || content.length > 10000) {
            setError('Content must be between 1 and 10,000 characters.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!validateForm()) return;

        setSubmitting(true);
        const formData = new FormData();
        formData.append('id', id);
        formData.append('title', title);
        formData.append('content', content);
        formData.append('privacy', privacy);
        if (image) formData.append('image', image);
        selectedViewers.forEach(vID => formData.append('viewers', vID));

        try {
            const response = await fetch('http://localhost:8080/api/posts/update', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (response.ok) {
                router.push(`/post/${id}`);
            } else {
                const msg = await response.text();
                setError(msg || 'Failed to update post');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

        setSubmitting(true);
        try {
            const response = await fetch(`http://localhost:8080/api/posts/delete?id=${id}`, {
                method: 'POST', // or DELETE if you prefer, but I used POST/GET in handlers for ease
                credentials: 'include',
            });

            if (response.ok) {
                router.push('/');
            } else {
                const msg = await response.text();
                setError(msg || 'Failed to delete post');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="status">Loading...</div>;

    return (
        <div className="layout">
            <Navbar />
            <main className="container">
                <div className="form-card fade-in">
                    <div className="card-header">
                        <h1>Edit Post</h1>
                        <button type="button" className="delete-btn" onClick={handleDelete} disabled={submitting}>
                            🗑️ Delete
                        </button>
                    </div>

                    {error && <div className="error-msg">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Title <span className={title.length > 100 ? 'text-danger' : ''}>({title.length}/100)</span></label>
                            <input
                                type="text"
                                value={title}
                                maxLength={105}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Privacy</label>
                            <div className="privacy-selector">
                                {['public', 'almost_private', 'private'].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        className={privacy === p ? 'active' : ''}
                                        onClick={() => setPrivacy(p)}
                                    >
                                        {p.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {privacy === 'private' && (
                            <div className="form-group fade-in">
                                <label>Select Viewers 
                                    <div className="label-actions">
                                        <span className="helper">({selectedViewers.length} selected)</span>
                                        {followers.length > 0 && (
                                            <button type="button" className="text-btn" onClick={() => {
                                                if (selectedViewers.length === followers.length) {
                                                    setSelectedViewers([]);
                                                } else {
                                                    setSelectedViewers(followers.map(f => f.id));
                                                }
                                            }}>
                                                {selectedViewers.length === followers.length ? 'Deselect All' : 'Select All'}
                                            </button>
                                        )}
                                    </div>
                                </label>
                                <div className="viewer-grid">
                                    {followers.map(f => (
                                        <div key={f.id} 
                                            className={`viewer-card ${selectedViewers.includes(f.id) ? 'selected' : ''}`}
                                            onClick={() => {
                                                if (selectedViewers.includes(f.id)) {
                                                    setSelectedViewers(selectedViewers.filter(vID => vID !== f.id));
                                                } else {
                                                    setSelectedViewers([...selectedViewers, f.id]);
                                                }
                                            }}
                                        >
                                            <div className="avatar">{f.first_name[0]}{f.last_name[0]}</div>
                                            <span>{f.first_name} {f.last_name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Image</label>
                            <div className="file-input-wrapper">
                                <input type="file" accept="image/*" onChange={handleImageChange} id="image-upload" />
                                <label htmlFor="image-upload" className="file-label">
                                    {image ? image.name : 'Change image...'}
                                </label>
                            </div>
                            {(preview || existingImage) && (
                                <div className="image-preview-container">
                                    <img src={preview || `http://localhost:8080${existingImage}`} alt="Preview" />
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Content <span className={content.length > 10000 ? 'text-danger' : ''}>({content.length}/10000)</span></label>
                            <textarea
                                value={content}
                                maxLength={10100}
                                onChange={(e) => setContent(e.target.value)}
                                rows="10"
                                required
                            />
                        </div>

                        <div className="actions">
                            <button type="button" className="cancel-btn" onClick={() => router.back()}>Cancel</button>
                            <button type="submit" className="submit-btn" disabled={submitting}>
                                {submitting ? 'Updating...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            <style jsx>{`
                .layout { min-height: 100vh; background: var(--bg-main); }
                .form-card { max-width: 800px; margin: 3rem auto; background: var(--card-bg); padding: 3rem; border-radius: 24px; border: 1px solid var(--border); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
                .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
                h1 { font-size: 2.5rem; font-weight: 800; background: linear-gradient(135deg, var(--primary), #6e8efb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .delete-btn { background: rgba(255, 77, 77, 0.1); color: #ff4d4d; border: 2px solid rgba(255, 77, 77, 0.2); padding: 0.8rem 1.2rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .delete-btn:hover { background: #ff4d4d; color: white; }
                .form-group { margin-bottom: 2rem; display: flex; flex-direction: column; gap: 0.75rem; }
                label { font-size: 0.9rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; display: flex; justify-content: space-between; }
                input[type="text"], textarea { background: var(--bg-main); border: 2px solid var(--border); padding: 1.25rem; border-radius: 16px; color: var(--text-main); font-size: 1.1rem; }
                .privacy-selector { display: flex; background: var(--bg-main); padding: 0.5rem; border-radius: 16px; gap: 0.5rem; border: 2px solid var(--border); }
                .privacy-selector button { flex: 1; padding: 0.8rem; border-radius: 12px; border: none; background: transparent; color: var(--text-muted); font-weight: 700; cursor: pointer; }
                .privacy-selector button.active { background: var(--primary); color: white; }
                .viewer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; background: var(--bg-main); padding: 1rem; border-radius: 16px; max-height: 250px; overflow-y: auto; border: 2px solid var(--border); }
                .viewer-card { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--card-bg); border-radius: 12px; border: 2px solid var(--border); cursor: pointer; }
                .viewer-card.selected { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.05); }
                .avatar { width: 32px; height: 32px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; }
                .label-actions { display: flex; align-items: center; gap: 1rem; }
                .text-btn { background: transparent; border: none; color: var(--primary); font-size: 0.8rem; font-weight: 700; cursor: pointer; text-transform: uppercase; }
                .file-label { display: block; padding: 1rem; background: var(--bg-main); border: 2px dashed var(--border); border-radius: 16px; text-align: center; cursor: pointer; color: var(--text-muted); font-weight: 600; }
                #image-upload { display: none; }
                .image-preview-container { margin-top: 1rem; border-radius: 16px; overflow: hidden; border: 2px solid var(--border); }
                .image-preview-container img { width: 100%; display: block; max-height: 400px; object-fit: contain; background: #111; }
                .actions { display: flex; gap: 1.5rem; margin-top: 2rem; }
                .submit-btn { flex: 2; background: var(--primary); color: white; padding: 1.25rem; border-radius: 16px; border: none; font-weight: 800; font-size: 1.2rem; cursor: pointer; }
                .cancel-btn { flex: 1; background: transparent; color: var(--text-muted); padding: 1.25rem; border-radius: 16px; border: 2px solid var(--border); font-weight: 700; cursor: pointer; }
                .error-msg { background: rgba(255, 77, 77, 0.1); color: #ff4d4d; padding: 1.25rem; border-radius: 16px; margin-bottom: 2rem; border: 2px solid rgba(255, 77, 77, 0.2); font-weight: 700; }
                .status { text-align: center; padding: 5rem; font-size: 1.5rem; }
            `}</style>
        </div>
    );
}
