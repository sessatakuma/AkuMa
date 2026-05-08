import 'components/Nav.css';

export default function Nav() {
    return (
        <header className='nav'>
            <a className='skip-link' href='#main-content'>
                本文へ移動
            </a>
            <div className='nav-brand' aria-label='せっさたくま'>
                <a className='nav-title' href='#main-content'>
                    <img className='logo' src='images/logo.png' alt='' aria-hidden='true' />
                    <span className='title'>せっさたくま</span>
                </a>
            </div>
        </header>
    );
}
