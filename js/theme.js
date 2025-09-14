// js/theme.js - Theme management functionality
export class ThemeManager {
    constructor(appState) {
        this.state = appState;
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateTheme();
    }
    
    bindEvents() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.checked = this.state.state.darkMode;
            themeToggle.addEventListener('change', (e) => {
                this.state.setState({ darkMode: e.target.checked });
                this.updateTheme();
            });
        }
    }
    
    updateTheme() {
        const scheme = this.state.state.darkMode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-color-scheme', scheme);
    }
}
