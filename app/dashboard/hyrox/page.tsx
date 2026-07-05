import { getRaceResults, getCompetitions } from "./actions";
import { isUserAdmin } from "@/utils/admin";
import HyroxClient from "./HyroxClient";

export const metadata = {
    title: "Mis Marcas | RivalFit",
    description: "Registra tus marcas de HYROX, Deka y más competencias con splits por segmento."
};

export default async function MisMarcasPage() {
    const [results, competitions, isAdmin] = await Promise.all([
        getRaceResults(),
        getCompetitions(),
        isUserAdmin()
    ]);

    return <HyroxClient initialResults={results} competitions={competitions} isAdmin={isAdmin} />;
}
