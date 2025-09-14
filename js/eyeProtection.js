// js/eyeProtection.js - Eye protection functionality
export class EyeProtectionManager {
    constructor(appState) {
        this.state = appState;
        this.init();
    }
    
    init() {
        this.createOverlay();
        this.bindEvents();
        this.updateEyeProtection();
    }
    
    createOverlay() {
        const existing = document.getElementById('eyeProtectionOverlay');
        if (existing) existing.remove();
        
        const overlay = document.createElement('div');
        overlay.className = 'eye-protection-overlay';
        overlay.id = 'eyeProtectionOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 200, 87, var(--eye-protection-intensity, 0));
            pointer-events: none;
            z-index: 9999;
            transition: background 0.3s ease;
            opacity: 0;
        `;
        document.body.appendChild(overlay);
    }
    
    bindEvents() {
        // Eye protection toggle button
        const eyeBtn = document.getElementById('eyeProtectionToggle');
        if (eyeBtn) {
            eyeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showModal();
            });
        }
        
        // Modal events
        const modal = document.getElementById('eyeProtectionModal');
        if (modal) {
            // Close buttons
            const closeButtons = modal.querySelectorAll('#closeEyeModal, #closeEyeModal2');
            closeButtons.forEach(btn => {
                btn.addEventListener('click', () => this.hideModal());
            });
            
            // Save button
            const saveBtn = modal.querySelector('#saveEyeSettings');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => this.saveSettings());
            }
            
            // UPDATED: Intensity slider with track styling
            const intensitySlider = modal.querySelector('#eyeIntensity');
            if (intensitySlider) {
                intensitySlider.addEventListener('input', (e) => {
                    const valueDisplay = modal.querySelector('#intensityValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = e.target.value + '%';
                    }
                    // Update slider track styling
                    this.updateSliderTrack(intensitySlider);
                });
            }
            
            // Modal outside click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }
    }
    
    // NEW: Update slider track styling
    updateSliderTrack(slider) {
        const value = slider.value;
        const percentage = value / 100;
        slider.style.background = `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${percentage * 100}%, #404040 ${percentage * 100}%, #404040 100%)`;
    }
    
    showModal() {
        const modal = document.getElementById('eyeProtectionModal');
        if (modal) {
            modal.classList.remove('hidden');
            
            // Update modal controls with current state
            const enabledCheckbox = modal.querySelector('#eyeProtectionEnabled');
            const intensitySlider = modal.querySelector('#eyeIntensity');
            const intensityValue = modal.querySelector('#intensityValue');
            const colorTempDropdown = modal.querySelector('#colorTemperature');
            
            if (enabledCheckbox) {
                enabledCheckbox.checked = this.state.state.eyeProtectionEnabled;
            }
            if (intensitySlider && intensityValue) {
                intensitySlider.value = this.state.state.eyeProtectionIntensity;
                intensityValue.textContent = this.state.state.eyeProtectionIntensity + '%';
                // Initialize slider styling
                this.updateSliderTrack(intensitySlider);
            }
            
            // ADDED: Initialize dropdown and bind its events
            if (colorTempDropdown) {
                // Set default value
                colorTempDropdown.value = this.state.state.colorTemperature || '4000';
                
                // Bind change event
                colorTempDropdown.addEventListener('change', (e) => {
                    console.log('Color temperature changed to:', e.target.value);
                    this.state.setState({ colorTemperature: e.target.value });
                    this.updateColorTemperature(e.target.value);
                });
            }
        }
    }
    
    // NEW: Handle color temperature changes
    updateColorTemperature(temperature) {
        const overlay = document.getElementById('eyeProtectionOverlay');
        if (!overlay) return;
        
        let color;
        switch(temperature) {
            case '3000':
                color = 'rgba(255, 200, 87, var(--eye-protection-intensity, 0))'; // Warm
                break;
            case '6500':
                color = 'rgba(173, 216, 255, var(--eye-protection-intensity, 0))'; // Cool
                break;
            default:
                color = 'rgba(255, 200, 87, var(--eye-protection-intensity, 0))'; // Neutral
        }
        
        overlay.style.background = color;
    }
    
    hideModal() {
        const modal = document.getElementById('eyeProtectionModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    saveSettings() {
        const modal = document.getElementById('eyeProtectionModal');
        if (!modal) return;
        
        const enabledCheckbox = modal.querySelector('#eyeProtectionEnabled');
        const intensitySlider = modal.querySelector('#eyeIntensity');
        const colorTempDropdown = modal.querySelector('#colorTemperature');
        
        const updates = {};
        
        if (enabledCheckbox) {
            updates.eyeProtectionEnabled = enabledCheckbox.checked;
        }
        if (intensitySlider) {
            updates.eyeProtectionIntensity = parseInt(intensitySlider.value);
        }
        if (colorTempDropdown) {
            updates.colorTemperature = colorTempDropdown.value;
        }
        
        this.state.setState(updates);
        this.updateEyeProtection();
        this.updateColorTemperature(updates.colorTemperature || '4000');
        this.hideModal();
        
        console.log('Eye protection settings saved:', updates);
        
        // Show success message
        this.showToast('Eye protection settings saved!');
    }
    
    // NEW: Show toast notification
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast eye-protection-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">👁️</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #2a2a2a;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Hide and remove toast
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    updateEyeProtection() {
        const overlay = document.getElementById('eyeProtectionOverlay');
        if (!overlay) return;
        
        const intensity = this.state.state.eyeProtectionIntensity / 100 * 0.3;
        document.documentElement.style.setProperty('--eye-protection-intensity', intensity);
        
        if (this.state.state.eyeProtectionEnabled) {
            overlay.style.opacity = '1';
        } else {
            overlay.style.opacity = '0';
        }
        
        const eyeBtn = document.getElementById('eyeProtectionToggle');
        if (eyeBtn) {
            eyeBtn.classList.toggle('active', this.state.state.eyeProtectionEnabled);
        }
    }
}
