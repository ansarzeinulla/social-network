import { assetURL } from "../services/api";

// Cover renders either a user-uploaded photo or a per-user generated gradient.
//
// Gradient is deterministic from `seed` (typically the user id) so the same
// user always sees the same colors. Two hue stops + a fixed accent — looks
// distinct between users without being garish.
function gradientFor(seed) {
    const n = Number(seed) || 0;
    const h1 = (n * 47) % 360;
    const h2 = (h1 + 60) % 360;
    return `linear-gradient(135deg, hsl(${h1}, 70%, 55%), hsl(${h2}, 70%, 45%))`;
}

export default function Cover({ url, seed, height = 220, children }) {
    const style = url
        ? { backgroundImage: `url(${assetURL(url)})`, backgroundSize: "cover", backgroundPosition: "center" }
        : { background: gradientFor(seed) };

    return (
        <div className="cover" style={{ ...style, height }}>
            {children}
            <style jsx>{`
                .cover {
                    position: relative;
                    width: 100%;
                }
            `}</style>
        </div>
    );
}
