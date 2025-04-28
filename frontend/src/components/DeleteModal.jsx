import React from 'react';
import '../css/deleteModal.css'; 

function DeleteModal({ show, onCancel, onConfirm, communityName }) {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Delete Community</h3>
        <p>Are you sure you want to delete <strong>{communityName}</strong>?</p>
        <div className="modal-buttons">
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button className="delete-btn" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default DeleteModal;
