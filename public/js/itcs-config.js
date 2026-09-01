/**
 * JunctionAI Configuration Panel Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    const configForm = document.getElementById('itcs-config-form');
    if (!configForm) return;

    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(configForm);
        const updates = {};
        for (const [key, value] of formData.entries()) {
            updates[key] = value;
        }

        const submitBtn = configForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving Changes...';

        try {
            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            const data = await res.json();
            if (data.success) {
                if (window.itcsControls) {
                    window.itcsControls.showToast('System configuration updated and loaded into running engine!', 'success');
                } else {
                    alert('Configuration updated successfully!');
                }
            } else {
                alert(data.error || 'Failed to update configuration');
            }
        } catch (err) {
            alert('Network error updating system configuration');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});
