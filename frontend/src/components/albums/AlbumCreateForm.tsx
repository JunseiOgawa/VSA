import React, { useState } from 'react';

interface AlbumCreateFormProps {
  onSubmit: (albumName: string) => void;
}

const AlbumCreateForm: React.FC<AlbumCreateFormProps> = ({ onSubmit }) => {
  const [albumName, setAlbumName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (albumName.trim()) {
      onSubmit(albumName);
      setAlbumName('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={albumName}
        onChange={(e) => setAlbumName(e.target.value)}
        placeholder="アルバム名"
        required
      />
      <button type="submit">作成</button>
    </form>
  );
};

export default AlbumCreateForm;