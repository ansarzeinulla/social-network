import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { useRouter } from 'next/router';

export default function NewPost() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [privacy, setPrivacy] = useState('public');
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');


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
        if (privacy === 'private' && selectedViewers.length === 0) {
            setError('Please select at least one follower for a private post.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('privacy', privacy);
        if (image) formData.append('image', image);
        selectedViewers.forEach(id => formData.append('viewers', id));

        try {
            const response = await fetch('http://localhost:8080/api/posts/create', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (response.status === 401) {
                router.push('/login');
                return;
            }

            if (response.ok) {
                router.push('/');
            } else {
                const msg = await response.text();
                setError(msg || 'Failed to create post');
            }
        } catch (err) {
            setError('Network error. Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="layout">
            <Navbar />
            <main className="container">
                <div className="form-card fade-in">
                    <h1>Create New Post</h1>

                    {error && <div className="error-msg">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Title <span className={title.length > 100 ? 'text-danger' : ''}>({title.length}/100)</span></label>
                            <input
                                type="text"
                                value={title}
                                maxLength={105}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What's this post about?"
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
                                <label>Select Viewers <span className="helper">({selectedViewers.length} selected)</span></label>
                                <div className="viewer-grid">
                                    {followers.length > 0 ? (
                                        followers.map(f => (
                                            <div key={f.id} 
                                                className={`viewer-card ${selectedViewers.includes(f.id) ? 'selected' : ''}`}
                                                onClick={() => {
                                                    if (selectedViewers.includes(f.id)) {
                                                        setSelectedViewers(selectedViewers.filter(id => id !== f.id));
                                                    } else {
                                                        setSelectedViewers([...selectedViewers, f.id]);
                                                    }
                                                }}
                                            >
                                                <div className="avatar">{f.first_name[0]}{f.last_name[0]}</div>
                                                <span>{f.first_name} {f.last_name}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-followers">No followers available to share with. Only accepted followers can view private posts.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Image (Optional)</label>
                            <div className="file-input-wrapper">
                                <input type="file" accept="image/*" onChange={handleImageChange} id="image-upload" />
                                <label htmlFor="image-upload" className="file-label">
                                    {image ? image.name : 'Choose an image...'}
                                </label>
                            </div>
                            {preview && (
                                <div className="image-preview-container">
                                    <img src={preview} alt="Preview" />
                                    <button type="button" className="remove-img" onClick={() => { setImage(null); setPreview(null); }}>×</button>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Content <span className={content.length > 10000 ? 'text-danger' : ''}>({content.length}/10000)</span></label>
                            <textarea
                                value={content}
                                maxLength={10100}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Express yourself..."
                                rows="10"
                                required
                            />
                        </div>

                        <div className="actions">
                            <button type="button" className="cancel-btn" onClick={() => router.back()}>Cancel</button>
                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? 'Posting...' : 'Publish Post'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            <style jsx>{`
                .layout {
                    min-height: 100vh;
                    background-color: var(--bg-main);
                }
                .form-card {
                    max-width: 800px;
                    margin: 3rem auto;
                    background: var(--card-bg);
                    padding: 3rem;
                    border-radius: 24px;
                    border: 1px solid var(--border);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                }
                h1 {
                    font-size: 2.5rem;
                    font-weight: 800;
                    margin-bottom: 2.5rem;
                    background: linear-gradient(135deg, var(--primary), #6e8efb);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .form-group {
                    margin-bottom: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                label {
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    display: flex;
                    justify-content: space-between;
                }
                input[type="text"], textarea {
                    background: var(--bg-main);
                    border: 2px solid var(--border);
                    padding: 1.25rem;
                    border-radius: 16px;
                    color: var(--text-main);
                    font-size: 1.1rem;
                    transition: all 0.3s;
                }
                input[type="text"]:focus, textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1);
                }
                .privacy-selector {
                    display: flex;
                    background: var(--bg-main);
                    padding: 0.5rem;
                    border-radius: 16px;
                    gap: 0.5rem;
                    border: 2px solid var(--border);
                }
                .privacy-selector button {
                    flex: 1;
                    padding: 0.8rem;
                    border-radius: 12px;
                    border: none;
                    background: transparent;
                    color: var(--text-muted);
                    font-weight: 700;
                    text-transform: capitalize;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .privacy-selector button.active {
                    background: var(--primary);
                    color: white;
                    box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
                }
                .viewer-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 1rem;
                    background: var(--bg-main);
                    padding: 1rem;
                    border-radius: 16px;
                    max-height: 250px;
                    overflow-y: auto;
                    border: 2px solid var(--border);
                }
                .viewer-card {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: var(--card-bg);
                    border-radius: 12px;
                    border: 2px solid var(--border);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .viewer-card:hover { border-color: var(--primary); }
                .viewer-card.selected {
                    border-color: var(--primary);
                    background: rgba(var(--primary-rgb), 0.05);
                }
                .avatar {
                    width: 32px;
                    height: 32px;
                    background: var(--primary);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 800;
                }
                .no-followers {
                    grid-column: 1 / -1;
                    padding: 2rem;
                    text-align: center;
                    color: var(--text-muted);
                    font-style: italic;
                }
                .helper { font-weight: 400; text-transform: none; font-size: 0.8rem; }
                .file-input-wrapper {
                    position: relative;
                }
                #image-upload {
                    position: absolute;
                    width: 0.1px;
                    height: 0.1px;
                    opacity: 0;
                }
                .file-label {
                    display: block;
                    padding: 1rem;
                    background: var(--bg-main);
                    border: 2px dashed var(--border);
                    border-radius: 16px;
                    text-align: center;
                    cursor: pointer;
                    color: var(--text-muted);
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .file-label:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                }
                .image-preview-container {
                    position: relative;
                    margin-top: 1rem;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 2px solid var(--border);
                }
                .image-preview-container img {
                    width: 100%;
                    display: block;
                    max-height: 400px;
                    object-fit: contain;
                    background: #111;
                }
                .remove-img {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(0,0,0,0.6);
                    color: white;
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .actions {
                    display: flex;
                    gap: 1.5rem;
                    margin-top: 2rem;
                }
                .submit-btn {
                    flex: 2;
                    background: var(--primary);
                    color: white;
                    padding: 1.25rem;
                    border-radius: 16px;
                    border: none;
                    font-weight: 800;
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 20px rgba(var(--primary-rgb), 0.4);
                }
                .cancel-btn {
                    flex: 1;
                    background: transparent;
                    color: var(--text-muted);
                    padding: 1.25rem;
                    border-radius: 16px;
                    border: 2px solid var(--border);
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .cancel-btn:hover {
                    background: var(--bg-hover);
                    color: var(--text-main);
                }
                .error-msg {
                    background: rgba(255, 77, 77, 0.1);
                    color: #ff4d4d;
                    padding: 1.25rem;
                    border-radius: 16px;
                    margin-bottom: 2rem;
                    border: 2px solid rgba(255, 77, 77, 0.2);
                    font-weight: 700;
                }
                .text-danger { color: #ff4d4d; }
            `}</style>
        </div>
    );
}
