import { AuthProvider } from '../../../auth/AuthContext';
import ExtensionAuthPage from '../../../auth/ExtensionAuthPage';

export default function Page() {
    return (
        <AuthProvider>
            <ExtensionAuthPage />
        </AuthProvider>
    );
}
