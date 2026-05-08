import { createRoot } from 'react-dom/client';

import App from './App';

import 'shared/styles/index.css';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
