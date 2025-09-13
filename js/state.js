// js/state.js - Shared state management across pages
export class AppState {
    constructor() {
        this.state = {
            darkMode: false,
            eyeProtectionEnabled: false,
            eyeProtectionIntensity: 50,
            searchQuery: '',
            selectedCategory: ''
        };
        
        this.loadSettings();
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('pdfReaderSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.state.darkMode = settings.darkMode ?? false;
                this.state.eyeProtectionEnabled = settings.eyeProtectionEnabled ?? false;
                this.state.eyeProtectionIntensity = settings.eyeProtectionIntensity ?? 50;
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
    }
    
    saveSettings() {
        try {
            const settings = {
                darkMode: this.state.darkMode,
                eyeProtectionEnabled: this.state.eyeProtectionEnabled,
                eyeProtectionIntensity: this.state.eyeProtectionIntensity
            };
            localStorage.setItem('pdfReaderSettings', JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }
    
    setState(updates) {
        Object.assign(this.state, updates);
        this.saveSettings();
    }
}
