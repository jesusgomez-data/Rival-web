import { getHyroxResults } from "./actions";
import HyroxClient from "./HyroxClient";

export const metadata = {
    title: "HYROX | RivalFit",
    description: "Registra tus simulacros HYROX con splits por estación y compara contra tu mejor marca."
};

export default async function HyroxPage() {
    const results = await getHyroxResults();
    return <HyroxClient initialResults={results} />;
}
