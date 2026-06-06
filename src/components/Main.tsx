import AccentEditor from './AccentEditor/components/AccentEditor';
import Nav from './Nav';
import UsageSection from './UsageSection';

export default function Main() {
    return (
        <div className='app-container'>
            <Nav />
            <AccentEditor />
            <UsageSection />
        </div>
    );
}
