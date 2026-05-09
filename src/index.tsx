import Main from 'components/Main';
import './index.css';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<Main />);
}
