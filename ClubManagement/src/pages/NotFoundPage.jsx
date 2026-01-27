import { Link } from "react-router-dom";

function NotFoundPage() {
    return (
        <>
            <body>
                <h1>404 - Page Not Found</h1>
                <Link to="/">Go back to Home</Link>
            </body>
        </>
    );
}

export default NotFoundPage;