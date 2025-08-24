// public/js/dashboard.js - UPDATED VERSION
let itemType = '';
let itemId = '';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard script loaded successfully');
    
    // Add event listeners to all remove buttons using event delegation
    document.addEventListener('click', function(event) {
        if (event.target.closest('.remove-btn')) {
            const button = event.target.closest('.remove-btn');
            itemType = button.getAttribute('data-type');
            itemId = button.getAttribute('data-id');
            const itemName = button.getAttribute('data-name');
            
            console.log('Remove button clicked:', itemType, itemId, itemName);
            
            const message = `Are you sure you want to remove ${itemType === 'pet' ? 'pet' : 'task'} "${itemName}"? This action cannot be undone.`;
            document.getElementById('confirmationMessage').textContent = message;
            
            const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
            modal.show();
        }
    });
    
    // Confirm remove button handler
    document.getElementById('confirmRemoveBtn').addEventListener('click', function() {
        console.log('Confirm remove button clicked');
        if (itemType && itemId) {
            console.log(`Sending DELETE request to /${itemType}s/${itemId}`);
            
            // Show loading state
            const removeBtn = document.getElementById('confirmRemoveBtn');
            const originalText = removeBtn.innerHTML;
            removeBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Removing...';
            removeBtn.disabled = true;
            
            // Send delete request
            fetch(`/${itemType}s/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                console.log('Response received:', response.status, response.statusText);
                if (response.ok) {
                    console.log('Delete successful');
                    // Show success message and reload
                    const successMessage = document.createElement('div');
                    successMessage.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
                    successMessage.style.zIndex = '1060';
                    successMessage.innerHTML = `
                        <strong>Success!</strong> ${itemType === 'pet' ? 'Pet' : 'Task'} has been removed successfully.
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    `;
                    document.body.appendChild(successMessage);
                    
                    // Reload the page after a short delay
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    console.error('Delete failed:', response.status);
                    alert('Error removing item. Please try again.');
                    // Reset button state
                    removeBtn.innerHTML = originalText;
                    removeBtn.disabled = false;
                    
                    // Close the modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
                    modal.hide();
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                alert('Error removing item. Please try again.');
                // Reset button state
                removeBtn.innerHTML = originalText;
                removeBtn.disabled = false;
                
                // Close the modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
                modal.hide();
            });
        } else {
            console.error('Missing itemType or itemId');
        }
    });
});