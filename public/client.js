document.addEventListener('DOMContentLoaded', function() {
    const newProjectBtn = document.getElementById('newProject');
    
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', function() {
            window.location.href = '/planner';
        });
    }
}); 