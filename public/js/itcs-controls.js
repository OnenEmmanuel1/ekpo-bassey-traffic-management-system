/**
 * JunctionAI Control Room Interactive Actions
 * Handles emergency vehicle priority dispatch, pedestrian crosswalk requests, and simulation overrides
 */

window.itcsControls = {
    /**
     * Trigger Emergency Vehicle Preemption Override
     */
    async triggerEmergency(laneId, priorityType = 'Ambulance Medical Priority', notes = '') {
        try {
            const res = await fetch('/api/junction/emergency-override', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ laneId, priorityType, notes })
            });

            const data = await res.json();
            if (data.success) {
                this.showToast(data.message || 'Emergency preemption dispatched successfully!', 'success');
                this.closeModal('itcs-emergency-modal');
            } else {
                this.showToast(data.error || 'Failed to dispatch preemption', 'danger');
            }
        } catch (err) {
            this.showToast('Network error triggering emergency preemption', 'danger');
        }
    },

    /**
     * Clear Active Emergency Preemption
     */
    async clearEmergency() {
        try {
            const res = await fetch('/api/junction/emergency-clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await res.json();
            if (data.success) {
                this.showToast(data.message, 'success');
            } else {
                this.showToast(data.error, 'danger');
            }
        } catch (err) {
            this.showToast('Error clearing emergency preemption', 'danger');
        }
    },

    /**
     * Submit Pedestrian Crossing Demand
     */
    async requestPedestrianCrossing() {
        try {
            const res = await fetch('/api/junction/pedestrian-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: 'Manual operator pushbutton demand from command console' })
            });

            const data = await res.json();
            if (data.success) {
                this.showToast(data.message, 'info');
            } else {
                this.showToast(data.error, 'danger');
            }
        } catch (err) {
            this.showToast('Error requesting pedestrian phase', 'danger');
        }
    },

    /**
     * Set manual density override for an approach lane
     */
    async setLaneDensityOverride(laneId, density) {
        try {
            const res = await fetch('/api/junction/density-override', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ laneId, density })
            });

            const data = await res.json();
            if (data.success) {
                this.showToast(data.message, 'info');
            } else {
                this.showToast(data.error, 'danger');
            }
        } catch (err) {
            this.showToast('Error applying density override', 'danger');
        }
    },

    /**
     * Modal helpers
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('open');
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('open');
    },

    /**
     * Toast notification helper
     */
    showToast(message, type = 'info') {
        const existingToast = document.getElementById('itcs-toast-notification');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.id = 'itcs-toast-notification';
        toast.className = `itcs-alert itcs-alert-${type}`;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '9999';
        toast.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.4)';
        toast.style.maxWidth = '380px';
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast) toast.remove();
        }, 4000);
    }
};
