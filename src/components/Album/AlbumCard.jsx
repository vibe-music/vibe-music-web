import React from 'react';
import { useNavigate } from 'react-router-dom';
import MarqueeText from '../Common/MarqueeText';
import './AlbumCard.css';

const AlbumCard = ({ album, id }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/album/${album.id}`);
    };

    return (
        <div className="album-card" onClick={handleClick} id={id}>
            <div className="album-card__cover">
                {album.coverArt || album.coverArtThumbnail ? (
                    <img
                        src={album.coverArt || album.coverArtThumbnail}
                        alt={album.title}
                        loading="lazy"
                    />
                ) : (
                    <div className="album-card__cover-placeholder">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 18V5l12-2v13M9 18l-7 2V7l7-2M9 18l7-2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                )}
                <div className="album-card__overlay"></div>
            </div>

            <div className="album-card__info">
                <h3 className="album-card__title">{album.title}</h3>
                <p className="album-card__artist">{album.artist}</p>
                {album.year && <p className="album-card__year">{album.year}</p>}
            </div>
        </div>
    );
};

export default AlbumCard;
