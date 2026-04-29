import { assetURL } from "../services/api";

// Avatar — shows user's uploaded image if `url` is set, otherwise the
// first letter of `name` over a colored background. Falls back to "?" if
// neither is provided.
export default function Avatar({ url, name, size = 40, className = "", style, onClick }) {
    const letter = (name || "?").trim().slice(0, 1).toUpperCase();
    const baseStyle = {
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        ...style,
    };

    return (
        <div className={`avatar ${className}`} style={baseStyle} onClick={onClick}>
            {url ? <img src={assetURL(url)} alt="" /> : letter}
        </div>
    );
}
