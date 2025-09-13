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
            
            // Intensity slider
            const intensitySlider = modal.querySelector('#eyeIntensity');
            if (intensitySlider) {
                intensitySlider.addEventListener('input', (e) => {
                    const valueDisplay = modal.querySelector('#intensityValue');
                    if (valueDisplay) {
                        valueDisplay.textContent = e.target.value;
                    }
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
    
    showModal() {
        const modal = document.getElementById('eyeProtectionModal');
        if (modal) {
            modal.classList.remove('hidden');
            
            // Update modal controls with current state
            const enabledCheckbox = modal.querySelector('#eyeProtectionEnabled');
            const intensitySlider = modal.querySelector('#eyeIntensity');
            const intensityValue = modal.querySelector('#intensityValue');
            
            if (enabledCheckbox) {
                enabledCheckbox.checked = this.state.state.eyeProtectionEnabled;
            }
            if (intensitySlider && intensityValue) {
                intensitySlider.value = this.state.state.eyeProtectionIntensity;
                intensityValue.textContent = this.state.state.eyeProtectionIntensity;
            }
        }
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
        
        const updates = {};
        
        if (enabledCheckbox) {
            updates.eyeProtectionEnabled = enabledCheckbox.checked;
        }
        if (intensitySlider) {
            updates.eyeProtectionIntensity = parseInt(intensitySlider.value);
        }
        
        this.state.setState(updates);
        this.updateEyeProtection();
        this.hideModal();
        
        console.log('Eye protection settings saved:', updates);
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
